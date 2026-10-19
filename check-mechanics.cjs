'use strict';
const assert=require('node:assert/strict');
const Factory=require('./docs/factory.js');
const hero=time=>Factory.frame(time).actors.find(entry=>entry.id==='hero');
const program=Factory.pressProgram;

for(const time of [72,73.5,73.76,73.999]){
  const entry=hero(time);
  assert.equal(entry.contact,false);
  for(const key of ['force','load','damage','impact'])assert.equal(entry[key],0,`${key} before contact`);
}
const hit=hero(74);
assert(hit.contact&&hit.impact===1);
assert(Math.abs(hit.machine.upperGap)<1e-8&&Math.abs(hit.machine.lowerGap)<1e-8,'both heads touch together');
assert.equal(hit.damage,0);
assert(hero(74.08).force>.999,'one fast load after contact');
assert.equal(hero(74.3).impact,0,'one impact, not a repeated bounce');
assert(hero(73.7).machine.plannedGap>hero(72).machine.plannedGap,'windup opens');
assert(hero(73.97).machine.plannedGap<hero(73.76).machine.plannedGap,'release closes fast');

let previousLoad=0;
const normal=[-Math.sin(Factory.anchors.localRotation),Math.cos(Factory.anchors.localRotation)];
for(const time of [74,74.04,74.08,74.5,75.58,76,76.68,77]){
  const entry=hero(time),body=entry.body,machine=entry.machine;
  assert(entry.load>=previousLoad-1e-10);previousLoad=entry.load;
  assert.equal(body.sx,1);assert.equal(body.sy,1);assert.equal(body.bend,0);
  assert(body.edgeBends.every(value=>value===0));
  for(const [x,y] of entry.actor.outline(body)){
    const support=(x-body.x)*normal[0]+(y-body.y)*normal[1];
    assert(support>=machine.upperFace-1e-8&&support<=machine.lowerFace+1e-8,'shell never penetrates a head');
  }
}
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
}
assert.equal(Factory.frame(132).hero,null);assert.equal(Factory.frame(132).chase,undefined);
console.log(JSON.stringify({pass:true,contact:program.contactTime,windup:program.start,strike:program.strikeStart,hold:program.closeEnd,release:program.holdEnd,clear:program.end,turns:12,heroWindowOpen:hero(94.5).windowOpen,heroResult:hero(94.5).result}));
