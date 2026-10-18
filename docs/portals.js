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
  return{geometry,query,clampTravel,localPoint};
});
