'use strict';
const assert=require('node:assert/strict');
const F=require('./docs/factory-routine.js');
const hero=t=>F.frame(t).actors.find(e=>e.id==='hero');
const reset=()=>F.setNodeResistance(null);
function step(input,t,seconds,{held=false,actualHero,initialProgress=0}={}){let state;for(let i=0;i<Math.round(seconds*100);i++){state=input.update(.01,{time:t,held,actualHero,initialProgress});F.setNodeResistance(state);}return state;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),localX=body=>{const a=F.anchors.localRotation,dx=body.x-F.anchors.factoryCenter.x,dy=body.y-F.anchors.factoryCenter.y;return dx*Math.cos(a)+dy*Math.sin(a);};

// The leading outline, rather than the center arriving at the die, takes over input.
const arrivals=[];
for(const[name,start,center,index]of[['mold',67.4,71.7,0],['compact',76.7,78.5,1],['paint',81.6,83.2,2]]){
  reset();let entry=start;while(F.nodeProgress(entry).node!==name&&entry<center)entry+=.002;
  assert(entry<center-.20,'platform entry must precede center arrival at '+name);
  const body=hero(entry).body,centerDistance=localX(body)-F.anchors.stationX[index];assert(centerDistance>154,'the body center is still outside the platform');
  assert.equal(F.nodeProgress(entry,body).node,name);assert.equal(F.nodeProgress(entry-.004).node,null);arrivals.push({name,entry:Number(entry.toFixed(3)),centerDistance:Number(centerDistance.toFixed(1))});
}

// Repeated clicks deliberately try every pentagon side, independent of mouse position.
reset();const moldTime=71.72,input=new F.NodeResistance(),base=hero(moldTime).body,edges=[];let maxEscape=0;
for(let attempt=0;attempt<10;attempt++){
  assert(input.press(moldTime,{x:attempt%2?1e5:-1e5,y:0}));edges.push(input.snapshot(moldTime).edge);let previous=hero(moldTime).body;
  for(let i=0;i<38;i++){
    F.setNodeResistance(input.update(.01,{time:moldTime,held:false}));const body=hero(moldTime).body;
    assert(distance(previous,body)<1.3,'the escape visibly grows from its current position');assert.equal(body.angle,base.angle);previous=body;
  }
  const escaped=hero(moldTime);maxEscape=Math.max(maxEscape,distance(escaped.body,base));assert(distance(escaped.body,base)>25.8);
  const closing=step(input,moldTime,.055);assert(closing.closing>.4&&closing.closing<.8);
  const stopped=step(input,moldTime,.075);assert(distance(hero(moldTime).body,base)<1e-8);assert(hero(moldTime).routine.mold.faces[attempt%5].locked);assert(stopped.impact>0);
}
assert.deepEqual(edges,[0,1,2,3,4,0,1,2,3,4]);
const paused=input.snapshot(moldTime);input.update(.5,{time:moldTime,advance:false,held:true});assert.deepEqual(input.snapshot(moldTime),paused);

// A short click twists; sustained pressure expands both the shell and matching die.
reset();const compactTime=79.4,baseline=hero(compactTime),tap=new F.NodeResistance();tap.press(compactTime);step(tap,compactTime,.1,{held:true});tap.release();const tapped=step(tap,compactTime,.03);
assert(Math.abs(tapped.twist)>.01);assert.equal(tapped.expansion,0);assert.equal(hero(compactTime).body.sx,1);
reset();const hold=new F.NodeResistance();hold.press(compactTime);const expanding=step(hold,compactTime,1.1,{held:true}),expanded=hero(compactTime);
assert(expanding.expansion>.45);assert(expanded.body.sx>1.07&&expanded.body.sy>1.07);assert.equal(expanded.body.x,baseline.body.x);assert.equal(expanded.body.y,baseline.body.y);
const oldRadius=Math.max(...baseline.routine.compacting.shell.map(p=>Math.hypot(...p))),newRadius=Math.max(...expanded.routine.compacting.shell.map(p=>Math.hypot(...p)));assert(newRadius>oldRadius*1.07,'the die really moves outward with the expanding shell');
for(const face of expanded.routine.compacting.faces){assert.equal(face.gap,0);assert(Math.abs(face.support-face.faceSupport)<1e-8,'the die remains in contact with the actual expanded frame');}
hold.release();const struck=step(hold,compactTime,.12),crushed=hero(compactTime);assert.equal(struck.expansion,0);assert(struck.impact>.8);assert(crushed.body.sx<1);assert(crushed.routine.compacting.impact>.8);
reset();const exhausted=new F.NodeResistance();exhausted.press(compactTime);const full=step(exhausted,compactTime,2.1,{held:true});assert(full.exhausted);assert.equal(full.effortProgress,full.capacity);assert.equal(full.expansion,0);

// A held pointer crossing a platform switches to that station without retaining escape.
reset();const crossing=new F.NodeResistance();crossing.press(moldTime);step(crossing,moldTime,.2,{held:true});assert(distance({x:0,y:0},{x:crossing.offset[0],y:crossing.offset[1]})>0);
const handed=crossing.update(.01,{time:78.3,held:true,initialProgress:.16});F.setNodeResistance(handed);assert.equal(handed.node,'compact');assert.deepEqual(handed.offset,[0,0]);assert.equal(handed.expansion,0);assert.equal(handed.age,.01);assert.equal(handed.effortProgress,.16);
const beforeRecoil=F.frame(78.3).hero;assert.equal(F.nodeProgress(78.3,{...beforeRecoil,x:beforeRecoil.x+1e4}).node,'compact','once taken over, a local struggle cannot fall back to conveyor behavior');

// The paint turn has visible opposition, forced alignment, then the fixed nozzle paints.
reset();const span=(94-83.2)/5,paintTime=83.2+.20*span,paintBase=hero(paintTime),paintInput=new F.NodeResistance();paintInput.press(paintTime);const resistance=step(paintInput,paintTime,.4,{held:true});
const opposed=hero(paintTime),machine=F.paintAt(paintTime,5),before=F.paintAt(paintTime-.01,5).machineAngle,after=F.paintAt(paintTime+.01,5).machineAngle;
assert.equal(resistance.paintStage,'resist-turn');assert(Math.abs(opposed.body.angle-paintBase.body.angle)>.35);assert((opposed.body.angle-paintBase.body.angle)*(after-before)<0);
assert.equal(opposed.body.x,paintBase.body.x);assert.equal(opposed.body.y,paintBase.body.y);assert.equal(machine.spraying,false);
for(let side=0;side<5;side++){
  const align=83.2+(side+.45)*span;F.setNodeResistance(paintInput.update(.01,{time:align,held:true}));const p=F.paintAt(align,5);assert.equal(p.stage,'force-align');assert(Math.abs(p.angle-p.machineAngle)<.09);
  const spraying=83.2+(side+.65)*span;F.setNodeResistance(paintInput.update(.01,{time:spraying,held:true}));const aligned=F.paintAt(spraying,5);assert.equal(aligned.angle,aligned.machineAngle);assert(aligned.spraying);assert.equal(aligned.stage,'spray');
  const painted=83.2+(side+.82)*span;F.setNodeResistance(paintInput.update(.01,{time:painted,held:true}));assert.equal(hero(painted).routine.paint.filter(v=>v===1).length,side+1);
}

// The red arc is completed-node capacity; a hold fills only the remaining open arc.
reset();for(const[time,count]of[[71.7,0],[76.69,0],[76.7,1],[81.59,1],[81.6,2],[93.99,2],[94,3]]){
  const progress=F.nodeProgress(time);assert.equal(progress.completedNodes,count);assert.equal(progress.redFraction,count/3);assert.equal(progress.capacity,1-count/3);
  const r=new F.NodeResistance();r.press(time);const s=step(r,time,.4,{held:true});assert(s.effortProgress<=progress.capacity);assert.equal(s.redFraction,count/3);reset();
}
console.log(JSON.stringify({pass:true,arrivals,clickedFaces:edges,maxEscape,shortClickTwist:true,heldDieExpands:true,releaseAndFullRingSlam:true,stationTakeover:true,paintSequence:['resist-turn','force-align','spray'],redFractions:[0,1/3,2/3,1]}));
