/* Rendering reads story time and a preset camera track independently. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),on=(id,event,fn)=>$(id)?.addEventListener(event,fn);
  const workbench=document.body.classList.contains('workbench');
  const stage=$('stage'),lower=$('possibility-world'),upper=$('outer-world');
  const low=lower.getContext('2d'),mainTop=upper.getContext('2d'),top=mainTop;
  const cameraTrack=window.FlatlandCamera,characters=window.FlatlandCharacters,motion=window.FlatlandMotion;
  const district=window.FlatlandDistrict,factory=window.FlatlandFactory,dimension=window.FlatlandDimension;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),duration=cameraTrack.duration;
  const palette=window.FlatlandPalette;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mode=new URLSearchParams(location.search).get('mode')==='auto'?'auto':'interactive';
  const player=new window.FlatlandStoryPlayer({duration,mode,playing:mode==='auto'&&!workbench&&!reduced.matches});
  const initialTime=Number(new URLSearchParams(location.search).get('t'));if(initialTime>0){player.seek(initialTime);player.playing=mode==='auto'&&!workbench&&!reduced.matches;}
  const state={last:0,ambient:0,open:false,layer:0,w:0,h:0,dpr:1,pointer:null,modalResume:false,inputAt:-Infinity};
  const cavity=new Path2D('M-49 7 C-57-17-33-44-9-48 C15-57 30-31 47-6 C60 16 35 43 7 45 C-24 51-53 35-49 7Z');
  function view(){const v=cameraTrack.pose(player.time);if(v.follow==='hero'){const hero=factory.frame(player.time).hero;if(hero)return{...v,x:hero.x,y:hero.y};}return v;}
  function scale(v){return Math.min(state.w/1280,state.h/760)*v.zoom;}
  function screen(ctx){ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.clearRect(0,0,state.w,state.h);}
  function placeWorld(ctx,v){ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.translate(state.w/2,state.h/2);ctx.scale(scale(v),scale(v));ctx.translate(-v.x,-v.y);}
  function world(ctx,v){screen(ctx);placeWorld(ctx,v);}
  function transform(ctx,b){ctx.translate(b.x,b.y);ctx.rotate(b.angle||0);ctx.scale(b.sx??1,b.sy??1);}
  function cavityTransform(ctx,actor){
    if(actor.kind==='child'){ctx.scale(motion.geometry.childScale,motion.geometry.childScale);return;}
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
    if(entry.id==='hero'&&!player.playing&&!reduced.matches&&(player.time<1.2||(player.time>=6.8&&player.time<13)||(player.time>=104&&player.time<106.8))){
      // A small inward breath only at rest; contact silhouettes and machine forces stay on story time.
      b={...b,bend:(b.bend||0)+.025*(.5+.5*Math.sin(state.ambient*2.4))};
    }
    if(entry.id==='hero'&&player.time>=119&&player.time<132){const age=(performance.now()-state.inputAt)/1000,k=age>=0&&age<.22?Math.sin(Math.PI*age/.22):0;b={...b,sx:b.sx*(1+.035*k),sy:b.sy*(1-.035*k)};}
    const outline=actor.localPath(b);top.save();transform(top,b);
    top.fillStyle=entry.color||palette.ink;top.fill(outline);
    if(entry.cavity){
      top.save();top.clip(outline);cavityTransform(top,actor);
      top.globalCompositeOperation='destination-out';top.fill(cavity);top.globalCompositeOperation='source-over';top.clip(cavity);
      const damage=clamp(entry.damage||0);
      fracture(entry,damage,top);
      if(entry.blacken){top.globalAlpha=clamp(entry.blacken);top.fillStyle=palette.ink;top.fillRect(-100,-100,200,200);top.globalAlpha=1;}
      top.restore();
      if(entry.core){top.fillStyle=palette.gold;top.beginPath();top.ellipse(0,0,10*(entry.coreScale??1),10*(entry.coreScale??1),0,0,Math.PI*2);top.fill();}
    }
    if(entry.label==='reject'&&entry.restraint?.attached!==false)drawFailureMark(top,entry.restraint);
    top.restore();
    if(entry.emotion){
      window.FlatlandEmotions.draw(top,entry.emotion,b.x+15,b.y-(actor.kind==='mother'?120:95),entry.emotionElapsed??.3,entry.emotionDuration??1.2);
    }
  }
  function drawFailureMark(ctx,restraint={}){
    const size=restraint.size??1,peel=restraint.peel??0;
    ctx.save();ctx.translate(-17*size,10);ctx.rotate(-peel*.42);ctx.scale(size,size);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(27,0);ctx.lineTo(34,11);ctx.lineTo(27,22);ctx.lineTo(0,22);ctx.closePath();
    ctx.fillStyle=palette.paper;ctx.fill();ctx.strokeStyle=palette.ink;ctx.lineWidth=1.2;ctx.stroke();
    ctx.lineWidth=3.2;ctx.lineCap='square';ctx.beginPath();ctx.moveTo(10,5);ctx.lineTo(22,17);ctx.moveTo(22,5);ctx.lineTo(10,17);ctx.stroke();ctx.restore();
  }
  const heroTexture=document.createElement('canvas');heroTexture.width=heroTexture.height=256;
  const heroTextureContext=heroTexture.getContext('2d'),textureExtent=160;
  const heroMaterial=document.createElement('canvas');heroMaterial.width=heroMaterial.height=256;
  const heroMaterialContext=heroMaterial.getContext('2d');
  function journeyData(time){
    const sample=factory.frame(Math.min(time,131.999999)),entry=sample.actors.find(a=>a.id==='hero');
    const ctx=heroTextureContext;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,256,256);
    if(entry){const a=256/textureExtent;ctx.setTransform(a,0,0,a,128,128);drawActor({...entry,textureWindow:true,blacken:(entry.blacken||0)*(1-.85*(entry.restraint?.release||0)),body:{...entry.body,x:0,y:0,angle:0}},ctx);heroMaterialContext.setTransform(a,0,0,a,128-800*a,128-550*a);window.FlatlandPossibility.draw(heroMaterialContext,state.ambient);ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-over';ctx.drawImage(heroMaterial,0,0);ctx.globalCompositeOperation='source-over';}
    return{...sample,entry,heroTexture,textureExtent,detachedTag:factory.frame(time).detachedTag};
  }
  function drawLight(light){
    if(!light)return;const glow=clamp(light.glow||0),r=light.r||10;
    if(glow){const gradient=top.createRadialGradient(light.x,light.y,r*.2,light.x,light.y,r*5);gradient.addColorStop(0,palette.gold+'88');gradient.addColorStop(1,palette.gold+'00');top.fillStyle=gradient;top.beginPath();top.arc(light.x,light.y,r*5*glow,0,Math.PI*2);top.fill();}
    top.fillStyle=glow?palette.cream:palette.gold;top.beginPath();top.arc(light.x,light.y,r,0,Math.PI*2);top.fill();
  }
  function draw(time,v){
    world(low,v);window.FlatlandPossibility.draw(low,state.ambient);
    if(time>=119){
      screen(top);const data=journeyData(time),viewport={w:state.w,h:state.h,dpr:state.dpr};
      if(time<138)dimension.drawJourney(top,time,v,viewport,state.ambient,data);
      else dimension.draw(top,time,v,viewport,state.ambient,data);
      return;
    }
    world(top,v);const s=scale(v),viewport={w:state.w,h:state.h};
    top.fillStyle=time>=61?palette.outside.background:palette.blue;top.fillRect(v.x-state.w/s/2-1,v.y-state.h/s/2-1,state.w/s+2,state.h/s+2);
    const plant=factory.frame(time),heading=plant.hero?plant.hero.angle+characters.actors.child.headAxis(plant.hero).angle:0;
    if(time<61){
      district.drawBase(top,time);
      const home=district.frame(time);home.actors.forEach(drawActor);
      if(time>=58)plant.actors.filter(actor=>actor.id==='hero').forEach(drawActor);
      window.FlatlandCityMap.drawGate(top,time,palette);
    }else if(time<104){
      if(time>=102.8){screenOverlay();window.FlatlandInner.drawOuter(top,time,viewport,heading,plant.chase?{...plant.chase,scale:s}:undefined);placeWorld(top,v);}
      top.save();top.globalAlpha=1-clamp((time-102.8)/1.2);factory.drawBase(top,time);top.restore();
      plant.actors.forEach(drawActor);drawLight(plant.light);
      top.save();top.globalAlpha=1-clamp((time-102.8)/1.2);factory.drawOverlay(top,time);top.restore();
    }else{
      screenOverlay();window.FlatlandInner.drawOuter(top,time,viewport,heading,plant.chase?{...plant.chase,scale:s}:undefined);placeWorld(top,v);
      plant.actors.filter(actor=>actor.id==='hero').forEach(drawActor);if(time<106.8||time>=119)drawLight(plant.light);factory.drawOverlay(top,time);
    }
    // Passing the dark doorway is an edit between two independent scene spaces.
    const doorCover=time<61?clamp((time-60.65)/.35):1-clamp((time-61)/.45);
    if(time>60.65&&time<61.45){screenOverlay();top.globalAlpha=doorCover;top.fillStyle=palette.industrial;top.fillRect(0,0,state.w,state.h);top.globalAlpha=1;}
    if(time>=106.8&&time<119){
      screenOverlay();const light=plant.light,portal={x:(plant.hero.x-v.x)*s+state.w/2,y:(plant.hero.y-v.y)*s+state.h/2,radius:50*s*motion.geometry.childScale,angle:plant.hero.angle};
      const screenLight=light?{x:(light.x-v.x)*s+state.w/2,y:(light.y-v.y)*s+state.h/2,r:(light.r||10)*s}:null;
      window.FlatlandInner.draw(top,time,viewport,state.ambient,screenLight,portal);
      if(time<110.5){const g=window.FlatlandInner.portalGeometry(time,viewport,portal,screenLight),entry=plant.actors.find(a=>a.id==='hero');top.save();top.translate(g.x,g.y);top.rotate(g.angle);top.scale(g.radius/(50*motion.geometry.childScale),g.radius/(50*motion.geometry.childScale));drawFailureMark(top,entry.restraint);top.restore();}
    }
  }
  function screenOverlay(){top.setTransform(state.dpr,0,0,state.dpr,0,0);}
  const format=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function interfaceState(v){
    const shot=cameraTrack.shotAt(player.time),index=cameraTrack.shots.indexOf(shot);
    stage.dataset.phase=shot.id;stage.dataset.time=player.time.toFixed(2);stage.dataset.layer=state.open?'possibility':'windows';stage.dataset.mode=player.mode;stage.dataset.playing=String(player.playing);
    if(!workbench){const link=document.querySelector('.workbench-link');if(link)link.href='./workbench.html?mode='+player.mode+'&t='+player.time.toFixed(2);return;}
    const notes=window.FlatlandStoryNotes.at(player.time);
    for(const [name,text] of Object.entries(notes)){const panel=$('shot-'+name);if(panel&&panel.textContent!==text)panel.textContent=text;}
    const caption=shot.label.split(' · ')[1];if($('caption').textContent!==caption)$('caption').textContent=caption;$('phase-number').textContent=`${String(index+1).padStart(2,'0')} / ${cameraTrack.shots.length}`;
    $('chapter').value=shot.id;$('progress').value=Math.round(player.time*100);$('progress').style.setProperty('--p',`${player.time/duration*100}%`);
    $('time').value=`${format(player.time)} / ${format(duration)}`;$('play').setAttribute('aria-label',player.playing?'暂停':'播放');$('play-icon').textContent=player.mode==='auto'&&player.playing?'Ⅱ':'▶';
    $('mode-interactive').setAttribute('aria-pressed',String(player.mode==='interactive'));
    $('mode-auto').setAttribute('aria-pressed',String(player.mode==='auto'));
    $('play').setAttribute('aria-label',player.mode==='interactive'?'推进下一动作':player.playing?'暂停':'播放');
    const viewer=document.querySelector('.brand');if(viewer)viewer.href='./?mode='+player.mode+'&t='+player.time.toFixed(2);
  }
  function frame(now){
    const dt=state.last?Math.min((now-state.last)/1000,.05):0;state.last=now;
    if(!document.hidden&&!$('reference-dialog')?.open){
      player.tick(dt);
      if(!reduced.matches)state.ambient+=dt;
    }
    state.layer=reduced.matches?Number(state.open):state.layer+(Number(state.open)-state.layer)*(1-Math.exp(-dt*6));upper.style.opacity=1-state.layer*.92;
    const v=view();draw(player.time,v);interfaceState(v);requestAnimationFrame(frame);
  }
  function resize(){const box=stage.getBoundingClientRect();state.w=box.width;state.h=box.height;state.dpr=Math.min(window.devicePixelRatio||1,2);[lower,upper].forEach(c=>{c.width=Math.round(state.w*state.dpr);c.height=Math.round(state.h*state.dpr);});}
  function seek(time){player.seek(time);}
  function togglePlay(){state.inputAt=performance.now();player.tap();}
  if(workbench){
    cameraTrack.shots.forEach(shot=>{const option=document.createElement('option');option.value=shot.id;option.textContent=shot.label;$('chapter').append(option);});
    on('chapter','change',e=>seek(cameraTrack.shots.find(s=>s.id===e.target.value).start));
    on('previous','click',()=>{const i=cameraTrack.shots.indexOf(cameraTrack.shotAt(player.time));seek(cameraTrack.shots[Math.max(0,i-1)].start);});
    on('next','click',()=>{const i=cameraTrack.shots.indexOf(cameraTrack.shotAt(player.time));seek(cameraTrack.shots[Math.min(cameraTrack.shots.length-1,i+1)].start);});

  }
  on('mode-interactive','click',()=>player.setMode('interactive'));
  on('mode-auto','click',()=>player.setMode('auto'));
  on('play','click',togglePlay);on('restart','click',()=>seek(0));
  on('progress','input',e=>seek(Number(e.target.value)/100));
  on('layers','click',()=>{state.open=!state.open;$('layers').setAttribute('aria-pressed',String(state.open));});
  stage.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)togglePlay();}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();seek(player.time+(e.key==='ArrowRight'?1:-1));}});
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0||state.pointer!==null)return;
    state.pointer=e.pointerId;state.inputAt=performance.now();stage.focus({preventScroll:true});stage.setPointerCapture(e.pointerId);player.press();
  });
  function release(e,cancelled=false){if(state.pointer!==e.pointerId)return;state.pointer=null;player.release(cancelled);}
  stage.addEventListener('pointerup',e=>release(e));
  stage.addEventListener('pointercancel',e=>release(e,true));
  stage.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('visibilitychange',()=>{state.last=0;if(document.hidden&&player.pressed){player.release(true);state.pointer=null;}});
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
  new ResizeObserver(resize).observe(stage);resize();requestAnimationFrame(frame);
})();
