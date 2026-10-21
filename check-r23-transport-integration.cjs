'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Path2D,DOMMatrix}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const repo=__dirname,docs=path.join(repo,'docs'),out=process.env.FLATLAND_PROOF_DIR||'/private/tmp/flatland-r22';fs.mkdirSync(out,{recursive:true});
const scripts=[...fs.readFileSync(path.join(docs,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]);
function setup(version,width=1280,height=760,viewer=false,palette=''){
 const values=new Map(),nodes=new Map(),localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))};
 localStorage.setItem('flatland.palette.v1',JSON.stringify({preset:'F3',colors:{}}));
 function element(id){
  if(nodes.has(id))return nodes.get(id);const listeners={};
  const node=['possibility-world','outer-world'].includes(id)?createCanvas(width,height):{};
  Object.assign(node,{id,dataset:{},style:{setProperty(){}},classList:{contains(){return false;}},addEventListener(type,fn){(listeners[type]??=[]).push(fn);},dispatch(type,event){for(const fn of listeners[type]||[])fn(event);},append(){},replaceChildren(){},setAttribute(name,value){this[name]=value;},getBoundingClientRect(){return{x:0,y:0,left:0,top:0,right:width,bottom:height,width,height};},focus(){},setPointerCapture(){}});
  nodes.set(id,node);return node;
 }
 let count=0;
 const documentEvents={};
 const document={body:{classList:{contains:name=>name===(viewer?'viewer':'workbench')}},hidden:false,getElementById:element,querySelector(){return null;},querySelectorAll(){return[];},addEventListener(type,fn){(documentEvents[type]??=[]).push(fn);},dispatch(type,event){for(const fn of documentEvents[type]||[])fn(event);},createElement:tag=>tag==='canvas'?createCanvas(300,150):element('created-'+(++count))};
 const sandbox={console,document,localStorage,Path2D,DOMMatrix,URLSearchParams,URL,location:{search:'?mode=interactive&version='+version+'&palette='+palette,href:'https://titianharold.github.io/ESCFlatland/workbench.html?version='+version},history:{replaceState(){}},performance:{now:()=>0},devicePixelRatio:1,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame(){},OffscreenCanvas:class{constructor(w,h){return createCanvas(w,h);}},setTimeout,clearTimeout};sandbox.window=sandbox;sandbox.globalThis=sandbox;
 const context=vm.createContext(sandbox);
 for(const filename of scripts){let source=fs.readFileSync(path.join(docs,filename),'utf8');if(filename==='app.js')source=source.replace(/\}\)\(\);\s*$/,`window.__innerCheck={seekRaw:raw=>seek(timing.playbackAt(raw)),setMode,restart,view:()=>view(),point:(x,y)=>{const v=view(),s=scale(v);return {x:state.w/2+(x-v.x)*s,y:state.h/2+(y-v.y)*s};},step:dt=>{tickStory(dt);state.ambient+=dt;if(sceneTime()<58)homeFrame();},snapshot:()=>({encounter:encounter.snapshot(),actions:actions.snapshot(),time:player.time,target:player.target,playing:player.playing,mode:player.mode,raw:sceneTime(),inner:innerState(),workGate:workProgress.snapshot(),chaseGate:chaseProgress.snapshot(),review:state.reviewPaused,palette:palette.getConfig(),version:version.id,factoryAmbient:state.factoryAmbient}),draw:()=>{const t=sceneTime(),v=view(t);draw(t,v);interfaceState(v,t);},parents:()=>{const f=homeFrame(),v=view(),s=scale(v);return f.actors.filter(e=>e.id==='father'||e.id==='mother').map(e=>({id:e.id,x:state.w/2+(e.body.x-v.x)*s,y:state.h/2+(e.body.y-v.y)*s}));},journey:()=>journeyData(sceneTime()),plant:()=>factoryFrame(sceneTime()),home:()=>homeFrame(),ending:()=>dimension.endingLight(sceneTime(),viewport()),node:id=>$(id)};\n})();`);vm.runInContext(source,context,{filename});}
 const T=sandbox.__innerCheck,step=seconds=>{for(let i=0;i<Math.round(seconds*20);i++)T.step(.05);};
 const press=(x=15,y=15)=>element('stage').dispatch('pointerdown',{button:0,pointerId:1,clientX:x,clientY:y}),release=(x=15,y=15)=>element('stage').dispatch('pointerup',{button:0,pointerId:1,clientX:x,clientY:y});
 const click=(x,y)=>{press(x,y);release(x,y);};
 const save=name=>{T.draw();const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.drawImage(element('possibility-world'),0,0);ctx.drawImage(element('outer-world'),0,0);fs.writeFileSync(path.join(out,version+'-'+name+'.png'),c.toBuffer('image/png'));};
 return{T,step,click,press,release,save,sandbox};
}





const along=body=>body.x*Math.cos(.4)+body.y*Math.sin(.4);
const Q=setup('routine'),{T,press,release}=Q;
T.seekRaw(77.1);press();let previous=along(T.plant().hero),red=null,redSpeeds=[],retreat=0,lag=[];
for(let i=0;i<650;i++){
 T.step(.01);const snap=T.snapshot(),body=T.plant().hero,x=along(body),speed=(previous-x)/.01;
 if(x>previous)retreat+=x-previous;
 if(snap.actions.factory.exhausted&&snap.raw<78.49){if(red===null)red=i*.01;redSpeeds.push(speed);lag.push(snap.factoryAmbient-snap.raw);}
 previous=x;
}
T.draw();assert(red!==null);assert(retreat>10);assert(redSpeeds.every(v=>Math.abs(v-250)<1e-6),'exhausted app movement stays at belt speed');
assert.equal(T.node('stage').dataset.blocked,'0.333','the visible ring records the completed correction node independently of held effort');
const paused=T.snapshot();T.node('play').dispatch('click',{});for(let i=0;i<100;i++)T.step(.01);const afterPause=T.snapshot();assert.equal(afterPause.raw,paused.raw);assert.equal(afterPause.factoryAmbient,paused.factoryAmbient);assert.equal(afterPause.actions.factory.fatigue,paused.actions.factory.fatigue);
T.node('play').dispatch('click',{});T.step(.01);assert(T.snapshot().raw>paused.raw);release();T.seekRaw(77.2);const reset=T.snapshot();assert.equal(reset.factoryAmbient,77.2);assert.equal(reset.actions.factory.fatigue,0);T.restart();assert.equal(T.snapshot().raw,0);assert.equal(T.snapshot().factoryAmbient,0);
console.log(JSON.stringify({realApp:true,retreat,redAt:red,postRedSpeed:[Math.min(...redSpeeds),Math.max(...redSpeeds)],redFrames:redSpeeds.length,pauseFreezesMotionAndFatigue:true,seekAndRestartClearDelay:true,ambientLag:[Math.min(...lag),Math.max(...lag)]}));

const R=setup('routine'),C=setup('routine');R.T.seekRaw(77.1);C.T.seekRaw(77.1);R.press();C.T.node('play').dispatch('click',{});
for(let i=0;i<650;i++){R.T.step(.01);C.T.step(.01);}
assert(Math.abs(R.T.snapshot().factoryAmbient-C.T.snapshot().factoryAmbient)<1e-7,'background time follows elapsed wall time independently of held resistance');
console.log(JSON.stringify({ambientClockComparison:{held:R.T.snapshot().factoryAmbient,unheld:C.T.snapshot().factoryAmbient,difference:R.T.snapshot().factoryAmbient-C.T.snapshot().factoryAmbient}}));
R.release();let reached=false,contact=false,maxReleasedSpeed=0;
const compact=R.sandbox.FlatlandRoutineFactory.anchors.compact;let prior=along(R.T.plant().hero),arrivalAt=null;
for(let i=0;i<1200;i++){
 const before=R.T.snapshot().raw;R.T.step(.01);const current=R.T.snapshot(),plant=R.T.plant(),body=plant.hero,entry=plant.actors.find(actor=>actor.id==='hero');
 if(before<78.48&&current.raw<78.49)maxReleasedSpeed=Math.max(maxReleasedSpeed,(prior-along(body))/.01);
 if(current.raw>=78.5){reached=true;arrivalAt??=6.5+(i+1)*.01;assert(Math.hypot(body.x-compact.x,body.y-compact.y)<1e-7,'the delayed child physically arrives at the die before pressing');}
 if(entry.routine.compacting.contact){contact=true;assert(entry.routine.compacting.force===1);break;}
 prior=along(body);
}
assert(reached&&contact,'a complete app hold still reaches a real delayed press contact');assert(Math.abs(maxReleasedSpeed-250)<1e-6,'releasing an exhausted hold does not add a catch-up speed');
console.log(JSON.stringify({delayedArrivalWallSeconds:arrivalAt,actualDieContact:true,releaseBeltSpeed:maxReleasedSpeed}));
