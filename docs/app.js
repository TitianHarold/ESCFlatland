/* Scene clocks drive the machinery; camera tracking reads the resolved actor pose. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),on=(id,event,fn)=>$(id)?.addEventListener(event,fn);
  const workbench=document.body.classList.contains('workbench');
  const stage=$('stage'),lower=$('possibility-world'),upper=$('outer-world');
  const low=lower.getContext('2d'),mainTop=upper.getContext('2d'),top=mainTop;
  const params=new URLSearchParams(location.search),version=window.FlatlandStoryVersions.get(params.get('version'));
  const cameraTrack=version.camera,characters=window.FlatlandCharacters,motion=window.FlatlandMotion;
  const district=window.FlatlandDistrict,factory=version.factory,dimension=window.FlatlandDimension;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),timing=version.timing,duration=timing.duration;
  factory.setPlaybackClock?.(timing.playbackAt);
  const palette=window.FlatlandPalette;
  // Paths are supplied with the final transparent hand assets; white remains until they load.
  dimension.setEndingAssets(window.FlatlandEndingAssets||{hands:'assets/pov-hands-open-fair-r19.png',flexedHands:'assets/pov-hands-flexed-fair-r19.png',brushHands:'assets/pov-hands-brush-r23.png',toolsHands:'assets/pov-hands-tools-r24.png',layout:{left:[0,0,.5,1],right:[.5,0,.5,1],wristLeft:[.525,.60],wristRight:[.55,.60]}});
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mode=params.get('mode')==='auto'?'auto':'interactive';
  const player=new window.FlatlandStoryPlayer({duration,timing,beats:version.beats,mode,playing:mode==='auto'&&!workbench&&!reduced.matches});
  const initialTime=Number(params.get('t'));if(initialTime>0){player.seek(initialTime);player.playing=mode==='auto'&&!workbench&&!reduced.matches;}
  const encounterAPI=window.FlatlandEncounterInteraction,encounter=new encounterAPI.EncounterController({sceneTime:timing.sceneAt(player.time)}),actions=new window.FlatlandActionInput.Actions();
  const progressAPI=window.FlatlandInteractionProgress,workProgress=new progressAPI.WorkProgress({raw:timing.sceneAt(player.time)}),chaseProgress=new progressAPI.ChaseProgress({raw:timing.sceneAt(player.time)});
  const peel=new progressAPI.PaintPeel(),ending=new window.FlatlandEndingProgress.Session(),follow=new window.FlatlandCamera.Follow();
  const correction=factory.NodeResistance?new factory.NodeResistance():null;
  const discovery=window.FlatlandInnerDiscovery,inner=new discovery.Session({autoDuration:timing.playbackAt(119)-timing.playbackAt(110)});
  const state={last:0,ambient:0,open:false,layer:0,w:0,h:0,dpr:1,pointer:null,innerPointer:false,scenePointer:false,innerActive:false,workActive:false,chaseActive:false,endingActive:false,chaseOrigin:Math.max(119,timing.sceneAt(player.time)),reviewPaused:workbench,modalResume:false,inputAt:-Infinity,pressAge:0,chasePointer:false,cameraView:null,factoryAmbient:timing.sceneAt(player.time),lookOffset:0,lookTrail:[],lastLight:null,factoryKeyHeld:false,factoryPressPoint:null,correction:null};
  const cavity=new Path2D('M-49 7 C-57-17-33-44-9-48 C15-57 30-31 47-6 C60 16 35 43 7 45 C-24 51-53 35-49 7Z');
  function sceneTime(){return timing.sceneAt(player.time);}
  function familyPhase(time=sceneTime()){return time<encounterAPI.familyEnd-1e-7;}
  function targetView(time=sceneTime()){
    if(time>=132)return{space:'pov',shotId:'dimension',x:0,y:0,zoom:1,tilt:0,yaw:0,screenY:.5};
    if(time<119&&cameraTrack.track){
      const hero=time<58?homeFrame(time).hero:factoryFrame(time).hero;
      const reference=time>=district.timing.firstMove&&time<58?district.cameraTarget?.(time):undefined;
      return{...cameraTrack.track(time,hero,reference),resisting:time<58&&encounter.snapshot().effects.load>.05};
    }
    const v=cameraTrack.pose(time);
    if(v.follow==='hero'){const hero=factoryFrame(time).hero;if(hero)return{...v,x:hero.x,y:hero.y};}
    return v;
  }
  function view(time=sceneTime()){return Math.abs(time-sceneTime())<1e-7&&state.cameraView?state.cameraView:targetView(time);}
  function updateCamera(dt,reset=false){
    const time=sceneTime(),goal=targetView(time),hero=time<58?homeFrame(time).hero:time<119?factoryFrame(time).hero:null;
    state.cameraView=reset?follow.reset(goal):follow.update(goal,hero,viewport(),dt);
  }
  function workPhase(time=sceneTime()){return version.id==='routine'&&time>=98&&time<110;}
  function factoryPhase(time=sceneTime()){return time>=58&&time<(version.id==='routine'?94:98);}
  function chasePhase(time=sceneTime()){return time>=119&&time<132;}
  function inputPhase(){const t=sceneTime();return inInner(t)?'inner':familyPhase(t)?'family':t<district.timing.firstMove?'authority':t<58?'escort':factoryPhase(t)?'factory':workPhase(t)?'work':t>=132?'ending':t>=119?'chase':'transfer';}
  function homeFrame(time=sceneTime()){const frame=encounter.applyFrame(district.frame(time));return time>=58&&time<(version.id==='routine'?67.4:70)?district.withGateEscort(frame,time,factoryFrame(time).hero,factory.entryEscortBody):frame;}
  let factoryCache={key:null,frames:new Map()};
  function factoryFrame(time,bounds){
    const effort={...actions.snapshot().factory,transportResolved:true},cacheable=time>=58&&time<96;
    const key=cacheable?[time,state.factoryAmbient,effort.offset,effort.preload,effort.effort,effort.stride,effort.pulse,effort.exhausted,state.correction?.age,state.correction?.level].join(':'):null;
    const region=bounds?Object.values(bounds).join(':'):'all';
    if(cacheable){if(factoryCache.key!==key)factoryCache={key,frames:new Map()};if(factoryCache.frames.has(region))return factoryCache.frames.get(region);}
    const base=factory.frame(time,bounds);
    if(!factoryPhase(time))return base;
    const result=factory.withResistance?.(base,effort.offset,time,effort)||base;
    result.actors=result.actors.map(entry=>entry.id==='hero'?{...entry,resistancePulse:effort.pulse,resistanceExhausted:effort.exhausted}:entry);
    if(cacheable)factoryCache.frames.set(region,result);return result;
  }
  function visibleBounds(v){const s=scale(v);return{minX:v.x-state.w/s/2,maxX:v.x+state.w/s/2,minY:v.y-state.h/s/2,maxY:v.y+state.h/s/2,scale:s};}
  function materialWindows(frame,bounds){
    return frame.actors.filter(entry=>entry.cavity).map(entry=>{
      const points=entry.actor.outline(entry.body),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      return{minX:Math.min(...xs)-3,minY:Math.min(...ys)-3,maxX:Math.max(...xs)+3,maxY:Math.max(...ys)+3};
    }).filter(b=>b.maxX>=bounds.minX&&b.minX<=bounds.maxX&&b.maxY>=bounds.minY&&b.minY<=bounds.maxY);
  }
  function scale(v){return Math.min(state.w/1280,state.h/760)*v.zoom;}
  function screen(ctx){ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.clearRect(0,0,state.w,state.h);}
  function placeWorld(ctx,v){const t=sceneTime(),jolt=version.id==='routine'&&t>=79.25&&t<79.65?factory.compactAt(t).recoil*1.6:0;ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.translate(state.w/2+jolt,state.h/2);ctx.scale(scale(v),scale(v));ctx.translate(-v.x,-v.y);}
  function world(ctx,v){screen(ctx);placeWorld(ctx,v);}
  function transform(ctx,b){ctx.translate(b.x,b.y);ctx.rotate(b.angle||0);ctx.scale(b.sx??1,b.sy??1);}
  function cavityTransform(ctx,actor,body){
    if(actor.kind==='child'){const stretch=1+Math.max(-.15,Math.min(.32,body.axialStretch??0)),head=actor.vertices[actor.headIndex],angle=Math.atan2(head[1],head[0]);ctx.rotate(angle);ctx.scale(stretch,1/stretch);ctx.rotate(-angle);ctx.scale(motion.geometry.childScale,motion.geometry.childScale);return;}
    const xs=actor.vertices.map(p=>p[0]),ys=actor.vertices.map(p=>p[1]);
    ctx.translate((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2);
    ctx.scale((Math.max(...xs)-Math.min(...xs))/135,(Math.max(...ys)-Math.min(...ys))/145);
  }
  const fractureTile=document.createElement('canvas'),fractureContext=fractureTile.getContext('2d');
  function fracture(entry,damage,context){
    const top=context||mainTop;
    if(damage<.06)return;
    const matrix=top.getTransform(),detail=Math.hypot(matrix.a,matrix.b)>.10;
    let region;
    if(sceneTime()<104){
      const corners=[[-65,-65],[65,-65],[65,65],[-65,65]].map(([x,y])=>[matrix.a*x+matrix.c*y+matrix.e,matrix.b*x+matrix.d*y+matrix.f]);
      const x=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))-2),y=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))-2);
      region={x,y,w:Math.max(0,Math.min(lower.width,Math.ceil(Math.max(...corners.map(p=>p[0])))+2)-x),h:Math.max(0,Math.min(lower.height,Math.ceil(Math.max(...corners.map(p=>p[1])))+2)-y)};
      if(region.w&&region.h){fractureTile.width=region.w;fractureTile.height=region.h;fractureContext.drawImage(lower,region.x,region.y,region.w,region.h,0,0,region.w,region.h);}
    }
    if(detail&&!entry.textureWindow){
      const rim=[[-53,-42],[-21,-53],[10,-55],[40,-38],[58,-13],[57,20],[32,45],[0,53],[-32,45],[-54,18],[-58,-12]],pressure=clamp(entry.force||0);
      top.fillStyle=palette.night;top.fill(cavity);
      for(let i=0;i<rim.length;i++){
        const a=rim[i],b=rim[(i+1)%rim.length],cx=(a[0]+b[0])/3,cy=(a[1]+b[1])/3;
        const spread=damage*(1.8+pressure*2.2),dx=cx/28*spread,dy=cy/28*spread;
        const shard=new Path2D();shard.moveTo(-8+(i%3)*2,3-i%2*4);shard.lineTo(a[0],a[1]);shard.lineTo((a[0]+b[0])/2+3*Math.sin(i), (a[1]+b[1])/2);shard.lineTo(b[0],b[1]);shard.closePath();
        top.save();top.translate(dx,dy);top.clip(shard);
        // Every fragment still samples the same moving possibility layer.
        top.setTransform(1,0,0,1,0,0);const px=matrix.a*dx+matrix.c*dy,py=matrix.b*dx+matrix.d*dy;
        if(!region)top.drawImage(lower,px,py);else if(region.w&&region.h)top.drawImage(fractureTile,region.x+px,region.y+py);top.restore();
      }
    }
    top.strokeStyle=palette.night;top.lineWidth=.5+damage*3.3;top.lineJoin='miter';
    const cracks=[[-53,-30,-25,-13,-14,7],[-5,-53,3,-23,-14,7],[53,-19,27,-8,13,8],[50,39,26,25,13,8],[-29,48,-23,23,-14,7]];
    cracks.forEach((line,i)=>{if(damage<(i+1)*.13)return;top.beginPath();top.moveTo(line[0],line[1]);top.lineTo(line[2],line[3]);top.lineTo(line[4],line[5]);top.stroke();});
  }
  function drawActor(entry,context){
    const top=context&&typeof context.save==='function'?context:mainTop;
    let b=entry.body;const actor=entry.actor;if(!b||!actor)return;
    const outline=actor.localPath(b);top.save();transform(top,b);
    top.fillStyle=entry.color||palette.ink;top.fill(outline);
    if(entry.cavity){
      top.save();top.clip(outline);cavityTransform(top,actor,b);
      top.globalCompositeOperation='destination-out';top.fill(cavity);top.globalCompositeOperation='source-over';top.clip(cavity);
      const damage=clamp(entry.damage||0);
      fracture(entry,damage,top);
      if(entry.blacken){top.globalAlpha=clamp(entry.blacken);top.fillStyle=palette.ink;top.fillRect(-100,-100,200,200);top.globalAlpha=1;}
      top.restore();
    }
    if(entry.core){top.save();top.globalAlpha=entry.coreReveal??1;dimension.paintSeedGlow(top,0,0,10*(entry.coreScale??1));top.restore();}
    if(entry.label==='reject'&&entry.restraint?.attached!==false)drawFailureMark(top,entry.restraint);
    factory.drawActorOverlay?.(top,entry,dimension.paintSeedGlow);
    if(entry.resistancePulse){top.save();top.globalAlpha=entry.resistancePulse*.65;top.strokeStyle=entry.resistanceExhausted?'#e74b47':palette.gold;top.lineWidth=2.5;top.stroke(outline);top.restore();}
    top.restore();
    if(entry.emotion){
      window.FlatlandEmotions.draw(top,entry.emotion,b.x+15,b.y-(actor.kind==='mother'?120:95),entry.emotionElapsed??.3,entry.emotionDuration??1.2);
    }
  }
  function drawFailureMark(ctx,restraint={}){
    window.FlatlandRestraint.draw(ctx,restraint,palette);
  }

  const heroTexture=document.createElement('canvas');heroTexture.width=heroTexture.height=256;
  const heroTextureContext=heroTexture.getContext('2d'),textureExtent=160;
  const heroMaterial=document.createElement('canvas');heroMaterial.width=heroMaterial.height=256;
  const heroMaterialContext=heroMaterial.getContext('2d');
  function journeyData(time){
    const interactive=player.mode==='interactive'&&chasePhase(time),drive=chaseProgress.snapshot();
    const base=factoryFrame(Math.min(time,131.999999)),rate=interactive?drive.rate:player.playbackRate,boost=interactive?clamp((rate-.32)/3.88):clamp((rate-1)/.8);
    const original=base.actors.find(a=>a.id==='hero'),sprinting=time>=119&&time<132;
    const speed=(original?.body.speed||base.chase?.speed||0)*rate,shape=motion.speedShape(speed);
    const body=original&&sprinting?{...original.body,angle:original.body.angle+state.lookOffset,speed,axialStretch:shape.axialStretch,strain:shape.strain,effort:boost}:original?.body;
    const entry=original?{...original,body}:undefined;
    const guide=base.light&&body?{...base.light,x:body.x+(base.light.x-body.x)*1.10,y:body.y+(base.light.y-body.y)*1.10,guideOffset:base.light.guideOffset?.map(value=>value*1.10),guideDistanceScale:1.10}:base.light;
    const light=sprinting?dimension.seedLight(time,entry,guide):guide;
    const sample=sprinting?{...base,hero:body,light,chase:{...base.chase,speed:body.speed,inputRate:rate,effort:boost,...(interactive?{travel:drive.travel+state.chaseOrigin-119,baseTravel:time-119,holdGate:true,charge:drive.charge,finishing:drive.finishing,finishAge:drive.finishAge}:{})},actors:base.actors.map(a=>a.id==='hero'?entry:a)}:base;
    const darkness=window.FlatlandInner.darkness(time);
    const ctx=heroTextureContext;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,256,256);
    if(entry){
      const textureBody=time>=132?dimension.journeyPose(time,sample).raw:entry.body;
      const a=256/textureExtent;ctx.setTransform(a,0,0,a,128,128);drawActor({...entry,core:0,routine:entry.routine?{...entry.routine,seed:false}:undefined,textureWindow:true,blacken:version.id==='routine'?entry.blacken:0,body:{...textureBody,x:0,y:0,angle:0}},ctx);
      heroMaterialContext.setTransform(1,0,0,1,0,0);heroMaterialContext.clearRect(0,0,256,256);
      heroMaterialContext.setTransform(a,0,0,a,128-800*a,128-550*a);window.FlatlandPossibility.draw(heroMaterialContext,state.ambient);
      heroMaterialContext.setTransform(1,0,0,1,0,0);heroMaterialContext.globalAlpha=darkness;heroMaterialContext.fillStyle=palette.night;heroMaterialContext.fillRect(0,0,256,256);heroMaterialContext.globalAlpha=1;
      ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-over';ctx.drawImage(heroMaterial,0,0);ctx.globalCompositeOperation='source-over';
    }
    return{...sample,entry,heroTexture,textureExtent,darkness,detachedTag:factoryFrame(time).detachedTag};
  }
  function drawLight(light){
    if(light)dimension.paintSeedGlow(top,light.x,light.y,light.r||10,clamp(light.reveal??1));
  }
  function inInner(time=sceneTime()){return time>=110-1e-7&&time<119-1e-7;}
  function viewport(){return{w:state.w,h:state.h,dpr:state.dpr};}
  function innerState(){return inner.snapshot(viewport());}
  function innerDisplayTime(){return inInner()?timing.playbackAt(110+9*innerState().progress):player.time;}
  function drawInner(){
    const box=viewport(),snapshot=innerState(),b=snapshot.breakProgress;
    const u=snapshot.shrinkProgress;
    screen(low);low.fillStyle=discovery.background;low.fillRect(0,0,state.w,state.h);
    screen(top);top.fillStyle=discovery.background;top.fillRect(0,0,state.w,state.h);
    const startView=view(119),data=journeyData(119),point=dimension.journeyLightPoint(119,startView,box,data);
    if(u>0){top.save();top.globalAlpha=u;dimension.drawJourney(top,119,startView,box,state.ambient,{...data,hideLight:true});top.restore();}
    // The discovered space closes into the same projected seed that leads the chase.
    top.save();
    if(u>0){
      const x=state.w/2+(point[0]-state.w/2)*u,y=state.h/2+(point[1]-state.h/2)*u;
      const cover=1.8*Math.hypot(state.w,state.h),radius=cover*Math.pow(Math.max(1,point[3]*5.5)/cover,u);
      top.translate(x,y);top.scale(radius/50,radius/50);top.clip(cavity);top.scale(50/radius,50/radius);top.translate(-x,-y);
    }
    discovery.draw(top,box,snapshot,{drawContents:(ctx,v)=>window.FlatlandInner.drawContents(ctx,v,state.ambient)});top.restore();
    if(u>0){
      const flight=snapshot.seedFlight,scale=Math.max(state.w/1280,state.h/760);
      const x=state.w/2+(point[0]-state.w/2)*flight,y=state.h/2+(point[1]-state.h/2)*flight,k=scale+(point[3]-scale)*flight;
      screenOverlay();top.save();top.globalAlpha=clamp((b-.35)/.15);dimension.paintArrivalLight(top,[x,y,0,k],119,6,state.w,state.h,true);top.restore();
    }
  }
  function draw(time,v){
    if(time>=132){screen(low);low.fillStyle='#ffffff';low.fillRect(0,0,state.w,state.h);screen(top);dimension.drawEnding(top,time,{w:state.w,h:state.h,dpr:state.dpr},{state:ending.snapshot(),ambient:state.ambient,lightOrigin:state.lastLight,drawContents:(ctx,v,clock)=>window.FlatlandInner.drawContents(ctx,v,clock)});return;}
    if(inInner(time)){drawInner();return;}
    const bounds=visibleBounds(v),plant=time<119?factoryFrame(time,bounds):null;
    if(version.id==='routine'&&time>=96&&time<110){screen(low);low.fillStyle=palette.paper;low.fillRect(0,0,state.w,state.h);}
    else{world(low,v);const regions=time>=64&&time<104&&!state.open&&state.layer<.001?materialWindows(plant,bounds):undefined;window.FlatlandPossibility.draw(low,state.ambient,regions);}
    if(time>=119){
      screen(top);const data=journeyData(time),viewport={w:state.w,h:state.h,dpr:state.dpr};
      const point=dimension.journeyLightPoint(time,v,viewport,data);if(point)state.lastLight=dimension.arrivalLight(point,dimension.chaseArrivalTime(time,data),data.light?.r||10,state.w,state.h);
      if(time<138)dimension.drawJourney(top,time,v,viewport,state.ambient,data);
      else dimension.draw(top,time,v,viewport,state.ambient,data);
      return;
    }
    world(top,v);const s=scale(v),viewport={w:state.w,h:state.h};
    top.fillStyle=time>=61?palette.outside.background:palette.blue;top.fillRect(v.x-state.w/s/2-1,v.y-state.h/s/2-1,state.w/s+2,state.h/s+2);
    const heading=plant.hero?plant.hero.angle+characters.actors.child.headAxis(plant.hero).angle:0;
    if(time<61){
      district.drawBase(top,time);
      const home=homeFrame(time);home.actors.forEach(drawActor);
      if(time>=58)plant.actors.filter(actor=>actor.id==='hero').forEach(drawActor);
      window.FlatlandCityMap.drawGate(top,time,palette);
    }else if(version.id==='routine'){
      factory.drawBase(top,time,bounds);plant.actors.forEach(drawActor);drawLight(plant.light);factory.drawOverlay(top,time,bounds);
      const dark=workPhase(time)&&player.mode==='interactive'?workProgress.snapshot().darkness:plant.outsideDarkness;
      if(dark){screenOverlay();top.save();top.globalAlpha=dark;top.fillStyle=discovery.background;top.fillRect(0,0,state.w,state.h);top.restore();}
    }else if(time<104){
      if(time>=102.8){screenOverlay();window.FlatlandInner.drawOuter(top,time,viewport,heading,plant.chase?{...plant.chase,scale:s}:undefined);placeWorld(top,v);}
      top.save();top.globalAlpha=1-clamp((time-102.8)/1.2);factory.drawBase(top,time,bounds);top.restore();
      plant.actors.forEach(drawActor);drawLight(plant.light);
      top.save();top.globalAlpha=1-clamp((time-102.8)/1.2);factory.drawOverlay(top,time,bounds);top.restore();
    }else{
      screenOverlay();window.FlatlandInner.drawOuter(top,time,viewport,heading,plant.chase?{...plant.chase,scale:s}:undefined);placeWorld(top,v);
      plant.actors.filter(actor=>actor.id==='hero').forEach(entry=>drawActor(plant.light?{...entry,core:0}:entry));if(time<110)drawLight(plant.light);factory.drawOverlay(top,time,bounds);
    }
    const escortEnd=version.id==='routine'?67.4:70;
    if(time>=61&&time<escortEnd){const fade=clamp((time-escortEnd+.6)/.6);top.save();top.globalAlpha=1-fade*fade*(3-2*fade);homeFrame(time).actors.filter(entry=>/^guard-/.test(entry.id)).forEach(drawActor);top.restore();}
    // Passing the dark doorway is an edit between two independent scene spaces.
    const doorCover=time<61?clamp((time-60.65)/.35):1-clamp((time-61)/.45);
    if(time>60.65&&time<61.45){screenOverlay();top.globalAlpha=doorCover;top.fillStyle=palette.industrial;top.fillRect(0,0,state.w,state.h);top.globalAlpha=1;}
    const transition=factory.sceneTransition?.(time);if(transition?.cover){screenOverlay();top.save();top.globalAlpha=transition.cover;top.fillStyle=palette.industrial;top.fillRect(0,0,state.w,state.h);top.restore();}
    if(version.id==='rhythm'&&time>=108.8&&time<110){screenOverlay();top.save();const q=clamp((time-108.8)/1.2);top.globalAlpha=q*q*(3-2*q);top.fillStyle=discovery.background;top.fillRect(0,0,state.w,state.h);top.restore();}
  }
  function screenOverlay(){top.setTransform(state.dpr,0,0,state.dpr,0,0);}
  const format=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function actionNotes(time,base){
    if(player.mode!=='interactive'||inInner(time))return base;
    const e=encounter.snapshot(),a=actions.snapshot();
    if(familyPhase(time))return{summary:'点击地面，孩子从当前位置走过去；点击父亲或母亲，孩子寻路靠近并尝试接触。双方回应结束后，孩子受挫退回房间中心，停留片刻。',action:e.familyTarget==='return'?'孩子收紧边线，退回房间中心，停留片刻。':e.familyWaiting?'孩子轻轻摇晃、缓慢试探周围，父母保持沉稳的小幅动作；接触后的符号保留到下一次点击。':e.familyTarget==='ground'?'孩子走向点击的位置，绕开父母与墙壁。':e.familyTarget==='father'?'孩子寻路靠近父亲；接触后父亲缩退，孩子头顶变成叹号。':'孩子寻路靠近母亲；接触后母亲躲开，孩子头顶变成叹号。',camera:base.camera};
    if(time<district.timing.firstMove)return{summary:'执政官先进入并打量孩子，示意士兵缓一步跟进。',action:e.effects.shiver>0?'孩子左右颤抖；执政官的观察与士兵进门继续。':'执政官转向孩子观察，士兵稍后从入口跟进。',camera:base.camera};
    if(time<58)return{summary:'执政官走在前方，孩子居中，三名士兵在后方半包围押送。',action:e.effects.resistance>0?'孩子试图停步，执政官回头；后方士兵催促。':e.effects.lag>.1?'士兵尖角触及孩子，孩子露出害怕符号，随后继续前进。':'队伍沿道路前行，孩子被催促着跟上。',camera:base.camera};
    if(state.correction?.node&&state.correction.level>.08)return{...base,action:state.correction.node==='mold'?'孩子向点击的边慢慢逃去；对应边段突然扣合，将他挡回槽内。':state.correction.node==='compact'?'孩子围绕稳定中心收紧、左右挣扎，夹具进一步夹紧。':'孩子逆着机器转向扭动，喷漆前仍被强制转正，逐边涂黑。'};
    if(factoryPhase(time)&&a.factory.pulse>.08)return{...base,action:a.factory.exhausted?'孩子反抗后失力，重新被传送带带向工位。':'长按让孩子收紧、左右向后挣扎，圆环随持续用力而消耗；输送带与机器继续运行。'};
    if(workPhase(time)){const progress=workProgress.snapshot();return{...base,action:progress.phase==='fade'?'画面持续、平滑地变黑；更密集的点击会加快变黑，工位继续循环。':progress.phase==='wide'?'镜头已到最远，密集工位保持循环，画面自动连续变黑。':'点击让所有工位的循环加快，镜头进一步拉远；等待时继续当前的机械循环。'};}
    if(chasePhase(time))return{...base,action:player.pressed?'持续长按，主角与周围图形一起加速拉伸，圆环逐渐蓄满。':'主角低速追光，周围图形继续掠过；松开的圆环逐渐退空。'};
    return base;
  }
  function interfaceState(v,time=sceneTime()){
    const indicator=$('hold-indicator'),charge=chaseProgress.snapshot();
    if(indicator){indicator.dataset.visible=String(player.mode==='interactive'&&chasePhase(time)&&(player.pressed||charge.charge>0));indicator.style.setProperty('--hold-progress',String(charge.charge));indicator.style.setProperty('--hold-color',palette.gold);}
    updateEffortIndicator(v,time);
    const shot=inInner(time)?cameraTrack.shots.find(s=>s.id==='inner'):cameraTrack.shotAt(time),index=cameraTrack.shots.indexOf(shot),displayTime=innerDisplayTime();
    stage.dataset.endingPhase=time>=132?ending.snapshot().phase:'';stage.dataset.peeled=String(peel.snapshot().filter(value=>value>=1).length);stage.dataset.paused=String(state.reviewPaused);stage.dataset.phase=shot.id;stage.dataset.sceneTime=(inInner(time)?110+9*innerState().progress:time).toFixed(2);stage.dataset.time=displayTime.toFixed(2);stage.dataset.layer=state.open?'possibility':'windows';stage.dataset.mode=player.mode;stage.dataset.playing=String(player.playing);stage.dataset.version=version.id;
    if(!workbench){$('replay').hidden=time<132||!ending.snapshot().complete;return;}
    const snapshot=inInner(time)?innerState():null;
    const notes=snapshot?{summary:'黑暗中亮点游动。点击捕捉后，所在位置留下流动色带；亮区沿各自轮廓扩散、连通，照亮整个内心。',action:snapshot.awaitingCenter?'内心已经全部点亮，中央柔光等待点击；点亮它后，画面才缓慢收回光中。':snapshot.phase==='break'||snapshot.done?'已点亮的区域从实际捕捉的位置向外生长、连成一片；全景亮透后收回身体内的同一颗光种子。':snapshot.collected?'已经点亮的局部持续翻卷，其余亮点仍在暗处游动，等待捕捉。':'暗层缓慢运动，亮点闪烁游动，短光迹指示它的方向。',camera:'保持内心全景；全亮后等待点击中央光点，再缩回身体，从体内飞出并引导右上方追逐。'}:actionNotes(time,version.notes.at(time));
    for(const [name,text] of Object.entries(notes)){const panel=$('shot-'+name);if(panel&&panel.textContent!==text)panel.textContent=text;}
    const caption=shot.label.split(' · ')[1];if($('caption').textContent!==caption)$('caption').textContent=caption;$('phase-number').textContent=`${String(index+1).padStart(2,'0')} / ${cameraTrack.shots.length}`;
    $('chapter').value=shot.id;$('progress').value=Math.round(displayTime*100);$('progress').style.setProperty('--p',`${displayTime/duration*100}%`);
    $('time').value=`${format(displayTime)} / ${format(duration)}`;$('play').setAttribute('aria-label',state.reviewPaused?'播放':'暂停');$('play-icon').textContent=state.reviewPaused?'▶':'Ⅱ';
    $('mode-interactive').setAttribute('aria-pressed',String(player.mode==='interactive'));
    $('mode-auto').setAttribute('aria-pressed',String(player.mode==='auto'));
    const viewer=document.querySelector('.brand');if(viewer)viewer.href='./?version='+version.id+'&mode='+player.mode+'&t='+displayTime.toFixed(2);
  }
  function updateEffortIndicator(v,time){
    const node=$('effort-indicator');if(!node)return;
    const effort=actions.snapshot().factory,progress=correction&&time>=71.7&&time<96?factory.nodeProgress(time):null;
    const visible=player.mode==='interactive'&&(factoryPhase(time)||!!progress)&&(progress?(progress.node||progress.redFraction>0):(effort.held||effort.fatigue>.015||effort.pulse>.03||effort.exhausted));
    const spent=progress?progress.redFraction:effort.fatigue,exhausted=progress?spent===1:effort.exhausted;
    node.dataset.visible=String(!!visible);node.dataset.state=exhausted?'exhausted':'ready';
    node.style.setProperty('--effort-progress',String(spent));node.style.setProperty('--effort-color',progress?'#e74b47':palette.gold);
    stage.dataset.fatigue=spent.toFixed(3);stage.dataset.exhausted=String(exhausted);stage.dataset.correctionNode=progress?.node||'';
    if(!visible)return;
    const hero=factoryFrame(time).hero;if(!hero)return;
    const s=scale(v),x=state.w/2+(hero.x-v.x)*s,y=state.h/2+(hero.y-v.y)*s;
    node.style.left=clamp(x+62,36,state.w-36)+'px';node.style.top=clamp(y+50,36,state.h-36)+'px';
  }
  function frame(now){
    const dt=state.last?Math.min((now-state.last)/1000,.05):0;state.last=now;
    if(!document.hidden&&!$('reference-dialog')?.open&&!$('palette-dialog')?.open){
      tickStory(dt);
      if(!state.reviewPaused&&!reduced.matches)state.ambient+=dt;
    }
    state.layer=reduced.matches?Number(state.open):state.layer+(Number(state.open)-state.layer)*(1-Math.exp(-dt*6));upper.style.opacity=sceneTime()>=110?1:1-state.layer*.92;
    // Discovery owns its action clock; scene changes never reset the ambient motion.
    const time=sceneTime(),v=view(time);draw(time,v);interfaceState(v,time);requestAnimationFrame(frame);
  }
  function resize(){const box=stage.getBoundingClientRect();state.w=box.width;state.h=box.height;district.configureEntranceViewport?.({w:state.w,h:state.h,time:sceneTime(),zoom:1.4});state.dpr=Math.min(window.devicePixelRatio||1,2);[lower,upper].forEach(c=>{c.width=Math.round(state.w*state.dpr);c.height=Math.round(state.h*state.dpr);});}
  function syncInner(reconstruct=false){
    const time=sceneTime();state.innerActive=inInner(time);
    if(state.innerActive){inner.reset();if(reconstruct)inner.seek(clamp((time-110)/9));}
  }
  function resumeFlow(){state.reviewPaused=false;player.target=timing.playbackAt(110);player.playing=true;}
  function conveyorSpeed(time,rawRate){
    const segment=factory.transferProgram?.find(s=>time>=s.start&&time<s.end);
    if(segment)return Math.abs(segment.to-segment.from)/(segment.end-segment.start)*rawRate;
    if(version.id==='rhythm'){
      if(time>=70&&time<72)return 420/2*rawRate;
      if(time>=77&&time<80)return Math.abs(factory.anchors.stationX[1]+730)/3*rawRate;
      if(time>=87&&time<90)return Math.abs(factory.anchors.stationX[2]-factory.anchors.stationX[1])/3*rawRate;
    }
    return 150;
  }
  function updateCorrection(dt){
    if(!correction)return;
    const time=sceneTime(),held=state.factoryKeyHeld||state.scenePointer==='factory'&&state.pointer!==null;
    const node=factory.nodeProgress(time).node;
    if(held&&node&&node!==state.correction?.node)correction.press(time,state.factoryPressPoint);
    state.correction=correction.update(dt,{time,held,advance:!state.reviewPaused});
    factory.setNodeResistance(player.mode==='interactive'?state.correction:null);
  }
  function tickStory(dt){
    if(state.reviewPaused)return;
    const time=sceneTime(),rawRate=(timing.sceneAt(Math.min(duration,player.time+.01))-time)/.01;
    if(player.pressed&&chasePhase(time))state.pressAge+=dt;
    if(time>=58&&time<(version.id==='routine'?96:104)){
      state.factoryAmbient=timing.sceneAt(timing.playbackAt(Math.max(state.factoryAmbient,time))+dt);
      factory.setAmbientTime?.(state.factoryAmbient);
    }else factory.setAmbientTime?.(null);
    if(player.mode==='interactive'&&chasePhase(time)){if(chaseProgress.snapshot().finishing)peel.finish();peel.update(dt);factory.setPeelState?.(peel.snapshot());}
    else factory.setPeelState?.(null);
    if(player.mode==='interactive'&&(familyPhase(time)||time<=encounterAPI.familyEnd+1e-7&&!encounter.snapshot().familyDone)){
      encounter.tick(dt,{automatic:false,advance:!state.reviewPaused});const family=encounter.snapshot();
      player.time=timing.playbackAt(family.sceneTime);player.playing=!family.familyWaiting&&!state.reviewPaused;
      if(family.familyDone)resumeFlow();
    }else if(inInner(time)){
      if(!state.innerActive)syncInner();
      inner.update(dt,{automatic:player.mode==='auto'&&player.playing,advance:!state.reviewPaused});
      const done=innerState().done;
      if(done&&player.mode==='interactive'&&player.playing){
        player.time=timing.playbackAt(119);player.target=timing.playbackAt(132);state.innerActive=false;state.reviewPaused=false;chaseProgress.seek(119);state.chaseActive=true;state.chaseOrigin=119;
      }else player.tick(dt,player.mode==='interactive'?player.time:done?Infinity:timing.playbackAt(119)-1e-7);
    }else if(time>=132){
      if(!state.endingActive){ending.seek(time);state.endingActive=true;}
      const progress=ending.update(dt,{automatic:player.mode==='auto',advance:true});
      player.time=timing.playbackAt(progress.raw);player.target=timing.playbackAt(138);player.playing=!progress.complete&&!progress.awaiting;
    }else if(player.mode==='interactive'&&workPhase(time)){
      if(!state.workActive){workProgress.seek(time);state.workActive=true;}
      actions.update(dt,{phase:'work',time,rawRate,advance:true});factory.setWorkTime?.(actions.snapshot().work.time);
      const progress=workProgress.update(dt,{advance:!state.reviewPaused});player.time=timing.playbackAt(progress.raw);player.target=player.time;player.playing=progress.advancing&&!state.reviewPaused;
      if(progress.complete){player.time=player.target=timing.playbackAt(110);player.playing=false;state.workActive=false;factory.setWorkTime?.(null);syncInner();}
    }else if(player.mode==='interactive'&&chasePhase(time)){
      if(!state.chaseActive){chaseProgress.seek(time);state.chaseOrigin=time;state.chaseActive=true;}
      const progress=chaseProgress.update(dt,{held:player.pressed,advance:!state.reviewPaused});player.time=timing.playbackAt(progress.raw);player.target=timing.playbackAt(132);player.playing=!state.reviewPaused&&!progress.complete;
      if(progress.complete){player.pressed=false;player.pressChase=false;player.target=timing.playbackAt(138);player.playing=true;}
    }else{
      state.innerActive=false;
      if(player.mode==='interactive'&&!familyPhase(time)&&time<110&&!state.reviewPaused)resumeFlow();
      const atNode=correction&&factory.nodeProgress(time).node;
      if(factoryPhase(time)&&time>=64&&!atNode&&(state.factoryKeyHeld||state.scenePointer==='factory'&&state.pointer!==null))actions.holdResistance(true);
      actions.update(dt,{phase:workPhase(time)?'work':factoryPhase(time)&&!atNode?'factory':'',time,rawRate,beltSpeed:conveyorSpeed(time,rawRate),advance:player.playing});
      factory.setWorkTime?.(workPhase(time)?actions.snapshot().work.time:null);
      player.tick(dt,time<110?timing.playbackAt(player.mode==='interactive'&&version.id==='routine'&&time<98?98:110):Infinity);
      if(player.mode==='interactive'&&factoryPhase(time)&&time>=64&&!atNode){
        const adjusted=factory.resistTravel?.(time,sceneTime(),actions.snapshot().factory.backwardStep);
        if(Number.isFinite(adjusted))player.time=timing.playbackAt(adjusted);
      }
      // The doorway hands the child to the conveyor with no inherited resistance.
      if(time<61&&sceneTime()>=61){actions.seek(sceneTime());state.factoryKeyHeld=false;if(state.scenePointer==='factory')state.scenePointer='transfer';}
      if(inInner()&&!state.innerActive)syncInner();
      encounter.tick(dt,{automatic:player.mode==='auto',sceneTime:sceneTime(),transportResolved:true});
      if(player.mode==='interactive'&&time<58)player.time=timing.playbackAt(encounter.snapshot().sceneTime);
    }
    updateCorrection(dt);updateLook(dt);updateCamera(dt);
  }
  function updateLook(dt){
    const time=sceneTime();
    if(time<119.6||time>=123){state.lookOffset=0;state.lookTrail=[];return;}
    const frame=factoryFrame(time),entry=frame.actors.find(actor=>actor.id==='hero'),body=entry?.body,light=frame.light;
    if(!body||!light)return;
    const facing=Math.atan2(light.y-body.y,light.x-body.x)-entry.actor.headAxis(body).angle;
    const delta=Math.atan2(Math.sin(facing-body.angle),Math.cos(facing-body.angle));
    state.lookTrail.push({at:state.ambient,value:Math.max(-.45,Math.min(.45,delta))});
    while(state.lookTrail.length>1&&state.lookTrail[1].at<=state.ambient-.12)state.lookTrail.shift();
    const fade=1-clamp((time-122)/1),target=state.lookTrail[0].value*fade;
    state.lookOffset+=(target-state.lookOffset)*(1-Math.exp(-dt/.18));
  }
  function seek(time){
    player.seek(time);encounter.seek(sceneTime());actions.seek(sceneTime());factoryCache={key:null,frames:new Map()};factory.setWorkTime?.(null);
    workProgress.seek(sceneTime());chaseProgress.seek(sceneTime());state.workActive=false;state.chaseActive=false;state.chaseOrigin=Math.max(119,sceneTime());
    syncInner(true);state.pointer=null;state.innerPointer=false;state.scenePointer=false;state.reviewPaused=true;
    peel.reset();factory.setPeelState?.(player.mode==='interactive'&&chasePhase()?peel.snapshot():null);
    factory.setAmbientTime?.(null);state.factoryAmbient=sceneTime();state.pressAge=0;state.chasePointer=false;
    correction?.reset();state.correction=null;state.factoryKeyHeld=false;state.factoryPressPoint=null;updateCorrection(0);
    ending.seek(sceneTime());state.endingActive=sceneTime()>=132;state.lookOffset=0;state.lookTrail=[];state.lastLight=null;updateCamera(0,true);
  }
  function restart(){
    seek(0);district.configureEntranceViewport?.({w:state.w,h:state.h,time:0,zoom:1.4});state.ambient=0;state.last=0;state.open=false;state.layer=0;state.modalResume=false;state.reviewPaused=false;state.inputAt=-Infinity;
    $('layers')?.setAttribute('aria-pressed','false');upper.style.opacity=1;
    player.playing=player.mode==='auto';
    const url=new URL(location.href);url.searchParams.set('t','0.00');history.replaceState(null,'',url);
  }
  function resumeInner(){player.target=Math.max(player.target,timing.playbackAt(119));player.playing=true;}
  function touchInner(x,y){
    if(innerState().done){resumeInner();return true;}
    if(!inner.tap(x,y,viewport()))return false;
    if(!player.playing)resumeInner();
    return true;
  }
  function localTap(point){
    const time=sceneTime();
    if(inInner(time)){touchInner(point.x,point.y);return;}
    if(familyPhase(time)){
      state.reviewPaused=false;encounter.activatePoint(worldPoint(point));return;
    }
    if(time<58){encounter.activate(time<district.timing.firstMove?'authority':'escort');resumeFlow();return;}
    if(factoryPhase(time)){if(!correction?.press(time,point?worldPoint(point):undefined))actions.resist();resumeFlow();return;}
    if(workPhase(time)){if(!state.workActive){workProgress.seek(time);state.workActive=true;}actions.work();workProgress.click();state.reviewPaused=false;return;}
    if(time>=132){ending.click();state.reviewPaused=false;state.endingActive=true;player.playing=true;return;}
    if(time<110)resumeFlow();
  }
  function togglePlay(){
    state.inputAt=performance.now();
    state.reviewPaused=!state.reviewPaused;cancelInput();
    player.playing=!state.reviewPaused;
    if(!state.reviewPaused){if(player.mode==='auto')player.target=Infinity;else if(!familyPhase()&&sceneTime()<110)resumeFlow();}
  }
  function setMode(mode){
    if(inInner())player.time=innerDisplayTime();
    actions.holdResistance(false);state.factoryKeyHeld=false;correction?.reset();state.correction=null;player.setMode(mode);state.reviewPaused=false;updateCorrection(0);
    workProgress.seek(sceneTime());chaseProgress.seek(sceneTime());state.workActive=false;state.chaseActive=false;state.chaseOrigin=Math.max(119,sceneTime());
    encounter.tick(0,{automatic:mode==='auto',sceneTime:sceneTime()});
    peel.reset();factory.setPeelState?.(mode==='interactive'&&chasePhase()?peel.snapshot():null);ending.seek(sceneTime());state.endingActive=sceneTime()>=132;state.pressAge=0;state.chasePointer=false;updateCamera(0,true);
    if(mode==='interactive'&&!familyPhase()&&sceneTime()<110)resumeFlow();
  }
  if(workbench){
    $('progress').max=String(duration*100);
    $('story-version').value=version.id;
    if(version.id==='routine')document.querySelectorAll('.timeline-marks span').forEach((mark,i)=>{mark.textContent=['家庭','查家','规整化','日常工作','追光','新维度'][i];});
    on('story-version','change',e=>{
      const next=window.FlatlandStoryVersions.get(e.target.value),url=new URL(location.href);
      url.searchParams.set('version',next.id);url.searchParams.set('t',next.timing.playbackAt(inInner()?110+9*innerState().progress:sceneTime()).toFixed(2));url.searchParams.set('mode',player.mode);location.href=url.href;
    });
    cameraTrack.shots.forEach(shot=>{const option=document.createElement('option');option.value=shot.id;option.textContent=shot.label;$('chapter').append(option);});
    on('chapter','change',e=>seek(timing.playbackAt(cameraTrack.shots.find(s=>s.id===e.target.value).start)));
    on('previous','click',()=>{const i=cameraTrack.shots.indexOf(cameraTrack.shotAt(sceneTime()));seek(timing.playbackAt(cameraTrack.shots[Math.max(0,i-1)].start));});
    on('next','click',()=>{const i=cameraTrack.shots.indexOf(cameraTrack.shotAt(sceneTime()));seek(timing.playbackAt(cameraTrack.shots[Math.min(cameraTrack.shots.length-1,i+1)].start));});

  }
  on('mode-interactive','click',()=>setMode('interactive'));
  on('mode-auto','click',()=>setMode('auto'));
  on('play','click',togglePlay);on('restart','click',restart);on('replay','click',restart);
  on('progress','input',e=>seek(Number(e.target.value)/100));
  on('layers','click',()=>{state.open=!state.open;$('layers').setAttribute('aria-pressed',String(state.open));});
  function beginFactory(point){
    state.factoryPressPoint=point?worldPoint(point):undefined;
    if(!correction?.press(sceneTime(),state.factoryPressPoint))actions.holdResistance(true);
    resumeFlow();
  }
  function endFactory(){actions.holdResistance(false);correction?.release();state.factoryKeyHeld=false;}
  stage.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat){if(player.mode==='interactive'&&factoryPhase()){state.factoryKeyHeld=true;beginFactory();}else if(player.mode==='interactive'&&chasePhase()){state.reviewPaused=false;state.pressAge=0;player.press();}else if(player.mode==='interactive'&&sceneTime()>=132)localTap();else togglePlay();}}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();seek(innerDisplayTime()+(e.key==='ArrowRight'?1:-1));}});
  document.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)&&(state.factoryKeyHeld||actions.snapshot().factory.held)){e.preventDefault();endFactory();}if([' ','Enter'].includes(e.key)&&player.pressChase){e.preventDefault();if(state.pressAge<.25&&chasePhase())peel.click();player.release(true);}});
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0||state.pointer!==null)return;
    state.pointer=e.pointerId;state.innerPointer=inInner()&&player.mode==='interactive';state.scenePointer=player.mode==='interactive'&&!inInner()&&(sceneTime()<119||sceneTime()>=132)?inputPhase():false;state.inputAt=performance.now();state.chasePointer=chasePhase();state.pressAge=0;stage.focus({preventScroll:true});stage.setPointerCapture(e.pointerId);
    if(state.scenePointer==='factory')beginFactory(pointerPoint(e));
    if(state.scenePointer==='escort'||state.scenePointer==='authority'){localTap(pointerPoint(e));state.scenePointer='coercion';}
    if(!state.innerPointer&&!state.scenePointer){if(chasePhase()){state.reviewPaused=false;const p=pointerPoint(e),indicator=$('hold-indicator');if(indicator){indicator.style.left=p.x+'px';indicator.style.top=p.y+'px';}}player.press();}
  });
  function worldPoint(p,time=sceneTime()){const v=view(time),s=scale(v);return{x:v.x+(p.x-state.w/2)/s,y:v.y+(p.y-state.h/2)/s};}
  function pointerPoint(e){const box=stage.getBoundingClientRect();return{x:(e.clientX-box.left)*state.w/box.width,y:(e.clientY-box.top)*state.h/box.height};}
  function release(e,cancelled=false){
    if(state.pointer!==e.pointerId)return;state.pointer=null;
    if(state.innerPointer){state.innerPointer=false;if(!cancelled&&inInner()){const p=pointerPoint(e);touchInner(p.x,p.y);}return;}
    if(state.scenePointer){const phase=state.scenePointer;state.scenePointer=false;if(phase==='factory'){endFactory();return;}if(!cancelled&&phase===inputPhase())localTap(pointerPoint(e));return;}
    if(state.chasePointer&&!cancelled&&state.pressAge<.25&&chasePhase())peel.click();
    state.chasePointer=false;player.release(cancelled);
  }
  stage.addEventListener('pointermove',e=>{const p=pointerPoint(e),s=innerState(),target=player.mode==='interactive'&&(inInner()?(s.awaitingCenter?Math.hypot(s.center.x-p.x,s.center.y-p.y)<=s.center.hitRadius:s.points.some(dot=>dot.visible&&!dot.collected&&Math.hypot(dot.x-p.x,dot.y-p.y)<=dot.hitRadius)):familyPhase()&&!!encounter.hitTest(worldPoint(p)));stage.style.cursor=target?'pointer':'default';});
  stage.addEventListener('pointerup',e=>release(e));
  stage.addEventListener('pointercancel',e=>release(e,true));
  stage.addEventListener('contextmenu',e=>e.preventDefault());
  function cancelInput(){
    endFactory();if(player.pressed)player.release(true);
    state.pointer=null;state.innerPointer=false;state.scenePointer=false;state.chasePointer=false;state.pressAge=0;state.last=0;
  }
  stage.addEventListener('blur',cancelInput);window.addEventListener?.('blur',cancelInput);
  document.addEventListener('visibilitychange',()=>{state.last=0;if(document.hidden)cancelInput();});
  const dialog=$('reference-dialog');let loadedReferences=false;
  on('references','click',async()=>{
    state.modalResume=player.playing;player.playing=false;dialog.showModal();if(loadedReferences)return;
    try{
      const response=await fetch('references.json');if(!response.ok)throw Error('reference response');const data=await response.json(),groups=new Map();
      for(const item of data){if(!groups.has(item.group))groups.set(item.group,[]);groups.get(item.group).push(item);}
      for(const [name,items] of groups){
        const section=document.createElement('section');section.className='reference-section';const h=document.createElement('h3');h.textContent=name;section.append(h);const grid=document.createElement('div');grid.className='reference-grid';
        for(const item of items){const fig=document.createElement('figure');fig.className='reference-card';const a=document.createElement('a');a.href=item.src;a.target='_blank';a.rel='noopener';const img=document.createElement('img');img.src=item.src;img.alt=item.name;img.loading='lazy';const caption=document.createElement('figcaption');caption.textContent=item.name.replace(/^\d+_/,'').replaceAll('_',' · ');a.append(img,caption);fig.append(a);grid.append(fig);}section.append(grid);$('reference-groups').append(section);
      }
      loadedReferences=true;
    }catch{const p=document.createElement('p');p.textContent='素材索引暂时没有载入，请重新打开页面。';$('reference-groups').replaceChildren(p);}
  });
  on('close-references','click',()=>dialog.close());
  dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog?.addEventListener('close',()=>{player.playing=state.modalResume;state.modalResume=false;});
  new ResizeObserver(resize).observe(stage);resize();actions.seek(sceneTime());syncInner(true);ending.seek(sceneTime());state.endingActive=sceneTime()>=132;factory.setPeelState?.(player.mode==='interactive'&&chasePhase()?peel.snapshot():null);if(!workbench&&player.mode==='interactive'&&!familyPhase()&&sceneTime()<110)resumeFlow();updateCamera(0,true);requestAnimationFrame(frame);
})();
