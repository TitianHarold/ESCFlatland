'use strict';
const assert=require('node:assert/strict');
const Motion=require('./docs/motion.js'),Factory=require('./docs/factory.js'),Dimension=require('./docs/dimension.js'),Rules=require('./docs/correction-rules.js');
const rest={axialStretch:0,strain:0,perspectiveStretch:1};
assert.deepEqual(Motion.speedShape(0),rest);
assert.deepEqual(Motion.speedShape(NaN),rest);
assert.deepEqual(Motion.speedShape(-1600),Motion.speedShape(1600));
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
// Resistance clones only the hero and tapers to zero before every machinery contact.
let windows=0;
for(let t=69;t<98;t+=.007){
  const source=Factory.frame(t),original={...source.hero},w=Factory.resistanceWindow(t),result=Factory.withResistance(source,1000,t);
  assert(result.appliedOffset>=0&&result.appliedOffset<=110+1e-9);
  assert.deepEqual(source.hero,original,'an input reaction cannot mutate cached animation poses');
  assert.equal(result.actors.find(e=>e.id==='hero').body,result.hero,'the renderer and collision silhouette share one body');
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
console.log('One smooth actual-speed response, continuous launch, no double stretch and contact-safe conveyor reaction passed.');
