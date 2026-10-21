'use strict';
const assert=require('node:assert/strict'),Versions=require('./docs/story-versions.js'),District=require('./docs/district.js'),{Follow}=require('./docs/camera.js');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),viewport={w:1280,h:760};
for(const id of ['rhythm','routine']){
  const v=Versions.get(id),camera=v.camera,bodyAt=t=>t<58?District.frame(t).hero:v.factory.frame(t).hero;
  for(const raw of [17.3,58,61,64,id==='routine'?67.4:68.3,id==='routine'?69.5:70.8]){
    const before=camera.track(raw-.000001,bodyAt(raw-.000001)),after=camera.track(raw,bodyAt(raw));
    assert(distance(before,after)<.01,id+' editorial target is continuous at '+raw);
    assert(Math.abs(before.zoom-after.zoom)<.00001,id+' zoom does not reset at '+raw);
  }
  const follow=new Follow(),hero={x:0,y:0},goal={space:'flat',x:0,y:0,zoom:1,followBody:true};follow.reset(goal);
  let view=follow.update({...goal,x:60},{x:60,y:0},viewport,.05);
  assert.equal(view.x,0,'a small backward step moves inside the image, not the whole factory');
  view=follow.update({...goal,x:180},{x:180,y:0},viewport,.05);
  assert(view.x>0&&view.x<180,'crossing the dead zone creates a damped response');
  const held={...view};view=follow.update({...goal,x:180},{x:180,y:0},viewport,0);assert.deepEqual(view,held,'zero elapsed time freezes following');
  const motion=new Follow();motion.reset({...goal,followReference:true,focalOffsetY:160});let lastX=0;
  for(let i=1;i<=120;i++){
    const x=i*2,actual={x:x-35*Math.sin(i*.27),y:160};
    view=motion.update({...goal,x,followReference:true,focalOffsetY:160},actual,viewport,.016);
    assert(view.x>lastX,'natural short refusals do not interrupt the travelling camera');lastX=view.x;
    assert(Math.abs(actual.x-view.x)<viewport.w*.23,'the actual child stays inside the soft boundary');
  }
  const dolly=new Follow();dolly.reset(camera.track(60.9,bodyAt(60.9)));let prior=dolly.current;
  for(let t=60.91;t<70.9;t+=.01){
    const hero=bodyAt(t),goal=camera.track(t,hero);view=dolly.update(goal,hero,viewport,.01);
    assert(distance(view,prior)<80,id+' pullback/overview/push-in never jumps');prior=view;
  }
  for(let raw=119;raw<=132;raw+=.13)assert.deepEqual(camera.track(raw,{x:1e5,y:-1e5}),camera.pose(raw),'chase framing is unchanged');
}
console.log('Camera dead/soft zones, damped response, continuous natural escort, pause, gate pullback and factory push-in passed.');
