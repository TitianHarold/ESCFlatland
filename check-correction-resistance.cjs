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
  assert.equal(F.nodeProgress(entry,body).node,name);assert.equal(F.nodeProgress(entry,body).processStart,center);assert.equal(F.nodeProgress(entry-.004).node,null);arrivals.push({name,entry:Number(entry.toFixed(3)),centerDistance:Number(centerDistance.toFixed(1))});
}

// Every click tries a different side: contract, accelerate, then hit and recoil.
reset();const moldTime=71.72,input=new F.NodeResistance(),base=hero(moldTime).body,edges=[];let maxEscape=0;
for(let attempt=0;attempt<10;attempt++){
  assert(input.press(moldTime,{x:attempt%2?1e5:-1e5,y:0}));edges.push(input.snapshot(moldTime).edge);assert(input.snapshot(moldTime).processPaused);
  const samples=[];let previous=hero(moldTime).body;
  for(let i=0;i<65;i++){
    const state=input.update(.01,{time:moldTime,held:false});F.setNodeResistance(state);const entry=hero(moldTime),body=entry.body;
    assert(distance(previous,body)<15,'contact is a rapid stroke, never a position jump');assert.equal(body.angle,base.angle);samples.push({state,body});previous=body;
    maxEscape=Math.max(maxEscape,distance(body,base));
  }
  assert(samples[2].state.anticipation>.8&&samples[2].body.sx<.93,'the child visibly coils before escape');
  const early=distance(samples[9].body,samples[10].body),late=distance(samples[21].body,samples[22].body);assert(late>early*12,'escape accelerates rather than a smooth uniform glide');
  assert(distance(samples[23].body,base)>41);assert(distance(samples[27].body,base)>45);
  assert(samples[27].state.closing>.65&&samples[27].state.closing<.8);assert(samples[28].state.impact>.9);
  assert(distance(samples[30].body,samples[29].body)>8,'the bar visibly knocks the child back');assert(samples[28].body.sx<.92,'impact compresses the silhouette');
  assert(distance(samples[34].body,base)>5,'the child overshoots backwards instead of a soft return');
  assert(distance(samples.at(-1).body,base)<.08);assert.equal(samples.at(-1).state.processPaused,false);assert(hero(moldTime).routine.mold.faces[attempt%5].locked);
}
assert.deepEqual(edges,[0,1,2,3,4,0,1,2,3,4]);
reset();const heldMold=new F.NodeResistance();heldMold.press(moldTime);assert.equal(step(heldMold,moldTime,.8,{held:true}).processPaused,false,'holding cannot keep the completed mold reaction paused');
const paused=input.snapshot(moldTime);input.update(.5,{time:moldTime,advance:false,held:true});assert.deepEqual(input.snapshot(moldTime),paused);

// A tap twists only the body. Holding separates rigid strips and matching die faces.
reset();const compactTime=79.4,baseline=hero(compactTime),tap=new F.NodeResistance();tap.press(compactTime);step(tap,compactTime,.1,{held:true});tap.release();const tapped=step(tap,compactTime,.03);
assert(Math.abs(tapped.twist)>.01);assert.equal(tapped.expansion,0);assert.equal(hero(compactTime).body.sx,1);assert(tapped.processPaused);assert.equal(step(tap,compactTime,.4).processPaused,false,'a completed tap releases the frozen process');
reset();const hold=new F.NodeResistance();hold.press(compactTime);const expanding=step(hold,compactTime,1.35,{held:true}),expanded=hero(compactTime);assert(Number.isFinite(expanding.recoil));
assert(expanding.expansion>.45);assert(expanding.processPaused);assert(expanded.body.sx>1.1&&expanded.body.sy>1.1);assert.equal(expanded.body.x,baseline.body.x);assert.equal(expanded.body.y,baseline.body.y);
const oldPress=baseline.routine.compacting,newPress=expanded.routine.compacting,segmentLength=face=>Math.hypot(face.to[0]-face.from[0],face.to[1]-face.from[1]);
let cornerGap=0;
for(let i=0;i<5;i++){
  const bar=newPress.bars[i],oldBar=oldPress.bars[i],face=newPress.faces[i],oldFace=oldPress.faces[i];
  assert(Math.abs(segmentLength(bar)-segmentLength(oldBar))<1e-8,'a black strip never grows longer');assert(Math.abs(segmentLength(face)-segmentLength(oldFace))<1e-8,'the die face is rigid too');
  assert.equal(face.thickness,oldFace.thickness);assert(Math.abs(bar.normal[0]-oldBar.normal[0])+Math.abs(bar.normal[1]-oldBar.normal[1])<1e-8,'strips never rotate with the body twist');
  const dx=bar.from[0]-oldBar.from[0],dy=bar.from[1]-oldBar.from[1];assert(dx*bar.normal[0]+dy*bar.normal[1]>7,'each strip moves outward');assert(Math.abs(dx*bar.normal[1]-dy*bar.normal[0])<1e-8,'each strip travels only along its normal');
  assert.equal(face.gap,0);assert(Math.abs(face.support-face.faceSupport)<1e-8,'the die touches the translated strip');
  const next=newPress.bars[(i+1)%5];cornerGap=Math.max(cornerGap,Math.hypot(bar.to[0]-next.from[0],bar.to[1]-next.from[1]));
}
assert(cornerGap>9,'separate rigid strips expose visible gaps at the corners');
// Exercise the actual actor-scaled stroke renderer, not only its unscaled geometry.
function frameSegments(entry){
  const matrix=[1,0,0,1,0,0],stack=[],segments=[];let path=[];
  const point=(x,y)=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]],ctx={
    save(){stack.push([...matrix]);},restore(){matrix.splice(0,6,...stack.pop());},scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[a0,b,c0,d]=matrix;matrix[0]=a0*c+c0*s;matrix[1]=b*c+d*s;matrix[2]=c0*c-a0*s;matrix[3]=d*c-b*s;},translate(x,y){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
    beginPath(){path=[];},moveTo(x,y){path.push(point(x,y));},lineTo(x,y){path.push(point(x,y));},closePath(){},clip(){},fill(){},arc(){},stroke(){if(this.lineWidth===12&&path.length===2)segments.push({from:path[0],to:path[1],width:Math.hypot(matrix[0],matrix[1])*this.lineWidth});}
  };
  ctx.rotate(entry.body.angle);ctx.scale(entry.body.sx,entry.body.sy);F.drawActorOverlay(ctx,entry);return segments;
}
const rendered=frameSegments(expanded);assert.equal(rendered.length,5);for(let i=0;i<5;i++){assert(Math.abs(segmentLength(rendered[i])-segmentLength(newPress.bars[i]))<1e-8);assert(Math.abs(rendered[i].width-12)<1e-8,'rendering must undo body scaling for the rigid strips');}
hold.release();const struck=step(hold,compactTime,.12),crushed=hero(compactTime);assert.equal(struck.expansion,0);assert(struck.impact>.8);assert(struck.processPaused);assert(crushed.body.sx<1);assert(crushed.routine.compacting.impact>.8);
for(let i=0;i<5;i++)assert.deepEqual(crushed.routine.compacting.bars[i],oldPress.bars[i],'release snaps each strip back to its original lock');
hold.press(compactTime);const expandedAgain=step(hold,compactTime,.9,{held:true});assert(expandedAgain.expansion>.3,'a fresh press after the slam can push the rigid strips open again');
reset();const interrupted=new F.NodeResistance();interrupted.press(compactTime);step(interrupted,compactTime,.9,{held:true});interrupted.release();step(interrupted,compactTime,.04);interrupted.press(compactTime);step(interrupted,compactTime,.03,{held:true});interrupted.release();const settled=step(interrupted,compactTime,.12);assert.equal(settled.expansion,0,'a short click during the slam cannot leave the strips suspended');
reset();const exhausted=new F.NodeResistance();exhausted.press(compactTime);let full;for(let i=0;i<300;i++){full=step(exhausted,compactTime,.01,{held:true});if(full.exhausted)break;}assert(full.exhausted);assert.equal(full.effortProgress,full.capacity);assert(full.expansion>0,'sample the exhausting slam while it is still returning');
for(let i=0;i<14;i++){exhausted.press(compactTime);full=step(exhausted,compactTime,.01,{held:true});exhausted.release();}assert.equal(full.expansion,0,'exhausted repeat presses cannot stop the clamp returning');

// A held pointer crossing a platform switches to that station without retaining escape.
reset();const crossing=new F.NodeResistance();crossing.press(moldTime);step(crossing,moldTime,.2,{held:true});assert(distance({x:0,y:0},{x:crossing.offset[0],y:crossing.offset[1]})>0);
const handed=crossing.update(.01,{time:78.3,held:true,initialProgress:.16});F.setNodeResistance(handed);assert.equal(handed.node,'compact');assert.deepEqual(handed.offset,[0,0]);assert.equal(handed.expansion,0);assert.equal(handed.age,.01);assert.equal(handed.effortProgress,.16);
const beforeRecoil=F.frame(78.3).hero;assert.equal(F.nodeProgress(78.3,{...beforeRecoil,x:beforeRecoil.x+1e4}).node,'compact','once taken over, a local struggle cannot fall back to conveyor behavior');

// Process time stays fixed while a click visibly blocks the indexed paint turn.
reset();const span=(94-83.2)/5,paintTime=83.2+.12*span,paintInput=new F.NodeResistance(),nominal=F.paintAt(paintTime,5);paintInput.press(paintTime);F.setNodeResistance(paintInput.snapshot(paintTime));assert(paintInput.snapshot(paintTime).processPaused);step(paintInput,paintTime,.1,{held:true});
const beforeTapRelease=F.paintAt(paintTime,5).angle;paintInput.release();F.setNodeResistance(paintInput.snapshot(paintTime));assert.equal(F.paintAt(paintTime,5).angle,beforeTapRelease);const tapReaction=step(paintInput,paintTime,.18);assert(tapReaction.processPaused);assert(F.paintAt(paintTime,5).angle<nominal.machineAngle-.07,'a brief click has visible reverse pressure even though raw time is frozen');
const settledTap=step(paintInput,paintTime,.2);assert.equal(settledTap.processPaused,false);assert.equal(F.paintAt(paintTime,5).angle,nominal.machineAngle,'reaction time alone returns to the frozen nominal angle');
reset();const heldPaint=new F.NodeResistance();heldPaint.press(paintTime);step(heldPaint,paintTime,.18,{held:true});const caught=F.paintAt(paintTime,5);const resistance=step(heldPaint,paintTime,.32,{held:true}),opposed=hero(paintTime),reverse=F.paintAt(paintTime,5);
assert(resistance.processPaused);assert.equal(resistance.paintStage,'resist-turn');assert(reverse.angle<caught.angle-.20,'a held hand visibly reverses the body counterclockwise');assert(reverse.angle<reverse.machineAngle);assert(reverse.opposition>.5);assert.equal(reverse.spraying,false);
const beforeReclick=reverse.angle;heldPaint.press(paintTime);F.setNodeResistance(heldPaint.snapshot(paintTime));assert(Math.abs(F.paintAt(paintTime,5).angle-beforeReclick)<1e-8,'repeated clicks catch the visible angle without snapping to the machine angle');
step(heldPaint,paintTime,.35,{held:true});const beforeRelease=F.paintAt(paintTime,5).angle;assert(beforeRelease<heldPaint.paintCatchAngle-.1);heldPaint.release();F.setNodeResistance(heldPaint.snapshot(paintTime));assert(Math.abs(F.paintAt(paintTime,5).angle-beforeRelease)<1e-8,'releasing a held reverse starts from its visible angle');const returning=step(heldPaint,paintTime,.18);assert(returning.processPaused);assert.equal(returning.paintStage,'force-align');assert(!F.paintAt(paintTime,5).spraying);const returned=step(heldPaint,paintTime,.2);assert.equal(returned.processPaused,false);assert.equal(F.paintAt(paintTime,5).angle,F.paintAt(paintTime,5).machineAngle);
assert.equal(opposed.body.x,hero(paintTime).body.x);assert.equal(opposed.body.y,hero(paintTime).body.y);
for(let side=0;side<5;side++){
  const turn=83.2+(side+.2)*span;reset();const a=F.paintAt(turn-.01,5),b=F.paintAt(turn+.01,5);assert(b.machineAngle>a.machineAngle,'all indexed turns use the same clockwise direction');
  const reaction=new F.NodeResistance();reaction.press(turn);step(reaction,turn,.4,{held:true});reaction.release();const settled=step(reaction,turn,.4);assert.equal(settled.processPaused,false);assert.equal(F.paintAt(turn,5).angle,F.paintAt(turn,5).machineAngle);
  const spraying=83.2+(side+.65)*span;F.setNodeResistance(reaction.update(.01,{time:spraying,held:false}));const aligned=F.paintAt(spraying,5);assert.equal(aligned.angle,aligned.machineAngle);assert(aligned.spraying);assert.equal(aligned.stage,'spray');
  const painted=83.2+(side+.82)*span;F.setNodeResistance(reaction.update(.01,{time:painted,held:false}));assert.equal(hero(painted).routine.paint.filter(v=>v===1).length,side+1);
}
reset();const forced=new F.NodeResistance();forced.press(paintTime);let forcedState;for(let i=0;i<300;i++){forcedState=step(forced,paintTime,.01,{held:true});if(forcedState.exhausted&&!forcedState.processPaused)break;}assert(forcedState.exhausted);assert.equal(forcedState.processPaused,false,'natural exhaustion returns the angle and releases process time without pointerup');assert.equal(F.paintAt(paintTime,5).angle,F.paintAt(paintTime,5).machineAngle);forced.release();F.setNodeResistance(forced.snapshot(paintTime));assert.equal(forced.snapshot(paintTime).processPaused,false,'late pointerup does not restart an exhausted return');

// Attempt capacity is independent of completed nodes; there is no permanent red arc.
reset();for(const[time,count]of[[71.7,0],[76.69,0],[76.7,1],[81.59,1],[81.6,2],[93.99,2],[94,3]]){
  const progress=F.nodeProgress(time);assert.equal(progress.completedNodes,count);assert.equal(progress.redFraction,0);assert.equal(progress.capacity,1);
  const r=new F.NodeResistance();r.press(time);const state=step(r,time,.4,{held:true});assert(state.effortProgress<=1);assert.equal(state.redFraction,0);reset();
}
console.log(JSON.stringify({pass:true,arrivals,clickedFaces:edges,maxEscape,shortClickTwist:true,rigidStripsSeparate:true,cornerGap:Number(cornerGap.toFixed(2)),heldPaintCounterclockwise:true,releaseAndFullRingSlam:true,stationTakeover:true,localProcessPause:true,paintSequence:['resist-turn','force-align','spray'],redFractions:[0]}));
