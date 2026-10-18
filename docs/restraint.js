/* Shared local geometry for the two cuffs, connecting links and geometric lock. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandRestraint=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
  function geometry(state={}){
    const fracture=clamp(state.fracture||0),peel=Math.max(clamp(state.peel||0),fracture),stress=clamp(state.stress||0),shiver=Number.isFinite(state.shiver)?state.shiver:0,parts=[];
    function band(cx,cy,rx,ry,width,gap=0,heading=0,segments=18){
      const start=heading+gap/2,span=TAU-gap;
      const point=(a,inset)=>[cx+Math.cos(a)*(rx-inset),cy+Math.sin(a)*(ry-inset)];
      for(let i=0;i<segments;i++){
        const a=start+span*i/segments,b=start+span*(i+1)/segments;
        parts.push({points:[point(a,0),point(b,0),point(b,width),point(a,width)],fill:'metal',stroke:'ink',width:.45});
      }
    }
    // Open centers leave the moving possibility window visible through both cuffs.
    band(-16-peel*3-stress*.6+shiver,-2,10,21,3.3,peel*1.25,-peel*.25);
    band(16+peel*3+stress*.6-shiver,-2,10,21,3.3,peel*1.25,Math.PI+peel*.25);
    for(const x of [-8,0,8]){
      const side=Math.sign(x);
      band(x+side*(stress*.6+fracture*2)+shiver*side,8+shiver*side*.4,5.7+stress*.45,3.5-stress*.2,1.5,fracture*(x===0?1.95:.18),-Math.PI/2,10);
    }
    // The shackle opens with the cuff ends; the lock plate remains below the seed.
    band(-peel*2,12-peel*2,5,6,1.8,Math.PI+peel*.9,Math.PI/2-peel*.5,12);
    parts.push({points:[[-7,14],[7,14],[7,24],[-7,24]],fill:'ink',stroke:'metal',width:.8});
    // The verdict is cut into the physical lock, rather than carried on a paper card.
    function verdictBar(x1,y1,x2,y2){
      const length=Math.hypot(x2-x1,y2-y1),nx=-(y2-y1)/length*.65,ny=(x2-x1)/length*.65;
      parts.push({points:[[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]],fill:'metal'});
    }
    verdictBar(-4.3,16.3,4.3,21.7);verdictBar(-4.3,21.7,4.3,16.3);
    return parts;
  }
  function draw(ctx,state={},palette={}){
    if(state.attached===false)return;
    const size=state.size??1.8,offset=state.offset||[0,0];
    ctx.save();ctx.translate(offset[0],offset[1]);ctx.scale(size,size);
    for(const part of geometry(state)){
      ctx.beginPath();part.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      ctx.fillStyle=palette[part.fill]||'#121d2f';ctx.fill();
      if(part.stroke){ctx.strokeStyle=palette[part.stroke]||'#121d2f';ctx.lineWidth=part.width;ctx.lineJoin='round';ctx.stroke();}
    }
    ctx.restore();
  }
  return Object.freeze({geometry,draw});
});
