'use strict';
const assert=require('node:assert/strict'),Ending=require('./docs/ending-progress.js');
const run=(session,seconds,options={})=>{for(let i=0;i<Math.round(seconds*100);i++)session.update(.01,options);return session.snapshot();};
assert(Math.abs(Ending.duration-14)<1e-9);
const ending=new Ending.Session();
assert.equal(run(ending,30).phase,'stopped');assert.equal(ending.snapshot().raise,0);assert.equal(ending.snapshot().complete,false);
assert(ending.click());assert.equal(ending.snapshot().raise,0,'a click starts the continuous raise without jumping to raised hands');
let state=run(ending,.6);assert(state.raise>0&&state.raise<1);
state=run(ending,.6);assert.equal(state.phase,'open');assert.equal(state.raise,1);assert.equal(run(ending,10).phase,'open');
assert(ending.click());state=run(ending,.5);assert(state.flex>0&&state.flex<1);assert.equal(state.lightDrop,0);
state=run(ending,.5);assert.equal(state.phase,'half');assert.equal(state.flex,1);assert.equal(run(ending,10).phase,'half');
assert(ending.click());state=run(ending,.8);assert(state.lightDrop>0&&state.lightDrop<1);assert(state.grasp>0&&state.grasp<1);
const paused=ending.snapshot();ending.update(20,{advance:false,automatic:true});assert.deepEqual(ending.snapshot(),paused,'pause freezes the seed drift clock, all poses and the story');
const observed=[];for(let i=0;i<1200;i++){const s=ending.update(.01);if(!observed.includes(s.phase))observed.push(s.phase);}
assert.deepEqual(observed,['drop','grasp','vanish','seed','expand','message','done']);
state=ending.snapshot();assert(state.complete);assert.equal(state.handsOpacity,0);assert.equal(state.expansion,1);assert.equal(state.textOpacity,1);assert.equal(state.text,'welcome to explore a new dimension');assert.equal(ending.click(),false);
const queued=new Ending.Session();queued.click();queued.click();queued.click();assert.equal(queued.snapshot().phase,'raise');assert.equal(queued.snapshot().raise,0);queued.update(.6);assert(queued.snapshot().raise<1&&queued.snapshot().flex===0,'rapid clicks queue the later discoveries without skipping the first pose');
const auto=new Ending.Session();assert.equal(run(auto,13.99,{automatic:true}).complete,false);assert(run(auto,.01,{automatic:true}).complete);assert.equal(auto.snapshot().clicks,3);
const jump=new Ending.Session();jump.update(Ending.duration,{automatic:true});assert(jump.snapshot().complete,'one long frame follows the same complete automatic sequence');
for(const raw of [132,132.1,133,134.2,135,136,137.8,138]){const a=Ending.snapshotAt(raw),b=new Ending.Session().seek(raw).snapshot();assert.deepEqual(a,b);assert(Math.abs(a.raw-raw)<1e-7,'review seek reconstructs the same raw timeline');}
const Inner=require('./docs/inner-discovery.js'),inner=new Inner.Session();
for(let i=0;i<6;i++)inner.collect(i,{w:1280,h:760});
inner.update(1.44);assert(inner.snapshot().fullLit);assert.equal(inner.snapshot().shrinkProgress,0);
inner.update(.59);assert.equal(inner.snapshot().shrinkProgress,0,'the fully illuminated field has a visible breath before shrinking');
inner.update(.99);state=inner.snapshot();assert(state.shrinkProgress>.45&&state.shrinkProgress<.55);assert.equal(state.done,false);
inner.update(.98);assert(inner.snapshot().done);assert.equal(inner.snapshot().shrinkProgress,1);assert.equal(inner.snapshot().seedFlight,1);
console.log(JSON.stringify({pass:true,endingSeconds:Ending.duration,innerBreakSeconds:Inner.breakDuration,clicks:3,queuedPosesContinuous:true,pausedClockFrozen:true,finalText:Ending.text}));
