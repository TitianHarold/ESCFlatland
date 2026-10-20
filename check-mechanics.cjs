'use strict';
const assert=require('node:assert/strict');
const Factory=require('./docs/factory.js');
const Rules=require('./docs/correction-rules.js');
const Characters=require('./docs/character-geometry.js');
const hero=time=>Factory.frame(time).actors.find(entry=>entry.id==='hero');
const program=Factory.pressProgram,normal=[-Math.sin(Factory.anchors.localRotation),Math.cos(Factory.anchors.localRotation)];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];

assert.equal(program.cycleCount,4);
assert.equal(Factory.anchors.pressStations.length,4);
let previousLoad=0;
for(const [index,cycle] of program.cycles.entries()){
  const unit=program.programs[index],start=hero(unit.arrivalTime),before=hero(cycle.contactTime-.001);
  assert.equal(cycle.start,72+index*.5);
  assert.equal(cycle.strikeStart,cycle.start,'arrival immediately starts the downstroke');
  assert.equal(cycle.closeEnd-cycle.start,.5,'half a second down');
  assert.equal(cycle.returnEnd-cycle.closeEnd,3,'three seconds up');
  assert.equal(cycle.end-cycle.returnEnd,1.5,'one and a half seconds waiting at the top');
  assert.equal(unit.period,5);
  assert(Math.hypot(start.body.x-Factory.anchors.pressStations[index].x,start.body.y-Factory.anchors.pressStations[index].y)<1e-8,'the body reaches its station before the contact impulse');
  assert(!before.contact&&before.force===0&&before.impact===0);
  assert.equal(before.load,start.load,'no new damage before actual contact');
  assert.equal(before.damage,start.damage);
  const hit=hero(cycle.contactTime+.000001);
  assert(hit.contact&&hit.impact>.99&&hit.cycle===index+1);
  assert(Math.abs(hit.machine.upperGap)<1e-8&&Math.abs(hit.machine.lowerGap)<1e-8,'both faces really touch');
  assert(hit.damage>=before.damage);
  assert(hero(cycle.closeEnd).force>.999);
  assert(Rules.pressState(unit,cycle.start+.1).plannedGap<unit.openGap,'no preparatory upward motion');
  assert(!Rules.pressState(unit,cycle.end).contact,'each machine fully retracts');
  assert(Math.hypot(hero(unit.clearTime).body.x-start.body.x,hero(unit.clearTime).body.y-start.body.y)<1e-8,'transport waits for full shell clearance');
  assert(Math.hypot(hero((unit.clearTime+cycle.returnEnd)/2).body.x-start.body.x,hero((unit.clearTime+cycle.returnEnd)/2).body.y-start.body.y)>10,'transport moves during the upstroke');
}
assert(program.programs.filter(unit=>Rules.pressState(unit,73.6).operationPhase==='rising').length>=2,'multiple presses return simultaneously while the next press closes');
for(let time=72;time<77;time+=.01){
  const entry=hero(time),body=entry.body;
  assert(entry.load>=previousLoad-1e-10);previousLoad=entry.load;
  assert.equal(body.sx,1);assert.equal(body.sy,1);assert.equal(body.bend,0);
  assert(body.edgeBends.every(value=>value===0),'shell stays rigid');
  const points=entry.actor.outline(body);
  for(const [index,unit] of program.programs.entries()){
    const machine=Rules.pressState(unit,time),center=Factory.anchors.pressStations[index];
    // A moving shell may leave a head laterally only after the transverse gap clears it.
    const along=[Math.cos(Factory.anchors.localRotation),Math.sin(Factory.anchors.localRotation)];
    for(const point of points){
      const relative=[point[0]-center.x,point[1]-center.y];
      if(Math.abs(dot(relative,along))>68)continue;
      const support=dot(relative,normal);
      assert(support>=machine.upperFace-1e-8&&support<=machine.lowerFace+1e-8,'shell never penetrates any of the four pads');
    }
  }
}
assert.equal(hero(program.contactTime-.001).damage,0);
assert.equal(hero(77).completedCycles,4);
assert(hero(77).damage>hero(program.programs[0].clearTime).damage,'all stations accumulate damage');
assert.equal(hero(77).damage,hero(87).damage,'transfer and spin cannot heal damage');
const initialAngle=hero(80).body.angle;
for(const time of [80,80.14,80.28,81,84,86.75,86.9,87]){
  const entry=hero(time);
  assert(Math.abs(entry.body.angle-initialAngle-entry.spin.angle)<1e-8);
  assert.equal(entry.turns,entry.mixDose);
}
assert.equal(hero(87).turns,12);
assert(hero(94.5).windowOpen>.01);assert.equal(hero(94.5).label,'reject');
for(const row of [0,1,3,4,10,14]){
  const entry=Factory.frame(64-row*.83+22.1).actors.find(actor=>actor.row===row&&actor.slot===0);
  assert.equal(entry.result,'pass');assert.equal(entry.blacken,1);assert.equal(entry.windowOpen,0);
  assert.equal(entry.cavity,false);assert.equal(entry.label,undefined);assert.equal(entry.turns,12);
  assert.equal(entry.cycleCount,4);assert.equal(entry.completedCycles,4);
}
for(const row of [0,1,3,4]){
  const at=age=>Factory.frame(64-row*.83+age).actors.find(actor=>actor.row===row&&actor.slot===0).body;
  const a=at(10-.000001),b=at(10);assert(Math.hypot(a.x-b.x,a.y-b.y)<.01,'workers continue from the same safe transfer point');
}
for(let time=64;time<104;time+=.25){
  const actors=Factory.frame(time).actors.filter(entry=>entry.row!==undefined);
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)if(actors[i].row===actors[j].row){
    assert(!Characters.penetrates(actors[i].actor.outline(actors[i].body),actors[j].actor.outline(actors[j].body)),'workers never overlap while waiting or moving through the same four presses');
  }
}
assert.equal(Factory.frame(132).hero,null);
console.log(JSON.stringify({pass:true,presses:4,phaseInterval:.5,cycle:5,down:.5,up:3,upperWait:1.5,contacts:program.contactTimes,heroWindowOpen:hero(94.5).windowOpen,heroResult:hero(94.5).result}));
