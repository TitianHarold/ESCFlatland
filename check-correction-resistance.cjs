'use strict';
const assert=require('node:assert/strict');
const F=require('./docs/factory-routine.js');
const hero=t=>F.frame(t).actors.find(e=>e.id==='hero');
const reset=()=>F.setNodeResistance(null);
function step(input,t,seconds,{held=false}={}){let state;for(let i=0;i<Math.round(seconds*100);i++)state=input.update(.01,{time:t,held});F.setNodeResistance(state);return state;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// A click chooses a real face from its world direction, then that face traps the child.
const t=71.72,original=hero(t),points=original.routine.vertices;
let maxEscape=0;
for(let edge=0;edge<points.length;edge++){
  reset();const input=new F.NodeResistance(),body=hero(t).body,a=points[edge],b=points[(edge+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const nx=(b[1]-a[1])/length,ny=-(b[0]-a[0])/length,c=Math.cos(body.angle),s=Math.sin(body.angle);
  const target={x:body.x+180*(nx*c-ny*s),y:body.y+180*(nx*s+ny*c)};
  assert(input.press(t,target));assert.equal(input.snapshot(t).edge,edge);
  let previous=body;
  for(let i=0;i<44;i++){
    F.setNodeResistance(input.update(.01,{time:t,held:false}));const moved=hero(t).body;
    assert(distance(previous,moved)<1.5,'the attempted escape begins slowly, with no instant position jump');
    assert.equal(moved.angle,body.angle,'running toward a side never spins the child');previous=moved;
  }
  const escaped=hero(t),escape=distance(body,escaped.body);assert(escape>22&&escape<=24);maxEscape=Math.max(maxEscape,escape);
  const dx=escaped.body.x-body.x,dy=escaped.body.y-body.y;assert(dx*(target.x-body.x)+dy*(target.y-body.y)>0,'the escape points toward the clicked world side');
  const closing=step(input,t,.06),face=hero(t).routine.mold.faces[edge];assert(closing.closing>.4&&closing.closing<.6);assert(face.gap<18);
  step(input,t,.07);const trapped=hero(t);assert(distance(trapped.body,body)<1e-8);assert(trapped.routine.mold.faces[edge].locked);assert.equal(trapped.routine.mold.faces[edge].gap,0);
  assert(input.snapshot(t).impact>0,'the closing edge has a brief visible impact');
  const snapshot=input.snapshot(t);input.update(.5,{time:t,advance:false,held:true});assert.deepEqual(input.snapshot(t),snapshot,'pause freezes the attempted escape and clamp response');
}

// Holding at compaction deforms the child around its existing center and tightens the fixed die.
reset();const compactTime=78.9,baseline=hero(compactTime),input=new F.NodeResistance();input.press(compactTime,{x:0,y:0});step(input,compactTime,.6,{held:true});
const compact=hero(compactTime);assert.equal(compact.body.x,baseline.body.x);assert.equal(compact.body.y,baseline.body.y);assert.equal(compact.body.angle,baseline.body.angle);
assert(compact.body.axialStretch<-.12);assert(compact.body.bend>.19);assert(compact.routine.compacting.clearance<baseline.routine.compacting.clearance*.05,'the die closes around the active struggle');
const firstBends=[...compact.body.edgeBends];step(input,compactTime,.18,{held:true});assert.notDeepEqual(hero(compactTime).body.edgeBends,firstBends,'the outline keeps swaying inside the stable die');
input.release();step(input,compactTime,1);assert(hero(compactTime).routine.resistance.level<.001);

// Rotation is resisted during each indexed turn, then the fixed nozzle still paints that edge.
reset();const turnTime=83.2+2.16*.25,paintBase=hero(turnTime),paintInput=new F.NodeResistance();paintInput.press(turnTime);step(paintInput,turnTime,.5,{held:true});
const resisting=hero(turnTime),before=F.paintAt(turnTime-.01,5).angle,after=F.paintAt(turnTime+.01,5).angle;
assert(Math.abs(resisting.body.angle-paintBase.body.angle)>.2);assert((resisting.body.angle-paintBase.body.angle)*(after-before)<0,'twist opposes the actual machine turn');
assert.equal(resisting.body.x,paintBase.body.x);assert.equal(resisting.body.y,paintBase.body.y);
for(let side=0;side<5;side++){
  const spray=83.2+(side+.82)*2.16;reset();const normal=hero(spray);F.setNodeResistance(paintInput.update(.01,{time:spray,held:true}));const held=hero(spray);
  assert.equal(held.body.angle,normal.body.angle,'the machine overcomes the twist before the fixed spray starts');
  assert.equal(held.routine.paint.filter(v=>v===1).length,side+1);
}

// Depletion comes from completing the three operations, independent of click count or holds.
reset();for(const[time,count]of[[71.7,0],[76.69,0],[76.7,1],[81.59,1],[81.6,2],[93.99,2],[94,3]]){
  const progress=F.nodeProgress(time);assert.equal(progress.completedNodes,count);assert.equal(progress.redFraction,count/3);
  for(let i=0;i<12;i++){paintInput.press(time);paintInput.update(.01,{time,held:true});}
  assert.equal(paintInput.snapshot(time).redFraction,count/3);
}
paintInput.reset();assert.equal(paintInput.snapshot(0).redFraction,0);reset();
console.log(JSON.stringify({pass:true,clickedFaces:5,maxEscape,stableCompactionCenter:true,opposedIndexedRotation:true,redFractions:[0,1/3,2/3,1],conveyorClockUntouched:true}));
