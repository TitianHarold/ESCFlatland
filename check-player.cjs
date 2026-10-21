const assert = require('node:assert/strict');
const StoryPlayer = require('./docs/story-player.js');
const Timing=require('./docs/story-timing.js');
const Camera=require('./docs/camera.js');
const Motion=require('./docs/motion.js'),Factory=require('./docs/factory.js');
const step = (player, seconds) => {for(let i=0;i<Math.round(seconds*100);i++)player.tick(.01);};

const ordinary = new StoryPlayer();
ordinary.press();step(ordinary,1);ordinary.release();
assert(ordinary.playing, 'A slow click starts the whole episode');
const endpoint = ordinary.target;
ordinary.tap();assert.equal(ordinary.target,endpoint,'Extra clicks cannot skip a playing episode');
step(ordinary,1);ordinary.press();step(ordinary,.3);ordinary.release();
assert(ordinary.playing,'Releasing the mouse cannot interrupt an ordinary episode');
step(ordinary,10);
assert.equal(ordinary.time,Timing.playbackAt(6.8),'First episode includes contact and the completed parental reflex');
assert(!ordinary.playing);
ordinary.tap();assert.equal(ordinary.target,Timing.playbackAt(98),'Capture, escort, entry and correction continue until the completed failure check');
const cut=Timing.playbackAt(77);
step(ordinary,cut-ordinary.time-.01);
assert.equal(Camera.shotAt(Timing.sceneAt(ordinary.time)).id,'press');
ordinary.tick(.02);
assert.equal(Camera.shotAt(Timing.sceneAt(ordinary.time)).id,'turn','The same action crosses an actual camera shot boundary');
assert(ordinary.playing,'Changing camera shots cannot pause the action');
assert.equal(ordinary.target,Timing.playbackAt(98),'Crossing the shot boundary cannot reset the episode target');

const chase = new StoryPlayer();chase.seek(Timing.playbackAt(119));chase.press();step(chase,1);
assert(chase.time>Timing.playbackAt(119)+1.5,'Holding accelerates the chase');
const heldRate=chase.playbackRate;assert(heldRate>1.79,'Holding reaches the accelerated rate');
chase.release();const releasedAt=chase.time;chase.tick(.01);
assert(chase.playbackRate<heldRate&&chase.playbackRate>1.7,'Release eases down without snapping');
step(chase,.99);
assert(chase.playing,'Chase continues after release');
assert(chase.playbackRate<1.004,'Release settles back to base speed');
assert(chase.time-releasedAt>1&&chase.time-releasedAt<1.16,'Only the short release easing adds travel');
chase.press();step(chase,20);
assert.equal(chase.time,Timing.playbackAt(132),'Holding cannot spill into the next scene');
chase.release();assert.equal(chase.target,Timing.playbackAt(132));

const auto = new StoryPlayer({mode:'auto',playing:true});step(auto,160);
assert.equal(auto.time,90);assert(!auto.playing);
// Equal playback intervals travel progressively farther, without periodic speed pulses.
const distances=[],distancePerProgress=[],speedIncrements=[];
let last=Factory.frame(122).hero,lastProgress=Motion.chaseProgress(122);
for(let playback=76.25;playback<=86;playback+=.25){
  const time=Timing.sceneAt(playback),next=time===132?Factory.anchors.chaseEnd:Factory.frame(time).hero,progress=Motion.chaseProgress(time);
  const distance=Math.hypot(next.x-last.x,next.y-last.y);
  distances.push(distance);distancePerProgress.push(distance/(progress.q-lastProgress.q));
  speedIncrements.push(progress.qSpeed-lastProgress.qSpeed);
  assert(progress.qSpeed>lastProgress.qSpeed,'Sprint speed rises continuously from rest rather than pulsing');
  if(distances.length>1)assert(distance>distances.at(-2),'Successive equal-time world displacements increase');
  last=next;lastProgress=progress;
  assert(Math.abs(Timing.sceneAt(playback)-122-(playback-76))<1e-9,'Sprint editing time is uniform');
}
assert(Math.max(...distancePerProgress)/Math.min(...distancePerProgress)<1.02,'World displacement follows the smooth progress curve along the sampled arc');
assert.equal(Motion.chaseProgress(122).qSpeed,0,'The sprint launches from rest');
for(let raw=122.002;raw<132;raw+=.002)assert(Math.abs(Motion.chaseProgress(raw).qSpeed-Motion.chaseProgress(raw-.002).qSpeed)<.003,'The acceleration has no instantaneous speed jump');
const oldRouteSpan=Math.hypot(-800-Factory.anchors.discard.x,3300);
assert(distances.reduce((sum,distance)=>sum+distance,0)>oldRouteSpan*3,'The sprint travels over three times the former route span');
assert(Factory.frame(122.8).chase.speed>oldRouteSpan/10*3,'The sprint exceeds three times the former cruise speed after its short launch');
const testAuto=new StoryPlayer({mode:'auto'});testAuto.seek(76);testAuto.setMode('auto');
for(let i=0;i<50;i++){testAuto.tick(.1);assert.equal(testAuto.playbackRate,1,'Autoplay stays at base speed');}
assert(Math.abs(testAuto.time-81)<1e-8);
assert.equal(Timing.duration,90);
assert.equal(Factory.frame(132).hero,null,'The sprint ends at the white POV stop, with no coast actor');
console.log('Click episodes, continuous cuts, smooth input rate, uninterrupted accelerating chase over 3x the former route and 90s autoplay passed.');

for(let t=0;t<=90;t+=.25)assert(Math.abs(Timing.playbackAt(Timing.sceneAt(t))-t)<1e-8,'Edit clock round trips');

// Version edits have separate clocks and cameras, while the input model stays shared.
const Versions=require('./docs/story-versions.js'),A=Versions.get('rhythm'),B=Versions.get('routine');
const Office=require('./docs/office-world.js');
Factory.setPlaybackClock(A.timing.playbackAt);
try {
assert.equal(Versions.get().id,'routine');
for(let raw=0;raw<=58;raw+=1)assert.equal(A.timing.playbackAt(raw),B.timing.playbackAt(raw),'Both openings share the same edit');
assert.equal(A.factory.anchors.pressStations.length,4);
for(const [index,program] of A.factory.pressProgram.programs.entries()){
  assert.equal(program.start,72+index*.5,'Adjacent fixtures start half a second apart');
  assert(Math.abs(A.timing.playbackAt(program.closeEnd)-A.timing.playbackAt(program.start)-.5)<1e-7,'Each visible descent takes half a playback second');
  assert(Math.abs(A.timing.playbackAt(program.returnEnd)-A.timing.playbackAt(program.closeEnd)-3)<1e-7,'Each visible return takes three playback seconds');
  assert(Math.abs(program.cycleEnd-program.start-5)<1e-7,'Each fixture has a five-second mechanical cycle');
  assert(Math.abs(program.waitEnd-program.returnEnd-1.5)<1e-7,'The upper position waits for one and a half mechanical seconds');
  assert.equal(program.windupDuration,0,'The downward movement does not start with a lift');
}
assert.equal(A.timing.playbackAt(77)-A.timing.playbackAt(72),5);
const firstFixtureAt=A.timing.playbackAt(72),entryAt=seconds=>Factory.frame(A.timing.sceneAt(seconds)).actors.find(entry=>entry.id==='hero');
for(const [offset,phase] of[[5.01,'upper-wait'],[6.49,'upper-wait'],[6.51,'closing'],[11.51,'closing']]){
  assert.equal(entryAt(firstFixtureAt+offset).machine.operationPhase,phase,'The fourth fixture keeps its real-time phase after the camera leaves');
}
const departedDamage=entryAt(firstFixtureAt+5.01).damage;
for(const offset of[6.51,11.51,13]){
  const entry=entryAt(firstFixtureAt+offset);
  assert.equal(entry.damage,departedDamage,'Empty fixture cycles cannot keep damaging the departed hero');
  assert.equal(entry.machine.contact,false,'A later empty closure cannot contact the departed hero');
}
assert.equal(A.timing.duration,79);assert.equal(B.timing.duration,90);
assert.equal(A.duration,79);assert.equal(B.duration,90);
assert.equal(A.timing.playbackAt(98)-A.timing.playbackAt(77),9.5,'The post-fixture factory actions retain their previous speed');
assert.equal(A.timing.playbackAt(119)-A.timing.playbackAt(104),13,'The struggle and inner sequence are not stretched');
assert.equal(A.timing.playbackAt(138)-A.timing.playbackAt(119),17,'Chase and POV retain their previous speed');
assert(A.notes.at(74.1).action.includes('第一、第二、第三、第四组夹具同时回升'),'Notes show concurrent fixture motion, not a single current group');
assert(B.camera.shots.every(shot=>!/fail|discard|失败|扔出/i.test(shot.id+' '+shot.label)),'B contains no failure/discard shots');
assert.equal(B.timing.playbackAt(94)-B.timing.playbackAt(64),19,'The longer open-belt travel fits the existing factory edit');
for(const [start,end]of[[76.7,78.5],[81.6,83.2]])assert(Math.abs(B.timing.playbackAt(end)-B.timing.playbackAt(start)-3)<1e-8,'Each inter-station transfer leaves three real seconds for resistance');
assert.equal(B.timing.playbackAt(108)-B.timing.playbackAt(94),16);
assert.equal(B.timing.playbackAt(119)-B.timing.playbackAt(108),10);
const workView=B.camera.pose(98),officeView=B.camera.pose(104);
assert.equal(workView.x,Office.anchors.work.x);assert.equal(workView.y,Office.anchors.work.y);
assert.equal(officeView.x,Office.anchors.overview.x);assert.equal(officeView.y,Office.anchors.overview.y);
assert(officeView.zoom<workView.zoom*.3,'The office overview reveals a substantially wider area');
for(const raw of[98,100,102,104,106,108]){
  const previous=B.camera.pose(raw-.001),next=B.camera.pose(raw+.001);
  assert(Math.hypot(next.x-previous.x,next.y-previous.y)<3&&Math.abs(next.zoom-previous.zoom)<.001,'The office pullback has no position or zoom jump');
}
assert.deepEqual(B.camera.pose(109),{...officeView,shotId:'work'},'The full office view stays fixed while it darkens');
assert.equal(B.camera.shotAt(109.99).id,'work');assert.equal(B.camera.shotAt(110).id,'inner');
const innerView=B.camera.pose(110);
assert.equal(innerView.x,Factory.anchors.discard.x);assert.equal(innerView.y,Factory.anchors.discard.y);
assert.equal(B.camera.pose(118.9).x,innerView.x);assert.equal(B.camera.pose(118.9).y,innerView.y,'The inner shot does not travel along an office exit');
const officeEpisode=new StoryPlayer({timing:B.timing,beats:B.beats});
officeEpisode.seek(B.timing.playbackAt(94));officeEpisode.tap();
assert.equal(officeEpisode.target,B.timing.playbackAt(119),'Office work, darkening and inner light are one click episode');
step(officeEpisode,B.timing.playbackAt(110)-officeEpisode.time+.02);
assert(officeEpisode.playing&&B.timing.sceneAt(officeEpisode.time)>110,'The work-to-inner cut does not stop the action');
assert.equal(officeEpisode.target,B.timing.playbackAt(119));
assert(!JSON.stringify(B.notes.at(102)).includes('闸门'));assert(!JSON.stringify(B.notes.at(102)).includes('矫正所'));
assert(B.notes.at(102).camera.includes('铺满'));assert.equal(B.factory.sceneTransition(96).cover,1,'The separate factory and office spaces change only under the doorway cover');
assert(B.notes.at(107).action.includes('逐渐变暗')&&B.notes.at(113).summary.includes('内心'));
for(const variant of[A,B]){
  Factory.setPlaybackClock(variant.timing.playbackAt);
  assert.equal(variant.timing.playbackAt(138),variant.duration);
  for(let seconds=0;seconds<=variant.duration;seconds+=.5)assert(Math.abs(variant.timing.playbackAt(variant.timing.sceneAt(seconds))-seconds)<1e-7);
  const p=new StoryPlayer({timing:variant.timing,beats:variant.beats});
  const stationCut=variant.id==='routine'?76.7:77;p.seek(variant.timing.playbackAt(stationCut)-.01);p.tap();const target=p.target;
  const before=variant.camera.shotAt(variant.timing.sceneAt(p.time));p.tick(.02);
  assert.notEqual(variant.camera.shotAt(variant.timing.sceneAt(p.time)).id,before.id,'The camera crosses a real station cut');
  assert(p.playing,'Camera cuts cannot end a version action');assert.equal(p.target,target);
  p.seek(variant.timing.playbackAt(119));p.press();step(p,1);assert(p.playbackRate>1.79);
  p.release();step(p,1);assert(p.playing);assert(p.playbackRate<1.004);
  p.press();step(p,20);assert.equal(p.time,variant.timing.playbackAt(132));
  assert(!p.playing,'The shared white stop remains an action boundary');
  const startView=variant.camera.pose(119);assert.equal(startView.x,A.factory.anchors.discard.x);assert.equal(startView.y,A.factory.anchors.discard.y);
  // B's external world is fully hidden from 110; its inner view uses the shared chase-space anchor.
  for(let raw=70;raw<(variant.id==='routine'?110:119);raw+=.1){
    const body=variant.factory.frame(raw).hero,view=variant.camera.pose(raw);
    assert(Math.abs((body.x-view.x)*view.zoom)<600&&Math.abs((body.y-view.y)*view.zoom)<340,'The hero stays inside the shot while moving between stations and the work circuit');
  }
}
const alternateTiming={duration:45,playbackAt:raw=>raw*45/138,sceneAt:seconds=>seconds*138/45};
const injected=new StoryPlayer({timing:alternateTiming,beats:[alternateTiming.playbackAt(132),45]});
injected.seek(alternateTiming.playbackAt(119));injected.press();step(injected,1);
assert(injected.playbackRate>1.79,'Chase input must consult the injected clock rather than the default clock');
assert.equal(injected.target,alternateTiming.playbackAt(132));
console.log('Version A/B: real-time offset fixtures, unchanged 79s/90s edits, continuous office pullback/inner episode, containment and chase hold passed.');

} finally {Factory.setPlaybackClock(time=>time);}
