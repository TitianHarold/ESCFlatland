/* Discovery has its own clock: waiting animates the dark, finding light opens it. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./palette.js'));
  else root.FlatlandInnerDiscovery=factory(root.FlatlandPalette);
})(typeof globalThis!=='undefined'?globalThis:this,function(P){
  'use strict';
  const TAU=Math.PI*2,total=6,breakDuration=2,collectProgress=.72;
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mix=(a,b,q)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-q)+parseInt(b.slice(i,i+2),16)*q).toString(16).padStart(2,'0')).join('');
  const background=()=>mix(P.night,'#000000',.89);
  const sites=Object.freeze([[.37,.57],[.62,.38],[.30,.32],[.70,.65],[.49,.72],[.53,.24]].map(Object.freeze));
  function size(viewport){return{w:Math.max(1,viewport?.w||1),h:Math.max(1,viewport?.h||1),s:Math.max(.55,Math.min(viewport?.w/1280||1,viewport?.h/760||1))};}
  function point(id,clock,viewport){const {w,h,s}=size(viewport),p=sites[id];return{x:w*p[0]+Math.sin(clock*.42+id*1.73)*8*s,y:h*p[1]+Math.cos(clock*.35+id*2.17)*7*s};}
  class Session{
    constructor({autoDuration=8}={}){this.autoDuration=Math.max(3,Number.isFinite(autoDuration)?autoDuration:8);this.reset();}
    reset(){this.clock=0;this.actionClock=0;this.autoElapsed=0;this.found=[];this.breakAge=0;return this;}
    collect(id,viewport){
      if(this.found.some(item=>item.id===id)||this.found.length===total)return false;
      const pair=Math.floor(this.found.length/2)*2;
      if(id<pair||id>pair+1)return false;
      const {w,h}=size(viewport),p=point(id,this.clock,viewport);
      this.found.push({id,u:p.x/w,v:p.y/h,at:this.actionClock,clock:this.clock});
      this.autoElapsed=Math.max(this.autoElapsed,this.found.length*(this.autoDuration-breakDuration)/total);
      if(this.found.length===total)this.breakAge=0;
      return true;
    }
    tap(x,y,viewport){
      if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      const candidates=this.snapshot(viewport).points.filter(p=>p.visible&&!p.collected);
      const hit=candidates.find(p=>Math.hypot(x-p.x,y-p.y)<=p.hitRadius);
      return hit?this.collect(hit.id,viewport):false;
    }
    update(dt,{automatic=false,advance=true}={}){
      dt=Math.max(0,Number.isFinite(dt)?dt:0);this.clock+=dt;
      if(!advance)return this;
      const step=(this.autoDuration-breakDuration)/total,start=this.autoElapsed,end=start+dt;
      let advanced=0;
      if(automatic&&this.found.length<total){
        // Step across each scheduled hit so a long frame behaves like many small frames.
        for(let number=this.found.length+1;number<=total;number++){
          const due=number*step;if(due>end+1e-9)break;
          const segment=Math.max(0,due-start-advanced);this.advance(segment);advanced+=segment;
          const id=Array.from({length:total},(_,i)=>i).find(i=>!this.found.some(p=>p.id===i));
          this.collect(id,{w:1280,h:760});
        }
      }
      this.advance(dt-advanced);if(automatic)this.autoElapsed=end;return this;
    }
    advance(dt){this.actionClock+=dt;if(this.found.length===total)this.breakAge=Math.min(breakDuration,this.breakAge+dt);}
    seek(progress){
      const p=clamp(Number.isFinite(progress)?progress:0);this.reset();this.clock=this.autoElapsed=p*this.autoDuration;this.actionClock=this.clock;
      const count=p>=collectProgress?total:Math.floor(p/collectProgress*total+1e-8);
      for(let id=0;id<count;id++){const at=Math.min(this.actionClock-.6,(id+1)*(this.autoDuration-breakDuration)/total);this.found.push({id,u:sites[id][0],v:sites[id][1],at,clock:at});}
      this.breakAge=p>=collectProgress?(p-collectProgress)/(1-collectProgress)*breakDuration:0;return this;
    }
    snapshot(viewport){
      const {w,h,s}=size(viewport),count=this.found.length,b=clamp(this.breakAge/breakDuration),pair=Math.floor(count/2)*2;
      const points=sites.map((_,id)=>{
        const found=this.found.find(item=>item.id===id),p=found?{x:found.u*w,y:found.v*h}:point(id,this.clock,viewport);
        const visible=!!found||(count<total&&id>=pair&&id<pair+2),pulse=.55+.45*Math.sin(this.clock*1.55+id*2.1)**2;
        const unlockedAt=pair?Math.max(...this.found.filter(item=>item.id<pair).map(item=>item.clock)):0,arrival=smooth((this.clock-unlockedAt)/.45);
        return{id,...p,r:(1.8+.6*pulse)*s,hitRadius:Math.max(24,30*s),alpha:visible?(found?.12:(.22+.48*pulse)*arrival)*(1-smooth(b/.4)):0,collected:!!found,visible};
      });
      const reveals=this.found.map(found=>{const age=Math.max(0,this.actionClock-found.at),strength=smooth(age/.6);return{id:found.id,x:found.u*w,y:found.v*h,age,strength,radius:(138+found.id%3*17)*s};});
      return{points,reveals,collected:count,progress:count<total?collectProgress*count/total:collectProgress+(1-collectProgress)*b,
        phase:count===total?(b>=1?'done':'break'):count||this.clock>.6?'discover':'dark',breakProgress:b,done:b>=1,clock:this.clock};
    }
  }
  let contentCanvas,maskCanvas,grainCanvas;
  function canvas(w,h){const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):typeof document!=='undefined'?document.createElement('canvas'):null;if(c){c.width=w;c.height=h;}return c;}
  function buffers(w,h){
    if(!contentCanvas){contentCanvas=canvas(w,h);maskCanvas=canvas(w,h);}
    if(!contentCanvas||!maskCanvas)return false;
    for(const c of [contentCanvas,maskCanvas])if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
    return true;
  }
  function texture(ctx,w,h,p){
    if(!grainCanvas){grainCanvas=canvas(128,128);if(grainCanvas){const g=grainCanvas.getContext('2d');let seed=3917;for(let i=0;i<1900;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%128;seed=(Math.imul(seed,1664525)+1013904223)>>>0;g.fillStyle=i%3?'#ffffff':'#000000';g.globalAlpha=.1;g.fillRect(x,seed%128,1,1);}}}
    if(grainCanvas){ctx.save();ctx.globalAlpha=.055;ctx.fillStyle=ctx.createPattern(grainCanvas,'repeat');ctx.fillRect(0,0,w,h);ctx.restore();}
    ctx.strokeStyle=p.quiet;ctx.lineCap='round';ctx.lineJoin='round';
  }
  function fallbackContents(ctx,v,clock,p){
    const {w,h,s}=size(v),colors=[p.teal,p.lavender,p.coral,p.gold];ctx.fillStyle=p.night;ctx.fillRect(0,0,w,h);
    for(let i=0;i<9;i++){ctx.save();ctx.translate(w*(.16+(i%3)*.34),h*(.14+Math.floor(i/3)*.34));ctx.rotate(clock*.045*(i%2?1:-1)+i);ctx.fillStyle=colors[i%4];ctx.beginPath();ctx.moveTo(-230*s,20*s);ctx.bezierCurveTo(-70*s,-180*s,200*s,-90*s,210*s,40*s);ctx.bezierCurveTo(130*s,-20*s,0,130*s,-230*s,20*s);ctx.fill();ctx.restore();}
  }
  function draw(ctx,viewport,state,{drawContents,palette=P}={}){
    const {w,h,s}=size(viewport),clock=state.clock||0,b=state.breakProgress||0,p=palette,dark=mix(p.night,'#000000',.89);
    ctx.save();ctx.fillStyle=dark;ctx.fillRect(0,0,w,h);texture(ctx,w,h,p);
    ctx.globalAlpha=.018+.009*Math.sin(clock*.3)**2;
    for(let i=0;i<11;i++){const x=w*(.1+(i%4)*.27)+Math.sin(clock*.08+i)*15*s,y=h*(.14+(i%3)*.35),r=(90+(i%4)*30)*s;ctx.beginPath();ctx.moveTo(x-r,y);ctx.bezierCurveTo(x-r*.6,y-r,x+r*.9,y+r*.8,x+r,y);ctx.bezierCurveTo(x+r*.5,y-r*.6,x-r*.7,y+r,x-r,y);ctx.lineWidth=(i%3?1:2.4)*s;ctx.stroke();}
    ctx.globalAlpha=1;
    if((state.reveals.length||b>0)&&buffers(Math.ceil(w),Math.ceil(h))){
      const c=contentCanvas.getContext('2d'),m=maskCanvas.getContext('2d');
      c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.clearRect(0,0,w,h);c.save();
      if(drawContents)drawContents(c,viewport);else fallbackContents(c,viewport,clock,p);
      c.restore();m.setTransform(1,0,0,1,0,0);m.globalAlpha=1;m.globalCompositeOperation='source-over';m.clearRect(0,0,w,h);
      for(const r of state.reveals){const radius=r.radius*(.12+.88*r.strength)*(1+b*.9),g=m.createRadialGradient(r.x,r.y,0,r.x,r.y,radius);g.addColorStop(0,'rgba(255,255,255,'+(.88*r.strength)+')');g.addColorStop(.48,'rgba(255,255,255,'+(.58*r.strength)+')');g.addColorStop(1,'rgba(255,255,255,0)');m.fillStyle=g;m.fillRect(r.x-radius,r.y-radius,radius*2,radius*2);}
      if(b>0){const reach=Math.hypot(w,h)*1.2,half=reach*.55*Math.pow(smooth(b),2.2),feather=70*s;m.save();m.translate(w*.51,h*.49);m.rotate(-.55);const g=m.createLinearGradient(0,-half-feather,0,half+feather);g.addColorStop(0,'#ffffff00');g.addColorStop(Math.min(.49,feather/(half*2+feather*2)),'#ffffffff');g.addColorStop(Math.max(.51,1-feather/(half*2+feather*2)),'#ffffffff');g.addColorStop(1,'#ffffff00');m.fillStyle=g;m.fillRect(-reach,-half-feather,reach*2,(half+feather)*2);m.restore();}
      c.globalCompositeOperation='destination-in';c.drawImage(maskCanvas,0,0);c.globalCompositeOperation='source-over';ctx.drawImage(contentCanvas,0,0);
      if(b>0&&b<.9){const reach=Math.hypot(w,h)*1.2,half=reach*.55*Math.pow(smooth(b),2.2);ctx.save();ctx.translate(w*.51,h*.49);ctx.rotate(-.55);ctx.strokeStyle=p.gold;ctx.globalAlpha=Math.sin(Math.PI*clamp(b/.9))*.42;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-reach,side*half);ctx.bezierCurveTo(-reach*.28,side*half+6*s,reach*.28,side*half-10*s,reach,side*half);ctx.lineWidth=2.2*s;ctx.stroke();}ctx.restore();}
    }
    for(const dot of state.points){if(!dot.visible||dot.alpha<=0)continue;ctx.globalAlpha=dot.alpha;const glow=ctx.createRadialGradient(dot.x,dot.y,0,dot.x,dot.y,dot.r*5);glow.addColorStop(0,p.gold+'70');glow.addColorStop(1,p.gold+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(dot.x,dot.y,dot.r*5,0,TAU);ctx.fill();ctx.fillStyle=p.gold;ctx.beginPath();ctx.arc(dot.x,dot.y,dot.r,0,TAU);ctx.fill();}
    ctx.restore();
  }
  return{Session,draw,total,get background(){return background();}};
});
