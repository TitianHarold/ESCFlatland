'use strict';
const assert=require('node:assert/strict');
const {EncounterController,familyEnd}=require('./docs/encounter-interaction.js');
const District=require('./docs/district.js'),C=require('./docs/character-geometry.js');
const actor=(frame,id)=>frame.actors.find(entry=>entry.id===id);
function noOverlap(frame){
  const entries=frame.actors.filter(entry=>/^(hero|father|mother|inspector|guard-[123])$/.test(entry.id));
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)assert(!C.penetrates(entries[i].actor.outline(entries[i].body),entries[j].actor.outline(entries[j].body)),entries[i].id+' must not cross '+entries[j].id);
}
const controller=new EncounterController();let frame=controller.applyFrame(District.frame(0)),first={...frame.hero};
for(let i=0;i<180;i++){controller.tick(1/60);frame=controller.applyFrame(District.frame(controller.sceneTime));noOverlap(frame);}
assert.equal(controller.sceneTime,0,'idle observation must not advance the family event clock');
assert(Math.hypot(frame.hero.x-first.x,frame.hero.y-first.y)>10,'the child keeps exploring while the event waits');
assert.equal(controller.activate('mother'),false,'clicking the second target must not skip the first encounter');
for(const target of ['father','mother']){
  assert(controller.activate(target));let minimum=Infinity;
  for(let i=0;i<230;i++){
    const state=controller.tick(1/60);frame=controller.applyFrame(District.frame(state.sceneTime));noOverlap(frame);
    assert.equal(controller.applyFrame(District.frame(state.sceneTime)),frame,'hit testing must not advance the solver a second time');
    const child=actor(frame,'hero'),adult=actor(frame,target);minimum=Math.min(minimum,C.distance(child.actor.outline(child.body),adult.actor.outline(adult.body)));
    if(state.familyWaiting||state.familyDone)break;
  }
  assert(minimum<1e-4,target+' must be physically touched before recoiling');
}
assert(controller.snapshot().familyDone);assert.equal(controller.sceneTime,familyEnd);
const arrival=District.frame(14.5);assert(actor(arrival,'inspector'));assert(!actor(arrival,'guard-1'),'the inspector must enter before the guards');
controller.seek(14.5);frame=controller.applyFrame(arrival);const originalX=frame.hero.x;assert(controller.activate('authority'));
controller.tick(1/60,{sceneTime:14.52});frame=controller.applyFrame(District.frame(14.52));assert.notEqual(frame.hero.x,originalX,'authority clicks make the child shiver');noOverlap(frame);
controller.seek(16.5);frame=controller.applyFrame(District.frame(16.5));let maxLag=0,closestGuard=Infinity;
for(let i=1;i<600;i++){
  const raw=16.5+i/30*2.2;if(raw>=58)break;
  if(i===30||i===35||i===40)assert(controller.activate('escort'));
  controller.tick(1/30,{sceneTime:raw});frame=controller.applyFrame(District.frame(raw));noOverlap(frame);
  const child=actor(frame,'hero'),canonical=District.frame(raw).hero;maxLag=Math.max(maxLag,Math.hypot(child.body.x-canonical.x,child.body.y-canonical.y));
  if(raw>19&&raw<26)for(const guard of frame.actors.filter(entry=>/^guard-/.test(entry.id)))closestGuard=Math.min(closestGuard,C.distance(child.actor.outline(child.body),guard.actor.outline(guard.body)));
}
assert(maxLag>60,'clicking must visibly resist instead of merely delaying the story clock');assert(closestGuard<.1,'a guard must make real contact while urging the child onward');
assert.equal(controller.snapshot().effects.lag,0,'resistance must end before the factory handoff');
const ending=District.frame(58);controller.tick(1/60,{sceneTime:58});assert.equal(controller.applyFrame(ending),ending);
const auto=new EncounterController();for(const raw of [0,4.3,6.8,13.7,20])assert.equal(auto.tick(1/60,{automatic:true,sceneTime:raw}).sceneTime,raw,'automatic preview keeps the canonical scene clock');
for(const [raw,target] of [[3,'father'],[12,'mother']]){const review=new EncounterController({sceneTime:raw});review.applyFrame(District.frame(raw));assert(review.activate(target));assert(review.tick(1/60).sceneTime>=raw,'resuming a partly reviewed action must not rewind it');}
console.log('PASS encounters: moving idle, target order, real father/mother contacts, inspector lead, child shiver, bounded resistance, real guard contact, collision-safe escort and exact handoff.');
