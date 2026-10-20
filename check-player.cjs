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
// The actual curved world path advances equal distances at equal playback intervals.
const distances=[];let last=Factory.frame(122).hero;
for(let playback=76.25;playback<86;playback+=.25){
  const time=Timing.sceneAt(playback),next=Factory.frame(time).hero;
  distances.push(Math.hypot(next.x-last.x,next.y-last.y));last=next;
  assert.equal(Motion.chaseProgress(time).qSpeed,.1,'There is no scripted speed pulse');
  assert(Math.abs(Timing.sceneAt(playback)-122-(playback-76))<1e-9,'Sprint editing time is uniform');
}
assert(Math.max(...distances)/Math.min(...distances)<1.012,'Arc sampling keeps world displacement uniform');
const testAuto=new StoryPlayer({mode:'auto'});testAuto.seek(76);testAuto.setMode('auto');
for(let i=0;i<50;i++){testAuto.tick(.1);assert.equal(testAuto.playbackRate,1,'Autoplay stays at base speed');}
assert(Math.abs(testAuto.time-81)<1e-8);
assert.equal(Timing.duration,90);
assert.equal(Factory.frame(132).hero,null,'The sprint ends at the white POV stop, with no coast actor');
console.log('Click episodes, continuous cuts, smooth input acceleration/release, uniform world chase and 90s autoplay passed.');

for(let t=0;t<=90;t+=.25)assert(Math.abs(Timing.playbackAt(Timing.sceneAt(t))-t)<1e-8,'Edit clock round trips');
