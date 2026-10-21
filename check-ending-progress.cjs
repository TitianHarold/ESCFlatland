'use strict';
const assert=require('node:assert/strict'),Ending=require('./docs/ending-progress.js');
const run=(session,seconds,options={})=>{for(let i=0;i<Math.round(seconds*100);i++)session.update(.01,options);return session.snapshot();};
assert.equal(Ending.duration,16);
const ending=new Ending.Session();
assert.equal(run(ending,30).phase,'stopped');assert.equal(ending.snapshot().raise,0);assert.equal(ending.snapshot().complete,false);
assert(ending.click());assert.equal(ending.snapshot().raise,0,'a click begins the continuous raise');
let state=run(ending,.6);assert(state.raise>0&&state.raise<1);
state=run(ending,.6);assert.equal(state.phase,'open');assert.equal(state.raise,1);assert.equal(run(ending,10).phase,'open');
assert(ending.click());state=run(ending,.5);assert(state.flex>0&&state.flex<1);assert.equal(state.lightDrop,0);
state=run(ending,.5);assert.equal(state.phase,'half');assert.equal(state.flex,1);assert.equal(run(ending,10).phase,'half');
assert(ending.click());state=run(ending,.8);assert(state.lightDrop>0&&state.lightDrop<1);assert.equal(state.toolsReveal,0,'tools cannot appear before the central light blooms');
const paused=ending.snapshot();ending.update(20,{advance:false,automatic:true});assert.deepEqual(ending.snapshot(),paused,'pause freezes light, pose and story');
const observed=[];for(let i=0;i<1200;i++){const s=ending.update(.01);if(!observed.includes(s.phase))observed.push(s.phase);}
assert.deepEqual(observed,['drop','bloom','reveal','tools']);state=ending.snapshot();assert(state.awaiting&&!state.complete);assert.equal(state.lightOpacity,0);assert.equal(state.toolsReveal,1);assert.equal(state.handsOpacity,1);
assert(ending.click());state=run(ending,.45);assert(state.handsOpacity>0&&state.handsOpacity<1);assert.equal(state.lightOpacity,0);
run(ending,10);state=ending.snapshot();assert(state.complete);assert.equal(state.handsOpacity,0);assert.equal(state.expansion,1);assert.equal(state.textOpacity,1);assert.equal(state.text,'Let’s explore a new dimension');assert.equal('title' in state,false);assert.equal(ending.click(),false);
const queued=new Ending.Session();queued.click();queued.click();queued.click();queued.click();assert.equal(queued.snapshot().phase,'raise');assert.equal(queued.snapshot().raise,0);queued.update(.6);assert(queued.snapshot().raise<1&&queued.snapshot().flex===0,'rapid clicks queue later discoveries without skipping the first pose');
const auto=new Ending.Session();assert.equal(run(auto,15.99,{automatic:true}).complete,false);assert(run(auto,.01,{automatic:true}).complete);assert.equal(auto.snapshot().clicks,4);
const jump=new Ending.Session();jump.update(Ending.duration,{automatic:true});assert(jump.snapshot().complete);
for(const raw of [132,132.1,133,134.2,135,136,137.8,138]){const a=Ending.snapshotAt(raw),b=new Ending.Session().seek(raw).snapshot();assert.deepEqual(a,b);assert(Math.abs(a.raw-raw)<1e-7);}
const Inner=require('./docs/inner-discovery.js'),inner=new Inner.Session(),viewport={w:1280,h:760};
for(let i=0;i<6;i++)inner.collect(i,viewport);
inner.update(1.44);assert(inner.snapshot(viewport).fullLit);assert(inner.snapshot(viewport).awaitingCenter);assert.equal(inner.snapshot(viewport).shrinkProgress,0);
inner.update(20);assert.equal(inner.snapshot(viewport).shrinkProgress,0);assert.equal(inner.snapshot(viewport).done,false);
const center=inner.snapshot(viewport).center;assert(inner.tap(center.x,center.y,viewport));inner.update(.98);state=inner.snapshot(viewport);assert(state.shrinkProgress>.49&&state.shrinkProgress<.51);inner.update(.98);assert(inner.snapshot(viewport).done);assert.equal(inner.snapshot(viewport).seedFlight,1);
console.log(JSON.stringify({pass:true,endingSeconds:Ending.duration,innerBreakSeconds:Inner.breakDuration,clicks:4,thirdClickWaitsForFourth:true,pausedClockFrozen:true,finalText:Ending.text}));
