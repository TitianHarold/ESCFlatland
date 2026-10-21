'use strict';
const assert=require('node:assert/strict'),D=require('./docs/district'),C=require('./docs/character-geometry'),Map=require('./docs/city-map'),Portals=require('./docs/portals');
for(const [name,F,end] of [['rhythm',require('./docs/factory'),70],['routine',require('./docs/factory-routine'),67.4]]){
  assert.equal(typeof F.entryEscortBody,'function');let previous=null;
  const inspector=D.frame(58).actors.find(a=>a.id==='inspector').body;
  for(let t=58;t<end;t+=.025){
    const hero=F.frame(t).hero,frame=D.withGateEscort(D.frame(t),t,hero,F.entryEscortBody),guards=frame.actors.filter(a=>/^guard-/.test(a.id));assert.equal(guards.length,3);
    assert.deepEqual(frame.actors.find(a=>a.id==='inspector').body,inspector,'inspector stays beside the gate');
    for(const guard of guards){
      const outline=guard.actor.outline(guard.body);assert(!Portals.query(guard.actor,guard.body,Map.gate.portal,t).blocked,name+' '+guard.id+' cannot cross a jamb or a closing door at '+t);
      assert(!C.penetrates(outline,C.actors.child.outline(hero)),name+' escort cannot overlap the child at '+t);
      for(const other of guards)if(other.id!==guard.id)assert(!C.penetrates(outline,other.actor.outline(other.body)),name+' guards cannot overlap at '+t);
      if(previous)assert(Math.hypot(guard.body.x-previous[guard.id].x,guard.body.y-previous[guard.id].y)<12,name+' guards follow the entrance curve continuously');
      if(t>end-.03)assert(Math.min(...outline.map(p=>(p[0]-Map.gate.point[0])*Math.cos(Map.gate.heading)+(p[1]-Map.gate.point[1])*Math.sin(Map.gate.heading)))>0,name+' all three whole silhouettes enter before the overview handoff');
    }
    previous=Object.fromEntries(guards.map(g=>[g.id,g.body]));
  }
}
console.log('PASS gate escort: three soldiers remain through the true entrance and receiving path, all silhouettes enter, inspector waits outside, no hero/guard/jamb overlaps or route jumps in either version.');
