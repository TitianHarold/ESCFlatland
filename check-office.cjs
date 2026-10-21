'use strict';
const assert=require('node:assert/strict'),Office=require('./docs/office-world.js'),C=require('./docs/character-geometry.js'),Routine=require('./docs/factory-routine.js');
const main=Office.cellAt(0,0),sample=Office.visibleCells();
assert.equal(sample.filter(c=>c.main).length,1);assert.equal(Office.gate,undefined);assert.equal(Office.signals,undefined);assert.equal(Office.drawSignals,undefined);
for(let i=0;i<sample.length;i++){const a=sample[i];assert(a.walls.every(w=>w.r>0));for(let j=i+1;j<sample.length;j++){const b=sample[j];assert(Math.abs(a.x-b.x)>=1200||Math.abs(a.y-b.y)>=880);}}
// Grid identity and placement depend on world row/column, never camera or pullback time.
assert.deepEqual(Office.cellAt(-87,53),Office.cellAt(-87,53));assert.equal(Office.cellAt(1,0).x-main.x,Office.pitch.x);assert(Math.abs(Office.cellAt(0,1).y-main.y-Office.pitch.y)<1e-8);
for(const[w,h]of[[1280,760],[760,1280]])for(const zoom of[.2,.07,.035,.0175]){
  const v=Office.anchors.overview,b={minX:v.x-w/zoom/2,maxX:v.x+w/zoom/2,minY:v.y-h/zoom/2,maxY:v.y+h/zoom/2,scale:zoom},cells=Office.visibleCells(b);
  assert(cells.length>20);assert(cells.every(c=>c.id==='office-'+c.col+'-'+c.row));
  for(const x of[b.minX,b.maxX])for(const y of[b.minY,b.maxY]){const p=Office.local({x,y}),col=Math.round((p.x-main.x)/Office.pitch.x),row=Math.round((p.y-main.y)/Office.pitch.y);assert(cells.some(c=>c.col===col&&c.row===row),'every viewport corner is covered by the same fixed grid');}
  if(zoom===.035)assert(cells.length>500,'dense portrait and landscape views contain hundreds of offices');
}
function wallPolygon(rect){const r=Math.min(rect.r,rect.w/2,rect.h/2),corners=[[rect.x+rect.w-r,rect.y+r,-Math.PI/2],[rect.x+rect.w-r,rect.y+rect.h-r,0],[rect.x+r,rect.y+rect.h-r,Math.PI/2],[rect.x+r,rect.y+r,Math.PI]];return corners.flatMap(([x,y,a])=>Array.from({length:9},(_,i)=>[x+r*Math.cos(a+i*Math.PI/16),y+r*Math.sin(a+i*Math.PI/16)]));}
let min=Infinity;
for(let t=96;t<110;t+=.1){const actors=Office.actors(t),byCell=new Map();for(const e of actors){assert.equal(e.cavity,false);assert.equal(e.actor.form,'regular');const cell=sample.find(c=>c.id===e.office),outline=e.actor.outline(e.body).map(([x,y])=>{const p=Office.local({x,y});return[p.x,p.y];});for(const wall of cell.walls)assert(!C.intersects(outline,wallPolygon(wall)),'resident stays clear of every wall and work mass');const group=byCell.get(e.office)||[];group.push(e);byCell.set(e.office,group);}
 const e=Routine.frame(t).actors.find(e=>e.id==='hero'),r=1+6/(71*Math.cos(Math.PI/5)),outline=e.routine.vertices.map(([x,y])=>[e.body.x+x*r*Math.cos(e.body.angle)-y*r*Math.sin(e.body.angle),e.body.y+x*r*Math.sin(e.body.angle)+y*r*Math.cos(e.body.angle)]).map(([x,y])=>{const p=Office.local({x,y});return[p.x,p.y];});for(const wall of main.walls)assert(!C.intersects(outline,wallPolygon(wall)),'the framed child enters the permanent opening without crossing a wall');
 byCell.get(main.id).push(e);for(const group of byCell.values())for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const d=Math.hypot(group[i].body.x-group[j].body.x,group[i].body.y-group[j].body.y);min=Math.min(min,d);assert(d>130,'independent footprints also remain separate during office ingress');}
}
assert.equal(Office.actors(95.999).length,0);assert.equal(Office.actors(110).length,0);
const first=Office.actors(101).map(e=>[e.id,e.body.x,e.body.y]);Office.actors(105);assert.deepEqual(Office.actors(101).map(e=>[e.id,e.body.x,e.body.y]),first);
Office.setWorkTime(103.2);const sped=Office.actors(101).map(e=>[e.id,e.body.x,e.body.y]);Office.setWorkTime(null);assert.deepEqual(Office.actors(103.2).map(e=>[e.id,e.body.x,e.body.y]),sped,'all resident motion shares the injected work clock');assert.notDeepEqual(Office.heroPoint(108),Office.heroPoint(108.2),'the protagonist keeps working while the scene darkens');
assert.equal(Routine.sceneTransition(96).cover,1);assert.equal(Routine.sceneTransition(95.65).cover,0);assert.equal(Routine.sceneTransition(96.35).cover,0);
console.log(JSON.stringify({pass:true,grid:'unbounded',viewportCoverage:['landscape','portrait'],minimumWorkerDistance:min,gateRemoved:true,sharedWorkClock:true}));
