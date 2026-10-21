'use strict';
const assert=require('node:assert/strict'),C=require('./docs/character-geometry'),D=require('./docs/district'),E=require('./docs/encounter-interaction').EncounterController,CollisionWorld=require('./docs/collision-world'),CityMap=require('./docs/city-map');
const walls=new CollisionWorld([CityMap.mainHouse.boundary]),pose=e=>e.applyFrame(D.frame(e.sceneTime));
function tick(e){const before=e.navigation?{...e.navigation.body}:null;e.tick(1/60);const f=pose(e),h=f.actors.find(a=>a.id==='hero'),parents=f.actors.filter(a=>a.id==='father'||a.id==='mother');assert.equal(walls.collision(h.actor,h.body,new Map()),null,'child cannot cross a real wall');for(const p of parents)assert(!C.penetrates(h.actor.outline(h.body),p.actor.outline(p.body)),'child cannot penetrate '+p.id);if(before)assert(Math.hypot(h.body.x-before.x,h.body.y-before.y)<=5.1,'no route reset or teleport');return f;}
function until(e,predicate,max=1800){for(let i=0;i<max;i++){const f=tick(e);if(predicate(e,f))return f;}assert.fail('navigation did not reach '+JSON.stringify(e.snapshot()));}
for(const order of [['mother','father'],['father','mother']]){
 const e=new E();pose(e);for(const id of order){const p=e.ensureFamily().parents.find(p=>p.id===id);assert.equal(e.hitTest(p.body),id);assert(e.activatePoint(p.body));until(e,()=>e.navigation.lastContact?.id===id);const h=e.navigation.body,parent=e.navigation.parents.find(p=>p.id===id);assert(C.distance(C.actors.child.outline(h),parent.actor.outline(parent.body))<.0001,'reaction begins only at actual silhouette contact');assert.equal(e.mark,'exclamation');until(e,()=>e.snapshot().familyVisited.includes(id));}
 const f=until(e,()=>e.snapshot().familyDone);assert(Math.hypot(f.hero.x-800,f.hero.y-660)<.01);assert.equal(e.sceneTime,D.timing.familyEnd);assert(e.navigation.breathAge>=.9,'a visible breath precedes authority entry');
 let previous=f;for(let raw=17.325;raw<26.29;raw+=.025){e.tick(1/60,{sceneTime:raw});const next=pose(e);assert(Math.hypot(next.hero.x-previous.hero.x,next.hero.y-previous.hero.y)<10,'real-time family hands over to authority without a position jump');for(const a of next.actors.filter(a=>/^(hero|father|mother|inspector|guard-[123])$/.test(a.id)))for(const b of next.actors)if(a.id!==b.id)assert(!C.penetrates(a.actor.outline(a.body),b.actor.outline(b.body)),'authority handoff keeps all silhouettes separate');previous=next;}
}
// A floor click is a real spatial goal. Retargeting never changes the current pose.
const e=new E();pose(e);assert(e.activatePoint({x:1200,y:550}));let detour=false;
for(let i=0;i<90;i++){const f=tick(e);if(f.hero.y>605)detour=true;}
const during={...e.navigation.body};assert(e.activatePoint({x:800,y:850}));assert.deepEqual(e.navigation.body,during,'changing the goal must not move or reinitialize the child');
until(e,()=>e.snapshot().familyWaiting);assert(Math.hypot(e.navigation.body.x-800,e.navigation.body.y-850)<2);assert.equal(e.navigation.visited.size,0);assert(!e.snapshot().familyDone,'walking alone never advances to authority');
assert(e.activatePoint({x:1200,y:550}));until(e,(_e,f)=>{if(f.hero.y>605)detour=true;return e.snapshot().familyWaiting;});assert(detour,'path bends around the mother instead of crossing her');assert(Math.hypot(e.navigation.body.x-1200,e.navigation.body.y-550)<2);
// Repeated contacts use the parent's current displaced pose and do not visit the other parent.
const repeated=new E();pose(repeated);for(let pass=0;pass<2;pass++){const p=repeated.ensureFamily().parents.find(p=>p.id==='father');assert(repeated.activatePoint(p.body));until(repeated,()=>repeated.navigation.lastContact?.id==='father');until(repeated,()=>repeated.navigation.parents.find(p=>p.id==='father').reaction.age>=.5);}
assert.deepEqual(repeated.snapshot().familyVisited,['father']);assert(!repeated.snapshot().familyDone);
// Out-of-house clicks remain inside the same planar room.
assert(repeated.activatePoint({x:2000,y:2000}));until(repeated,()=>repeated.snapshot().familyWaiting);assert(C.contains([repeated.navigation.body.x,repeated.navigation.body.y],CityMap.mainHouse.polygon));
console.log('PASS family navigation: either order, real contacts, repeats, floor goals, mid-route retarget, obstacle detours, wall collision, continuous return and authority gate.');
