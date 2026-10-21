'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const Factory=require('./docs/factory.js'),Versions=require('./docs/story-versions.js'),{ChaseProgress}=require('./docs/interaction-progress.js');
const file=path.resolve('docs/dimension.js'),box={module:{exports:{}},require:createRequire(file)};
vm.runInNewContext(fs.readFileSync(file,'utf8').replace('return Object.freeze({draw,drawJourney,','return Object.freeze({__project:projection,draw,drawJourney,'),box,{filename:file});
const Dimension=box.module.exports,viewport={w:1280,h:760},time=131.7,base=Factory.frame(time),camera=Versions.get('routine').camera.pose(time);
const layout=drive=>Dimension.journeyView(time,camera,viewport,{...base,chase:{...base.chase,holdGate:true,inputRate:drive.rate,finishing:drive.finishing}});
const run=(controller,seconds,held)=>{for(let i=0;i<Math.round(seconds*60);i++)controller.update(1/60,{held});return controller.snapshot();};
const gate=new ChaseProgress({raw:time}),slow=layout(gate.snapshot()),fast=layout(run(gate,2,true));
assert(fast.view.zoom>slow.view.zoom*1.3,'fast and slow states have different projected sizes');
assert(fast.view.tilt>slow.view.tilt+.5,'holding changes the camera angle, not just object speed');
assert(fast.view.focal/fast.view.zoom<slow.view.focal/slow.view.zoom*.6,'the sprint moves the camera closer');
assert(Math.hypot(fast.view.x-slow.view.x,fast.view.y-slow.view.y)>40,'the camera focus moves from the open lead to the close follow');
assert(Math.abs(fast.view.yaw-slow.view.yaw)>.15,'the camera heading follows the perspective change');
const projectedSize=l=>Dimension.__project(l.view,viewport)([...l.state.center.slice(0,2),4])[3];
assert(projectedSize(fast)>projectedSize(slow)*1.3,'the same body and reference vertices grow under the faster lens');
let previous=fast.view;
for(let i=0;i<120;i++){
  const current=layout(gate.update(1/60,{held:false})).view;
  assert(Math.abs(current.tilt-previous.tilt)<.09&&Math.abs(current.zoom-previous.zoom)<.04,'release has no frame-sized camera cut');previous=current;
}
const returned=layout(gate.snapshot()).view;
for(const key of['x','y','yaw','zoom','tilt','focal'])assert(Math.abs(returned[key]-slow.view[key])<.0001,'release returns '+key+' to the slow camera before the lock');
assert.equal(gate.snapshot().raw,time,'returning the lens never rewinds forward story travel');
const locked=new ChaseProgress({raw:time});run(locked,4.5,true);assert(locked.snapshot().finishing);
const committed=layout(locked.snapshot()).view,afterRelease=layout(run(locked,.8,false)).view;
for(const key of['zoom','tilt','focal'])assert.equal(afterRelease[key],committed[key],'a full ring keeps '+key+' in the fast state after release');
for(const version of['routine','rhythm']){
  let previous;
  for(let t=121.99;t<=122.01;t+=.0001){
    const data=Factory.frame(t),view=Dimension.journeyView(t,Versions.get(version).camera.pose(t),viewport,data).view;
    if(previous){assert(Math.hypot(view.x-previous.x,view.y-previous.y)<.5,'the invitation focus joins the follow without the old 122-second jump');assert(Math.abs(view.yaw-previous.yaw)<.001);}
    previous=view;
  }
}
console.log('Reversible chase focus, angle, distance and projected size; continuous invitation join; full-ring lens lock passed.');
