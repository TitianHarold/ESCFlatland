'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const Motion=require('./docs/motion.js'),Factory=require('./docs/factory.js'),Dimension=require('./docs/dimension.js'),Rules=require('./docs/correction-rules.js');
const rest={axialStretch:0,strain:0,perspectiveStretch:1};
assert.deepEqual(Motion.speedShape(0),rest);
assert.deepEqual(Motion.speedShape(NaN),rest);
assert.deepEqual(Motion.speedShape(-1600),Motion.speedShape(1600));
const chaseData=Factory.frame(130),coast=Dimension.journeyView(130,{}, {w:1280,h:760},{...chaseData,chase:{...chaseData.chase,holdGate:true,inputRate:.32}}).view;
const sprint=Dimension.journeyView(130,{}, {w:1280,h:760},{...chaseData,chase:{...chaseData.chase,holdGate:true,inputRate:4.2}}).view;
assert(coast.tilt<.15&&sprint.tilt>.8,'coasting uses an open low-speed perspective');assert(coast.focal>sprint.focal*2&&coast.zoom<sprint.zoom,'the close foreshortened lens belongs to sprinting');
let previous=rest;
for(let speed=1;speed<=15000;speed+=17){
  const shape=Motion.speedShape(speed);
  for(const key of Object.keys(shape))assert(shape[key]>previous[key],key+' responds monotonically to actual speed');
  assert(shape.axialStretch<.24&&shape.strain<.75&&shape.perspectiveStretch<3);
  previous=shape;
}
for(const t of[121.99999,122,122.00001]){
  const data=Factory.frame(t),pose=Dimension.journeyPose(t,data);
  assert(Math.abs(pose.sprintStretch-1)<1e-10,'the invitation-to-sprint cut has no preset stretch');
  assert((data.hero.axialStretch||0)<1e-10);
}
assert.equal(Motion.chaseProgress(122).qSpeed,0);
const dt=.0001,before=Motion.chaseProgress(122),after=Motion.chaseProgress(122+dt);
assert((after.qSpeed-before.qSpeed)/dt<.001,'acceleration itself enters continuously from rest');
for(const t of[122.1,122.8,125,130]){
  const data=Factory.frame(t);
  for(const rate of[0,.5,1,1.8]){
    const actual=data.hero.speed*rate,shape=Motion.speedShape(actual),pose=Dimension.journeyPose(t,{...data,chase:{...data.chase,speed:actual,effort:1}});
    assert.equal(pose.raw.axialStretch,shape.axialStretch);assert.equal(pose.raw.strain,shape.strain);
    const total=pose.sprintStretch*(1+.04*shape.strain)*(1+shape.axialStretch);
    assert(Math.abs(total-shape.perspectiveStretch)<1e-12,'actual velocity is the only stretch input, not effort or phase');
  }
}
// Inspect the rendered sheet geometry, rather than a second copy of its response formula.
const file=path.resolve('docs/dimension.js'),box={module:{exports:{}},require:createRequire(file)};
vm.runInNewContext(fs.readFileSync(file,'utf8').replace('return Object.freeze({draw,drawJourney,','return Object.freeze({__arrival:chaseArrivalTime,__deform:deformReference,__reference:referenceDeformation,__flow:referenceFlow,__objects:journeyObjects,__alpha:distanceAlpha,__sheet:apparition,draw,drawJourney,'),box,{filename:file});
const actual=box.module.exports,heading=-.61,c=Math.cos(heading),s=Math.sin(heading),sample=[c*80-s*20,s*80+c*20,9];
const atRest=actual.__deform(sample,heading,actual.__reference(0,60,-1));
assert(atRest.every((n,i)=>Math.abs(n-sample[i])<1e-12),'references have no preset speed distortion at rest');
let stretch=1;
for(const speed of[100,700,1800,4500,12000]){
  const d=actual.__reference(speed,60,-1),p=actual.__deform(sample,heading,d);
  assert(d.stretch>stretch,'reference stretch follows the same continuous actual-speed response');stretch=d.stretch;
  assert(p[0]*c+p[1]*s>80,'the distorted sheet lengthens along its travel direction');
  assert(Math.abs(-p[0]*s+p[1]*c)<20,'the reference contracts across that direction');
}
const sheet=actual.__objects.find(item=>item.index===60),flat=[],fast=[];
actual.__sheet(flat,sheet,128,128,1,0);actual.__sheet(fast,sheet,128,128,1,4500);
assert.equal(flat.length,fast.length,'speed deforms the same curved sheet mesh without replacing it with a solid');
const extent=list=>{const h=sheet.heading,c=Math.cos(h),s=Math.sin(h),values=list.flatMap(face=>face.points.map(p=>(p[0]-sheet.x)*c+(p[1]-sheet.y)*s));return Math.max(...values)-Math.min(...values);};
assert(extent(fast)>extent(flat)*2.5,'actual colored sheet vertices acquire a strong directional smear');
const capTime=131.7,heroAtCap=actual.journeyPose(capTime,Factory.frame(capTime)).center;
const ahead=actual.__objects.find(item=>item.index===120),baseTravel=capTime-119;
const first=actual.__flow(ahead,heroAtCap,capTime,{chase:{travel:baseTravel,baseTravel}}),next=actual.__flow(ahead,heroAtCap,capTime,{chase:{travel:baseTravel+.001,baseTravel}});
assert(Math.hypot(next.x-first.x,next.y-first.y)>1,'references keep moving when narrative progress waits for the hold');
for(const extra of[1,5,20,100]){
  const visible=actual.__objects.map(item=>actual.__flow(item,heroAtCap,capTime,{chase:{travel:baseTravel+extra,baseTravel}})).filter(item=>actual.__alpha([item.x,item.y],heroAtCap)>.1);
  assert(visible.length>=4,'continued low-speed travel never runs out of reference shapes');
}
for(const charge of[0,.4,.8])assert.equal(actual.__arrival(131.7,{chase:{holdGate:true,charge}}),131,'an unfinished hold does not bleach the waiting chase');
assert(actual.__arrival(131.7,{chase:{holdGate:true,charge:.9}})>131);
assert.equal(actual.__arrival(131.7,{chase:{holdGate:true,charge:1}}),131.7);
assert.equal(actual.__arrival(131.7,{chase:{}}),131.7,'automatic playback retains its authored white transition');
// Resistance clones only the hero and tapers to zero before every machinery contact.
let windows=0;
for(let t=69;t<98;t+=.007){
  const source=Factory.frame(t),original={...source.hero},w=Factory.resistanceWindow(t),result=Factory.withResistance(source,1000,t);
  assert(result.appliedOffset>=0&&result.appliedOffset<=240+1e-9);
  assert.deepEqual(source.hero,original,'an input reaction cannot mutate cached animation poses');
  assert.equal(result.actors.find(e=>e.id==='hero').body,result.hero,'the renderer and collision silhouette share one body');
  assert.equal(result.hero.angle,source.hero.angle,'backward transport must never turn the child around');
  if(result.appliedOffset){
    windows++;
    const dx=result.hero.x-source.hero.x,dy=result.hero.y-source.hero.y;
    assert(Math.abs(dx*w.tangent.y-dy*w.tangent.x)<1e-9,'resistance stays on the conveyor lane');
    const next=Factory.frame(t+.0001).hero,forward={x:next.x-source.hero.x,y:next.y-source.hero.y};
    if(Math.hypot(forward.x,forward.y)>1e-7)assert(dx*forward.x+dy*forward.y<0,'resistance moves against the actual transport direction in every window');
    if(t>=70&&t<77){
      const angle=Factory.anchors.localRotation,c=Math.cos(angle),s=Math.sin(angle),origin=Factory.anchors.factoryCenter;
      const points=result.actors.find(e=>e.id==='hero').actor.outline(result.hero).map(([x,y])=>[(x-origin.x)*c+(y-origin.y)*s,-(x-origin.x)*s+(y-origin.y)*c]);
      Factory.pressProgram.programs.forEach((program,i)=>{
        const press=Rules.pressState(program,t),station=[480,145,-190,-525][i];
        const inside=points.filter(p=>p[0]>station-76&&p[0]<station+76);
        for(const point of inside)assert(point[1]>=130+press.upperFace-1e-6&&point[1]<=130+press.lowerFace+1e-6,'reverse motion cannot enter a real press pad');
      });
    }
  }
  if(source.actors.find(e=>e.id==='hero').contact)assert.equal(result.appliedOffset,0,'a live pressure contact cannot be displaced');
}
assert(windows>100,'plain transport spaces remain playable');
for(const program of Factory.pressProgram.programs){
  for(const t of[program.arrivalTime,program.contactTime,program.clearTime])assert.equal(Factory.withResistance(Factory.frame(t),100,t).appliedOffset,0);
}
// The forward chase already faces the route; resistance cannot leak into this phase.
for(let t=122.05;t<131.95;t+=.1){
  const source=Factory.frame(t),next=Factory.frame(t+.001),entry=source.actors.find(e=>e.id==='hero'),heading=entry.body.angle+entry.actor.headAxis(entry.body).angle;
  const dx=next.hero.x-source.hero.x,dy=next.hero.y-source.hero.y;
  assert(dx*Math.cos(heading)+dy*Math.sin(heading)>0,'the chase keeps facing its forward travel');
  assert.deepEqual(Factory.withResistance(source,340,t).hero,source.hero,'factory resistance cannot rotate or displace the chase');
}
console.log('One smooth actual-speed response, continuous launch, no double stretch and heading-preserving reverse conveyor travel passed.');
