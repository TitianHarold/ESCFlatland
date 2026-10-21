'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const Factory=require('./docs/factory.js');
const file=path.resolve('docs/dimension.js'),box={module:{exports:{}},require:createRequire(file)};
vm.runInNewContext(fs.readFileSync(file,'utf8').replace('return Object.freeze({draw,drawJourney,','return Object.freeze({__view:journeyView,__project:projection,__flow:referenceFlow,__objects:journeyObjects,__alpha:distanceAlpha,__route:journeyRoutePoint,draw,drawJourney,'),box,{filename:file});
const D=box.module.exports;let minimum=Infinity,samples=0;
for(const viewport of[{w:1280,h:760},{w:760,h:1280},{w:1719,h:1512}])for(const time of[129.8,130.5,131,131.7,131.95])for(const extra of[null,0,.2,.5,1,2,5,20,100]){
  const base=Factory.frame(time),data=extra===null?base:{...base,chase:{...base.chase,speed:base.chase.speed*1.8,baseTravel:time-119,travel:time-119+extra,holdGate:true,charge:.6}},layout=D.__view(time,{},viewport,data),project=D.__project(layout.view,viewport),counts={'-1':0,'1':0};
  for(const original of D.__objects){
    const item=D.__flow(original,layout.state.center,time,data),point=project([item.x,item.y,22]);
    if(D.__alpha([item.x,item.y],layout.state.center)>.05&&point&&point[0]>0&&point[0]<viewport.w&&point[1]>0&&point[1]<viewport.h)counts[item.side]++;
  }
  for(const side of[-1,1]){assert(counts[side]>=3,'both real world lanes remain projected inside the viewport at '+JSON.stringify({viewport,time,extra,side,counts}));minimum=Math.min(minimum,counts[side]);}samples++;
}
// Recycling changes the path coordinate, never the lateral membership of a pair.
const time=131.7,hero=D.journeyPose(time,Factory.frame(time)).center;
for(const original of D.__objects)for(const extra of[1,10,100]){
  const item=D.__flow(original,hero,time,{chase:{baseTravel:time-119,travel:time-119+extra}});
  const mate=D.__objects.find(o=>o.index===original.index&&o.side===-original.side),other=D.__flow(mate,hero,time,{chase:{baseTravel:time-119,travel:time-119+extra}}),dx=item.x-other.x,dy=item.y-other.y;
  assert(Math.abs(dx*Math.cos(item.heading)+dy*Math.sin(item.heading))<1e-7,'repeated pairs share one cross section of the curved route');
  assert((-dx*Math.sin(item.heading)+dy*Math.cos(item.heading))*item.side>0,'a repeated reference keeps its original world side');
}
console.log(JSON.stringify({samples,minimumVisibleReferencesPerSide:minimum,worldLanesPreserved:true,viewports:['landscape','portrait','wide workbench'],modes:['automatic','held loop']}));
