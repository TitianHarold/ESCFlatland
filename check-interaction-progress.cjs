'use strict';
const assert=require('node:assert/strict');
const{WorkProgress,ChaseProgress,PaintPeel}=require('./docs/interaction-progress.js');
function run(controller,seconds,options={}){
  for(let i=0;i<Math.round(seconds*60);i++)controller.update(1/60,options);
  return controller.snapshot();
}

const work=new WorkProgress();
assert.equal(run(work,30).raw,98,'idle work must not advance the story');
work.click();
assert.equal(work.snapshot().raw,98,'click sets a destination without teleporting');
let ws=run(work,2);
assert.equal(ws.raw,98.75);
assert.equal(run(work,30).raw,98.75,'completed click stays put indefinitely');
for(let i=0;i<6;i++)work.click();
assert.equal(run(work,2).complete,false,'seven clicks cannot complete eight steps');
work.click();
ws=run(work,1.1);assert.equal(ws.zoom,1);assert.equal(ws.phase,'fade');assert(ws.darkness>0,'reaching the furthest view automatically starts a continuous fade');
const dark=ws.darkness;assert(run(work,1).darkness>dark,'fade continues without more clicks');assert(run(work,5).complete);
const fast=new WorkProgress({raw:104}),slow=new WorkProgress({raw:104});assert.equal(fast.snapshot().phase,'fade');for(let i=0;i<12;i++){const before=fast.snapshot().darkness;fast.click();assert.equal(fast.snapshot().darkness,before);run(fast,.12);run(slow,.12);}assert(fast.snapshot().darkness>slow.snapshot().darkness,'frequent clicks smoothly accelerate the automatic fade');
work.seek(104);assert.equal(work.snapshot().target,1);assert.equal(work.snapshot().phase,'fade');const frozen=work.snapshot();work.update(.1,{advance:false});assert.deepEqual(work.snapshot(),frozen);

const chase=new ChaseProgress();
let cs=run(chase,60);
assert.equal(cs.complete,false,'unattended chase cannot enter the white ending');
assert.equal(cs.raw,131.7);
const idleTravel=cs.travel;
cs=run(chase,3);
assert(cs.travel>idleTravel,'reference motion must continue at the final gate');
assert.equal(cs.charge,0);
assert.equal(cs.rate,.32);

chase.seek(119);
cs=run(chase,2,{held:true});
const partialRaw=cs.raw;
assert(cs.rate>2,'holding is visibly faster than coasting');
assert.equal(cs.complete,false);
cs=run(chase,.6,{held:false});
assert(cs.charge<1e-8,'release empties the ring in about .6 seconds');
assert(cs.raw>=partialRaw,'release must never rewind the scene');
const coasting=cs.rate;
cs=run(chase,2,{held:false});
assert(cs.rate<coasting&&cs.rate>.31,'release returns smoothly to basic motion');
cs=run(chase,4.4,{held:true});
assert.equal(cs.complete,false,'only a full uninterrupted charge unlocks the ending');
cs=run(chase,.1,{held:true});
assert.equal(cs.finishing,true);assert.equal(cs.complete,false,'a full ring starts the final peeling burst');
const peel=new PaintPeel();peel.click();run(peel,.7);assert.equal(peel.snapshot().filter(v=>v===1).length,1);peel.finish();
run(peel,1.6);assert(peel.snapshot().every(v=>v===1),'the final burst removes every remaining panel in sequence');
cs=run(chase,1.7,{held:false});
assert.equal(cs.complete,true);
assert.equal(cs.raw,132);
assert.equal(cs.charge,1);
assert.deepEqual(chase.update(.1,{held:false}),cs,'completion is stable');
chase.seek(131.9);
assert(chase.update(.1).raw>=131.9,'a late review seek must not jump backwards to the gate');
console.log('interactive work and hold progression: passed');
