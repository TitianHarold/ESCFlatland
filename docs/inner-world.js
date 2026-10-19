/* The cavity opens into moving pigments; one seed is handed between the same views. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./palette.js'));
  else root.FlatlandInner=factory(root.FlatlandPalette);
})(typeof globalThis!=='undefined'?globalThis:this,function(P){
  'use strict';
  const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
  const ease=(t,a,b)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
  let grainTile,grainPattern,grainContext;
  function material(ctx){
    if(!grainTile){
      grainTile=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(256,256):typeof document!=='undefined'?document.createElement('canvas'):null;
      if(!grainTile)return null;grainTile.width=grainTile.height=256;
      const g=grainTile.getContext('2d');let seed=7253;
      const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      for(let i=0;i<15000;i++){
        g.globalAlpha=i%3?.11:.15;g.fillStyle=i%3?P.paper:P.night;
        g.fillRect(random()*256,random()*256,.45+random()*1.3,.45+random()*1.3);
      }
      g.globalAlpha=1;
    }
    if(grainContext!==ctx){grainContext=ctx;grainPattern=ctx.createPattern(grainTile,'repeat');}
    return grainPattern;
  }
  function polygon(ctx,points,color,texture){
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();
    ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.lineJoin='round';ctx.stroke();
    if(texture){ctx.fillStyle=texture;ctx.fill();}
  }
  function pigment(hex,dark,amount){
    return'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-amount)+parseInt(dark.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');
  }
  const layers=[
    {phase:.1,radius:480,width:230,depth:160,colors:[P.navy,P.cyan,P.deep]},
    {phase:1.25,radius:290,width:155,depth:-100,colors:[P.teal,P.cyan,P.navy]},
    {phase:2.55,radius:360,width:195,depth:90,colors:[P.lavender,P.coral,P.night]},
    {phase:3.7,radius:250,width:145,depth:-30,colors:[P.coral,P.lavender,P.navy]},
    {phase:4.8,radius:400,width:115,depth:230,colors:[P.gold,P.coral,P.navy]},
    {phase:5.65,radius:550,width:245,depth:-80,colors:[P.deep,P.navy,P.teal]}
  ].map(layer=>({...layer,backs:layer.colors.map(color=>pigment(color,P.night,.14))}));
  function rotate(point,time){
    const ay=.32*Math.sin(time*.31)+time*.115,ax=.46*Math.sin(time*.37),az=.16*Math.sin(time*.24);
    const x=point.x*Math.cos(ay)+point.z*Math.sin(ay),z=-point.x*Math.sin(ay)+point.z*Math.cos(ay);
    const y=point.y*Math.cos(ax)-z*Math.sin(ax),zz=point.y*Math.sin(ax)+z*Math.cos(ax);
    return{x:x*Math.cos(az)-y*Math.sin(az),y:x*Math.sin(az)+y*Math.cos(az),z:zz};
  }
  function surface(layer,u,v,time){
    const a=-2.8+u*6.1+layer.phase+time*.13;
    const r=layer.radius+65*Math.sin(a*1.7+layer.phase)+34*Math.cos(u*9.4-time*.25);
    const twist=a*.65+layer.phase*.8+time*.43+.45*Math.sin(u*8+time*.2);
    const taper=ease(u,0,.11)*(1-ease(u,.89,1));
    const width=layer.width*(.83+.2*Math.sin(u*7.7+layer.phase))*taper;
    const center={x:r*Math.cos(a)+95*Math.sin(a*.7+layer.phase),y:r*.64*Math.sin(a)+90*Math.sin(a*1.8+layer.phase),z:layer.depth+210*Math.sin(a*.86+layer.phase)+85*Math.sin(u*8-time*.33)};
    const span={x:Math.cos(a)*Math.cos(twist),y:Math.sin(a)*Math.cos(twist),z:Math.sin(twist)};
    return rotate({x:center.x+span.x*v*width,y:center.y+span.y*v*width,z:center.z+span.z*v*width},time);
  }
  function project(p){const scale=1100/Math.max(220,1450+p.z);return{x:p.x*scale,y:p.y*scale,z:p.z,scale};}
  function foldedFaces(time){
    const faces=[],steps=96;
    layers.forEach(layer=>{
      for(let i=0;i<steps;i++){
        const u=i/steps,next=(i+1)/steps;
        for(let band=0;band<3;band++){
          const v0=-1+band*2/3,v1=-1+(band+1)*2/3;
          const points=[surface(layer,u,v0,time),surface(layer,next,v0,time),surface(layer,next,v1,time),surface(layer,u,v1,time)];
          const a=points[0],b=points[1],c=points[3],normalZ=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
          faces.push({points:points.map(project),z:points.reduce((sum,p)=>sum+p.z,0)/4,color:normalZ<0?layer.backs[band]:layer.colors[band]});
        }
      }
    });
    return faces.sort((a,b)=>b.z-a.z);
  }
  const cavityPath='M-49 7 C-57-17-33-44-9-48 C15-57 30-31 47-6 C60 16 35 43 7 45 C-24 51-53 35-49 7Z';
  function cavity(ctx){
    ctx.beginPath();ctx.moveTo(-49,7);ctx.bezierCurveTo(-57,-17,-33,-44,-9,-48);
    ctx.bezierCurveTo(15,-57,30,-31,47,-6);ctx.bezierCurveTo(60,16,35,43,7,45);
    ctx.bezierCurveTo(-24,51,-53,35,-49,7);ctx.closePath();
  }
  function amount(t){return t>=110&&t<119?ease(t,110,110.18)*(1-ease(t,118.2,119)):0;}
  function portalProgress(t){return t<110||t>=119?0:ease(t,110,112)*(1-ease(t,118,119));}
  function darkness(t){return(.82-.37*ease(t,113.2,116))*(1-ease(t,119,130));}
  function portalGeometry(t,viewport,portal,externalLight){
    const w=viewport.w,h=viewport.h,s=Math.max(w/1280,h/760),entry=ease(t,110,112),exit=ease(t,118,119);
    const source={x:Number.isFinite(portal?.x)?portal.x:w/2,y:Number.isFinite(portal?.y)?portal.y:h/2};
    const target=externalLight||{x:w*.76,y:h*.24,r:10*s};
    const x=source.x*(1-exit)+target.x*exit,y=source.y*(1-exit)+target.y*exit;
    // The cavity contains a generous central disk; this radius takes its entire rim beyond every corner.
    const cover=1.8*Math.max(Math.hypot(x,y),Math.hypot(w-x,y),Math.hypot(x,h-y),Math.hypot(w-x,h-y))+40;
    const start=Math.max(1,Number.isFinite(portal?.radius)?portal.radius:50*s);
    const expanded=start*Math.pow(Math.max(start,cover)/start,entry);
    // At the end the remaining opening fits completely inside the same radius-10 light.
    const finish=Math.max(.1,(target.r??10*s)*.55),radius=expanded*Math.pow(finish/expanded,exit);
    return{x,y,radius,angle:Number.isFinite(portal?.angle)?portal.angle:0,entry,exit,start,cover};
  }
  function drawCore(ctx,t,viewport,externalLight,portal){
    if(t<110||t>=119)return;
    const s=Math.max(viewport.w/1280,viewport.h/760),flight=ease(t,116,118.2),enter=ease(t,110,112);
    const inner={x:viewport.w/2,y:viewport.h/2},source=portal||inner,target=externalLight||{x:inner.x+103*s,y:inner.y-80*s};
    const x=t<112?source.x*(1-enter)+inner.x*enter:inner.x*(1-flight)+target.x*flight,y=t<112?source.y*(1-enter)+inner.y*enter:inner.y*(1-flight)+target.y*flight;
    const r=t<112?(portal?.seedRadius??10*s)*(1-enter)+10*s*enter:10*s*(1-flight)+(externalLight?.r??10*s)*flight;
    ctx.save();
    const reveal=externalLight?.reveal??(.18+.82*ease(t,113.2,116)),glow=.1+.9*reveal,halo=ctx.createRadialGradient(x,y,r*.2,x,y,r*5);ctx.globalAlpha=reveal;
    halo.addColorStop(0,P.gold+'66');halo.addColorStop(1,P.gold+'00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*5*glow,0,TAU);ctx.fill();
    ctx.fillStyle=P.gold;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();
  }
  let veilCanvas,veilContext;
  function drawVeil(ctx,t,viewport,clock){
    const w=viewport.w,h=viewport.h,s=Math.max(w/1280,h/760);
    if(!veilCanvas){veilCanvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):typeof document!=='undefined'?document.createElement('canvas'):null;if(!veilCanvas)return;veilContext=veilCanvas.getContext('2d');}
    if(veilCanvas.width!==Math.ceil(w)||veilCanvas.height!==Math.ceil(h)){veilCanvas.width=Math.ceil(w);veilCanvas.height=Math.ceil(h);}
    const c=veilContext,phase=Number.isFinite(clock)?clock:0,opening=ease(t,113.2,116),strength=darkness(t);
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.globalCompositeOperation='source-over';c.globalAlpha=strength;c.fillStyle=P.night;c.fillRect(0,0,w,h);
    for(let i=0;i<7;i++){
      const x=w*(.12+(i%4)*.25)+Math.sin(phase*.09+i)*24*s,y=h*(.2+(i%3)*.3)+Math.cos(phase*.1+i)*18*s,r=(180+(i%3)*55)*s,g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,(i%2?P.quiet:P.night)+'99');g.addColorStop(1,P.night+'00');c.globalAlpha=strength*.36;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    const texture=material(c);if(texture){c.globalAlpha=.3;c.fillStyle=texture;c.fillRect(0,0,w,h);}
    c.lineCap='round';c.lineJoin='round';
    for(let i=0;i<22;i++){
      const angle=i*2.399+phase*.025,rx=(95+(i%7)*34)*s,ry=(65+(i%5)*28)*s,cx=w/2+Math.cos(i*3.1+phase*.12)*34*s,cy=h/2+Math.sin(i*2.7+phase*.10)*26*s;
      c.beginPath();
      for(let j=0;j<=44;j++){const a=j/44*TAU,warp=1+.13*Math.sin(a*3+i+phase*.23),x=Math.cos(a)*rx*warp,y=Math.sin(a)*ry*warp,px=cx+x*Math.cos(angle)-y*Math.sin(angle),py=cy+x*Math.sin(angle)+y*Math.cos(angle);j?c.lineTo(px,py):c.moveTo(px,py);}
      c.closePath();c.globalAlpha=.58+.18*Math.sin(i+phase*.14)**2;c.strokeStyle=i%3?P.ink:P.quiet;c.lineWidth=(i%4===0?5:2.2)*s;c.stroke();
    }
    for(let i=0;i<7;i++){
      const y=h*(.12+i*.13),drift=18*s*Math.sin(phase*.19+i);c.beginPath();c.moveTo(-40,y);c.bezierCurveTo(w*.34,y+100*s+drift,w*.65,y-130*s-drift,w+40,y+25*s);c.globalAlpha=.35;c.strokeStyle=P.ink;c.lineWidth=3*s;c.stroke();
    }
    if(opening>0){
      c.save();c.translate(w/2,h/2);c.rotate(-.48);c.globalCompositeOperation='destination-out';c.globalAlpha=1;c.fillStyle=P.ink;
      const length=Math.hypot(w,h)*.85,width=(1+Math.pow(opening,1.35)*Math.max(w,h)*.74)/2,edge=(i,side)=>{const u=i/18;return[(u-.5)*length*2,side*width+(7*s*Math.sin(i*1.73)+4*s*Math.sin(i*3.31+phase*.12))*Math.sin(Math.PI*u)];};
      c.beginPath();for(let i=0;i<=18;i++){const p=edge(i,-1);i?c.lineTo(...p):c.moveTo(...p);}for(let i=18;i>=0;i--)c.lineTo(...edge(i,1));c.closePath();c.fill();
      const beam=ease(t,113.2,113.55)*(1-ease(t,115.8,116.25));
      c.globalCompositeOperation='source-over';c.strokeStyle=P.gold;
      for(const side of [-1,1]){
        c.beginPath();for(let i=0;i<=18;i++){const p=edge(i,side);i?c.lineTo(...p):c.moveTo(...p);}
        c.globalAlpha=beam*(side<0?.2:.08);c.lineWidth=14*s;c.stroke();
        c.globalAlpha=beam*(side<0?.95:.45);c.lineWidth=(side<0?3.2:1.8)*s;c.stroke();
      }
      c.restore();
    }
    c.globalAlpha=1;c.globalCompositeOperation='source-over';ctx.drawImage(veilCanvas,0,0);
  }
  function draw(ctx,t,viewport,clock,externalLight,portal){
    const w=viewport.w,h=viewport.h,s=Math.max(w/1280,h/760);
    if(amount(t)){
      const g=portalGeometry(t,viewport,portal,externalLight),k=g.radius/50;
      let supplied=portal?.windowPath;
      if(typeof supplied==='string')supplied=typeof Path2D!=='undefined'?new Path2D(supplied):null;
      ctx.save();ctx.globalAlpha=amount(t);ctx.translate(g.x,g.y);ctx.rotate(g.angle);ctx.scale(k,k);
      if(supplied)ctx.clip(supplied);else{cavity(ctx);ctx.clip();}
      ctx.scale(1/k,1/k);ctx.rotate(-g.angle);ctx.translate(-g.x,-g.y);
      const texture=material(ctx);ctx.fillStyle=P.navy;ctx.fillRect(0,0,w,h);
      if(texture){ctx.fillStyle=texture;ctx.fillRect(0,0,w,h);}
      // The printed space returns through the window while its color fades into the outer space.
      const contentScale=(g.start/470)*(1-g.entry)+s*g.entry;
      ctx.translate(g.x*(1-g.entry)+w/2*g.entry,g.y*(1-g.entry)+h/2*g.entry);ctx.scale(contentScale,contentScale);
      const time=(t-110)*.9+(Number.isFinite(clock)?clock*.035:0);
      for(const face of foldedFaces(time))polygon(ctx,face.points,face.color,texture);
      ctx.scale(1/contentScale,1/contentScale);ctx.translate(-(g.x*(1-g.entry)+w/2*g.entry),-(g.y*(1-g.entry)+h/2*g.entry));
      drawVeil(ctx,t,viewport,clock);
      ctx.restore();
      if(g.exit<.9){
        ctx.save();ctx.globalAlpha=1-ease(t,118.2,119);ctx.translate(g.x,g.y);ctx.rotate(g.angle);ctx.scale(k,k);
        ctx.strokeStyle=P.navy;ctx.lineWidth=1.1;
        if(supplied)ctx.stroke(supplied);else{cavity(ctx);ctx.stroke();}ctx.restore();
      }
    }
    // This is the same intact radius-10 entity; only its screen projection changes.
    drawCore(ctx,t,viewport,externalLight,portal);
  }
  function drawOuter(ctx,t,viewport,heading=0,motion){
    if(t>=119)return;
    ctx.save();ctx.globalAlpha=1;ctx.fillStyle=P.outside?.background||P.white||P.paper;ctx.fillRect(0,0,viewport.w,viewport.h);ctx.restore();
  }
  return{draw,drawOuter,amount,portalProgress,portalGeometry,darkness,cavityPath};
});
