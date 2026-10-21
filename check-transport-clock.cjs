'use strict';
const assert=require('node:assert/strict'),A=require('./docs/factory.js'),B=require('./docs/factory-routine.js'),V=require('./docs/story-versions.js'),{Actions}=require('./docs/action-input.js');
const along=(body,factory)=>body.x*Math.cos(factory.anchors.localRotation)+body.y*Math.sin(factory.anchors.localRotation);
for(const [factory,id,end]of[[A,'rhythm',70],[B,'routine',67.4]]){
  const start=factory.frame(64).hero,last=factory.frame(end).hero;
  assert(Math.abs(along(start,factory)-along(last,factory)-200)<1e-7,'the hero travels during the whole overview');
  let before=start;for(let t=64.02;t<=end;t+=.02){const current=factory.frame(t).hero;assert(along(current,factory)<along(before,factory),'the overview never parks the child');before=current;}
  const live=factory.frame(77.2).hero,ambient=factory.frame(82).actors.find(e=>e.id!=='hero');factory.setAmbientTime(82);
  const delayed=factory.frame(77.2),matching=delayed.actors.find(e=>e.id===ambient.id);
  assert.deepEqual(delayed.hero,live,'ambient time never advances the delayed hero');assert.deepEqual(matching.body,ambient.body,'background residents keep their own running clock');
  factory.setAmbientTime(null);
}
const factory=B,timing=V.get('routine').timing,input=new Actions();input.holdResistance(true);
let playback=timing.playbackAt(77.1),ambient=playback,previous=null,exhaustedAt=null,lagAtExhaustion=null,peakAfter=0,retreat=0,arrival=null;
for(let i=0;i<2200;i++){
  const dt=.005,from=timing.sceneAt(playback),next=timing.sceneAt(playback+dt),segment=factory.transferProgram.find(s=>from>=s.start&&from<s.end),belt=segment?Math.abs(segment.to-segment.from)/(timing.playbackAt(segment.end)-timing.playbackAt(segment.start)):0;
  input.update(dt,{phase:'factory',time:from,beltSpeed:belt});const effort=input.snapshot().factory;
  const raw=factory.resistTravel(from,next,effort.backwardStep);playback=timing.playbackAt(raw);ambient+=dt;factory.setAmbientTime(timing.sceneAt(ambient));
  const original=factory.frame(raw),resolved=factory.withResistance(original,effort.offset,raw,{...effort,transportResolved:true}),x=along(resolved.hero,factory);
  assert.equal(resolved.hero.angle,original.hero.angle,'resolved reverse travel preserves heading');
  if(previous!==null&&x>previous)retreat+=x-previous;
  if(effort.exhausted&&exhaustedAt===null){exhaustedAt=i*dt;lagAtExhaustion=ambient-playback;assert.equal(effort.velocity,0);}
  if(effort.exhausted&&from<78.49){if(previous!==null)peakAfter=Math.max(peakAfter,(previous-x)/dt);assert(Math.abs((ambient-playback)-lagAtExhaustion)<1e-7,'exhaustion retains the real timeline delay instead of recovering it');assert.equal(effort.backwardStep,0);}
  previous=x;if(raw>=78.5){arrival=raw;break;}
}
assert(exhaustedAt!==null);assert(retreat>10,'held resistance actually steps backward against the belt');assert(Math.abs(peakAfter-250)<1e-6,'exhausted movement is exactly the 250 world px/s belt speed');assert(arrival>=78.5,'the delayed child still reaches the machine');
factory.setAmbientTime(null);const pressed=factory.frame(79.25).actors.find(e=>e.id==='hero');assert(pressed.routine.compacting.contact,'the press starts from the actual arrival clock');assert.equal(factory.withResistance(factory.frame(79.25),600,79.25,{effort:1,transportResolved:true}).hero, factory.frame(79.25).hero,'no procedural retreat can penetrate a closed die');
for(const [f,id,begin,end]of[[A,'rhythm',70,72],[A,'rhythm',77,80],[B,'routine',76.7,78.5],[B,'routine',81.6,83.2]]){
  for(let t=begin+.1;t<end-.01;t+=.01){const adjusted=f.resistTravel(t,t+.005,3);assert(adjusted<=t+.005+1e-8&&adjusted>=begin-1e-8);}
}
console.log(JSON.stringify({overviewTravel:200,realReverse:retreat,exhaustionAt:exhaustedAt,postExhaustionBeltSpeed:peakAfter,retainedDelaySeconds:lagAtExhaustion,delayedArrival:arrival,independentBackground:true}));

const target=A.anchors.heroPress,bounds={minX:target.x-30,maxX:target.x+30,minY:target.y-30,maxY:target.y+30,scale:1};
function actuatorPositions(){const moves=[],ctx=new Proxy({translate:(...values)=>moves.push(values),getTransform:()=>({a:1,b:0})},{get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>(object[key]=value,true)});A.drawOverlay(ctx,72.6,bounds);return moves.filter(point=>point[0]===480).map(point=>point[1]);}
A.setAmbientTime(72.6);const early=actuatorPositions();A.setAmbientTime(73.6);const later=actuatorPositions();assert(later[0]<early[0]&&later[1]>early[1],'an already cleared press keeps retracting while the hero clock is held');A.setAmbientTime(null);
