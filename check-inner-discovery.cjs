'use strict';
const assert=require('node:assert/strict'),Inner=require('./docs/inner-discovery.js');
const viewport={w:1280,h:760},session=new Inner.Session();
const first=session.snapshot(viewport);session.update(12);const idle=session.snapshot(viewport);
assert.equal(idle.progress,0);assert.equal(idle.done,false);assert.equal(idle.phase,'discover');
assert.notDeepEqual(idle.points.map(p=>[p.x,p.y]),first.points.map(p=>[p.x,p.y]),'waiting keeps the small lights moving');
assert.equal(idle.points.filter(p=>p.visible&&!p.collected).length,2);
assert.equal(session.tap(-500,-500,viewport),false);assert.equal(session.snapshot(viewport).progress,0);
const p=idle.points.find(p=>p.visible&&!p.collected);assert(session.tap(p.x,p.y,viewport));assert.equal(session.tap(p.x,p.y,viewport),false);
assert.equal(session.snapshot(viewport).collected,1);
for(let count=1;count<6;count++){const before=session.snapshot(viewport),next=before.points.find(p=>p.visible&&!p.collected);assert(next);assert(session.tap(next.x,next.y,viewport));assert.equal(session.snapshot(viewport).collected,count+1);session.update(.1);}
assert.equal(session.snapshot(viewport).phase,'break');session.update(1);const held=session.snapshot(viewport);session.update(3,{advance:false});const pause=session.snapshot(viewport);
assert.equal(pause.breakProgress,held.breakProgress);assert.deepEqual(pause.reveals,held.reveals);assert(pause.clock>held.clock);
session.update(1);assert.equal(session.snapshot(viewport).phase,'done');assert.equal(session.snapshot(viewport).progress,1);
assert(session.snapshot(viewport).points.every(p=>p.alpha===0),'markers vanish before the single seed leaves');
const frozen=new Inner.Session();frozen.update(2,{advance:false});assert(frozen.snapshot(viewport).points.some(p=>p.alpha>0),'ambient point arrival stays visible even while action is paused');
const resized=new Inner.Session(),mobile={w:360,h:640};resized.update(1);const small=resized.snapshot(mobile).points.find(p=>p.visible);assert(small.hitRadius>=24);assert(resized.tap(small.x+small.hitRadius-1,small.y,mobile));
const reveal=resized.snapshot(mobile).reveals[0];assert(Math.abs(resized.snapshot(viewport).reveals[0].x/viewport.w-reveal.x/mobile.w)<1e-12,'the discovery stays in the same normalized place after resize');
for(const duration of [7.2,8,8.18]){const auto=new Inner.Session({autoDuration:duration}),counts=[];for(let t=0;t<duration+.05;t+=.01){const before=auto.snapshot(viewport).collected;auto.update(.01,{automatic:true});const after=auto.snapshot(viewport).collected;if(after>before)counts.push(after);}assert.deepEqual(counts,[1,2,3,4,5,6]);assert(auto.snapshot(viewport).done);const jump=new Inner.Session({autoDuration:duration});jump.update(duration,{automatic:true});assert(jump.snapshot(viewport).done,'a long frame keeps the same scheduled collection and break duration');}
for(const progress of [0,.12,.35,.72,.86,1]){const a=new Inner.Session().seek(progress),b=new Inner.Session().seek(progress);assert.deepEqual(a.snapshot(viewport),b.snapshot(viewport));assert.equal(a.autoElapsed,progress*a.autoDuration);if(progress>=.72)assert(Math.abs(a.snapshot(viewport).progress-progress)<1e-12);}
const mixed=new Inner.Session();mixed.update(30);assert.equal(mixed.autoElapsed,0,'interactive waiting never spends the automatic collection schedule');
mixed.update(.5,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,0);
mixed.update(.5,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,1);
const manual=mixed.snapshot(viewport).points.find(p=>p.visible&&!p.collected);assert(mixed.tap(manual.x,manual.y,viewport));
const captured=mixed.snapshot(viewport).reveals.map(r=>[r.id,r.x,r.y]);assert.equal(mixed.autoElapsed,2);
mixed.update(30);assert.equal(mixed.autoElapsed,2);mixed.update(.9,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,2,'switching from idle or manual hits to auto waits for the next interval');
mixed.update(.1,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,3);assert.deepEqual(mixed.snapshot(viewport).reveals.slice(0,2).map(r=>[r.id,r.x,r.y]),captured,'automatic assistance preserves manually captured reveal positions');
assert(/^#[0-9a-f]{6}$/.test(Inner.background));
console.log(JSON.stringify({pass:true,visibleTargets:2,discoveries:6,ambientIndependent:true,pausedActionFrozen:true,automaticSameCollection:true,deterministicSeek:true}));
