/* Door rendering and travel limits share these world-space polygons. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./character-geometry.js'));
  else root.FlatlandPortals=factory(root.FlatlandCharacters);
})(typeof globalThis!=='undefined'?globalThis:this,function(Characters){
  'use strict';
  if(!Characters)throw new Error('Load character-geometry.js before portals.js.');
  const clamp=x=>Math.max(0,Math.min(1,x));
  function localPoint(portal,s,t){
    const c=Math.cos(portal.heading),n=Math.sin(portal.heading);
    return[portal.point[0]+s*c-t*n,portal.point[1]+s*n+t*c];
  }
  function rectangle(portal,s0,t0,s1,t1){return[[s0,t0],[s1,t0],[s1,t1],[s0,t1]].map(([s,t])=>localPoint(portal,s,t));}
  function roundedPolygon(vertices,radius=24){
    const points=[];
    vertices.forEach((corner,i)=>{
      const before=vertices[(i+vertices.length-1)%vertices.length],after=vertices[(i+1)%vertices.length],a=Math.hypot(before[0]-corner[0],before[1]-corner[1]),b=Math.hypot(after[0]-corner[0],after[1]-corner[1]);
      const cut=Math.min(radius,a*.22,b*.22),from=corner.map((v,k)=>v+(before[k]-v)*cut/a),to=corner.map((v,k)=>v+(after[k]-v)*cut/b);
      points.push(from);
      for(let step=1;step<=6;step++){const q=step/6,s=1-q;points.push(corner.map((v,k)=>s*s*from[k]+2*s*q*v+q*q*to[k]));}
    });
    return points;
  }
  function houseBoundary(spec){
    const vertices=(spec.vertices||spec.polygon).map(point=>[...point]),thickness=spec.thickness??8;
    const polygon=roundedPolygon(vertices,spec.cornerRadius??24),wanted=spec.door||vertices[0].map((v,k)=>(v+vertices[1][k])/2);
    let best={distance:Infinity};
    polygon.forEach((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),q=Math.max(0,Math.min(1,((wanted[0]-a[0])*dx+(wanted[1]-a[1])*dy)/(length*length))),point=[a[0]+dx*q,a[1]+dy*q],distance=Math.hypot(point[0]-wanted[0],point[1]-wanted[1]);if(distance<best.distance)best={a,b,i,length,q,distance};});
    const tx=(best.b[0]-best.a[0])/best.length,ty=(best.b[1]-best.a[1])/best.length,half=Math.min((spec.doorWidth??220)/2,best.length*.45),center=Math.max(half,Math.min(best.length-half,best.q*best.length));
    const along=d=>[best.a[0]+tx*d,best.a[1]+ty*d],left=along(center-half),right=along(center+half),wallPath=[right];
    for(let step=1;step<=polygon.length;step++)wallPath.push(polygon[(best.i+step)%polygon.length]);
    wallPath.push(left);
    const unit=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;return[dx/length,dy/length];};
    const offsets=wallPath.map((point,i)=>{
      const incoming=unit(wallPath[Math.max(0,i-1)],point),outgoing=unit(point,wallPath[Math.min(wallPath.length-1,i+1)]),a=i?incoming:outgoing,b=i<wallPath.length-1?outgoing:incoming;
      let nx=-a[1]-b[1],ny=a[0]+b[0],length=Math.hypot(nx,ny);if(length<1e-8){nx=-b[1];ny=b[0];length=1;}nx/=length;ny/=length;
      const width=Math.min(thickness*.8,thickness*.5/Math.max(.2,-nx*b[1]+ny*b[0]));return{left:[point[0]+nx*width,point[1]+ny*width],right:[point[0]-nx*width,point[1]-ny*width]};
    });
    const walls=offsets.slice(1).map((point,i)=>[offsets[i].left,point.left,point.right,offsets[i].right]);
    const bounds=points=>({minX:Math.min(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxX:Math.max(...points.map(p=>p[0])),maxY:Math.max(...points.map(p=>p[1]))});
    const orientation=Math.sign(vertices.reduce((sum,a,i)=>{const b=vertices[(i+1)%vertices.length];return sum+a[0]*b[1]-b[0]*a[1];},0))||1,normal=[-ty*orientation,tx*orientation];
    return{id:spec.id,vertices,polygon,wallPath,walls,wallBounds:walls.map(bounds),bounds:bounds(walls.flat()),thickness,door:{point:along(center),left,right,width:half*2,heading:Math.atan2(normal[1],normal[0]),normal}};
  }
  function geometry(portal,time){
    const opening=clamp(typeof portal.opening==='function'?portal.opening(time):portal.opening??0),w=portal.halfWidth,d=portal.halfDepth,span=portal.wallSpan??w+500,clearHalfWidth=w*opening;
    const walls=span>w?[
      rectangle(portal,portal.wallStart??-d,-span,portal.wallEnd??d,-w),
      rectangle(portal,portal.wallStart??-d,w,portal.wallEnd??d,span)
    ]:[];
    const panels=opening<1?[
      rectangle(portal,-d,-w,d,-clearHalfWidth),rectangle(portal,-d,clearHalfWidth,d,w)
    ]:[];
    return{opening,clearHalfWidth,panels,walls};
  }
  function radius(actor,body){return Math.max(...actor.vertices.map(([x,y])=>Math.hypot(x,y)))*Math.max(Math.abs(body.sx??1),Math.abs(body.sy??1))*1.4+32;}
  function nearby(actor,body,portal,padding=0){
    const x=body.x-portal.point[0],y=body.y-portal.point[1],c=Math.cos(portal.heading),n=Math.sin(portal.heading),s=x*c+y*n,t=-x*n+y*c,r=radius(actor,body)+padding;
    return s>=Math.min(-portal.halfDepth,portal.wallStart??-portal.halfDepth)-r&&s<=Math.max(portal.halfDepth,portal.wallEnd??portal.halfDepth)+r&&Math.abs(t)<=(portal.wallSpan??portal.halfWidth+500)+r;
  }
  function query(actor,body,portal,time){
    const state=geometry(portal,time),panels=[],walls=[];
    if(nearby(actor,body,portal)){
      const outline=actor.outline(body);
      state.panels.forEach(p=>{if(Characters.intersects(outline,p))panels.push(p);});
      state.walls.forEach(p=>{if(Characters.intersects(outline,p))walls.push(p);});
    }
    return{blocked:panels.length+walls.length>0,opening:state.opening,clearHalfWidth:state.clearHalfWidth,panels,walls};
  }
  // fromDistance must be a known safe pose; the returned value never crosses the first obstruction.
  function clampTravel(actor,poseAtDistance,fromDistance,toDistance,portalOrPortals,time){
    const portals=Array.isArray(portalOrPortals)?portalOrPortals:[portalOrPortals],direction=Math.sign(toDistance-fromDistance);
    if(!direction)return fromDistance;
    const blocked=d=>{const body=poseAtDistance(d);return portals.some(p=>query(actor,body,p,time).blocked);};
    if(blocked(fromDistance))return fromDistance;
    const fineStep=Math.max(.25,Math.min(4,...portals.map(p=>p.halfDepth))),length=Math.abs(toDistance-fromDistance);
    let traveled=0,safe=fromDistance;
    while(traveled<length){
      const body=poseAtDistance(safe),close=portals.some(p=>nearby(actor,body,p,32));
      traveled=Math.min(length,traveled+(close?fineStep:32));
      const candidate=fromDistance+direction*traveled;
      if(blocked(candidate)){
        let a=safe,b=candidate;
        for(let i=0;i<18;i++){const middle=(a+b)/2;if(blocked(middle))b=middle;else a=middle;}
        return a-direction*Math.min(.05,Math.abs(a-fromDistance));
      }
      safe=candidate;
    }
    return toDistance;
  }
  return{geometry,query,clampTravel,localPoint,roundedPolygon,houseBoundary};
});
