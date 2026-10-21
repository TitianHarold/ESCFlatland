'use strict';
const assert=require('node:assert/strict');
const Versions=require('./docs/story-versions.js');
const District=require('./docs/district.js');
const point=v=>[v.x,v.y];
const close=(a,b,message,tolerance=1e-7)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<tolerance,message);
for(const id of ['rhythm','routine']){
  const version=Versions.get(id),camera=version.camera,factory=version.factory;
  // Advancing the story clock cannot move a stopped character's travelling camera.
  for(const [start,end] of [[27,33],[43,54],[58.5,62.5],[71,71.4],[77,78.4],[82,86],[94,95.8]]){
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
  const from=factory.anchors.approach,closeAt=id==='routine'?69.5:70.8;
  // The editorial dolly proceeds smoothly even while the actor waits or resists.
  let lastDistance=Infinity,lastZoom=0;
  for(let raw=overviewEnd;raw<=closeAt;raw+=.01){
    const view=camera.track(raw,from),distance=Math.hypot(view.x-from.x,view.y-from.y);
    assert(distance<=lastDistance+1e-6&&view.zoom>=lastZoom-1e-9);lastDistance=distance;lastZoom=view.zoom;
    const backward=camera.track(raw,{x:from.x+85,y:from.y+37});
    assert(Math.abs(backward.x-view.x-85)<1e-7&&Math.abs(backward.y-view.y-37)<1e-7,'actual reverse motion affects the dolly one for one');
  }
  const bodyAtEnd=factory.frame(closeAt).hero,at=camera.track(closeAt,bodyAtEnd),before=camera.track(closeAt-.00001,bodyAtEnd);
  close(at,before,'overview dolly joins direct following without a camera jump',.001);
  assert.equal(at.x,bodyAtEnd.x);assert.equal(at.y,bodyAtEnd.y);
  const originalFrame=factory.frame;let samples=0;factory.frame=()=>{samples++;throw Error('Camera sampled another scene time');};
  camera.track(70.5,from);if(id==='routine')camera.track(96.5,from);factory.frame=originalFrame;assert.equal(samples,0,'camera cannot invalidate the current-time production cache');
  if(id==='routine'){
    for(const raw of [98,99,103,105,109,110,118])assert.deepEqual(camera.track(raw,{x:1e5,y:-1e5}),camera.pose(raw),'office and inner framing unchanged');
    close(camera.track(98-.00001,factory.frame(98-.00001).hero),camera.pose(98),'office entry joins its existing pullback',.001);
  }
}
console.log('Hero-driven camera: live reverse travel, uninterrupted overview dolly, no cross-time sampling, seek determinism and unchanged chase verified.');
