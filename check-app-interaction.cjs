'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Path2D,DOMMatrix}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const repo=__dirname,docs=path.join(repo,'docs'),out=process.env.FLATLAND_PROOF_DIR||'/private/tmp/flatland-r24';fs.mkdirSync(out,{recursive:true});
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
 for(const filename of scripts){let source=fs.readFileSync(path.join(docs,filename),'utf8');if(filename==='app.js')source=source.replace(/\}\)\(\);\s*$/,`window.__innerCheck={seekRaw:raw=>seek(timing.playbackAt(raw)),setMode,restart,view:()=>view(),point:(x,y)=>{const v=view(),s=scale(v);return {x:state.w/2+(x-v.x)*s,y:state.h/2+(y-v.y)*s};},step:dt=>{tickStory(dt);if(!state.reviewPaused)state.ambient+=dt;if(sceneTime()<58)homeFrame();},snapshot:()=>({encounter:encounter.snapshot(),actions:actions.snapshot(),correction:state.correction,time:player.time,target:player.target,playing:player.playing,mode:player.mode,raw:sceneTime(),inner:innerState(),workGate:workProgress.snapshot(),chaseGate:chaseProgress.snapshot(),peel:peel.snapshot(),ending:ending.snapshot(),ambient:state.ambient,background:state.factoryAmbient,review:state.reviewPaused,palette:palette.getConfig(),version:version.id}),draw:()=>{const t=sceneTime(),v=view(t);draw(t,v);interfaceState(v,t);},parents:()=>{const f=homeFrame(),v=view(),s=scale(v);return f.actors.filter(e=>e.id==='father'||e.id==='mother').map(e=>({id:e.id,x:state.w/2+(e.body.x-v.x)*s,y:state.h/2+(e.body.y-v.y)*s}));},journey:()=>journeyData(sceneTime()),plant:()=>factoryFrame(sceneTime()),home:()=>homeFrame(),ending:()=>dimension.endingLight(sceneTime(),viewport()),node:id=>$(id)};\n})();`);vm.runInContext(source,context,{filename});}
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
 T.seekRaw(44);press();assert(snap().encounter.effects.flinch>0,'press responds immediately before release');release();let priorRaw=snap().raw,retreated=false;
 for(let i=0;i<100;i++){T.step(.01);retreated||=snap().raw<priorRaw;assert(snap().encounter.effects.pace<=1,'escort never catches up with a speed burst');priorRaw=snap().raw;}assert(retreated,'the click makes the escorted child slowly retreat');
 if(version==='routine'){
  T.seekRaw(70.68);press();step(.05);assert.equal(snap().correction.node,'mold','touching the platform takes over even during a continuous hold');assert(snap().correction.held);assert.equal(snap().actions.factory.velocity,0,'old conveyor resistance stops at node entry');assert(snap().correction.effortProgress>0,'partly filled effort survives the behavior switch');release();
 }
 if(version==='routine'){T.seekRaw(72);const base=pos(T.plant().hero),point=T.point(base.x+100,base.y);press(point.x,point.y);step(.25);const dash=distance(base,T.plant().hero);assert(dash>35,'a mold click accelerates the actual child out toward the edge');step(.15);assert(distance(base,T.plant().hero)<dash*.2,'the sudden edge collision has already knocked the child back');release();step(.5);T.draw();assert.equal(T.node('stage').dataset.correctionNode,'mold');assert.equal(T.node('stage').dataset.fatigue,'0.000');}
 if(version==='routine'){
  for(const [raw,seconds]of [[72,.25],[79.5,.8],[83.5,.8]]){
   T.seekRaw(raw);const ambient=snap().background;press();assert(snap().correction.processPaused,'the press owns the process immediately');step(seconds);assert.equal(snap().raw,raw,'the active station does not advance during its reaction');assert(snap().background>ambient,'background production keeps its own clock');
   release();const releasedRaw=snap().raw;step(.15);assert.equal(snap().raw,releasedRaw,'return and settling finish before process time resumes');step(.65);assert(snap().raw>releasedRaw,'the same station resumes without another click');
   T.seekRaw(raw);T.node('play').dispatch('click',{});step(.5);assert(snap().raw>raw,'station interaction is optional');
  }
 }
 T.seekRaw(60);press();step(.35);T.draw();assert.equal(T.node('effort-indicator').dataset.visible,'true');assert(snap().actions.factory.offset>0);
 assert(distance(T.view(),{x:T.plant().hero.x,y:T.plant().hero.y-160})<400,'gate tracking keeps the actual child inside its soft region');release();
 T.seekRaw(version==='routine'?77.05:77.15);press();step(.7);
 const first={hero:pos(T.plant().hero),camera:pos(T.view())};step(.3);T.draw();
 const second={hero:pos(T.plant().hero),camera:pos(T.view())};assert(distance(first.hero,second.hero)>1);assert(distance({x:second.camera.x-first.camera.x,y:second.camera.y-first.camera.y},{x:second.hero.x-first.hero.x,y:second.hero.y-first.hero.y})>1,'resistance moves the child within the image rather than locking it to the camera');
 step(2.3);T.draw();assert(snap().actions.factory.exhausted);assert.equal(T.node('effort-indicator').dataset.state,'exhausted');if(version==='routine')assert.equal(T.node('stage').dataset.blocked,undefined);assert.equal(T.node('hold-indicator').dataset.visible,'false');
 T.node('stage').dispatch('blur',{});assert(!snap().actions.factory.held,'focus loss releases resistance');press();step(.6);assert(snap().actions.factory.exhausted);assert.equal(snap().actions.factory.effort,0);release();press();step(.08);assert(snap().actions.factory.weak>.7);release();T.seekRaw(77.2);T.node('stage').dispatch('keydown',{key:' ',repeat:false,preventDefault(){}});assert(snap().actions.factory.held);Q.sandbox.document.dispatch('keyup',{key:' ',preventDefault(){}});assert(!snap().actions.factory.held,'keyup outside stage still releases resistance');T.restart();assert.equal(snap().raw,0);assert.equal(snap().encounter.familyVisited.length,0);assert.equal(snap().actions.factory.fatigue,0);assert.equal(snap().inner.collected,0);assert.equal(snap().chaseGate.charge,0);assert.equal(snap().workGate.target,0);
 T.seekRaw(135);T.draw();assert.equal(T.ending().entityId,'hero-seed');assert(T.ending().r>3);Q.save('hands-seed');
 T.seekRaw(65);Q.save('overview');T.seekRaw(77.2);press();step(.7);T.draw();Q.save('resist');release();
 const V=setup(version,1280,760,true);V.T.seekRaw(135);V.T.draw();assert.equal(V.T.node('replay').hidden,true,'replay stays hidden while the last shot is unfinished');V.T.seekRaw(138);V.T.draw();assert.equal(V.T.node('replay').hidden,false);V.T.node('replay').dispatch('click',{});assert.equal(V.T.snapshot().raw,0);assert.equal(V.T.snapshot().encounter.familyVisited.length,0);
 if(version==='routine'){T.seekRaw(98);for(let i=0;i<8;i++)click(2,2);step(1.2);assert(snap().workGate.darkness>0,'work fades automatically on reaching maximum pullback');step(6);assert(Math.abs(snap().raw-110)<1e-8);}

 T.seekRaw(110);T.node('play').dispatch('click',{});step(.6);assert.equal(snap().inner.points.filter(p=>p.visible&&!p.collected).length,2);
 for(let i=0;i<6;i++){const dot=snap().inner.points.find(p=>p.visible&&!p.collected);click(dot.x,dot.y);step(.5);if(i>0&&i<5)assert.equal(snap().inner.points.filter(p=>p.visible&&!p.collected).length,1);}
 step(2);assert(snap().inner.awaitingCenter);const lit=snap().inner.progress;step(3);assert.equal(snap().inner.progress,lit,'a fully lit inner world waits for the central click');click(5,5);assert(snap().inner.awaitingCenter);click(snap().inner.center.x,snap().inner.center.y);step(2.1);assert(snap().raw>=119,'clicking the central seed releases the shrink transition');
 T.seekRaw(123);click(10,10);step(.7);assert.equal(snap().peel.filter(value=>value===1).length,1,'one short click releases exactly one coat panel');step(.8);assert.equal(snap().peel.filter(value=>value===1).length,1,'time cannot remove another panel');press();step(.6);release();step(.2);assert.equal(snap().peel.filter(value=>value===1).length,1,'holding accelerates without peeling');click(10,10);step(.7);assert.equal(snap().peel.filter(value=>value===1).length,2);
 T.node('play').dispatch('click',{});const frozen=snap();step(.8);assert.equal(snap().raw,frozen.raw);assert.equal(snap().ambient,frozen.ambient);assert.deepEqual(snap().peel,frozen.peel);T.draw();assert.equal(T.node('play')['aria-label'],'播放');
 press();step(6.4);release();assert(snap().peel.every(v=>v===1),'charging the final burst clears all remaining paint before the hands');
 T.seekRaw(132);click(10,10);step(1.3);assert.equal(snap().ending.phase,'open');assert.equal(snap().ending.clicks,1);step(2);assert.equal(snap().ending.phase,'open','the second hand discovery waits for another click');click(10,10);step(1.1);assert.equal(snap().ending.phase,'half');click(10,10);step(3.9);assert.equal(snap().ending.phase,'tools');assert.equal(snap().ending.toolsReveal,1);step(3);assert.equal(snap().ending.phase,'tools','the palette and brush wait for a fourth click');
 T.node('play').dispatch('click',{});const endingFrozen=snap().ending;step(.7);assert.deepEqual(snap().ending,endingFrozen,'pause freezes the final hand and light action');T.node('play').dispatch('click',{});click(10,10);step(8);assert(snap().ending.complete);assert.equal(snap().ending.handsOpacity,0);assert.equal(snap().ending.expansion,1);assert.equal(snap().ending.lightOpacity,0);assert.equal(snap().ending.text,'Let’s explore a new dimension');assert.equal(snap().ending.title,undefined);Q.save('new-dimension');
 const review=setup(version);review.T.setMode('auto');review.step(version==='routine'?122:112);assert.equal(review.T.snapshot().raw,138,'automatic review completes the expanded ending');assert(review.T.snapshot().ending.complete);
 console.log(version+': real family navigation, soft camera, held resistance, true pause, cumulative peeling, four ending clicks and new title passed');
}
console.log('App pointer integration passed; screenshots: '+out);
