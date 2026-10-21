'use strict';
const assert=require('node:assert/strict');
const D=require('./docs/district.js'),C=require('./docs/character-geometry.js');
const CityMap=require('./docs/city-map.js'),CollisionWorld=require('./docs/collision-world.js');
const walls=new CollisionWorld(CityMap.houseBoundaries),ids=['hero','inspector','guard-1','guard-2','guard-3'];
const actor=(frame,id)=>{const entry=frame.actors.find(a=>a.id===id);assert(entry,'Missing '+id);return entry;};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// One real tip contact is followed by forward travel, including the former first-step stop.
const contact=D.frame(D.timing.firstMove),child=actor(contact,'hero'),poker=actor(contact,'guard-2');
assert(C.distance(child.actor.outline(child.body),poker.actor.outline(poker.body))<.01,'The single poke must actually contact the child');
assert(!Object.hasOwn(D.timing,'firstStop'),'There is no scheduled first-step pause');
let previous=D.frame(D.timing.firstMove+.2).hero;
for(let t=D.timing.firstMove+.3;t<D.timing.firstMove+3;t+=.1){
  const next=D.frame(t).hero;
  assert(gap(previous,next)>.25,'The child must keep moving immediately after the poke: '+t);
  assert(gap(previous,next)<20,'The child cannot teleport forward: '+t);
  previous=next;
}

// Check the requested escort snapshots against the same silhouettes and wall assets as rendering.
for(const t of[D.timing.firstMove+1,34,42,55]){
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
      if(t>=34)assert(Math.max(...outline.map(p=>p[1]))<CityMap.mainDoor[1],id+' must have cleared the home doorway at '+t);
    }
  }
}
const handoff=D.frame(58).hero;assert(Math.hypot(handoff.x-D.handoff.x,handoff.y-D.handoff.y)<.001,'The delayed departure must still reach the shared factory handoff exactly');
console.log('PASS escort: one real poke, continuous departure, inspector ahead, three guards behind, doorway cleared by 34, no wall/actor penetration after departure and at 34/42/55.');
