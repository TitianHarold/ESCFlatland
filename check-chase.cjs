'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const Motion=require('./docs/motion.js'),Factory=require('./docs/factory.js'),Dimension=require('./docs/dimension.js');
const hero=t=>Factory.frame(t).hero;
let length=0;for(let i=1;i<=200;i++){const a=hero(122+(i-1)/20),b=i===200?Factory.anchors.chaseEnd:hero(122+i/20);length+=Math.hypot(b.x-a.x,b.y-a.y);}
const oldAverage=length/4.75/10;
let previous=0;
for(let t=122;t<131.99;t+=.05){
  const data=Factory.frame(t),b=Factory.frame(t+.01).hero,a=data.hero,speed=data.chase.speed;
  assert(speed>=previous,'sprint speed increases continuously');previous=speed;
  if(t>=122.8)assert(speed>oldAverage*3,'after the smooth .8-second launch the sprint exceeds three times the former cruise');
  if(t>122.001)assert(b.x>a.x&&b.y<a.y,'both diagonal coordinates move together');
  const pose=Dimension.journeyPose(t,data),shape=Motion.speedShape(speed);
  assert(Math.abs(pose.sprintStretch*(1+.04*pose.raw.strain)*(1+pose.raw.axialStretch)-shape.perspectiveStretch)<1e-12,'the projected total applies the one speed response exactly once');
  const light=data.light;assert(Math.hypot(light.x-a.x,light.y-a.y)<=142,'light lead is a world distance, never a fraction of the longer route');
}
assert.equal(Motion.chaseProgress(122).q,0);assert.equal(Motion.chaseProgress(132).q,1);
assert.equal(Factory.frame(132).hero,null);assert.equal(Dimension.journeyLightPoint(132),null);
assert(Dimension.journeyPose(131,Factory.frame(131)).sprintStretch>Dimension.journeyPose(123,Factory.frame(123)).sprintStretch);
const viewport={w:1280,h:760},camera={...Factory.anchors.discard,tilt:0,yaw:1.0664437894592371},data=Factory.frame(119),point=Dimension.journeyLightPoint(119,camera,viewport,data);
assert(point&&point.length===4&&point.every(Number.isFinite));
assert(point[0]>0&&point[0]<1280&&point[1]>0&&point[1]<760,'invitation light remains visible before the sprint');
assert.deepEqual(Dimension.journeyLightPoint(119,camera,viewport,data),point,'projection is stable on paused scrubs');
for(const factory of[Factory,require('./docs/factory-routine.js')]){
  let previous;
  for(let t=119;t<=122;t+=.002){
    const frame=factory.frame(t),entry=frame.actors.find(a=>a.id==='hero'),light=Dimension.seedLight(t,entry,frame.light);
    assert.equal(light.entityId,'hero-seed');
    if(t<=119.6){assert(light.inside,'the returning seed stays in the body before flying out');assert(Math.hypot(light.x-entry.body.x,light.y-entry.body.y)<11);}
    if(previous)assert(Math.hypot(light.x-previous.x,light.y-previous.y)<1,'the seed cannot jump from inside to the invitation path');
    previous=light;
  }
  const frame=factory.frame(121.9),light=Dimension.seedLight(121.9,frame.actors.find(a=>a.id==='hero'),frame.light);
  assert(!light.inside);assert.equal(light.x,frame.light.x);assert.equal(light.y,frame.light.y);
}
// Inspect the real world-space visibility gate, without adding diagnostics to the runtime API.
const file=path.resolve('docs/dimension.js'),box={module:{exports:{}},require:createRequire(file)};
vm.runInNewContext(fs.readFileSync(file,'utf8').replace('return Object.freeze({draw,drawJourney,','return Object.freeze({__objects:journeyObjects,__alpha:distanceAlpha,draw,drawJourney,'),box,{filename:file});
const actual=box.module.exports,dwell=[];
for(const index of[30,60,90]){
  const item=actual.__objects.find(item=>item.index===index);let first=Infinity,last=-Infinity;
  for(let t=122;t<132;t+=.01)if(actual.__alpha([item.x,item.y],actual.journeyPose(t,Factory.frame(t)).center)>.1){first=Math.min(first,t);last=Math.max(last,t);}
  const duration=last-first;assert(duration>0&&duration<1,'one abstract object sweeps past in less than a second');
  assert(duration<(2300+950)/oldAverage/3,'one-object residence is more than three times shorter than the former cruise');dwell.push(duration);
}
assert(dwell[2]<dwell[0],'references pass faster later in the same uninterrupted sprint');
console.log(JSON.stringify({pass:true,distanceMultiplier:4.75,launchSpeedMultiplier:Factory.frame(122.8).chase.speed/oldAverage,finalSpeedMultiplier:Factory.frame(131.99).chase.speed/oldAverage,dwellSeconds:dwell,lightAt119:point.slice(0,2),whiteStop:132}));
