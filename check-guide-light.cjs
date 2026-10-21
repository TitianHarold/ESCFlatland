'use strict';
const assert=require('node:assert/strict');
const {createCanvas,Path2D,DOMMatrix}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.Path2D=Path2D;global.DOMMatrix=DOMMatrix;
const Factory=require('./docs/factory.js'),Routine=require('./docs/factory-routine.js'),Dimension=require('./docs/dimension.js');
let samples=0,largestStep=0;
for(const factory of[Factory,Routine]){
  let previous;
  for(let t=119;t<122.05;t+=.002){
    const frame=factory.frame(t),entry=frame.actors.find(e=>e.id==='hero'),light=Dimension.seedLight(t,entry,frame.light);
    assert.equal(light.entityId,'hero-seed');
    if(t<=119.6)assert(light.inside,'the only seed remains in the body until its flight starts');
    if(previous){const distance=Math.hypot(light.x-previous.x,light.y-previous.y);largestStep=Math.max(largestStep,distance);assert(distance<1,'body-to-guide flight is continuous');}
    previous=light;samples++;
  }
}
const side=[];
for(let t=122;t<=129;t+=.05){const light=Factory.frame(t).light,heading=light.guideHeading,offset=light.guideOffset;side.push(-Math.sin(heading)*offset[0]+Math.cos(heading)*offset[1]);}
assert(Math.max(...side)-Math.min(...side)>45,'the guide banks gently to both world sides');
for(const viewport of[{w:1280,h:760},{w:760,h:1280}]){
  const camera={...Factory.anchors.discard,tilt:0,yaw:1.0664437894592371},time=131.7,base=Factory.frame(time),positions=[];
  for(let extra=0;extra<=4;extra+=.05){
    const data={...base,chase:{...base.chase,holdGate:true,charge:0,baseTravel:time-119,travel:time-119+extra}};
    const point=Dimension.journeyLightPoint(time,camera,viewport,data);assert(point&&point.every(Number.isFinite));
    assert(point[0]>0&&point[0]<viewport.w&&point[1]>0&&point[1]<viewport.h,'the circling world guide remains visible');positions.push(point);
  }
  assert(Math.max(...positions.map(p=>p[0]))-Math.min(...positions.map(p=>p[0]))>10*Math.min(viewport.w/1280,viewport.h/760),'the guide keeps drifting while the held story gate waits at the viewport scale');
  const timeNear=131.99999,frame=Factory.frame(timeNear),near=Dimension.journeyLightPoint(timeNear,camera,viewport,frame),end=Dimension.endingLight(132,viewport);
  assert(Math.hypot(near[0]-end.x,near[1]-end.y)<.001,'the same guide joins the hand POV without a position jump');
}
const canvas=createCanvas(128,128),ctx=canvas.getContext('2d');Dimension.paintSeedGlow(ctx,64,64,8);
const image=ctx.getImageData(0,0,128,128),pixel=x=>Array.from(image.data.slice((64*128+x)*4,(64*128+x)*4+4));
let previous=256;
for(const radius of[0,3,7,12,20,28,34,38]){const rgba=pixel(64+radius);assert(rgba[3]<=previous,'the glow fades smoothly from its bright core');previous=rgba[3];}
assert(pixel(64)[0]>250&&pixel(64)[1]>245,'the core is bright warm white');assert.equal(pixel(102)[3],0,'the gold halo has a transparent edge');
const arrival=createCanvas(128,128);Dimension.paintArrivalLight(arrival.getContext('2d'),[64,64,0,1],119,8,128,128,true);assert.deepEqual(arrival.getContext('2d').getImageData(0,0,128,128).data,image.data,'the enclosed seed uses exactly the same soft visual');
console.log(JSON.stringify({samples,largestWorldStep:largestStep,worldSideRange:Math.max(...side)-Math.min(...side),heldGateFloats:true,whitePOVContinuous:true,softRadialGlow:true}));
