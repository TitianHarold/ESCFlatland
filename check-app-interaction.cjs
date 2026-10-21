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
 for(const filename of scripts){let source=fs.readFileSync(path.join(docs,filename),'utf8');if(filename==='app.js')source=source.replace(/\}\)\(\);\s*$/,`window.__innerCheck={seekRaw:raw=>seek(timing.playbackAt(raw)),setMode,restart,view:()=>view(),point:(x,y)=>{const v=view(),s=scale(v);return {x:state.w/2+(x-v.x)*s,y:state.h/2+(y-v.y)*s};},step:dt=>{tickStory(dt);state.ambient+=dt;if(sceneTime()<58)homeFrame();},snapshot:()=>({encounter:encounter.snapshot(),actions:actions.snapshot(),time:player.time,target:player.target,playing:player.playing,mode:player.mode,raw:sceneTime(),inner:innerState(),workGate:workProgress.snapshot(),chaseGate:chaseProgress.snapshot(),review:state.reviewPaused,palette:palette.getConfig(),version:version.id}),draw:()=>{const t=sceneTime(),v=view(t);draw(t,v);interfaceState(v,t);},parents:()=>{const f=homeFrame(),v=view(),s=scale(v);return f.actors.filter(e=>e.id==='father'||e.id==='mother').map(e=>({id:e.id,x:state.w/2+(e.body.x-v.x)*s,y:state.h/2+(e.body.y-v.y)*s}));},journey:()=>journeyData(sceneTime()),plant:()=>factoryFrame(sceneTime()),home:()=>homeFrame(),ending:()=>dimension.endingLight(sceneTime(),viewport()),node:id=>$(id)};\n})();`);vm.runInContext(source,context,{filename});}
 const T=sandbox.__innerCheck,step=seconds=>{for(let i=0;i<Math.round(seconds*20);i++)T.step(.05);};
 const press=(x=15,y=15)=>element('stage').dispatch('pointerdown',{button:0,pointerId:1,clientX:x,clientY:y}),release=(x=15,y=15)=>element('stage').dispatch('pointerup',{button:0,pointerId:1,clientX:x,clientY:y});
 const click=(x,y)=>{press(x,y);release(x,y);};
 const save=name=>{T.draw();const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.drawImage(element('possibility-world'),0,0);ctx.drawImage(element('outer-world'),0,0);fs.writeFileSync(path.join(out,version+'-'+name+'.png'),c.toBuffer('image/png'));};
 return{T,step,click,press,release,save,sandbox};
}




const pos=b=>({x:b.x,y:b.y}),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(const version of ['routine','rhythm']){
 const Q=setup(version),{T,step,click,press,release}=Q,snap=()=>T.snapshot();
 const at=(x,y)=>{const p=T.point(x,y);click(p.x,p.y);};
 step(1);assert.equal(snap().raw,0);assert.equal(snap().encounter.familyVisited.length,0);
 let before=pos(T.home().hero);at(850,825);assert(distance(before,T.home().hero)<.001,'floor clicks cannot teleport');
 step(.8);assert(distance(before,T.home().hero)>10,'floor clicks move the actual body');
 before=pos(T.home().hero);at(690,740);assert(distance(before,T.home().hero)<.001,'midroute retarget must start from the displayed pose');step(1.8);
 assert(distance(T.home().hero,{x:690,y:740})<18);assert.equal(snap().encounter.familyVisited.length,0);
 for(const id of ['mother','father']){
  const parent=T.parents().find(p=>p.id===id);click(parent.x,parent.y);assert.equal(snap().encounter.familyTarget,id);
  let complete=false;
  for(let i=0;i<200;i++){step(.05);if(snap().encounter.familyVisited.includes(id)){complete=true;break;}}
  assert(complete,id+' actual contact must complete through pointer mapping');
  if(id==='mother'){assert(!snap().encounter.familyDone);assert(snap().raw<17.3);step(.3);}
 }
 for(let i=0;i<160&&!snap().encounter.familyDone;i++)step(.05);
 assert(snap().encounter.familyDone);assert(distance(T.home().hero,{x:800,y:660})<.1);assert(snap().raw>=17.3);
 T.seekRaw(60);press();step(.35);T.draw();assert.equal(T.node('effort-indicator').dataset.visible,'true');assert(snap().actions.factory.offset>0);
 assert(distance(T.view(),{x:T.plant().hero.x,y:T.plant().hero.y-160})<.00001,'gate camera follows resistance result');release();
 T.seekRaw(version==='routine'?77.05:77.15);press();step(.7);
 const first={hero:pos(T.plant().hero),camera:pos(T.view())};step(.3);T.draw();
 const second={hero:pos(T.plant().hero),camera:pos(T.view())};assert(distance(first.hero,second.hero)>1);assert(distance({x:second.camera.x-first.camera.x,y:second.camera.y-first.camera.y},{x:second.hero.x-first.hero.x,y:second.hero.y-first.hero.y})<.0001,'camera displacement follows actual resistance');
 step(2.3);T.draw();assert(snap().actions.factory.exhausted);assert.equal(T.node('effort-indicator').dataset.state,'exhausted');assert.equal(T.node('hold-indicator').dataset.visible,'false');
 T.node('stage').dispatch('blur',{});assert(!snap().actions.factory.held,'focus loss releases resistance');press();step(.6);assert(snap().actions.factory.exhausted);assert.equal(snap().actions.factory.effort,0);release();press();step(.08);assert(snap().actions.factory.weak>.7);release();T.seekRaw(77.2);T.node('stage').dispatch('keydown',{key:' ',repeat:false,preventDefault(){}});assert(snap().actions.factory.held);Q.sandbox.document.dispatch('keyup',{key:' ',preventDefault(){}});assert(!snap().actions.factory.held,'keyup outside stage still releases resistance');T.restart();assert.equal(snap().raw,0);assert.equal(snap().encounter.familyVisited.length,0);assert.equal(snap().actions.factory.fatigue,0);assert.equal(snap().inner.collected,0);assert.equal(snap().chaseGate.charge,0);assert.equal(snap().workGate.target,0);
 T.seekRaw(135);T.draw();assert.equal(T.ending().entityId,'hero-seed');assert(T.ending().r>3);Q.save('hands-seed');
 T.seekRaw(65);Q.save('overview');T.seekRaw(77.2);press();step(.7);T.draw();Q.save('resist');release();
 const V=setup(version,1280,760,true);V.T.seekRaw(135);V.T.draw();assert.equal(V.T.node('replay').hidden,true,'replay stays hidden while the last shot is unfinished');V.T.seekRaw(138);V.T.draw();assert.equal(V.T.node('replay').hidden,false);V.T.node('replay').dispatch('click',{});assert.equal(V.T.snapshot().raw,0);assert.equal(V.T.snapshot().encounter.familyVisited.length,0);
 if(version==='routine'){T.seekRaw(98);for(let i=0;i<8;i++)click(2,2);step(1.2);assert(snap().workGate.darkness>0,'work fades automatically on reaching maximum pullback');step(6);assert(Math.abs(snap().raw-110)<1e-8);}
 console.log(version+': real floor/parent navigation, actual camera follow, gate input, fatigue/red collapse, replay and POV seed passed');
}
console.log('App pointer integration passed; screenshots: '+out);
