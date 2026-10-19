/* Two interlocked chains cross the body; the same links draw in 2D and 3D. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandRestraint=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>v*v*(3-2*v);
  function geometry(state={}){
    const load=state.load===undefined?1:clamp(state.load),stress=clamp(state.stress||0),fracture=clamp(state.fracture||0);
    const release=Math.max(fracture,clamp(state.release||0)),peel=Math.max(release,clamp(state.peel||0));
    // A released chain keeps its broken shape even when its new owner omits load.
    // trail only continues that same deformation after detachment; it never resets it.
    const broken=Math.max(fracture,release,peel),split=smooth(broken),trail=clamp(state.trail||0)*split;
    const shiver=Number.isFinite(state.shiver)?state.shiver:0,parts=[];
    function link(cx,cy,heading,edgeOn,tension,crack,strand,index,piece){
      const rx=3.65+tension*.18,ry=edgeOn?1.05:2.05-tension*.18,width=edgeOn?.66:.82;
      const gap=crack*1.65,start=-Math.PI/2+gap/2,span=TAU-gap,c=Math.cos(heading),s=Math.sin(heading);
      const point=(a,inset)=>{const x=Math.cos(a)*(rx-inset),y=Math.sin(a)*(ry-inset);return[cx+x*c-y*s,cy+x*s+y*c];};
      for(let i=0;i<10;i++){
        const a=start+span*i/10,b=start+span*(i+1)/10;
        parts.push({points:[point(a,0),point(b,0),point(b,width),point(a,width)],fill:edgeOn?'ink':'metal',stroke:edgeOn?'metal':'ink',width:edgeOn?.23:.32,strand,link:index,piece});
      }
    }
    // Unequal endpoints fit the child's pentagon; the crossing leaves the central seed readable.
    const strands=[
      {a:[-21,-13],b:[18,22],count:12,ends:[[-24,-15],[24,15]],straight:.08},
      {a:[11,-15],b:[-19,13],count:10,ends:[[22,-6],[-23,6]],straight:Math.PI-.08}
    ];
    strands.forEach(({a,b,count,ends,straight},strand)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),tx=dx/length,ty=dy/length,heading=Math.atan2(dy,dx),breakAt=Math.floor(count*.48),spacing=length/(count-1);
      // Alternating wide and edge-on links overlap, rather than becoming a row of separate rings.
      for(const edgeOn of [false,true])for(let i=0;i<count;i++){
        if(Boolean(i%2)!==edgeOn)continue;
        const u=i/(count-1),half=i<breakAt?0:1,piece=strand*2+half;
        const first=half?breakAt:0,last=half?count-1:breakAt-1,middle=(first+last)/2;
        const middleU=middle/(count-1),startX=a[0]+dx*middleU,startY=a[1]+dy*middleU;
        const end=ends[half],outward=Math.sign(end[0]);
        // Each half rotates about its own centre, rather than restoring two long X arms.
        // The four lanes separate as the central links open, and flatten further in flight.
        const targetHeading=straight+(strand?1:-1)*.08*trail;
        const pieceHeading=heading+(targetHeading-heading)*split,c=Math.cos(pieceHeading),s=Math.sin(pieceHeading);
        const cx=startX+(end[0]+outward*9*trail-startX)*split;
        const cy=startY+(end[1]*(1+.22*trail)-startY)*split;
        const stressAtLink=clamp(stress*(count+1)-i)*(1-split);
        const tension=(clamp(load*(count+1)-i)+stressAtLink*.4)*(1-split);
        const slack=(1-clamp(tension))*Math.sin(Math.PI*u)*2.4*(strand?1:-1)*(1-split);
        const crack=clamp(broken*1.4-Math.abs(i-(breakAt-.5))*.65);
        const pull=stressAtLink*(u-.5)*1.2,rattle=shiver*(i%2?1:-1)*stressAtLink;
        const distance=(i-middle)*spacing;
        const x=cx+c*distance-s*(slack+rattle)+tx*pull;
        const y=cy+s*distance+c*(slack+rattle)+ty*pull;
        link(x,y,pieceHeading+rattle*.035,edgeOn,tension,crack,strand,i,piece);
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
