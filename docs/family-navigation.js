/* Family intent uses current world positions; the story clock never supplies its route. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./character-geometry.js'),require('./city-map.js'),require('./collision-world.js'),require('./motion.js'));
  else root.FlatlandFamilyNavigation=factory(root.FlatlandCharacters,root.FlatlandCityMap,root.FlatlandCollisionWorld,root.FlatlandMotion);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,CityMap,CollisionWorld,Motion){
  'use strict';
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=u=>{u=clamp(u);return u*u*(3-2*u);},delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  const child=C.actors.child,room=CityMap.mainHouse.polygon,step=32,radius=Math.max(...child.vertices.map(p=>Math.hypot(...p)))*1.07+3;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clone=b=>({...b,edgeBends:b.edgeBends?.slice()});
  function plan(start,goal,parents){
    const outlines=parents.map(p=>p.actor.outline(p.body));
    const safe=p=>C.contains([p.x,p.y],room)&&Math.min(...room.map((a,i)=>{const b=room[(i+1)%room.length],dx=b[0]-a[0],dy=b[1]-a[1],u=clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy));return Math.hypot(p.x-a[0]-u*dx,p.y-a[1]-u*dy);}))>=radius&&outlines.every(poly=>C.pointDistance([p.x,p.y],poly)>=radius);
    const clear=(a,b)=>{const n=Math.max(1,Math.ceil(distance(a,b)/12));for(let i=1;i<=n;i++)if(!safe({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;};
    let escape={x:start.x,y:start.y};
    for(const poly of outlines){const d=C.pointDistance([escape.x,escape.y],poly);if(d>=radius+2)continue;let nearest=null,best=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],u=clamp(((escape.x-a[0])*dx+(escape.y-a[1])*dy)/(dx*dx+dy*dy));const q={x:a[0]+u*dx,y:a[1]+u*dy},gap=distance(escape,q);if(gap<best){nearest=q;best=gap;}}if(best>1e-6){escape={x:escape.x+(escape.x-nearest.x)/best*(radius+3-best),y:escape.y+(escape.y-nearest.y)/best*(radius+3-best)};}}
    const prefix=distance(start,escape)>1?[{...escape,backout:true}]:[];
    if(safe(goal)&&clear(escape,goal))return{points:[...prefix,{x:goal.x,y:goal.y}],goal:{...goal}};
    const minX=Math.min(...room.map(p=>p[0])),maxX=Math.max(...room.map(p=>p[0])),minY=Math.min(...room.map(p=>p[1])),maxY=Math.max(...room.map(p=>p[1])),nodes=[],map=new Map();
    for(let y=minY+radius,j=0;y<maxY-radius;y+=step,j++)for(let x=minX+radius,i=0;x<maxX-radius;x+=step,i++){const n={x,y,i,j};if(safe(n)){map.set(i+','+j,nodes.length);nodes.push(n);}}
    if(!nodes.length)return null;
    const nearest=(p,visible)=>nodes.map((n,i)=>({i,d:distance(n,p)})).sort((a,b)=>a.d-b.d).find(n=>!visible||clear(p,nodes[n.i]))?.i;
    const begin=nearest(escape,true),finish=nearest(goal,safe(goal));if(begin===undefined||finish===undefined)return null;
    const destination=safe(goal)?{...goal}:{x:nodes[finish].x,y:nodes[finish].y},cost=new Map([[begin,0]]),came=new Map(),open=new Set([begin]),closed=new Set();
    while(open.size){let current=null,best=Infinity;for(const index of open){const score=cost.get(index)+distance(nodes[index],nodes[finish]);if(score<best){best=score;current=index;}}if(current===finish)break;open.delete(current);closed.add(current);const a=nodes[current];
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const next=map.get((a.i+dx)+','+(a.j+dy));if(next===undefined||closed.has(next)||!clear(a,nodes[next]))continue;const value=cost.get(current)+distance(a,nodes[next]);if(value<(cost.get(next)??Infinity)){cost.set(next,value);came.set(next,current);open.add(next);}}
    }
    if(begin!==finish&&!came.has(finish))return null;
    const route=[destination];for(let i=finish;i!==undefined;i=came.get(i)){route.unshift({x:nodes[i].x,y:nodes[i].y});if(i===begin)break;}
    route.unshift(escape);const smooth=[];for(let i=0;i<route.length-1;){let end=route.length-1;while(end>i+1&&!clear(route[i],route[end]))end--;smooth.push(route[end]);i=end;}
    return{points:[...prefix,...smooth],goal:destination};
  }
  class FamilyNavigation{
    constructor(frame,{visited=[],center={x:800,y:660},handoffAngle=0}={}){
      this.body=clone(frame.actors.find(a=>a.id==='hero').body);this.parents=['father','mother'].map(id=>{const a=frame.actors.find(a=>a.id===id);return{id,actor:a.actor,body:clone(a.body),reaction:null};});
      this.world=new CollisionWorld([CityMap.mainHouse.boundary]);this.visited=new Set(visited);this.center=center;this.handoffAngle=handoffAngle;this.state='explore';this.intent=null;this.route=[];this.velocity=0;this.clock=0;this.idleOrigin={x:this.body.x,y:this.body.y};this.mark=visited.length?'exclamation':null;this.markAt=0;this.returnProgress=0;this.done=false;this.lastContact=null;
      if(this.visited.size===2)this.beginReturn();
    }
    entries(){return[...this.parents.map(p=>({id:p.id,actor:p.actor,body:clone(p.body)})),{id:'hero',actor:child,body:clone(this.body)}];}
    hitTest(point,tolerance=20){if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return null;return this.parents.find(p=>C.pointDistance([point.x,point.y],p.actor.outline(p.body))<=tolerance)?.id||null;}
    activatePoint(point){
      if(this.state!=='explore'||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return false;
      const target=this.hitTest(point);this.intent={target:target||'ground',point:{x:point.x,y:point.y},age:0};this.mark='curiosity';this.markAt=this.clock;this.lastContact=null;return this.replan();
    }
    replan(){
      if(!this.intent)return false;let result;
      if(this.intent.target==='father'||this.intent.target==='mother'){
        const parent=this.parents.find(p=>p.id===this.intent.target),outline=parent.actor.outline(parent.body),base=Math.atan2(this.body.y-parent.body.y,this.body.x-parent.body.x),neutral={sx:1,sy:1,strain:0,bend:0,bounce:0},head=child.headAxis(neutral).angle;
        const candidates=[];
        for(let i=0;i<16;i++){const a=base+i*Math.PI/8,ux=Math.cos(a),uy=Math.sin(a),angle=a+Math.PI-head;let low=0,high=280;
          for(let n=0;n<22;n++){const d=(low+high)/2,pose={...neutral,x:parent.body.x+ux*d,y:parent.body.y+uy*d,angle};if(C.penetrates(child.outline(pose),outline))low=d;else high=d;}
          const goal={x:parent.body.x+ux*(high+.000001),y:parent.body.y+uy*(high+.000001),angle},stage={x:goal.x+ux*72,y:goal.y+uy*72};candidates.push({goal,stage,score:distance(this.body,stage)+72});
        }
        candidates.sort((a,b)=>a.score-b.score);
        for(const candidate of candidates){result=plan(this.body,candidate.stage,this.parents);if(result&&distance(result.goal,candidate.stage)<1){result.points.push({...candidate.goal,contact:true});this.intent.parentAt={x:parent.body.x,y:parent.body.y};break;}result=null;}
      }else result=plan(this.body,this.intent.point,this.parents);
      if(!result){this.route=[];this.intent=null;this.velocity=0;this.idleOrigin={x:this.body.x,y:this.body.y};return false;}
      this.route=result.points;this.intent.age=0;this.intent.obstacles=this.parents.map(p=>({x:p.body.x,y:p.body.y}));return true;
    }
    beginReturn(){
      this.state='return';this.returnFacing=this.body.angle;this.intent={target:'return',point:{...this.center},age:0};const result=plan(this.body,this.center,this.parents);this.route=result?.points||[];this.returnLength=this.remaining();this.returnProgress=0;
    }
    remaining(){let p=this.body,total=0;for(const q of this.route){total+=distance(p,q);p=q;}return total;}
    updateParents(dt){
      for(const parent of this.parents){const r=parent.reaction;if(!r)continue;r.age+=dt;const model=Motion.parentReaction(parent.id,r.age,.5),zero=Motion.parentReaction(parent.id,0,.5),span=parent.id==='father'?Math.hypot(44,18):Math.hypot(46,28),q=Math.hypot(model.x-zero.x,model.y-zero.y)/span;
        const edgeBends=parent.actor.vertices.map((_,i)=>i===r.edge?model.fear:0);parent.body={...r.from,x:r.from.x+r.away.x*span*q,y:r.from.y+r.away.y*span*q,angle:r.from.angle+model.angle-zero.angle,edgeBends,fear:model.fear,strain:0,speed:0,bend:0};
        if(r.age>=.5)this.visited.add(parent.id);
      }
      if(this.state==='explore'&&this.visited.size===2)this.beginReturn();
    }
    contact(parent){
      if(parent.reaction&&parent.reaction.age<.65)return;
      const head=child.headPoint(this.body),boundary=C.closestBoundary(parent.id,parent.body,head),dx=parent.body.x-this.body.x,dy=parent.body.y-this.body.y,length=Math.hypot(dx,dy)||1;
      parent.reaction={age:0,from:clone(parent.body),away:{x:dx/length,y:dy/length},edge:boundary.edgeIndex};this.lastContact={id:parent.id,clock:this.clock,point:boundary.point};this.mark='exclamation';this.markAt=this.clock;this.route=[];this.intent=null;this.velocity=0;this.idleOrigin={x:this.body.x,y:this.body.y};
    }
    tick(dt){
      dt=clamp(Number(dt)||0,0,.1);this.clock+=dt;const before=this.entries();this.updateParents(dt);let intended=clone(this.body);
      if(this.state==='breath'){
        this.breathAge+=dt;intended.x=this.center.x;intended.y=this.center.y;intended.angle=this.returnFacing+delta(this.returnFacing,this.handoffAngle)*ease(this.breathAge/.65);intended.strain=0;intended.bend=.1;intended.speed=0;
        if(this.breathAge>=.9){this.state='done';this.done=true;intended.angle=this.handoffAngle;}
      }else if(this.route.length){
        if(this.intent){this.intent.age+=dt;if(this.intent.age>.18&&this.intent.obstacles?.some((p,i)=>distance(p,this.parents[i].body)>4))this.replan();}
        const next=this.route[0],gap=distance(this.body,next),remaining=this.remaining(),keepFacing=this.state==='return'||next.backout,heading=Math.atan2(next.y-this.body.y,next.x-this.body.x),targetAngle=next.angle??(heading-child.headAxis(this.body).angle),turn=keepFacing?0:clamp(delta(this.body.angle,targetAngle),-5*dt,5*dt);
        intended.angle=keepFacing?this.body.angle:this.body.angle+turn;
        const align=keepFacing?1:Math.max(.12,Math.cos(delta(intended.angle,targetAngle))),targetSpeed=Math.min(this.state==='return'?180:285,Math.sqrt(Math.max(0,remaining)*1200))*align;
        this.velocity+=clamp(targetSpeed-this.velocity,-1000*dt,1000*dt);const move=Math.min(gap,this.velocity*dt)*(keepFacing?1:align);if(gap>1e-8){intended.x+=((next.x-this.body.x)/gap)*move;intended.y+=((next.y-this.body.y)/gap)*move;}intended.speed=this.velocity;intended.strain=Math.min(.28,this.velocity/1000);intended.bend=this.state==='return'?.18:0;
      }else{
        this.velocity=Math.max(0,this.velocity-1000*dt);const x=this.idleOrigin.x+8*Math.sin(this.clock*.55),y=this.idleOrigin.y+11*Math.sin(this.clock*.47),d=Math.hypot(x-this.body.x,y-this.body.y),amount=Math.min(1,dt*3);intended.x+=(x-this.body.x)*amount;intended.y+=(y-this.body.y)*amount;intended.speed=Math.min(14,d*3);intended.strain=0;intended.bend=this.mark==='exclamation'?.14:0;
      }
      const resolved=this.world.resolve(before,[...this.parents.map(p=>({id:p.id,actor:p.actor,body:p.body})),{id:'hero',actor:child,body:intended}]);
      for(const parent of this.parents)parent.body=clone(resolved.find(a=>a.id===parent.id).body);this.body=clone(resolved.find(a=>a.id==='hero').body);
      if(this.intent&&(this.intent.target==='father'||this.intent.target==='mother')){const parent=this.parents.find(p=>p.id===this.intent.target);if(C.distance(child.outline(this.body),parent.actor.outline(parent.body))<.0001)this.contact(parent);}
      if(this.route.length&&!this.route[0].contact&&distance(this.body,this.route[0])<(this.state==='return'?.06:.8)){this.route.shift();if(!this.route.length){if(this.state==='return'){this.state='breath';this.breathAge=0;this.returnFacing=this.body.angle;this.returnProgress=1;}else{this.intent=null;this.velocity=0;this.idleOrigin={x:this.body.x,y:this.body.y};}}}
      if(this.state==='return')this.returnProgress=clamp(1-this.remaining()/(this.returnLength||1));return this;
    }
    snapshot(){return{body:clone(this.body),parents:this.parents.map(p=>({id:p.id,body:clone(p.body),reactionAge:p.reaction?.age})),target:this.intent?.target||(this.state==='return'||this.state==='breath'?'return':null),moving:!!this.route.length,waiting:this.state==='explore'&&!this.intent&&!this.parents.some(p=>p.reaction&&p.reaction.age<.5),visited:[...this.visited],done:this.done,state:this.state,returnProgress:this.returnProgress,breathAge:this.breathAge||0,mark:this.mark,markAt:this.markAt,clock:this.clock,lastContact:this.lastContact};}
  }
  return{FamilyNavigation,plan,radius};
});
