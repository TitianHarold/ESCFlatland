/* Printed pigments fold through depth; the chase field is anchored in world space. */
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
  function amount(t){return ease(t,106.8,107.7)*(1-ease(t,116.05,116.8));}
  function drawCore(ctx,t,viewport,externalLight){
    if(t<112)return;
    const s=Math.max(viewport.w/1280,viewport.h/760),flight=ease(t,112,116.8),join=ease(t,115.2,116.8);
    const inner={x:viewport.w/2+s*(90+flight*235),y:viewport.h/2+s*(-65-flight*135)};
    const x=externalLight?inner.x*(1-join)+externalLight.x*join:inner.x,y=externalLight?inner.y*(1-join)+externalLight.y*join:inner.y;
    const r=10*s*(1-join)+(externalLight?.r??10*s)*join;
    ctx.save();
    if(t>=116.8){
      const glow=ease(t,116.8,117.5),halo=ctx.createRadialGradient(x,y,r*.2,x,y,r*5);
      halo.addColorStop(0,P.gold+'66');halo.addColorStop(1,P.gold+'00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*5*glow,0,TAU);ctx.fill();
    }
    ctx.fillStyle=P.gold;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();
  }
  function draw(ctx,t,viewport,clock,externalLight){
    const a=amount(t),w=viewport.w,h=viewport.h,s=Math.max(w/1280,h/760);
    if(a>0){
      ctx.save();ctx.globalAlpha*=a;ctx.translate(w/2,h/2);ctx.scale(s,s);
      const texture=material(ctx);ctx.fillStyle=P.navy;ctx.fillRect(-w/s,-h/s,2*w/s,2*h/s);
      if(texture){ctx.fillStyle=texture;ctx.fillRect(-w/s,-h/s,2*w/s,2*h/s);}
      // Every pigment lane belongs to a broad XYZ sheet. Sorting is per surface patch.
      const time=(t-106.8)*.9+(Number.isFinite(clock)?clock*.035:0);
      for(const face of foldedFaces(time))polygon(ctx,face.points,face.color,texture);
      ctx.restore();
    }
    // This is the same intact radius-10 entity; only its screen projection changes.
    drawCore(ctx,t,viewport,externalLight);
  }
  function hash(x,y,salt){let n=Math.imul(x+137,374761393)^Math.imul(y-257,668265263)^salt;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;}
  function drawOuter(ctx,t,viewport,heading=0,motion){
    const w=viewport.w,h=viewport.h,s=Math.max(w/1280,h/760);
    ctx.save();ctx.fillStyle=P.outside?.background||P.white||P.paper;ctx.fillRect(0,0,w,h);
    if(t<119||!motion||!Number.isFinite(motion.x)||!Number.isFinite(motion.y)){ctx.restore();return;}
    ctx.translate(w/2,h/2);const texture=material(ctx),sx=motion.startX??0,sy=motion.startY??0,angle=Number.isFinite(motion.heading)?motion.heading:heading,dx=Math.cos(angle),dy=Math.sin(angle);
    const baseScale=Number.isFinite(motion.scale)?motion.scale:s*.44;
    const colors=[P.cyan,P.lavender,P.coral,P.gold,P.navy];
    for(const depth of[.58,1]){
      const scale=baseScale*depth,cell=620,rx=Math.ceil(w/(scale*cell)/2)+2,ry=Math.ceil(h/(scale*cell)/2)+2,cx=Math.floor((motion.x-sx)/cell),cy=Math.floor((motion.y-sy)/cell);
      ctx.save();ctx.scale(scale,scale);ctx.globalAlpha=depth===1?.72:.26;
      for(let i=cx-rx;i<=cx+rx;i++)for(let j=cy-ry;j<=cy+ry;j++){
        const px=sx+(i+.2+hash(i,j,12)*.6)*cell,py=sy+(j+.2+hash(i,j,42)*.6)*cell;
        const cross=-(px-sx)*dy+(py-sy)*dx;if(Math.abs(cross)<190)continue;
        const x=px-motion.x,y=py-motion.y,r=42+hash(i,j,67)*90,color=colors[Math.floor(hash(i,j,81)*colors.length)];
        if(hash(i,j,92)>.52){
          const bend=hash(i,j,31)*1.4-.7;ctx.save();ctx.translate(x,y);ctx.rotate(bend);
          ctx.beginPath();ctx.moveTo(-r*2,-r*.38);ctx.bezierCurveTo(-r,-r*1.2,r*.3,r*.9,r*2,r*.2);ctx.lineTo(r*2,r*.65);ctx.bezierCurveTo(r*.3,r*1.35,-r,-r*.7,-r*2,r*.05);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(texture){ctx.fillStyle=texture;ctx.fill();}ctx.restore();
        }else{
          const points=[],sides=3+Math.floor(hash(i,j,23)*4),rotation=hash(i,j,51)*TAU;
          for(let k=0;k<sides;k++){const a=k/sides*TAU+rotation;points.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r});}polygon(ctx,points,color,texture);
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  return{draw,drawOuter,amount};
});
