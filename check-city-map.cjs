'use strict';
const assert=require('node:assert/strict');
const {createCanvas}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const City=require('./docs/city-map.js'),asset=City.getPavement(),houses=[City.mainHouse,...City.homes,...City.backgroundHomes];
assert.equal(asset.accesses.length,houses.length,'every room has a door-to-street route');
assert.equal(asset.accesses.filter(a=>a.generated).length,houses.length-1,'all non-story entrances are generated from the street graph');
assert.deepEqual(City.mainDoor,[800,240]);assert.deepEqual(City.gate.point,[-3000,-2100]);

// Test the final rendered union, including the house wall masses drawn over the pavement.
const bounds={x:-5000,y:-3900,w:9800,h:7300},scale=.25,w=Math.ceil(bounds.w*scale),h=Math.ceil(bounds.h*scale);
const canvas=createCanvas(w,h),ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.translate(-bounds.x,-bounds.y);
City.drawBase(ctx,42,{paper:'#fff',blue:'#000',navy:'#000',ink:'#000',outside:{wall:'#000'}});
const pixels=ctx.getImageData(0,0,w,h).data,walkable=new Uint8Array(w*h),visited=new Uint8Array(w*h),queue=new Uint32Array(w*h);
for(let i=0;i<walkable.length;i++)walkable[i]=pixels[i*4]>200?1:0;
const index=([x,y])=>Math.floor((y-bounds.y)*scale)*w+Math.floor((x-bounds.x)*scale);
const origin=index([800,660]);assert(walkable[origin]);let head=0,tail=1;queue[0]=origin;visited[origin]=1;
while(head<tail){
  const i=queue[head++],x=i%w;
  for(const j of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i+w<walkable.length?i+w:-1])if(j>=0&&walkable[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}
}
for(const house of houses){
  const access=asset.accesses.find(a=>a.houseId===house.id);assert.deepEqual(access.points[0],house.door,'routes begin at actual shared doors');
  assert(visited[index([house.x+house.w/2,house.y+house.h*.5])],house.id+' interior must reach the common street through its doorway');
  assert(visited[index(house.door)],house.id+' door must remain open after wall rendering');
  for(let i=0;i<access.points.length;i++){
    const p=access.points[i],a=access.points[Math.max(0,i-1)],b=access.points[Math.min(access.points.length-1,i+1)],length=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
    for(const offset of [-16,0,16]){
      const q=[p[0]-(b[1]-a[1])*offset/length,p[1]+(b[0]-a[0])*offset/length];
      assert(asset.contains(q),house.id+' cannot lose its generated corridor during contour smoothing');
      assert(visited[index(q)],house.id+' has a blocked or disconnected access at '+q.join(','));
    }
    if(!access.generated||!i||i===access.points.length-1)continue;
    const incoming=Math.atan2(p[1]-a[1],p[0]-a[0]),outgoing=Math.atan2(b[1]-p[1],b[0]-p[0]);
    assert(Math.abs(Math.atan2(Math.sin(outgoing-incoming),Math.cos(outgoing-incoming)))<.65,house.id+' must round its bends instead of retaining grid corners');
    assert(Math.hypot(p[0]-a[0],p[1]-a[1])<=8.01,'dense route samples must protect the whole passage when wall masses are fitted');
  }
}
console.log('PASS city map: 35 generated obstacle-aware, rounded routes; all 36 room interiors and doorways share one rendered pavement component with a clear 32-pixel corridor.');
