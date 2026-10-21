'use strict';
const assert=require('node:assert/strict');
const Versions=require('./docs/story-versions.js');
const District=require('./docs/district.js');
const point=v=>[v.x,v.y];
const close=(a,b,message,tolerance=1e-7)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<tolerance,message);
for(const id of ['rhythm','routine']){
  const version=Versions.get(id),camera=version.camera,factory=version.factory;
  // Advancing the story clock cannot move a stopped character's travelling camera.
  for(const [start,end] of [[27,33],[43,54],[58.5,62.5],[70.1,71.4],[77,78.4],[82,86],[94,95.8]]){
    const body=start<58?District.frame(start).hero:factory.frame(start).hero;
    const initial=camera.track(start,body);
    for(let raw=start;raw<=end;raw+=.07)assert.deepEqual(point(camera.track(raw,body)),point(initial),id+' stopped camera follows actual position at '+raw);
  }
  // Reverse motion moves the camera backward immediately, without flipping framing.
  for(const raw of [43,59,74,77.4,82,95]){
    const source=raw<58?District.frame(raw).hero:factory.frame(raw).hero,body=source.body||source;
    const before=camera.track(raw,body),after=camera.track(raw,{...body,x:body.x+85,y:body.y+37});
    assert(Math.abs(after.x-before.x-85)<1e-7&&Math.abs(after.y-before.y-37)<1e-7,id+' camera follows an actual backward step');
  }
  // Seeks have no hidden spring state, so the same body gives exactly the same view.
  const body=factory.frame(77.5).hero,expected=camera.track(77.5,body);
  camera.track(95,factory.frame(95).hero);camera.track(28,District.frame(28).hero);
  assert.deepEqual(camera.track(77.5,body),expected,'seek order does not alter framing');
  for(let raw=119;raw<=132;raw+=.03125)assert.deepEqual(camera.track(raw,{x:1e5,y:-1e5}),camera.pose(raw),'chase camera stays exactly unchanged');
  assert.deepEqual(camera.track(120,null),camera.pose(120));
  for(const raw of [0,6,12,17.29])assert.deepEqual(camera.track(raw,{x:100,y:100}),camera.pose(raw),'family keeps both parents in frame');
  const overviewEnd=id==='routine'?67.4:68.3;
  for(const raw of [64,65,overviewEnd-.0001])assert.deepEqual(camera.track(raw,{x:100,y:100}),camera.pose(raw),'full overview stays editorial');
  const from=id==='routine'?factory.anchors.approach:factory.frame(70).hero;
  const to=id==='routine'?factory.anchors.mold:factory.anchors.heroStages.m1;
  const progress=.19,h={x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress};
  const start=id==='routine'?67.5:70.1,end=id==='routine'?71:71.9;
  assert.deepEqual(camera.track(start,h),{...camera.track(end,h),shotId:camera.track(start,h).shotId},'overview dolly also stops with actual travel');
  const firstEnd=id==='routine'?71.7:72,at=camera.track(firstEnd,to),before=camera.track(firstEnd-.00001,to);
  close(at,before,'first close-up joins the following camera continuously');
  const anchor=camera.track(firstEnd+.1,to);
  assert.equal(anchor.x,to.x);assert.equal(anchor.y,to.y);
  if(id==='routine'){
    for(const raw of [98,99,103,105,109,110,118])assert.deepEqual(camera.track(raw,{x:1e5,y:-1e5}),camera.pose(raw),'office and inner framing unchanged');
    close(camera.track(98-.00001,factory.frame(98-.00001).hero),camera.pose(98),'office entry joins its existing pullback',.001);
  }
}
console.log('Hero-driven camera: stopped clocks, reverse travel, overview dolly, seek determinism and unchanged chase verified.');
