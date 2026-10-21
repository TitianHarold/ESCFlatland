'use strict';
const assert=require('node:assert/strict'),A=require('./docs/factory.js'),B=require('./docs/factory-routine.js'),V=require('./docs/story-versions.js');
function bounds(view,w=1280,h=760){const scale=Math.min(w/1280,h/760)*view.zoom;return{minX:view.x-w/(2*scale),maxX:view.x+w/(2*scale),minY:view.y-h/(2*scale),maxY:view.y+h/(2*scale),scale};}
for(const f of [A,B]){
  for(const [w,h]of [[1280,760],[820,980]]){
    const box=bounds(f.anchors.overview,w,h),plan=A.backgroundLayout(box,f.anchors.lanes,f.anchors.floorBounds.left,f.anchors.floorBounds.right);
    assert(plan.left<=plan.view.left&&plan.right>=plan.view.right,'belts extend to both viewport edges');
    assert(plan.lines.some(line=>line.virtual),'visible surrounding rows continue past the physical actor population');
    assert(plan.lines.every(line=>line.y+160>=plan.view.top&&line.y-160<=plan.view.bottom));
    assert(Math.min(...plan.lines.map(line=>line.y))-160<=plan.view.top&&Math.max(...plan.lines.map(line=>line.y))+160>=plan.view.bottom,'no finite-island border');
    assert(plan.lines.length<=Math.ceil((plan.view.bottom-plan.view.top+320)/260)+4&&plan.columns.length<5,'draw count follows visible extent');
  }
  const origin=f.anchors.factoryCenter,far=A.backgroundLayout({minX:origin.x-100000,maxX:origin.x-98000,minY:origin.y-100000,maxY:origin.y-98000},f.anchors.lanes,f.anchors.floorBounds.left,f.anchors.floorBounds.right);
  assert(far.lines.length<15&&far.columns.length<4,'a distant view does not draw every row between it and the origin');
}
for(const [id,spans]of [['routine',[[67.4,71.7,5.4],[76.7,78.5,6],[81.6,83.2,6]]],['rhythm',[[70,72,4],[77,80,4],[87,90,4]]]]){
  const timing=V.get(id).timing;for(const [start,end,seconds]of spans)assert(Math.abs(timing.playbackAt(end)-timing.playbackAt(start)-seconds)<1e-8);
  assert(Math.abs(timing.playbackAt(58)-timing.playbackAt(42)-9.2)<1e-8);
  assert(Math.abs(timing.playbackAt(132)-timing.playbackAt(119)-13)<1e-8,'chase duration is preserved');
}
const first=B.frame(68.5);assert.equal(B.frame(68.5),first,'production data is cached at the same actual scene time');
const filtered=B.frame(68.5,{minX:first.hero.x-90,maxX:first.hero.x+90,minY:first.hero.y-90,maxY:first.hero.y+90});assert(filtered.actors.length<first.actors.length);assert.equal(B.frame(68.5),first,'viewport filtering never contaminates the memo');
assert.notEqual(B.frame(98),B.frame(98),'office loops remain live at the same raw story time');
console.log('PASS factory overview: closer continuous backdrop, visible-bound row/column budget, unchanged physical populations, production memo, slower transfer spans and unchanged chase duration.');
