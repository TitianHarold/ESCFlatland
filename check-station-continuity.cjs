'use strict';
const assert=require('node:assert/strict');
const {createCanvas}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const F=require('./docs/factory-routine.js');
const hero=time=>F.frame(time).actors.find(entry=>entry.id==='hero');
const failures=[],evidence=[];
function check(name,body){F.setNodeResistance(null);try{evidence.push({name,...body()});}catch(error){failures.push({name,error:error.message});}finally{F.setNodeResistance(null);}}
function step(input,time,held,dt=.01){const state=input.update(dt,{time,held});F.setNodeResistance(state);return state;}
function frameMask(entry){
  const canvas=createCanvas(256,256),ctx=canvas.getContext('2d');
  // Remove transport, preserving the real body/frame rotation and scale.
  ctx.translate(128,128);ctx.rotate(entry.body.angle);ctx.scale(entry.body.sx,entry.body.sy);
  F.drawActorOverlay(ctx,entry,()=>{});
  return ctx.getImageData(0,0,256,256).data;
}
function maskDifference(a,b){let changed=0,mass=0;for(let i=3;i<a.length;i+=4){changed+=Math.abs(a[i]-b[i]);mass+=Math.max(a[i],b[i]);}return changed/Math.max(1,mass);}
function faceDistance(a,b){return Math.max(...a.map((face,i)=>Math.max(...['from','to'].map(key=>Math.hypot(face[key][0]-b[i][key][0],face[key][1]-b[i][key][1])))));}

check('finished mold retains its silhouette on the transfer',()=>{
  const difference=maskDifference(frameMask(hero(76.699)),frameMask(hero(76.701)));
  assert(difference<.002,'finishing the mold must not replace the fitted strips with a different corner silhouette; changed fraction '+difference.toFixed(4));
  return{difference};
});

check('passive compact entry retains the fitted frame',()=>{
  let arrival=76.7;while(F.nodeProgress(arrival).node!=='compact'&&arrival<78.5)arrival+=.0001;
  assert(arrival<78.5,'the leading contour enters before the center');
  const input=new F.NodeResistance();
  step(input,arrival-.001,false,0);const before=hero(arrival-.001);
  step(input,arrival+.001,false,0);const after=hero(arrival+.001);
  assert.equal(before.routine.fitted,1);assert.equal(after.routine.fitted,1);
  const difference=maskDifference(frameMask(before),frameMask(after));
  assert(difference<.002,'a passive platform handoff must not change frame drawing/position; changed fraction '+difference.toFixed(4));
  return{arrival,difference};
});

for(const [phase,time]of[['windup',79],['hold',79.5],['release',80.8]])check('compact '+phase+' hands the visible pose into a finished lock',()=>{
  const input=new F.NodeResistance(),nominal=hero(time).routine.compacting;
  input.press(time);F.setNodeResistance(input.snapshot(time));
  let previous=hero(time).routine.compacting,maxFreeStep=0;
  function sample(held){
    const state=step(input,time,held),press=hero(time).routine.compacting;
    // A slam may move rapidly. Catching the pose and resuming it may not teleport.
    if(!(press.impact>.05||previous.impact>.05))maxFreeStep=Math.max(maxFreeStep,faceDistance(press.faces,previous.faces));
    previous=press;return state;
  }
  for(let i=0;i<140;i++)sample(true);
  input.release();F.setNodeResistance(input.snapshot(time));
  let state,lockedFrames=0,lastWithdrawalGap=0;
  for(let i=0;i<130;i++){
    state=sample(false);const elapsed=(i+1)/100;
    if(elapsed>=.15&&elapsed<=.50){assert.equal(state.expansion,0,'the fast counterpressure fully closes the body');assert(previous.faces.every(face=>face.gap<1e-8),'the lock stays closed during its visible loaded hold');assert(state.processPaused,'the reaction owns process time throughout the loaded hold');lockedFrames++;}
    if(elapsed>=.56&&elapsed<=1.19){assert(previous.clearance>=lastWithdrawalGap-1e-8,'automatic withdrawal opens steadily after the lock');lastWithdrawalGap=previous.clearance;assert(state.processPaused,'withdrawal finishes before the station gives control back');}
  }
  assert.equal(state.processPaused,false,'the completed withdrawal gives control to conveyor transport');
  assert.equal(state.finishAt,81.6,'completed pressure requests the next transport segment rather than returning to the old frozen phase');
  assert(lockedFrames>=30,'the body remains visibly locked after the fast counterpressure');
  assert(previous.faces.every(face=>Math.abs(face.gap-24)<1e-8),'automatic withdrawal reaches the actual next-segment open pose');
  assert(faceDistance(previous.bars,nominal.bars)<.01,'the strips return to their original fixed locking positions');
  assert(maxFreeStep<3,'non-impact die motion must stay continuous at 100 Hz; largest step '+maxFreeStep.toFixed(3));
  const finished=hero(time),mask=frameMask(finished);step(input,state.finishAt,false,0);const departed=hero(state.finishAt);
  assert.equal(input.press(state.finishAt),false,'the transport segment receives input after withdrawal');
  assert(Math.hypot(finished.body.x-departed.body.x,finished.body.y-departed.body.y)<1e-8,'the completed withdrawal meets transport at the same body position');
  assert.equal(maskDifference(mask,frameMask(departed)),0,'the locked frame and black material survive departure');
  assert(faceDistance(previous.faces,departed.routine.compacting.faces)<1e-8,'the machine meets its actual next-segment open pose without a geometry jump');
  return{maxFreeStep,lockedSeconds:lockedFrames/100};
});

check('exhausted compact resistance locks, withdraws and leaves without pointer release',()=>{
  const time=79,input=new F.NodeResistance();input.press(time);F.setNodeResistance(input.snapshot(time));
  let state;for(let i=0;i<300;i++){state=step(input,time,true);if(state.exhausted)break;}
  assert(state.exhausted,'holding eventually triggers the machine counterpressure');
  const releaseStart=state.releaseAge;let lockedFrames=0;
  for(let i=0;i<130;i++){
    state=step(input,time,true);const age=state.releaseAge,press=hero(time).routine.compacting;
    if(age>=.15&&age<=.50){assert.equal(state.expansion,0);assert(press.faces.every(face=>face.gap<1e-8),'exhaustion holds the counterpressure shut');assert(state.processPaused);lockedFrames++;}
  }
  assert(lockedFrames>=30);assert.equal(state.finishAt,81.6);assert.equal(state.processPaused,false);
  assert.equal(state.expansion,0);assert(hero(time).routine.compacting.faces.every(face=>Math.abs(face.gap-24)<1e-8));
  const finished=hero(time);step(input,state.finishAt,false,0);assert.equal(input.press(state.finishAt),false,'an exhausted completed station returns input to the conveyor');assert(Math.hypot(finished.body.x-hero(state.finishAt).body.x,finished.body.y-hero(state.finishAt).body.y)<1e-8);
  return{releaseStart,lockedSeconds:lockedFrames/100,finishesWhileStillHeld:true};
});

check('already fitted mold edges do not reopen on another attempt',()=>{
  const time=76.65,input=new F.NodeResistance(),baseline=hero(time).routine.mold.faces;
  assert(baseline.every(face=>face.locked),'choose a finished set of strips before transfer');
  assert.equal(input.press(time),false,'a finished set of edges rejects more mold escape input');F.setNodeResistance(input.snapshot(time));
  const caught=hero(time).routine.mold.faces;
  assert(caught.every(face=>face.locked),'a click against an existing edge must not remove that edge');
  assert(faceDistance(caught,baseline)<.01,'an already locked strip cannot jump open by 48 units');
  for(let i=0;i<80;i++){
    step(input,time,false);const faces=hero(time).routine.mold.faces;
    assert(faces.every(face=>face.locked),'all previously fitted strips survive the attempt and return');
    assert(faceDistance(faces,baseline)<.01,'fixed mold strips keep their locked position');
  }
  return{lockedEdges:baseline.length};
});

check('an interactively locked edge survives process resumption',()=>{
  const input=new F.NodeResistance();let time=71.72;input.press(time);F.setNodeResistance(input.snapshot(time));
  for(let i=0;i<80;i++)step(input,time,false);
  assert(hero(time).routine.mold.faces[0].locked);
  for(let i=0;i<36;i++){time+=.01;step(input,time,false);assert(hero(time).routine.mold.faces[0].locked,'resuming the authored process must retain the edge already attached by the reaction');}
  return{resumedUntil:time};
});

check('mold click spam queues one attempt without restarting the active closure',()=>{
  const time=71.72,input=new F.NodeResistance();input.press(time);F.setNodeResistance(input.snapshot(time));
  for(let i=0;i<28;i++)step(input,time,false);
  const before=input.snapshot(time),closingFace=hero(time).routine.mold.faces[before.edge];
  assert(before.age>.279&&before.age<.281);assert(closingFace.gap>0&&closingFace.gap<15,'sample the last closing stroke before impact');
  for(let i=0;i<30;i++){
    assert(input.press(time));const queued=input.snapshot(time);F.setNodeResistance(queued);
    for(const key of['age','edge','closing','anticipation','impact','level'])assert.equal(queued[key],before[key],'a queued click preserves the currently visible '+key);
    assert.deepEqual(queued.offset,before.offset,'click spam cannot reset the current escape position');
    const face=hero(time).routine.mold.faces[before.edge];assert.equal(face.locked,closingFace.locked);assert.equal(face.gap,closingFace.gap,'the closing edge must not jump back open');assert.deepEqual(face.from,closingFace.from);assert.deepEqual(face.to,closingFace.to);
  }
  const directions=[before.edge];let previous=before,state;
  for(let i=0;i<160;i++){
    state=step(input,time,false);const faces=hero(time).routine.mold.faces;
    if(state.edge!==previous.edge){directions.push(state.edge);assert(previous.age>=.63,'the next direction waits for the current recoil to settle');}
    else assert(state.age>previous.age,'the same reaction clock keeps advancing after the burst of clicks');
    assert(faces[before.edge].locked,'the first edge completes impact and stays locked while the queued attempt runs');
    previous=state;
  }
  assert.deepEqual(directions,[0,1],'a burst queues one next direction, rather than one animation per click');
  assert.equal(state.processPaused,false,'the single pending attempt eventually settles and releases the process');
  assert.deepEqual(state.closed,[0,1],'no extra queued attempts appear after the second edge');
  return{queuedClicks:30,executedDirections:directions,finalAge:state.age};
});

check('the fifth mold collision settles before handing input back to transport',()=>{
  const time=71.72,input=new F.NodeResistance();
  for(let edge=0;edge<4;edge++){assert(input.press(time));F.setNodeResistance(input.snapshot(time));for(let i=0;i<70;i++)step(input,time,false);}
  assert(input.press(time));F.setNodeResistance(input.snapshot(time));
  for(let i=0;i<28;i++)step(input,time,false);
  for(let i=0;i<30;i++)assert(input.press(time));F.setNodeResistance(input.snapshot(time));
  const collided=step(input,time,false);
  assert(hero(time).routine.mold.faces.every(face=>face.locked),'the last impact completes the five fitted edges');
  assert(collided.processPaused,'the last recoil finishes before the conveyor receives control');
  assert.equal(collided.finishAt,null,'five locked edges alone cannot skip the final impact recoil');
  let state;for(let i=0;i<45;i++)state=step(input,time,false);
  assert.equal(state.processPaused,false,'finishing the last recoil releases the station');
  assert.equal(state.finishAt,76.7,'the completed mold requests the actual next transport segment');
  assert.equal(state.edge,4,'completion drops the queued repeat instead of cycling into another first edge');
  const mask=frameMask(hero(time));
  for(let i=0;i<10;i++){assert.equal(input.press(time),false,'after completion, clicks belong to backward conveyor resistance');F.setNodeResistance(input.snapshot(time));assert.equal(maskDifference(mask,frameMask(hero(time))),0,'completed mold input cannot start another reaction or remove its frame');}
  const finished=hero(time);step(input,state.finishAt,false,0);const departed=hero(state.finishAt);
  assert.equal(input.press(state.finishAt),false,'the next segment routes input to backward conveyor movement');
  assert(Math.hypot(finished.body.x-departed.body.x,finished.body.y-departed.body.y)<1e-8,'mold departure preserves the settled body position');
  assert.equal(maskDifference(mask,frameMask(departed)),0,'the assembled frame is unchanged when the conveyor takes over');
  return{finishedEdges:5,ignoredQueuedRepeats:30,returnsInputToTransport:true};
});

console.log(JSON.stringify({pass:!failures.length,evidence,failures},null,2));
if(failures.length)process.exitCode=1;
