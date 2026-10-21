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
  function point(id,clock,viewport){const {w,h,s}=size(viewport),p=sites[id],phase=id*1.73,rx=Math.min(w*.065,58*s),ry=Math.min(h*.06,48*s);return{x:w*p[0]+rx*(.74*Math.sin(clock*.95+phase)+.26*Math.sin(clock*1.71+phase*.7)),y:h*p[1]+ry*(.72*Math.cos(clock*.81+phase*1.25)+.28*Math.sin(clock*1.47+phase))};}
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
        const trail=found?[]:Array.from({length:7},(_,i)=>point(id,this.clock-(6-i)*.09,viewport));
        return{id,...p,trail,r:Math.max(2.8,(3.2+.8*pulse)*s),hitRadius:Math.max(28,34*s),alpha:visible?(found?.12:(.68+.32*pulse)*arrival)*(1-smooth(b/.4)):0,collected:!!found,visible};
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
  function revealMask(ctx,reveals,viewport,b){
    const {w,h}=size(viewport),growth=Math.pow(smooth(b/.72),1.5),solid=smooth(b/.42);
    for(const r of reveals){
      // Every opening stays rooted at the position the viewer actually caught.
      // Its own soft contour expands into neighbouring openings, never a preset slit.
      const reach=Math.max(Math.hypot(r.x,r.y),Math.hypot(w-r.x,r.y),Math.hypot(r.x,h-r.y),Math.hypot(w-r.x,h-r.y));
      const radius=r.radius*(.12+.88*r.strength)+reach*1.45*growth,alpha=r.strength*(.88+.12*solid);
      const g=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,radius);
      g.addColorStop(0,'rgba(255,255,255,'+alpha+')');
      g.addColorStop(.75*solid,'rgba(255,255,255,'+alpha+')');
      g.addColorStop(.48+.35*solid,'rgba(255,255,255,'+alpha*(.66+.34*solid)+')');
      g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g;ctx.fillRect(r.x-radius,r.y-radius,radius*2,radius*2);
    }
    // The cores already cover the viewport here; make the fully lit state exact,
    // including corner pixels, before the final seed returns to the body.
    if(b>=.72){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);}
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
      revealMask(m,state.reveals,viewport,b);
      c.globalCompositeOperation='destination-in';c.drawImage(maskCanvas,0,0);c.globalCompositeOperation='source-over';ctx.drawImage(contentCanvas,0,0);
    }
    for(const dot of state.points){
      if(!dot.visible||dot.alpha<=0)continue;
      if(dot.trail?.length){ctx.strokeStyle=p.gold;ctx.lineCap='round';for(let i=1;i<dot.trail.length;i++){const a=dot.trail[i-1],b=dot.trail[i];ctx.globalAlpha=dot.alpha*.28*i/dot.trail.length;ctx.lineWidth=Math.max(1,1.7*s)*i/dot.trail.length;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
      ctx.globalAlpha=dot.alpha;const radius=dot.r*7,glow=ctx.createRadialGradient(dot.x,dot.y,0,dot.x,dot.y,radius);glow.addColorStop(0,p.gold+'dd');glow.addColorStop(.22,p.gold+'72');glow.addColorStop(1,p.gold+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(dot.x,dot.y,radius,0,TAU);ctx.fill();ctx.fillStyle=p.gold;ctx.beginPath();ctx.arc(dot.x,dot.y,dot.r,0,TAU);ctx.fill();ctx.fillStyle=p.cream;ctx.beginPath();ctx.arc(dot.x,dot.y,dot.r*.52,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  return{Session,draw,total,get background(){return background();}};
});
