'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,Path2D,DOMMatrix}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const F=require('./docs/factory-routine.js'),P=require('./docs/palette.js');
const hero=time=>F.frame(time).actors.find(entry=>entry.id==='hero');
const checks=[],failures=[];
function check(name,run){try{checks.push({name,...run()});}catch(error){failures.push({name,error:error.message});}finally{F.setNodeResistance(null);F.setAmbientTime(null);}}
const area=points=>Math.abs(points.reduce((sum,[x,y],i)=>{const next=points[(i+1)%points.length];return sum+x*next[1]-y*next[0];},0))/2;
const local=p=>{const a=F.anchors.localRotation,c=Math.cos(a),s=Math.sin(a),o=F.anchors.factoryCenter;return[(p[0]-o.x)*c+(p[1]-o.y)*s,-(p[0]-o.x)*s+(p[1]-o.y)*c];};
function overlay(time){
  const center=F.anchors.heroStages.m2,canvas=createCanvas(1,1),ctx=canvas.getContext('2d'),dies=[],braces=[];let points=[];
  const worldPoint=(x,y)=>{const m=ctx.getTransform();return[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];};
  ctx.beginPath=()=>{points=[];};ctx.moveTo=(x,y)=>points.push(worldPoint(x,y));ctx.lineTo=(x,y)=>points.push(worldPoint(x,y));ctx.closePath=()=>{};
  const nearStation=()=>{const [x,y]=local(points.reduce((sum,p)=>sum.map((v,i)=>v+p[i]/points.length),[0,0]));return Math.hypot(x-F.anchors.stationX[1],y-130)<140;};
  ctx.fill=()=>{if(points.length===4&&ctx.fillStyle===P.industrial&&nearStation())dies.push(points.map(p=>[...p]));};
  ctx.stroke=()=>{if(points.length===2&&Math.abs(ctx.lineWidth-2.5)<1e-8&&ctx.strokeStyle===P.metal&&nearStation())braces.push(points.map(p=>[...p]));};
  F.frame(time);F.drawOverlay(ctx,time,{minX:center.x-170,maxX:center.x+170,minY:center.y-170,maxY:center.y+170});
  assert.equal(dies.length,5,'measure the five real matching die polygons');assert.equal(braces.length,5,'measure the five actual support strokes');
  return{dies,braces};
}
function pathDistance(a,b){assert.equal(a.length,b.length);let max=0;for(let i=0;i<a.length;i++){assert.equal(a[i].length,b[i].length);for(let j=0;j<a[i].length;j++)max=Math.max(max,Math.hypot(a[i][j][0]-b[i][j][0],a[i][j][1]-b[i][j][1]));}return max;}
function stripPaths(entry){
  const ctx=createCanvas(1,1).getContext('2d'),strips=[];let points=[];
  const point=(x,y)=>{const m=ctx.getTransform();return[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];};
  ctx.beginPath=()=>{points=[];};ctx.moveTo=(x,y)=>points.push(point(x,y));ctx.lineTo=(x,y)=>points.push(point(x,y));ctx.closePath=()=>{};ctx.clip=()=>{};ctx.arc=()=>{};ctx.stroke=()=>{};
  ctx.fill=()=>{if(points.length!==4)return;const from=points[0].map((v,i)=>(v+points[3][i])/2),to=points[1].map((v,i)=>(v+points[2][i])/2),length=Math.hypot(to[0]-from[0],to[1]-from[1]),normal=[(to[1]-from[1])/length,-(to[0]-from[0])/length],width=Math.abs((points[0][0]-points[3][0])*normal[0]+(points[0][1]-points[3][1])*normal[1]);if(Math.abs(width-12)<1e-5&&!strips.some(strip=>Math.hypot(strip[0][0]-points[0][0],strip[0][1]-points[0][1])<1e-7))strips.push(points.map(p=>[...p]));};
  ctx.translate(entry.body.x,entry.body.y);ctx.rotate(entry.body.angle);ctx.scale(entry.body.sx,entry.body.sy);F.drawActorOverlay(ctx,entry,()=>{});
  assert.equal(strips.length,5,'read five real rigid outer strips from the actor renderer');return strips;
}
function sample(time,state){const entry=hero(time);return{state,body:entry.body,outlineArea:area(entry.actor.outline(entry.body)),press:entry.routine.compacting,render:{...overlay(time),strips:stripPaths(entry)}};}
function automatic(){F.setNodeResistance(null);F.setAmbientTime(0);const samples=[];for(let i=0;i<=200;i++)samples.push(sample(79.25+i*.002));return samples;}
function resistance(time=79){
  F.setNodeResistance(null);F.setAmbientTime(0);const input=new F.NodeResistance();input.press(time);
  for(let i=0;i<135;i++)F.setNodeResistance(input.update(.01,{time,held:true}));
  input.release();F.setNodeResistance(input.snapshot(time));const samples=[sample(time,input.snapshot(time))];
  for(let i=0;i<280;i++){const state=input.update(.002,{time,held:false});F.setNodeResistance(state);samples.push(sample(time,state));}
  return{input,samples,time};
}
function metrics(samples,baseline){return{dieMotion:Math.max(...samples.map(s=>pathDistance(s.render.dies,baseline.render.dies))),braceMotion:Math.max(...samples.map(s=>pathDistance(s.render.braces,baseline.render.braces))),minimumArea:Math.min(...samples.map(s=>s.outlineArea)),impact:Math.max(...samples.map(s=>s.press.impact))};}
const settled=samples=>samples.find(sample=>sample.state.releaseAge>=.53);

check('counterpressure moves the rendered mechanism more strongly than automatic pressure',()=>{
  const auto=automatic(),natural=metrics(auto,auto.at(-1)),reaction=resistance(),contact=reaction.samples.find(s=>s.state.expansion===0&&s.state.releaseAge>0);
  assert(contact,'the body actually returns to its fixed locking size');
  const striking=reaction.samples.filter(s=>s.state.releaseAge>=contact.state.releaseAge&&s.state.releaseAge<contact.state.releaseAge+.30),response=metrics(striking,settled(reaction.samples));
  assert(response.dieMotion>natural.dieMotion*1.25&&response.dieMotion>1,'the real die polygons, rather than only a scalar, receive a stronger response');
  assert(response.braceMotion>natural.braceMotion*1.25,'the actual support motion is stronger after resistance');
  assert(response.minimumArea<natural.minimumArea*.96,'the visible child receives a stronger squeeze than in the automatic stroke');
  return{automatic:natural,counterpressure:response};
});

check('counterpressure impact waits for physical closure and decays before withdrawal',()=>{
  const {samples}=resistance(),contact=samples.find(s=>s.state.expansion===0&&s.state.releaseAge>0);
  assert(contact);const before=samples.filter(s=>s.state.releaseAge<contact.state.releaseAge-1e-8);
  assert(before.every(s=>s.press.impact<1e-8),'there is no impact flash or body crush before the rigid strips finish closing');
  const first=samples.find(s=>s.press.impact>.05);assert(first);assert(Math.abs(first.state.releaseAge-contact.state.releaseAge)<.005,'the visible impact and physical closure share the reaction clock');
  const baseline=settled(samples),early=samples.filter(s=>s.state.releaseAge>=contact.state.releaseAge&&s.state.releaseAge<contact.state.releaseAge+.16),late=samples.filter(s=>s.state.releaseAge>.45&&s.state.releaseAge<.55);
  const earlyPeak=Math.max(...early.map(s=>pathDistance(s.render.dies,baseline.render.dies))),latePeak=Math.max(...late.map(s=>pathDistance(s.render.dies,baseline.render.dies)));
  assert(earlyPeak>1);assert(latePeak<earlyPeak*.2,'the vibration decays instead of continuing through the next operation');
  return{contactAge:contact.state.releaseAge,firstImpactAge:first.state.releaseAge,earlyPeak,latePeak};
});

check('body, rigid frame and matching dies share one physical jolt',()=>{
  const {samples}=resistance(),baseline=settled(samples),active=samples.filter(s=>s.state.releaseAge>=.11&&s.state.releaseAge<.40);
  const peak=active.reduce((best,next)=>pathDistance(next.render.dies,baseline.render.dies)>pathDistance(best.render.dies,baseline.render.dies)?next:best);
  const shift=peak.render.dies[0][0].map((v,i)=>v-baseline.render.dies[0][0][i]);assert(Math.hypot(...shift)>1,'test a real rendered mechanism jolt');
  // Native Canvas matrices round their components; one thousandth of a world unit is subpixel.
  let rigidRounding=0;for(const group of['dies','strips'])for(let i=0;i<5;i++)for(let j=0;j<4;j++)rigidRounding=Math.max(rigidRounding,Math.hypot(peak.render[group][i][j][0]-baseline.render[group][i][j][0]-shift[0],peak.render[group][i][j][1]-baseline.render[group][i][j][1]-shift[1]));
  const bodyRounding=Math.hypot(peak.body.x-baseline.body.x-shift[0],peak.body.y-baseline.body.y-shift[1]);
  assert(rigidRounding<1e-3,'all rigid rendered material shares the same translation without stretching');assert(bodyRounding<1e-3,'the squeezed body receives the same physical jolt as its lock');
  return{sharedShift:shift,rigidRounding,bodyRounding};
});

check('frozen authored time does not alter the counterpressure animation',()=>{
  const early=resistance(79).samples,later=resistance(79.4).samples;
  for(let i=0;i<early.length;i++)if(early[i].state.releaseAge>=.11&&early[i].state.releaseAge<=.54){assert(pathDistance(early[i].render.dies,later[i].render.dies)<1e-7,'die shock cannot contain the frozen automatic phase');assert(pathDistance(early[i].render.braces,later[i].render.braces)<1e-7,'support shock cannot contain the frozen automatic phase');assert(Math.abs(early[i].outlineArea-later[i].outlineArea)<1e-7,'body compression uses the same release age at either authored phase');}
  return{sameResponseAtRaw:[79,79.4]};
});

check('pause freezes impact geometry and station departure clears it',()=>{
  const {input,time}=resistance();
  // Start a separate strike so the paused sample is in its strongest aftershock.
  input.reset();F.setNodeResistance(null);input.press(time);for(let i=0;i<135;i++)F.setNodeResistance(input.update(.01,{time,held:true}));input.release();for(let i=0;i<70;i++)F.setNodeResistance(input.update(.002,{time,held:false}));
  const before=sample(time,input.snapshot(time));const frozen=input.update(1,{time,held:false,advance:false});F.setNodeResistance(frozen);const after=sample(time,frozen);
  assert.deepEqual(after,before,'pausing cannot advance any body, die or support impact geometry');
  for(let i=0;i<600;i++)F.setNodeResistance(input.update(.002,{time,held:false}));const finish=input.snapshot(time);assert.equal(finish.finishAt,81.6);
  F.setNodeResistance(input.update(0,{time:finish.finishAt,held:false}));const departed=sample(finish.finishAt,input.snapshot(finish.finishAt));assert.equal(departed.press.impact,0);assert.equal(departed.press.recoil,0);
  F.setNodeResistance(null);const neutral=sample(finish.finishAt);assert.deepEqual(departed.render,neutral.render,'the next conveyor segment inherits no residual mechanism displacement');assert.equal(departed.outlineArea,neutral.outlineArea);
  return{pauseFrozen:true,departureImpact:departed.press.impact};
});

check('pausing process time cannot freeze or replay an earlier automatic impact',()=>{
  F.setNodeResistance(null);F.setAmbientTime(0);const input=new F.NodeResistance(),time=79.26;
  F.setNodeResistance(input.update(0,{time,held:false}));assert(hero(time).routine.compacting.impact>.8,'start inside the real automatic impact');
  input.press(time);for(let i=0;i<5;i++)F.setNodeResistance(input.update(.01,{time,held:true}));input.release();
  for(let i=0;i<65;i++)F.setNodeResistance(input.update(.01,{time,held:false}));
  for(const raw of[time,79.27,79.3,79.4]){F.setNodeResistance(input.update(.01,{time:raw,held:false}));const press=hero(raw).routine.compacting;assert.equal(press.impact,0,'the old automatic impact finishes on real time while the process is interrupted');assert.equal(press.recoil,0);assert.equal(press.cameraX,0);assert.equal(press.cameraY,0);}
  return{resumingAuthoredTimeDoesNotReplay:true};
});

function appProbe(){
  const nodes=new Map(),width=1280,height=760;
  function element(id){if(nodes.has(id))return nodes.get(id);const listeners={},node=['possibility-world','outer-world'].includes(id)?createCanvas(width,height):{};Object.assign(node,{id,dataset:{},style:{setProperty(){}},classList:{contains(){return false;}},addEventListener(type,fn){(listeners[type]??=[]).push(fn);},dispatch(type,event={}){for(const fn of listeners[type]||[])fn(event);},append(){},replaceChildren(){},setAttribute(name,value){this[name]=value;},getBoundingClientRect(){return{x:0,y:0,left:0,top:0,right:width,bottom:height,width,height};},focus(){},setPointerCapture(){}});nodes.set(id,node);return node;}
  let count=0;const values=new Map(),document={body:{classList:{contains:name=>name==='workbench'}},hidden:false,getElementById:element,querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},createElement:tag=>tag==='canvas'?createCanvas(300,150):element('created-'+(++count))};
  const sandbox={console,document,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))},Path2D,DOMMatrix,URLSearchParams,URL,location:{search:'?mode=interactive&version=routine&palette=F2',href:'https://titianharold.github.io/ESCFlatland/workbench.html'},history:{replaceState(){}},performance:{now:()=>0},devicePixelRatio:1,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame(){},OffscreenCanvas:class{constructor(w,h){return createCanvas(w,h);}},setTimeout,clearTimeout};sandbox.window=sandbox;sandbox.globalThis=sandbox;
  const context=vm.createContext(sandbox),docs=path.join(__dirname,'docs'),scripts=[...fs.readFileSync(path.join(docs,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
  for(const file of scripts){let source=fs.readFileSync(path.join(docs,file),'utf8');if(file==='app.js')source=source.replace(/\}\)\(\);\s*$/,`window.__impactCheck={seekRaw:raw=>seek(timing.playbackAt(raw)),setMode,step:dt=>tickStory(dt),sample:()=>{const v=view(),ctx=document.createElement('canvas').getContext('2d');placeWorld(ctx,v);const m=ctx.getTransform(),s=scale(v);return {raw:sceneTime(),review:state.reviewPaused,correction:state.correction,shake:[m.e-(state.w/2-v.x*s),m.f-(state.h/2-v.y*s)]};}};\n})();`);vm.runInContext(source,context,{filename:file});}
  const probe=sandbox.__impactCheck;assert(probe,'the app probe attaches to the real runtime');
  return{...probe,press:()=>element('stage').dispatch('pointerdown',{button:0,pointerId:1,clientX:15,clientY:15}),release:()=>element('stage').dispatch('pointerup',{button:0,pointerId:1,clientX:15,clientY:15}),pause:()=>element('play').dispatch('click')};
}

check('the rendered app camera shakes on the reaction clock and freezes on pause',()=>{
  const app=appProbe();app.setMode('auto');let automaticPeak=0;
  for(let i=0;i<=80;i++){app.seekRaw(79.25+i*.005);automaticPeak=Math.max(automaticPeak,Math.hypot(...app.sample().shake));}
  app.setMode('interactive');app.seekRaw(79);app.press();for(let i=0;i<135;i++)app.step(.01);app.release();let reactionPeak=0,paused=false;
  for(let i=0;i<250;i++){
    app.step(.005);const sample=app.sample();reactionPeak=Math.max(reactionPeak,Math.hypot(...sample.shake));
    if(!paused&&sample.correction?.releaseAge>.13&&sample.correction.releaseAge<.15){app.pause();const frozen=app.sample();app.step(.4);assert.deepEqual(app.sample(),frozen,'review pause freezes the actual world-to-screen impact transform');app.pause();paused=true;}
  }
  assert(paused);assert(reactionPeak>automaticPeak*1.25&&reactionPeak>1,'resistance strikes shake the actual rendered screen more than automatic pressure, including raw time outside the old impact window');
  const departureRounding=Math.hypot(...app.sample().shake);assert(app.sample().raw>=81.6);assert(departureRounding<1e-3,'screen impact clears when the finished station hands off');
  return{automaticPeak,reactionPeak,pausedDuringImpact:paused,departureRounding};
});

console.log(JSON.stringify({pass:!failures.length,checks,failures},null,2));
if(failures.length)process.exitCode=1;
