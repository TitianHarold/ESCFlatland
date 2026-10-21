'use strict';
const assert=require('node:assert/strict');
const Routine=require('./docs/factory-routine.js'),Base=require('./docs/factory.js'),C=require('./docs/character-geometry.js');
const hero=t=>Routine.frame(t).actors.find(e=>e.id==='hero');
// The alternate story retains one identity and never applies rejection or breakage.
for(let t=58;t<132;t+=.1){const e=hero(t);assert(e);assert.equal(e.damage,0);assert.equal(e.blacken,0);assert.equal(e.label,undefined);assert.equal(e.result,undefined);assert.equal(e.restraint,undefined);assert(e.body.sx===1&&e.body.sy===1);}
assert.equal(hero(71).routine.fitted,0);assert.equal(hero(77).routine.fitted,1);assert(hero(77).actor.vertices.every(p=>C.contains(p,hero(77).routine.vertices)),'regular shell contains the whole original child');
for(const t of [78.5,79,79.25,79.5,80.5,82]){const e=hero(t);assert.equal(e.body.bend,0);assert(e.body.edgeBends.every(v=>v===0));const m=e.routine.compacting;assert(m.upperFace<=m.upperSupport+1e-8&&m.lowerFace>=m.lowerSupport-1e-8);if(m.force){assert(Math.abs(m.upperFace-m.upperSupport)<1e-8);assert(Math.abs(m.lowerFace-m.lowerSupport)<1e-8);}}
const compact=t=>hero(t).routine.compacting;
assert.equal(compact(78.5).phase,'windup');assert.equal(compact(78.5).clearance,16);
assert(compact(79.14).clearance>23.9,'heavy windup opens outward before the fast strike');
assert.equal(compact(79.2).phase,'slam');assert(compact(79.2).clearance>20,'energy is released in the very last stroke');
assert(compact(79.24).clearance<7);assert(compact(79.249).clearance<1);
assert.equal(compact(79.25).impact,1);assert.equal(compact(79.25).clearance,0);
assert(Math.abs(compact(79.27).recoil)>1,'outer brace receives a brief impact vibration');
assert(Math.abs(compact(79.5).recoil)>.1,'loaded supports keep rattling briefly while the die remains tight');assert.equal(compact(79.5).impact,0);assert.equal(compact(79.65).recoil,0);
assert.equal(compact(79.64).force,1);assert.equal(compact(79.66).force,0);
// Each indexed step paints one more region; it never wipes the whole figure at once.
const start=83.2,span=(94-start)/5;
for(let i=0;i<5;i++){const before=Routine.paintAt(start+i*span+span*.50,5),after=Routine.paintAt(start+i*span+span*.82,5);assert.equal(before.side.filter(v=>v===1).length,i);assert.equal(after.side.filter(v=>v===1).length,i+1);const e=hero(start+i*span+span*.82),points=e.routine.vertices,a=points[after.sideIndex],b=points[(after.sideIndex+1)%5],rel=e.body.angle-Routine.anchors.localRotation,x=(a[0]+b[0])/2*Math.cos(rel)-(a[1]+b[1])/2*Math.sin(rel),y=(a[0]+b[0])/2*Math.sin(rel)+(a[1]+b[1])/2*Math.cos(rel);assert(Math.abs(x)<1e-8&&y<0,'each painted edge faces the fixed nozzle');}
assert(hero(94).routine.paint.every(v=>v===1));assert(hero(108).routine.paint.every(v=>v===1));
for(const t of [119,120,123,126,129,131.9]){const a=hero(t),b=Base.frame(t).actors.find(e=>e.id==='hero');assert.equal(a.body.x,b.body.x);assert.equal(a.body.y,b.body.y);assert.equal(a.body.angle,b.body.angle);assert(Routine.frame(t).chase);}
const end=hero(118.9999).body,next=hero(119).body;assert(Math.hypot(end.x-next.x,end.y-next.y)<.001);assert(Math.abs(Math.atan2(Math.sin(end.angle-next.angle),Math.cos(end.angle-next.angle)))<.001);
assert(hero(127).routine.paint.every(v=>v===0));assert(hero(127).routine.release.every(v=>v===1));assert.equal(Routine.frame(132).hero,null);
// The work loop is a true shared path and keeps the body clear of its central island.
const center=Routine.anchors.workCenter,angle=Routine.anchors.localRotation,c=Math.cos(angle),s=Math.sin(angle);
for(let t=98;t<108;t+=.05){const b=hero(t).body,dx=(b.x-center.x)*c+(b.y-center.y)*s,dy=-(b.x-center.x)*s+(b.y-center.y)*c;assert(Math.abs((dx/430)**2+(dy/240)**2-1)<.05);assert(Math.abs(dx)>290||Math.abs(dy)>170);}
for(const n of [3,4,5,6,7,8,9,10]){const p=Routine.paintAt(94,n);assert.equal(p.side.length,n);assert(p.side.every(v=>v===1));assert.equal(new Set(p.sideOrder).size,n);}
assert(hero(108).routine.seed,'small inner seed survives an entirely black window');assert.equal(hero(79.2).routine.compacting.force,0);assert.equal(hero(79.25).routine.compacting.force,1);
console.log(JSON.stringify({pass:true,story:'routine',sides:5,paintSteps:5,shellRelease:[123.5,126.47],chaseContinuous:true,noRejection:true}));

let minimum=Infinity;for(let t=98;t<108;t+=.02){const es=Routine.frame(t).actors;for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){const a=es[i].body,b=es[j].body;minimum=Math.min(minimum,Math.hypot(a.x-b.x,a.y-b.y));assert(Math.hypot(a.x-b.x,a.y-b.y)>145,'daily workers maintain separate footprints');}}console.log(JSON.stringify({minimumWorkerSpacing:minimum}));

for(const n of [3,4,5,6,7,8,9,10]){const actor=C.create({sides:n,radius:42,regular:false}),span=10.8/n;for(let i=0;i<n;i++){const p=Routine.paintAt(83.2+(i+.7)*span,n,83.2,94,actor),a0=Math.atan2(actor.vertices[0][1],actor.vertices[0][0]),a=a0+(p.sideIndex+.5)*Math.PI*2/n-Math.PI-actor.headAxis({sx:1,sy:1,bend:0,strain:0}).angle+p.angle;assert(Math.abs(Math.cos(a))<1e-8&&Math.sin(a)<0,'every polygon edge faces the actual nozzle when sprayed');const body={x:0,y:0,angle:Routine.anchors.localRotation-Math.PI-actor.headAxis({sx:1,sy:1,bend:0,strain:0}).angle,sx:1,sy:1},press=Routine.compactAt(79.3,78.5,81.6,actor,body);assert.equal(press.upperFace,press.upperSupport);assert.equal(press.lowerFace,press.lowerSupport);}}

for(const t of [94,97,108,111,119]){const a=hero(t-1e-6).body.angle,b=hero(t).body.angle;assert(Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<.01,'heading remains continuous at '+t);}

// Each compacting head is a real matching polygon face with an outward thickness.
for(const n of [3,4,5,6,7,8,9,10]){
  const actor=C.create({sides:n,radius:42,regular:false}),body={x:0,y:0,angle:Routine.anchors.localRotation-Math.PI-actor.headAxis({sx:1,sy:1,bend:0,strain:0}).angle,sx:1,sy:1};
  for(let t=78.4;t<=81.7;t+=.025){
    const press=Routine.compactAt(t,78.5,81.6,actor,body);assert.equal(press.faces.length,n);assert.equal(press.shell.length,n);
    for(const face of press.faces){
      const dot=p=>p[0]*face.normal[0]+p[1]*face.normal[1],tangent=[face.shellTo[0]-face.shellFrom[0],face.shellTo[1]-face.shellFrom[1]];
      assert(Math.abs(Math.hypot(...face.normal)-1)<1e-10);assert(Math.abs(tangent[0]*face.normal[0]+tangent[1]*face.normal[1])<1e-8);
      assert(Math.abs(dot(face.shellFrom)-face.support)<1e-8&&Math.abs(dot(face.shellTo)-face.support)<1e-8);
      assert(press.shell.every(p=>dot(p)<=face.support+1e-8),'outward die normal is a true shell support');
      assert(Math.abs(dot(press.centerline[face.index])+6-face.support)<1e-8,'die touches the visible outer frame, including its stroke');
      assert(face.polygon.every(p=>dot(p)>=face.support-1e-8),'no head material ever penetrates the shell');
      assert(Math.abs(dot(face.from)-face.support-face.gap)<1e-8&&Math.abs(dot(face.to)-face.support-face.gap)<1e-8);
      assert(Math.abs(dot(face.polygon[2])-dot(face.to)-20)<1e-8,'each matching head has actual outward thickness');
      if(press.force){assert(face.gap<1e-8);assert(Math.abs(dot(face.point)-face.support)<1e-8);}
      else if(t<79.25)assert(face.gap>0,'no force before all matching faces make contact');
      assert(face.polygon.every(p=>Math.abs(p[0])<154&&Math.abs(p[1])<124),'all heads stay inside their own line footprint');
    }
  }
}
console.log(JSON.stringify({matchingDieFaces:'3..10',trueOuterFrameContact:true,noHeadPenetration:true}));

// The standard frame is assembled through separate visible edges, not a global fade.
for(const n of[3,4,5,6,7,8,9,10]){
  const actor=C.create({sides:n,radius:42,regular:false}),span=5/n;
  for(let i=0;i<n;i++){
    const before=Routine.moldAt(71.7+(i+.2)*span,71.7,76.7,actor),hit=Routine.moldAt(71.7+(i+.7)*span,71.7,76.7,actor);
    assert.equal(before.faces.filter(f=>f.locked).length,i);assert.equal(hit.faces.filter(f=>f.locked).length,i+1);
    assert(before.faces[i].gap>20);assert.equal(hit.faces[i].gap,0);assert(hit.faces[i].impact>0);
    for(const face of before.faces)for(const p of[face.from,face.to])assert(Math.abs(p[0])<118&&Math.abs(p[1])<118,'open assembly segments remain in their own conveyor footprint');
  }
  assert(Routine.moldAt(76.7,71.7,76.7,actor).complete);assert.equal(Routine.moldAt(76.7,71.7,76.7,actor).fitted,1);
}
for(let t=70;t<94;t+=.025){const original=Routine.frame(t),changed=Routine.withResistance(original,1000,t),w=Routine.resistanceWindow(t);assert(changed.appliedOffset<=w.maxOffset+1e-8);assert.equal(changed.actors.find(e=>e.id==='hero').body,changed.hero);if(original.actors.find(e=>e.id==='hero').routine.compacting.force)assert.equal(changed.appliedOffset,0);}
for(const t of[71.7,78.5,83.2])assert.equal(Routine.withResistance(Routine.frame(t),1000,t).appliedOffset,0,'resistance clears before the machine closes');
console.log(JSON.stringify({stagedStandardFrame:'3..10 edges',safeResistanceWindows:true}));
