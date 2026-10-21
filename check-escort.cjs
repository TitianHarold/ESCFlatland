'use strict';
const assert=require('node:assert/strict');
const D=require('./docs/district.js'),C=require('./docs/character-geometry.js');
const CityMap=require('./docs/city-map.js'),CollisionWorld=require('./docs/collision-world.js');
const walls=new CollisionWorld(CityMap.houseBoundaries),ids=['hero','inspector','guard-1','guard-2','guard-3'];
const actor=(frame,id)=>{const entry=frame.actors.find(a=>a.id===id);assert(entry,'Missing '+id);return entry;};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// The child recoils before the first real tip contact, rather than willingly departing.
const preparing=D.frame(D.timing.takeAway-.45),prepared=actor(preparing,'hero');
assert(prepared.body.bend>.25,'the child visibly contracts before the guard pokes');
assert(gap(preparing.hero,D.frame(D.timing.takeAway-1.1).hero)<.01,'the first refusal happens in place');
// One real tip contact is followed by forward travel, including the former first-step stop.
const contact=D.frame(D.timing.firstMove),child=actor(contact,'hero'),poker=actor(contact,'guard-2');
assert(C.distance(child.actor.outline(child.body),poker.actor.outline(poker.body))<.01,'The single poke must actually contact the child');
assert(!Object.hasOwn(D.timing,'firstStop'),'There is no scheduled first-step pause');
let previous=D.frame(D.timing.firstMove+.2).hero;
for(let t=D.timing.firstMove+.3;t<D.timing.firstMove+3;t+=.1){
  const next=D.frame(t).hero;
  assert(gap(previous,next)>.25,'The child must keep moving immediately after the poke: '+t);
  assert(gap(previous,next)<25,'The child cannot teleport forward: '+t);
  previous=next;
}

// Check the requested escort snapshots against the same silhouettes and wall assets as rendering.
for(const t of[D.timing.firstMove+1,38.5,42,55]){
  const frame=D.frame(t),hero=actor(frame,'hero'),axis=hero.actor.headAxis(hero.body),heading=hero.body.angle+axis.angle;
  const forward=entry=>(entry.body.x-hero.body.x)*Math.cos(heading)+(entry.body.y-hero.body.y)*Math.sin(heading);
  assert(forward(actor(frame,'inspector'))>40,'The inspector leads at '+t);
  for(const id of ids){
    const entry=actor(frame,id),outline=entry.actor.outline(entry.body);
    assert.equal(walls.collision(entry.actor,entry.body,new Map()),null,id+' crosses a wall at '+t);
    assert.equal(entry.collision.blocked,false,id+' is stuck at '+t);
    for(const other of frame.actors)if(other.id!==id)assert(!C.penetrates(outline,other.actor.outline(other.body)),id+' intersects '+other.id+' at '+t);
    if(id.startsWith('guard-')){
      assert(forward(entry)<-20,id+' must remain behind the child at '+t);
      // The longer observation beat deliberately postpones departure; the first
      // snapshot is now still inside the home, with the same collision rules.
      if(t>=38.5)assert(Math.max(...outline.map(p=>p[1]))<CityMap.mainDoor[1],id+' must have cleared the home doorway at '+t);
    }
  }
}
// Refusal and renewed coercion also happen without any user click.
const contacts=new Set();
assert(D.timing.hesitationStarts.length>=6,'refusals must recur throughout the road');
for(const start of D.timing.hesitationStarts){
  let closest=Infinity,reversed=false,previous=D.frame(start).hero;
  const before=D.frame(start-.1).hero,axis=[previous.x-before.x,previous.y-before.y];
  for(let t=start+.025;t<start+1.7;t+=.025){
    const f=D.frame(t),h=actor(f,'hero'),outline=h.actor.outline(h.body),v=[h.body.x-previous.x,h.body.y-previous.y];
    if(v[0]*axis[0]+v[1]*axis[1]<-.001)reversed=true;
    for(const other of f.actors)if(other.id!==h.id)assert(!C.penetrates(outline,other.actor.outline(other.body)),h.id+' must not penetrate '+other.id+' during baseline refusal');
    let simultaneous=0;
    for(const guard of f.actors.filter(a=>/^guard-/.test(a.id))){const d=C.distance(outline,guard.actor.outline(guard.body));closest=Math.min(closest,d);if(d<.01){contacts.add(guard.id);simultaneous++;}}
    assert(simultaneous<=1,'three guards alternate real contacts instead of squeezing at the same time');
    previous=f.hero;
  }
  assert(reversed,'baseline escort includes backward resistance near '+start);
  assert(closest<.01,'the next guard poke really contacts the resisting child near '+start);
}
assert.deepEqual([...contacts].sort(),['guard-1','guard-2','guard-3'],'all three guards participate in alternating pokes');
for(const id of ['guard-1','guard-2','guard-3']){
  const f=D.frame(42.9),h=actor(f,'hero'),guard=actor(f,id),rest=D.guardCoercion(guard.actor,guard.body,h.body,0),jab=D.guardCoercion(guard.actor,guard.body,h.body,1);
  assert(gap(rest,jab)>8&&gap(rest,jab)<=20.01,'the '+id+' jab stays within twenty nearby pixels');
  assert(C.distance(guard.actor.outline(jab),h.actor.outline(h.body))<.01,'the '+id+' jab meets the actual child boundary');
}
// No side arrest teams or automatically joining children survive the edit.
assert.deepEqual(D.timing.detainees,[]);
const fixed=new Map(D.frame(0).actors.filter(a=>/^(west|northwest)-/.test(a.id)).map(a=>[a.id,a.body]));
for(const t of [30,36,44,50,57])for(const a of D.frame(t).actors){
  assert(!/-escort-/.test(a.id),'side enforcement parties are removed');
  if(fixed.has(a.id)){const b=fixed.get(a.id);assert(Math.hypot(a.body.x-b.x,a.body.y-b.y)<.001,'other households remain static');assert(Math.abs(a.body.angle-b.angle)<.001,'static residents do not turn to join a queue');}
}
const handoff=D.frame(58).hero;assert(Math.hypot(handoff.x-D.handoff.x,handoff.y-D.handoff.y)<.001,'The delayed departure must still reach the shared factory handoff exactly');
// Every entrance starts beyond the actual family camera edge, with no pause while entering or fanning out.
for(const [w,h] of [[1280,760],[1719,1512],[820,980],[390,844],[844,390]]){
  const viewport=D.configureEntranceViewport({w,h,time:0}),scale=Math.min(w/1280,h/760)*1.4;
  for(let i=0;i<4;i++){
    const id=i?'guard-'+i:'inspector',start=i?D.timing.guardsEntry[i-1]:D.timing.inspectorEntry,end=i?D.timing.guardsSettled[i-1]:D.timing.inspectorSettled;
    const first=actor(D.frame(start),id);assert(Math.max(...first.actor.outline(first.body).map(p=>(p[1]-500)*scale+h/2))<0,id+' must spawn fully outside '+w+'x'+h);
    let previous=null;
    for(let t=start+.2;t<end-.2;t+=.05){const entry=actor(D.frame(t),id);assert(!entry.collision.blocked,id+' cannot stop behind the inspector');if(previous)assert(gap(previous,entry.body)>.2,id+' entry and fan use one continuous path');previous=entry.body;}
  }
  assert.equal(D.configureEntranceViewport({w:w/2,h:h/2,time:20}),viewport,'resizing after entry must not relocate an active actor');
}
D.configureEntranceViewport({w:1280,h:760,time:0});
// Fine samples catch tangent discontinuities that a coarse entry snapshot can miss.
D.configureEntranceViewport({w:780,h:1260,time:0});
for(let i=1;i<=3;i++){
  let previous=null;
  for(let t=D.timing.guardsEntry[i-1];t<D.timing.guardsSettled[i-1];t+=.005){
    const entry=actor(D.frame(t),'guard-'+i);
    if(previous){const turn=Math.atan2(Math.sin(entry.body.angle-previous.angle),Math.cos(entry.body.angle-previous.angle));assert(Math.abs(turn)<.12,'guard-'+i+' must turn continuously through the doorway and between fan curves at '+t);}
    previous=entry.body;
  }
}
// Natural brief refusals leave the camera dolly continuous; input can add its own slower follow.
for(const start of D.timing.hesitationStarts){
  let previous=D.cameraTarget(start),moving=false;
  for(let t=start+.025;t<Math.min(start+1.1,53.5);t+=.025){
    const next=D.cameraTarget(t);assert(gap(previous,next)>D.timing.heroCruise*.02,'natural coercion cannot stop the nominal camera route');
    assert.deepEqual(D.frame(t).cameraTarget,next,'the rendered frame exposes the same camera route');previous=next;moving=true;
  }
  assert(moving);
}
D.configureEntranceViewport({w:1280,h:760,time:0});
console.log('PASS escort: seven spontaneous refusals, three staggered real twenty-pixel pokes, short street formation, collision-safe doors, continuous offscreen entrances in five viewports, and exact 58 handoff.');
