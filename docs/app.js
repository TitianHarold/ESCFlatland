/* Rendering reads story time and a preset camera track independently. */
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
  dimension.setEndingAssets(window.FlatlandEndingAssets||{hands:'assets/pov-hands-open.png',flexedHands:'assets/pov-hands-flexed.png',layout:{left:[0,0,.5,1],right:[.5,0,.5,1],wristLeft:[.525,.60],wristRight:[.55,.60]}});
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mode=params.get('mode')==='auto'?'auto':'interactive';
  const player=new window.FlatlandStoryPlayer({duration,timing,beats:version.beats,mode,playing:mode==='auto'&&!workbench&&!reduced.matches});
  const initialTime=Number(params.get('t'));if(initialTime>0){player.seek(initialTime);player.playing=mode==='auto'&&!workbench&&!reduced.matches;}
  const encounterAPI=window.FlatlandEncounterInteraction,encounter=new encounterAPI.EncounterController({sceneTime:timing.sceneAt(player.time)}),actions=new window.FlatlandActionInput.Actions();
  const discovery=window.FlatlandInnerDiscovery,inner=new discovery.Session({autoDuration:timing.playbackAt(119)-timing.playbackAt(110)});
  const state={last:0,ambient:0,open:false,layer:0,w:0,h:0,dpr:1,pointer:null,innerPointer:false,scenePointer:false,innerActive:false,reviewPaused:workbench,modalResume:false,inputAt:-Infinity};
  const cavity=new Path2D('M-49 7 C-57-17-33-44-9-48 C15-57 30-31 47-6 C60 16 35 43 7 45 C-24 51-53 35-49 7Z');
  function sceneTime(){return timing.sceneAt(player.time);}
  function familyPhase(time=sceneTime()){return time<encounterAPI.familyEnd-1e-7;}
  function view(time=sceneTime()){if(time>=132)return{space:'pov',shotId:'dimension',x:0,y:0,zoom:1,tilt:0,yaw:0,screenY:.5};const v=cameraTrack.pose(time);if(v.follow==='hero'){const hero=factoryFrame(time).hero;if(hero)return{...v,x:hero.x,y:hero.y};}return v;}
  function workPhase(time=sceneTime()){return version.id==='routine'&&time>=98&&time<110;}
  function factoryPhase(time=sceneTime()){return time>=64&&time<(version.id==='routine'?94:98);}
  function inputPhase(){const t=sceneTime();return inInner(t)?'inner':familyPhase(t)?'family':t<district.timing.firstMove?'authority':t<58?'escort':factoryPhase(t)?'factory':workPhase(t)?'work':t>=132?'ending':t>=119?'chase':'transfer';}
  function homeFrame(time=sceneTime()){return encounter.applyFrame(district.frame(time));}
  function factoryFrame(time,bounds){
    const base=factory.frame(time,bounds);
    if(!factoryPhase(time))return base;
    const effort=actions.snapshot().factory,frame=factory.withResistance?.(base,effort.offset,time)||base;
    frame.actors=frame.actors.map(entry=>entry.id==='hero'?{...entry,resistancePulse:effort.pulse}:entry);
    return frame;
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
  function fracture(entry,damage,context){
    const top=context||mainTop;
    if(damage<.06)return;
    const matrix=top.getTransform(),detail=Math.hypot(matrix.a,matrix.b)>.10;
    if(detail&&!entry.textureWindow){
      const rim=[[-53,-42],[-21,-53],[10,-55],[40,-38],[58,-13],[57,20],[32,45],[0,53],[-32,45],[-54,18],[-58,-12]],pressure=clamp(entry.force||0);
      top.fillStyle=palette.night;top.fill(cavity);
      for(let i=0;i<rim.length;i++){
        const a=rim[i],b=rim[(i+1)%rim.length],cx=(a[0]+b[0])/3,cy=(a[1]+b[1])/3;
        const spread=damage*(1.8+pressure*2.2),dx=cx/28*spread,dy=cy/28*spread;
        const shard=new Path2D();shard.moveTo(-8+(i%3)*2,3-i%2*4);shard.lineTo(a[0],a[1]);shard.lineTo((a[0]+b[0])/2+3*Math.sin(i), (a[1]+b[1])/2);shard.lineTo(b[0],b[1]);shard.closePath();
        top.save();top.translate(dx,dy);top.clip(shard);
        // Every fragment still samples the same moving possibility layer.
        top.setTransform(1,0,0,1,0,0);top.drawImage(lower,matrix.a*dx+matrix.c*dy,matrix.b*dx+matrix.d*dy);top.restore();
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
    if(entry.core){top.save();top.globalAlpha=entry.coreReveal??1;top.fillStyle=palette.gold;top.beginPath();top.ellipse(0,0,10*(entry.coreScale??1),10*(entry.coreScale??1),0,0,Math.PI*2);top.fill();top.restore();}
    if(entry.label==='reject'&&entry.restraint?.attached!==false)drawFailureMark(top,entry.restraint);
    factory.drawActorOverlay?.(top,entry);
    if(entry.resistancePulse){top.save();top.globalAlpha=entry.resistancePulse*.65;top.strokeStyle=palette.gold;top.lineWidth=2.5;top.stroke(outline);top.restore();}
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
    const base=factoryFrame(Math.min(time,131.999999)),rate=player.playbackRate,boost=clamp((rate-1)/.8);
    const original=base.actors.find(a=>a.id==='hero'),sprinting=time>=119&&time<132;
    const speed=(original?.body.speed||base.chase?.speed||0)*rate,shape=motion.speedShape(speed);
    const body=original&&sprinting?{...original.body,speed,axialStretch:shape.axialStretch,strain:shape.strain,effort:boost}:original?.body;
    const entry=original?{...original,body}:undefined;
    const sample=sprinting?{...base,hero:body,chase:{...base.chase,speed:body.speed,inputRate:rate,effort:boost},actors:base.actors.map(a=>a.id==='hero'?entry:a)}:base;
    const darkness=window.FlatlandInner.darkness(time);
    const ctx=heroTextureContext;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,256,256);
    if(entry){
      const textureBody=time>=132?dimension.journeyPose(time,sample).raw:entry.body;
      const a=256/textureExtent;ctx.setTransform(a,0,0,a,128,128);drawActor({...entry,textureWindow:true,blacken:version.id==='routine'?entry.blacken:0,body:{...textureBody,x:0,y:0,angle:0}},ctx);
      heroMaterialContext.setTransform(1,0,0,1,0,0);heroMaterialContext.clearRect(0,0,256,256);
      heroMaterialContext.setTransform(a,0,0,a,128-800*a,128-550*a);window.FlatlandPossibility.draw(heroMaterialContext,state.ambient);
      heroMaterialContext.setTransform(1,0,0,1,0,0);heroMaterialContext.globalAlpha=darkness;heroMaterialContext.fillStyle=palette.night;heroMaterialContext.fillRect(0,0,256,256);heroMaterialContext.globalAlpha=1;
      ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-over';ctx.drawImage(heroMaterial,0,0);ctx.globalCompositeOperation='source-over';
    }
    return{...sample,entry,heroTexture,textureExtent,darkness,detachedTag:factoryFrame(time).detachedTag};
  }
  function drawLight(light){
    if(!light)return;const glow=clamp(light.glow||0),r=light.r||10;
    top.save();top.globalAlpha=clamp(light.reveal??1);
    if(glow){const gradient=top.createRadialGradient(light.x,light.y,r*.2,light.x,light.y,r*5);gradient.addColorStop(0,palette.gold+'88');gradient.addColorStop(1,palette.gold+'00');top.fillStyle=gradient;top.beginPath();top.arc(light.x,light.y,r*5*glow,0,Math.PI*2);top.fill();}
    top.fillStyle=light.phase==='notice'||light.phase==='enclosed'||light.phase==='slit'?palette.gold:glow?palette.cream:palette.gold;top.beginPath();top.arc(light.x,light.y,r,0,Math.PI*2);top.fill();top.restore();
  }
  function inInner(time=sceneTime()){return time>=110-1e-7&&time<119-1e-7;}
  function viewport(){return{w:state.w,h:state.h,dpr:state.dpr};}
  function innerState(){return inner.snapshot(viewport());}
  function innerDisplayTime(){return inInner()?timing.playbackAt(110+9*innerState().progress):player.time;}
  function drawInner(){
    const box=viewport(),snapshot=innerState(),b=snapshot.breakProgress;
    const exit=clamp((b-.72)/.28),u=exit*exit*(3-2*exit);
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
    if(b>.35){
      const q=clamp((b-.35)/.65),flight=q*q*(3-2*q),scale=Math.max(state.w/1280,state.h/760);
      const x=state.w/2+(point[0]-state.w/2)*flight,y=state.h/2+(point[1]-state.h/2)*flight,k=scale+(point[3]-scale)*flight;
      screenOverlay();top.save();top.globalAlpha=clamp((b-.35)/.15);dimension.paintArrivalLight(top,[x,y,0,k],119,10,state.w,state.h);top.restore();
    }
  }
  function draw(time,v){
    if(time>=132){screen(low);low.fillStyle='#ffffff';low.fillRect(0,0,state.w,state.h);screen(top);dimension.drawEnding(top,time,{w:state.w,h:state.h,dpr:state.dpr});return;}
    if(inInner(time)){drawInner();return;}
    if(version.id==='routine'&&time>=96&&time<110){screen(low);low.fillStyle=palette.paper;low.fillRect(0,0,state.w,state.h);}
    else{world(low,v);window.FlatlandPossibility.draw(low,state.ambient);}
    if(time>=119){
      screen(top);const data=journeyData(time),viewport={w:state.w,h:state.h,dpr:state.dpr};
      if(time<138)dimension.drawJourney(top,time,v,viewport,state.ambient,data);
      else dimension.draw(top,time,v,viewport,state.ambient,data);
      return;
    }
    world(top,v);const s=scale(v),viewport={w:state.w,h:state.h};
    top.fillStyle=time>=61?palette.outside.background:palette.blue;top.fillRect(v.x-state.w/s/2-1,v.y-state.h/s/2-1,state.w/s+2,state.h/s+2);
    const bounds={minX:v.x-state.w/s/2,maxX:v.x+state.w/s/2,minY:v.y-state.h/s/2,maxY:v.y+state.h/s/2,scale:s};
    const plant=factoryFrame(time,bounds),heading=plant.hero?plant.hero.angle+characters.actors.child.headAxis(plant.hero).angle:0;
    if(time<61){
      district.drawBase(top,time);
      const home=homeFrame(time);home.actors.forEach(drawActor);
      if(time>=58)plant.actors.filter(actor=>actor.id==='hero').forEach(drawActor);
      window.FlatlandCityMap.drawGate(top,time,palette);
    }else if(version.id==='routine'){
      factory.drawBase(top,time,bounds);plant.actors.forEach(drawActor);drawLight(plant.light);factory.drawOverlay(top,time,bounds);
      const dark=workPhase(time)&&player.mode==='interactive'?Math.max(plant.outsideDarkness,actions.snapshot().work.darkness):plant.outsideDarkness;
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
    if(familyPhase(time))return{summary:'孩子在家观察走动。点击父亲、母亲，分别寻路靠近；接触后父母本能躲开，孩子转为疑惑。',action:e.familyWaiting?'孩子缓慢走动，转动头尖观察周围。':e.familyTarget==='father'?'孩子沿屋内空隙靠近父亲，尖角接触后父亲缩退。':'孩子转向母亲，沿可通行区域靠近，母亲接触后躲开。',camera:base.camera};
    if(time<district.timing.firstMove)return{summary:'执政官先进入并打量孩子，示意士兵缓一步跟进。',action:e.effects.shiver>0?'孩子左右颤抖；执政官的观察与士兵进门继续。':'执政官转向孩子观察，士兵稍后从入口跟进。',camera:base.camera};
    if(time<58)return{summary:'执政官走在前方，孩子居中，三名士兵在后方半包围押送。',action:e.effects.resistance>0?'孩子试图停步，执政官回头；后方士兵催促。':e.effects.lag>.1?'士兵尖角触及孩子，孩子露出害怕符号，随后继续前进。':'队伍沿道路前行，孩子被催促着跟上。',camera:base.camera};
    if(factoryPhase(time)&&a.factory.pulse>.08)return{...base,action:a.factory.exhausted?'孩子反抗后失力，重新被传送带带向工位。':'孩子向输送的反方向用力，尝试向后退；输送带与机器继续运行。'};
    if(workPhase(time)&&a.work.rate>1.1)return{...base,action:'主角与周围所有工位的工作循环一起加快，密集重复的动作持续，画面更快变暗。'};
    return base;
  }
  function interfaceState(v,time=sceneTime()){
    const shot=inInner(time)?cameraTrack.shots.find(s=>s.id==='inner'):cameraTrack.shotAt(time),index=cameraTrack.shots.indexOf(shot),displayTime=innerDisplayTime();
    stage.dataset.phase=shot.id;stage.dataset.sceneTime=(inInner(time)?110+9*innerState().progress:time).toFixed(2);stage.dataset.time=displayTime.toFixed(2);stage.dataset.layer=state.open?'possibility':'windows';stage.dataset.mode=player.mode;stage.dataset.playing=String(player.playing);stage.dataset.version=version.id;
    if(!workbench){const link=document.querySelector('.workbench-link');if(link)link.href='./workbench.html?version='+version.id+'&mode='+player.mode+'&t='+displayTime.toFixed(2);return;}
    const snapshot=inInner(time)?innerState():null;
    const notes=snapshot?{summary:'黑暗中有微弱光点缓慢闪动。点亮的局部留下流动色带，逐渐积累，最后破开迷雾。',action:snapshot.phase==='break'||snapshot.done?'已发现的色域连成光缝，暗层向两侧分开；同一颗光种子飞向前方。':snapshot.collected?'已经点亮的局部持续翻卷，其余微光仍在暗处闪动。':'暗层缓慢运动，偶尔有小点亮起，尚未照亮色带。',camera:'保持内心全景；破雾后窗口向光点收拢，连续接入右上方追逐。'}:actionNotes(time,version.notes.at(time));
    for(const [name,text] of Object.entries(notes)){const panel=$('shot-'+name);if(panel&&panel.textContent!==text)panel.textContent=text;}
    const caption=shot.label.split(' · ')[1];if($('caption').textContent!==caption)$('caption').textContent=caption;$('phase-number').textContent=`${String(index+1).padStart(2,'0')} / ${cameraTrack.shots.length}`;
    $('chapter').value=shot.id;$('progress').value=Math.round(displayTime*100);$('progress').style.setProperty('--p',`${displayTime/duration*100}%`);
    $('time').value=`${format(displayTime)} / ${format(duration)}`;$('play').setAttribute('aria-label',player.playing?'暂停':'播放');$('play-icon').textContent=player.mode==='auto'&&player.playing?'Ⅱ':'▶';
    $('mode-interactive').setAttribute('aria-pressed',String(player.mode==='interactive'));
    $('mode-auto').setAttribute('aria-pressed',String(player.mode==='auto'));
    $('play').setAttribute('aria-label',player.mode==='interactive'?(inInner(time)?'点亮下一处微光':'推进下一动作'):player.playing?'暂停':'播放');
    const viewer=document.querySelector('.brand');if(viewer)viewer.href='./?version='+version.id+'&mode='+player.mode+'&t='+displayTime.toFixed(2);
  }
  function frame(now){
    const dt=state.last?Math.min((now-state.last)/1000,.05):0;state.last=now;
    if(!document.hidden&&!$('reference-dialog')?.open&&!$('palette-dialog')?.open){
      tickStory(dt);
      if(!reduced.matches)state.ambient+=dt;
    }
    state.layer=reduced.matches?Number(state.open):state.layer+(Number(state.open)-state.layer)*(1-Math.exp(-dt*6));upper.style.opacity=sceneTime()>=110?1:1-state.layer*.92;
    // Discovery owns its action clock; scene changes never reset the ambient motion.
    const time=sceneTime(),v=view(time);draw(time,v);interfaceState(v,time);requestAnimationFrame(frame);
  }
  function resize(){const box=stage.getBoundingClientRect();state.w=box.width;state.h=box.height;state.dpr=Math.min(window.devicePixelRatio||1,2);[lower,upper].forEach(c=>{c.width=Math.round(state.w*state.dpr);c.height=Math.round(state.h*state.dpr);});}
  function syncInner(reconstruct=false){
    const time=sceneTime();state.innerActive=inInner(time);
    if(state.innerActive){inner.reset();if(reconstruct)inner.seek(clamp((time-110)/9));}
  }
  function resumeFlow(){state.reviewPaused=false;player.target=timing.playbackAt(110);player.playing=true;}
  function tickStory(dt){
    const time=sceneTime(),rawRate=(timing.sceneAt(Math.min(duration,player.time+.01))-time)/.01;
    if(player.mode==='interactive'&&(familyPhase(time)||time<=encounterAPI.familyEnd+1e-7&&!encounter.snapshot().familyDone)){
      encounter.tick(dt,{automatic:false});const family=encounter.snapshot();
      player.time=timing.playbackAt(family.sceneTime);player.playing=!family.familyWaiting;
      if(family.familyDone)resumeFlow();
    }else if(inInner(time)){
      if(!state.innerActive)syncInner();
      inner.update(dt,{automatic:player.mode==='auto'&&player.playing,advance:player.playing});
      const done=innerState().done;
      if(done&&player.mode==='interactive'&&player.playing){
        player.time=timing.playbackAt(119);player.target=timing.playbackAt(132);state.innerActive=false;
      }else player.tick(dt,player.mode==='interactive'?player.time:done?Infinity:timing.playbackAt(119)-1e-7);
    }else{
      state.innerActive=false;
      if(player.mode==='interactive'&&!familyPhase(time)&&time<110&&!state.reviewPaused)resumeFlow();
      actions.update(dt,{phase:workPhase(time)?'work':factoryPhase(time)?'factory':'',time,rawRate,advance:player.playing});
      factory.setWorkTime?.(workPhase(time)?actions.snapshot().work.time:null);
      if(workPhase(time)&&player.mode==='interactive'&&actions.snapshot().work.darkness>.995){player.time=timing.playbackAt(110);syncInner();}
      else player.tick(dt,time<110?timing.playbackAt(110):Infinity);
      if(inInner()&&!state.innerActive)syncInner();
      encounter.tick(dt,{automatic:player.mode==='auto',sceneTime:sceneTime()});
    }
  }
  function seek(time){
    player.seek(time);encounter.seek(sceneTime());actions.seek(sceneTime());factory.setWorkTime?.(null);
    syncInner(true);state.pointer=null;state.innerPointer=false;state.scenePointer=false;state.reviewPaused=true;
  }
  function resumeInner(){player.target=Math.max(player.target,timing.playbackAt(119));player.playing=true;}
  function touchInner(x,y){
    if(['break','done'].includes(innerState().phase)){resumeInner();return true;}
    if(!inner.tap(x,y,viewport()))return false;
    if(!player.playing)resumeInner();
    return true;
  }
  function localTap(point){
    const time=sceneTime();
    if(inInner(time)){touchInner(point.x,point.y);return;}
    if(familyPhase(time)){
      const target=parentAt(point);if(target)encounter.activate(target);return;
    }
    if(time<58){encounter.activate(time<district.timing.firstMove?'authority':'escort');resumeFlow();return;}
    if(factoryPhase(time)){actions.resist();resumeFlow();return;}
    if(workPhase(time)){actions.work();resumeFlow();return;}
    if(time>=132){player.tap();return;}
    if(time<110)resumeFlow();
  }
  function togglePlay(){
    state.inputAt=performance.now();
    if(player.mode==='auto'){player.tap();return;}
    if(inInner()){
      const point=innerState().points.find(p=>p.visible&&!p.collected);
      if(point)touchInner(point.x,point.y);else resumeInner();
    }else if(familyPhase())encounter.activate(encounter.snapshot().familyTarget);
    else localTap({x:state.w/2,y:state.h/2});
  }
  function setMode(mode){
    if(inInner())player.time=innerDisplayTime();
    player.setMode(mode);state.reviewPaused=false;
    encounter.tick(0,{automatic:mode==='auto',sceneTime:sceneTime()});
    if(mode==='interactive'&&!familyPhase()&&sceneTime()<110)resumeFlow();
  }
  function parentAt(point){
    const v=view(),s=scale(v),p={x:v.x+(point.x-state.w/2)/s,y:v.y+(point.y-state.h/2)/s},home=homeFrame();
    const accepted=encounter.snapshot().familyTarget;
    const parent=home.actors.find(entry=>entry.id===accepted);if(!parent)return null;
    const polygon=parent.actor.outline(parent.body);let inside=false,distance=Infinity;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j],dx=b[0]-a[0],dy=b[1]-a[1],q=clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy));
      distance=Math.min(distance,Math.hypot(p.x-a[0]-dx*q,p.y-a[1]-dy*q));
      if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside||distance<Math.max(12,22/s)?accepted:null;
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
  on('play','click',togglePlay);on('restart','click',()=>seek(0));
  on('progress','input',e=>seek(Number(e.target.value)/100));
  on('layers','click',()=>{state.open=!state.open;$('layers').setAttribute('aria-pressed',String(state.open));});
  stage.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)togglePlay();}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();seek(innerDisplayTime()+(e.key==='ArrowRight'?1:-1));}});
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0||state.pointer!==null)return;
    state.pointer=e.pointerId;state.innerPointer=inInner()&&player.mode==='interactive';state.scenePointer=player.mode==='interactive'&&!inInner()&&(sceneTime()<119||sceneTime()>=132)?inputPhase():false;state.inputAt=performance.now();stage.focus({preventScroll:true});stage.setPointerCapture(e.pointerId);if(!state.innerPointer&&!state.scenePointer)player.press();
  });
  function pointerPoint(e){const box=stage.getBoundingClientRect();return{x:(e.clientX-box.left)*state.w/box.width,y:(e.clientY-box.top)*state.h/box.height};}
  function release(e,cancelled=false){
    if(state.pointer!==e.pointerId)return;state.pointer=null;
    if(state.innerPointer){state.innerPointer=false;if(!cancelled&&inInner()){const p=pointerPoint(e);touchInner(p.x,p.y);}return;}
    if(state.scenePointer){const phase=state.scenePointer;state.scenePointer=false;if(!cancelled&&phase===inputPhase())localTap(pointerPoint(e));return;}
    player.release(cancelled);
  }
  stage.addEventListener('pointermove',e=>{const p=pointerPoint(e),target=player.mode==='interactive'&&(inInner()?innerState().points.some(dot=>dot.visible&&!dot.collected&&Math.hypot(dot.x-p.x,dot.y-p.y)<=dot.hitRadius):familyPhase()?parentAt(p):false);stage.style.cursor=target?'pointer':'default';});
  stage.addEventListener('pointerup',e=>release(e));
  stage.addEventListener('pointercancel',e=>release(e,true));
  stage.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('visibilitychange',()=>{state.last=0;if(document.hidden){if(player.pressed)player.release(true);state.pointer=null;state.innerPointer=false;state.scenePointer=false;}});
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
  new ResizeObserver(resize).observe(stage);resize();actions.seek(sceneTime());syncInner(true);if(!workbench&&player.mode==='interactive'&&!familyPhase()&&sceneTime()<110)resumeFlow();requestAnimationFrame(frame);
})();
