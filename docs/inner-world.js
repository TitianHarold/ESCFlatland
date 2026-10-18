/* Printed pigments unfold through the character's cavity, with no opacity transition. */
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
  function amount(t){return t>=106.8&&t<119?1:0;}
  function portalProgress(t){return t<106.8||t>=119?0:ease(t,106.8,110.5)*(1-ease(t,116,119));}
  function portalGeometry(t,viewport,portal,externalLight){
    const w=viewport.w,h=viewport.h,s=Math.max(w/1280,h/760),entry=ease(t,106.8,110.5),exit=ease(t,116,119);
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
    if(t<106.8)return;
    const s=Math.max(viewport.w/1280,viewport.h/760),flight=ease(t,112,116.8),join=ease(t,115.2,116.8);
    const inner={x:viewport.w/2+s*(90+flight*235),y:viewport.h/2+s*(-65-flight*135)};
    const enter=ease(t,106.8,112),source=portal||{x:viewport.w/2,y:viewport.h/2};
    const x=t<112?source.x*(1-enter)+inner.x*enter:externalLight?inner.x*(1-join)+externalLight.x*join:inner.x,y=t<112?source.y*(1-enter)+inner.y*enter:externalLight?inner.y*(1-join)+externalLight.y*join:inner.y;
    const r=t<112?10*s*(.55+.45*enter):10*s*(1-join)+(externalLight?.r??10*s)*join;
    ctx.save();
    if(t>=116.8){
      const glow=ease(t,116.8,117.5),halo=ctx.createRadialGradient(x,y,r*.2,x,y,r*5);
      halo.addColorStop(0,P.gold+'66');halo.addColorStop(1,P.gold+'00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*5*glow,0,TAU);ctx.fill();
    }
    ctx.fillStyle=P.gold;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();
  }
  function draw(ctx,t,viewport,clock,externalLight,portal){
    const w=viewport.w,h=viewport.h,s=Math.max(w/1280,h/760);
    if(amount(t)){
      const g=portalGeometry(t,viewport,portal,externalLight),k=g.radius/50;
      let supplied=portal?.windowPath;
      if(typeof supplied==='string')supplied=typeof Path2D!=='undefined'?new Path2D(supplied):null;
      ctx.save();ctx.globalAlpha=1;ctx.translate(g.x,g.y);ctx.rotate(g.angle);ctx.scale(k,k);
      if(supplied)ctx.clip(supplied);else{cavity(ctx);ctx.clip();}
      ctx.scale(1/k,1/k);ctx.rotate(-g.angle);ctx.translate(-g.x,-g.y);
      const texture=material(ctx);ctx.fillStyle=P.navy;ctx.fillRect(0,0,w,h);
      if(texture){ctx.fillStyle=texture;ctx.fillRect(0,0,w,h);}
      // The whole printed space grows out of the small window; the aperture alone controls visibility.
      const contentScale=(g.start/470)*(1-g.entry)+s*g.entry;
      ctx.translate(g.x*(1-g.entry)+w/2*g.entry,g.y*(1-g.entry)+h/2*g.entry);ctx.scale(contentScale,contentScale);
      const time=(t-106.8)*.9+(Number.isFinite(clock)?clock*.035:0);
      for(const face of foldedFaces(time))polygon(ctx,face.points,face.color,texture);
      ctx.restore();
      if(g.exit<.9){
        ctx.save();ctx.globalAlpha=1;ctx.translate(g.x,g.y);ctx.rotate(g.angle);ctx.scale(k,k);
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
  return{draw,drawOuter,amount,portalProgress,portalGeometry,cavityPath};
});
