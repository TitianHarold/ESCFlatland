/* Small deterministic silhouette sweeps; drawing and collision share actor.outline(). */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./character-geometry.js'));
  else root.FlatlandCollisionWorld=factory(root.FlatlandCharacters);
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const defaults={x:0,y:0,angle:0,sx:1,sy:1,bend:0,fear:0,strain:0,bounce:0,speed:0};
  const bounds=points=>({minX:Math.min(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxX:Math.max(...points.map(p=>p[0])),maxY:Math.max(...points.map(p=>p[1]))});
  const overlaps=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minY<b.maxY&&a.maxY>b.minY;
  const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function interpolate(a,b,u){
    const body={...a,...b};
    for(const key of new Set([...Object.keys(defaults),...Object.keys(a),...Object.keys(b)])){
      if(key==='edgeBends'||key==='edgeStretch'){
        const first=a[key]||[],last=b[key]||[],fallback=key==='edgeStretch'?1:0;
        body[key]=Array.from({length:Math.max(first.length,last.length)},(_,i)=>(first[i]??fallback)+((last[i]??fallback)-(first[i]??fallback))*u);
      }else if(typeof b[key]==='number'||Object.hasOwn(defaults,key)){
        const start=Number.isFinite(a[key])?a[key]:defaults[key]??b[key],end=Number.isFinite(b[key])?b[key]:start;
        body[key]=start+(key==='angle'?angleDelta(start,end):end-start)*u;
      }
    }
    return body;
  }
  function reservation(entry){const points=entry.actor.outline(entry.body);return{entry,points,bounds:bounds(points)};}
  class CollisionWorld{
    constructor(houseBoundaries=[]){
      this.houses=houseBoundaries.map(house=>{
        const walls=(house.walls||[]).map((points,i)=>({points,bounds:house.wallBounds?.[i]||bounds(points)}));
        return{id:house.id,walls,bounds:house.bounds||bounds(walls.flatMap(w=>w.points))};
      });
    }
    collision(actor,body,reservations){
      const points=actor.outline(body),box=bounds(points);
      for(const house of this.houses){
        if(!overlaps(box,house.bounds))continue;
        for(const wall of house.walls)if(overlaps(box,wall.bounds)&&C.penetrates(points,wall.points))return{kind:'wall',id:house.id};
      }
      for(const [id,other] of reservations)if(overlaps(box,other.bounds)&&C.penetrates(points,other.points))return{kind:'actor',id};
      return null;
    }
    spawn(entry,reservations){
      const conflict=this.collision(entry.actor,entry.body,reservations);
      if(!conflict)return{...entry,collision:{blocked:false,spawnAdjusted:false}};
      const axis=entry.actor.headAxis(entry.body),heading=(entry.body.angle||0)+axis.angle;
      // Nearest sampled rings first: behind, then alternating sides, then forward.
      const directions=[Math.PI,Math.PI/2,-Math.PI/2,Math.PI*3/4,-Math.PI*3/4,Math.PI/4,-Math.PI/4,0];
      for(let radius=8;radius<=2048;radius+=radius<256?8:32)for(const direction of directions){
        const body={...entry.body,x:entry.body.x+Math.cos(heading+direction)*radius,y:entry.body.y+Math.sin(heading+direction)*radius};
        if(!this.collision(entry.actor,body,reservations))return{...entry,body,collision:{blocked:true,spawnAdjusted:true,kind:conflict.kind,id:conflict.id}};
      }
      throw new Error('No safe spawn near actor '+entry.id+'; no collision was ignored.');
    }
    sweep(previous,intended,reservations){
      const a=previous.body,requested=intended.body,distance=Math.hypot(requested.x-a.x,requested.y-a.y),cap=distance>64?64/distance:1;
      const target=interpolate(a,requested,cap),travel=Math.hypot(target.x-a.x,target.y-a.y);
      let steps=Math.max(1,Math.ceil(travel/6),Math.ceil(Math.abs(angleDelta(a.angle||0,target.angle||0))/.06));
      for(const key of ['sx','sy','bend','fear','strain','bounce'])steps=Math.max(steps,Math.ceil(Math.abs((target[key]??defaults[key])-(a[key]??defaults[key]))/.04));
      for(const key of ['edgeBends','edgeStretch'])for(let i=0;i<(target[key]?.length||0);i++)steps=Math.max(steps,Math.ceil(Math.abs(target[key][i]-(a[key]?.[i]??(key==='edgeStretch'?1:0)))/.04));
      let safe=0,hit=null;
      for(let step=1;step<=steps;step++){
        const u=step/steps,body=interpolate(a,target,u);hit=this.collision(intended.actor,body,reservations);
        if(!hit){safe=u;continue;}
        let low=safe,high=u;
        for(let n=0;n<14;n++){const mid=(low+high)/2;if(this.collision(intended.actor,interpolate(a,target,mid),reservations))high=mid;else low=mid;}
        return{...intended,body:interpolate(a,target,low),collision:{blocked:true,kind:hit.kind,id:hit.id,capped:cap<1,fraction:cap*low}};
      }
      return{...intended,body:target,collision:{blocked:false,capped:cap<1,fraction:cap}};
    }
    resolve(previousActors=[],intendedActors=[]){
      const intendedIds=new Set(intendedActors.map(entry=>entry.id)),previous=new Map(),reservations=new Map();
      // Reserve every still-present previous silhouette before updating any actor.
      for(const entry of previousActors)if(intendedIds.has(entry.id)){previous.set(entry.id,entry);reservations.set(entry.id,reservation(entry));}
      return intendedActors.map(entry=>{
        if(!entry.actor?.outline||!Number.isFinite(entry.body?.x)||!Number.isFinite(entry.body?.y))throw new Error('Invalid collision actor '+entry.id);
        reservations.delete(entry.id);
        const before=previous.get(entry.id),resolved=before?this.sweep(before,entry,reservations):this.spawn(entry,reservations);
        reservations.set(entry.id,reservation(resolved));return resolved;
      });
    }
  }
  CollisionWorld.CollisionWorld=CollisionWorld;
  return CollisionWorld;
});
