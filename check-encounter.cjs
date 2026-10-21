'use strict';
const assert=require('node:assert/strict');
const {EncounterController,contactEnd,familyEnd}=require('./docs/encounter-interaction.js');
const District=require('./docs/district.js'),C=require('./docs/character-geometry.js'),Versions=require('./docs/story-versions.js'),Camera=require('./docs/camera.js');
const actor=(frame,id)=>frame.actors.find(entry=>entry.id===id);
function noOverlap(frame){
  const entries=frame.actors.filter(entry=>/^(hero|father|mother|inspector|guard-[123])$/.test(entry.id));
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)assert(!C.penetrates(entries[i].actor.outline(entries[i].body),entries[j].actor.outline(entries[j].body)),entries[i].id+' must not cross '+entries[j].id);
}
const Motion=require('./docs/motion.js');for(const kind of ['father','mother']){const at=t=>Motion.parentReaction(kind,t,.5),rest=at(0),quick=at(.06),late=at(.48);assert(Math.max(...quick.edgeBends)>.95,'contact side contracts within the first .1 seconds');assert(Math.hypot(quick.x-rest.x,quick.y-rest.y)<.01,'dent precedes body retreat');assert(Math.hypot(late.x-rest.x,late.y-rest.y)>45,'the continuous retreat completes by .5 seconds');assert.equal(quick.sx,1);assert.equal(quick.sy,1);}
const controller=new EncounterController();let frame=controller.applyFrame(District.frame(0)),first={...frame.hero};
for(let i=0;i<180;i++){controller.tick(1/60);frame=controller.applyFrame(District.frame(controller.sceneTime));noOverlap(frame);}
assert.equal(controller.sceneTime,0,'idle observation must not advance the family event clock');
assert(!actor(frame,'hero').emotion,'idle observation must not invent a curiosity mark');
assert(Math.hypot(frame.hero.x-first.x,frame.hero.y-first.y)>10,'the child keeps exploring while the event waits');
assert(controller.hitTest({x:1090,y:470})==='mother','either visible parent can be targeted first');
for(const target of ['mother','father']){
  assert(controller.activate(target));assert.equal(controller.mark,'curiosity');let minimum=Infinity,touched=false,touchAt=null,reactionFrames=0,peakDent=0,firstRetreat=null,settledRetreat=null;const baseline=actor(District.frame(0),target).body;
  for(let i=0;i<360;i++){
    const state=controller.tick(1/60);frame=controller.applyFrame(District.frame(state.sceneTime));noOverlap(frame);
    assert.equal(controller.applyFrame(District.frame(state.sceneTime)),frame,'hit testing must not advance the solver a second time');
    const child=actor(frame,'hero'),adult=actor(frame,target);minimum=Math.min(minimum,C.distance(child.actor.outline(child.body),adult.actor.outline(adult.body)));
    if(minimum<1e-4&&!touched){touched=true;touchAt=controller.ambient;}
    if(touched){const age=controller.ambient-touchAt,retreat=Math.hypot(adult.body.x-baseline.x,adult.body.y-baseline.y);peakDent=Math.max(peakDent,...(adult.body.edgeBends||[0]));if(age>.025&&age<.075)firstRetreat=retreat;if(age>.43&&age<.5)settledRetreat=retreat;if(age<.5)reactionFrames++;if(age<1.2)assert.equal(adult.emotion,'exclamation',target+' mark persists beyond its fast reaction');}
    if(touched)assert.equal(child.emotion,'exclamation','contact mark must persist until the next click');
    if(state.familyWaiting||state.familyDone)break;
  }
  assert(minimum<1e-4,target+' must be physically touched before recoiling');
  assert(reactionFrames>=28,target+' reaction gets an actual readable .5 seconds');
  assert(peakDent>.9,target+' contact edge visibly bends inward before retreat');
  assert(firstRetreat<1&&settledRetreat>35,target+' must indent first and retreat continuously instead of jumping away');
}
assert(controller.snapshot().familyDone);assert.equal(controller.sceneTime,familyEnd);
assert(Math.hypot(frame.hero.x-District.timing.homeCenter.x,frame.hero.y-District.timing.homeCenter.y)<.01,'the child must return to the actual room center before the inspector enters');
for(let raw=contactEnd;raw<familyEnd-.02;raw+=.04){const f=District.frame(raw);noOverlap(f);assert(!actor(f,'inspector'),'the inspector must stay outside throughout recovery');assert(Math.abs(f.hero.body.angle-District.frame(contactEnd).hero.body.angle)<1e-8,'hurt child retreats without turning around');}
const paused=new EncounterController({sceneTime:15});const pausedPose=paused.applyFrame(District.frame(15)).hero;paused.tick(1/30,{advance:false});assert.equal(paused.sceneTime,15);assert.equal(paused.snapshot().familyTarget,'return');assert.equal(paused.snapshot().familyWaiting,false);assert.equal(paused.applyFrame(District.frame(15)).hero.x,pausedPose.x);
const resume=new EncounterController({sceneTime:15});for(let i=0;i<300;i++)resume.tick(1/30);assert(resume.snapshot().familyDone,'recovery completes without a third click');
const arrivalTime=District.timing.inspectorSettled-.05,arrival=District.frame(arrivalTime);assert(actor(arrival,'inspector'));assert(!actor(arrival,'guard-1'),'the inspector must enter before the guards');
const timing=District.timing,settled=actor(District.frame(timing.inspectorSettled+.01),'inspector').body;
for(let t=timing.inspectorSettled+.02;t<timing.guardsEntry[0];t+=.1){
  frame=District.frame(t);noOverlap(frame);assert(!frame.actors.some(entry=>/^guard-/.test(entry.id)),'all guards remain outside the scene during the observation beat');
  const body=actor(frame,'inspector').body;assert(Math.hypot(body.x-settled.x,body.y-settled.y)<.001,'the inspector stands still while observing and signaling');
  assert.deepEqual([Camera.pose(t).x,Camera.pose(t).y,Camera.pose(t).zoom],[800,500,1.4],'the camera holds the family view during the observation beat');
}
for(const version of ['rhythm','routine']){
  const edit=Versions.get(version).timing;
  assert(edit.playbackAt(timing.guardsEntry[0])-edit.playbackAt(timing.inspectorSettled)>1.2,'the compressed edit retains a full visible breath before soldiers enter');
  for(let i=1;i<timing.guardsEntry.length;i++)assert(edit.playbackAt(timing.guardsEntry[i])-edit.playbackAt(timing.guardsEntry[i-1])>.45,'guards enter in individually readable beats');
}
controller.seek(arrivalTime);frame=controller.applyFrame(arrival);const originalX=frame.hero.x;assert(controller.activate('authority'));
controller.tick(1/60,{sceneTime:arrivalTime+.02});frame=controller.applyFrame(District.frame(arrivalTime+.02));assert.notEqual(frame.hero.x,originalX,'authority clicks make the child shiver');noOverlap(frame);
const escortStart=timing.firstMove+.05;controller.seek(escortStart);frame=controller.applyFrame(District.frame(escortStart));let maxLag=0,closestGuard=Infinity;
for(let i=1;i<600;i++){
  const raw=escortStart+i/30*2.2;if(raw>=58)break;
  if(i===30||i===35||i===40)assert(controller.activate('escort'));
  controller.tick(1/30,{sceneTime:raw});frame=controller.applyFrame(District.frame(raw));noOverlap(frame);
  if(raw>escortStart+8.5)for(const guard of frame.actors.filter(entry=>/^guard-/.test(entry.id)))assert(!guard.collision.blocked,'click resistance must not strand a guard in a doorway');
  const child=actor(frame,'hero'),canonical=District.frame(raw).hero;if(controller.snapshot().effects.resistance>.05&&controller.snapshot().effects.lag>.35)assert(Math.abs(Math.atan2(Math.sin(child.body.angle-controller.resistanceFacing),Math.cos(child.body.angle-controller.resistanceFacing)))<.1,'click resistance keeps its original facing');maxLag=Math.max(maxLag,Math.hypot(child.body.x-canonical.x,child.body.y-canonical.y));
  if(raw>escortStart+2.5&&raw<escortStart+10)for(const guard of frame.actors.filter(entry=>/^guard-/.test(entry.id)))closestGuard=Math.min(closestGuard,C.distance(child.actor.outline(child.body),guard.actor.outline(guard.body)));
}
assert(maxLag>60,'clicking must visibly resist instead of merely delaying the story clock');assert(closestGuard<.1,'a guard must make real contact while urging the child onward');
assert.equal(controller.snapshot().effects.lag,0,'resistance must end before the factory handoff');
const ending=District.frame(58);controller.tick(1/60,{sceneTime:58});assert.equal(controller.applyFrame(ending),ending);
const auto=new EncounterController();for(const raw of [0,4.3,6.8,13.7,20])assert.equal(auto.tick(1/60,{automatic:true,sceneTime:raw}).sceneTime,raw,'automatic preview keeps the canonical scene clock');
for(const [raw,target] of [[3,'father'],[12,'mother']]){const review=new EncounterController({sceneTime:raw});const pose=review.applyFrame(District.frame(raw)).hero;assert(review.activate(target));assert(Math.hypot(review.navigation.body.x-pose.x,review.navigation.body.y-pose.y)<.001,'resuming a review route starts at the actual displayed position');}
console.log('PASS encounters: moving idle, free parent order, real father/mother contacts, inspector lead, child shiver, bounded resistance, real guard contact, collision-safe escort and exact handoff.');
