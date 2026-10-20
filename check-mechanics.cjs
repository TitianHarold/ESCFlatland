'use strict';
const assert=require('node:assert/strict');
const Factory=require('./docs/factory.js');
const hero=time=>Factory.frame(time).actors.find(entry=>entry.id==='hero');
const program=Factory.pressProgram;

assert.equal(program.cycleCount,2);
assert.equal(program.cycles.length,2);
let previousLoad=0;
const normal=[-Math.sin(Factory.anchors.localRotation),Math.cos(Factory.anchors.localRotation)];
for(const cycle of program.cycles){
  const before=hero(cycle.contactTime-.001),start=hero(cycle.start);
  assert(!before.contact&&before.force===0&&before.impact===0);
  assert.equal(before.load,start.load,'no extra loading before this round touches');
  assert.equal(before.damage,start.damage,'previous round damage survives windup');
  const hit=hero(cycle.contactTime);
  assert(hit.contact&&hit.impact===1&&hit.cycle===cycle.index);
  assert(Math.abs(hit.machine.upperGap)<1e-8&&Math.abs(hit.machine.lowerGap)<1e-8,'both heads touch together');
  assert.equal(hit.damage,before.damage,'damage starts after real contact');
  assert(hero(cycle.closeEnd).force>.999,'each round loads rapidly');
  assert.equal(hero(cycle.contactTime+.3).impact,0,'one impact per round, no bounce');
  assert(hero(cycle.strikeStart).machine.plannedGap>start.machine.plannedGap,'windup opens');
  assert(before.machine.plannedGap<hero(cycle.strikeStart).machine.plannedGap,'strike closes fast');
  for(const time of [cycle.contactTime,cycle.closeEnd,cycle.holdEnd,cycle.end]){
    const entry=hero(time),body=entry.body,machine=entry.machine;
    assert(entry.load>=previousLoad-1e-10);previousLoad=entry.load;
    assert.equal(body.sx,1);assert.equal(body.sy,1);assert.equal(body.bend,0);
    assert(body.edgeBends.every(value=>value===0));
    for(const [x,y] of entry.actor.outline(body)){
      const support=(x-body.x)*normal[0]+(y-body.y)*normal[1];
      assert(support>=machine.upperFace-1e-8&&support<=machine.lowerFace+1e-8,'shell never penetrates a head');
    }
  }
  assert(!hero(cycle.end).contact,'each round fully retracts');
}
assert.equal(hero(program.contactTime-.001).damage,0);
assert(hero(program.end).damage>hero(program.cycles[0].end).damage,'second round adds real damage');
assert.equal(hero(program.end).completedCycles,2);
assert(program.end<77,'both full rounds finish before conveyor departure');
assert.equal(hero(77).damage,hero(87).damage,'release cannot heal the inner window');

const initialAngle=hero(80).body.angle;
for(const time of [80,80.14,80.28,81,84,86.75,86.9,87]){
  const entry=hero(time);
  assert(Math.abs(entry.body.angle-initialAngle-entry.spin.angle)<1e-8,'visible angle follows the same spin');
  assert.equal(entry.turns,entry.mixDose,'all twelve real turns contribute to dose');
  assert(Math.abs(entry.spin.angle-entry.turns*Math.PI*2)<1e-10);
}
assert.equal(hero(80).angularSpeed,0);assert(hero(80.28).angularSpeed>11);
assert.equal(hero(87).angularSpeed,0);assert.equal(hero(87).turns,12);
assert(hero(94.5).windowOpen>.5);assert.equal(hero(94.5).label,'reject');
for(const row of [0,1,3,4,10,14]){
  const entry=Factory.frame(64-row*.83+22.1).actors.find(actor=>actor.row===row&&actor.slot===0);
  assert.equal(entry.result,'pass');assert.equal(entry.blacken,1);assert.equal(entry.windowOpen,0);
  assert.equal(entry.cavity,false);assert.equal(entry.label,undefined);assert.equal(entry.turns,12);
  assert.equal(entry.cycleCount,2);assert.equal(entry.completedCycles,2);
}
assert.equal(Factory.frame(132).hero,null);assert.equal(Factory.frame(132).chase,undefined);
console.log(JSON.stringify({pass:true,cycles:program.cycles,contacts:program.contactTimes,turns:12,damageAfterFirst:hero(program.cycles[0].end).damage,damageAfterSecond:hero(program.end).damage,heroWindowOpen:hero(94.5).windowOpen,heroResult:hero(94.5).result}));
