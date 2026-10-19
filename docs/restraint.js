/* Two interlocked chains cross the body; the same links draw in 2D and 3D. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandRestraint=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
  function geometry(state={}){
    const load=state.load===undefined?1:clamp(state.load),stress=clamp(state.stress||0),fracture=clamp(state.fracture||0);
    const release=Math.max(fracture,clamp(state.release||0)),peel=Math.max(release,clamp(state.peel||0));
    const shiver=Number.isFinite(state.shiver)?state.shiver:0,parts=[];
    function link(cx,cy,heading,edgeOn,tension,crack,strand,index){
      const rx=3.65+tension*.18,ry=edgeOn?1.05:2.05-tension*.18,width=edgeOn?.66:.82;
      const gap=crack*1.65,start=-Math.PI/2+gap/2,span=TAU-gap,c=Math.cos(heading),s=Math.sin(heading);
      const point=(a,inset)=>{const x=Math.cos(a)*(rx-inset),y=Math.sin(a)*(ry-inset);return[cx+x*c-y*s,cy+x*s+y*c];};
      for(let i=0;i<10;i++){
        const a=start+span*i/10,b=start+span*(i+1)/10;
        parts.push({points:[point(a,0),point(b,0),point(b,width),point(a,width)],fill:edgeOn?'ink':'metal',stroke:edgeOn?'metal':'ink',width:edgeOn?.23:.32,strand,link:index});
      }
    }
    // Unequal endpoints fit the child's pentagon; the crossing leaves the central seed readable.
    const strands=[{a:[-21,-13],b:[18,22],count:12},{a:[11,-15],b:[-19,13],count:10}];
    strands.forEach(({a,b,count},strand)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),tx=dx/length,ty=dy/length,nx=-ty,ny=tx,heading=Math.atan2(dy,dx),breakAt=Math.floor(count*.48);
      // Alternating wide and edge-on links overlap, rather than becoming a row of separate rings.
      for(const edgeOn of [false,true])for(let i=0;i<count;i++){
        if(Boolean(i%2)!==edgeOn)continue;
        const u=i/(count-1),side=i<breakAt?-1:1;
        const stressAtLink=clamp(stress*(count+1)-i),tension=clamp(load*(count+1)-i)+stressAtLink*.4;
        const slack=(1-clamp(tension))*Math.sin(Math.PI*u)*2.4*(strand?1:-1);
        const crack=clamp(fracture*1.65-Math.abs(i-breakAt)*.38);
        const pull=side*peel*(2.4+Math.abs(u-.5)*2)+stressAtLink*(u-.5)*1.2,rattle=shiver*(i%2?1:-1)*stressAtLink;
        const x=a[0]+dx*u+tx*pull+nx*(slack+rattle+side*peel*.7);
        const y=a[1]+dy*u+ty*pull+ny*(slack+rattle+side*peel*.7);
        link(x,y,heading+side*peel*.12+rattle*.035,edgeOn,tension,crack,strand,i);
      }
    });
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
