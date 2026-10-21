'use strict';
const assert=require('node:assert/strict');
const {createCanvas,Path2D,DOMMatrix}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.Path2D=Path2D;global.DOMMatrix=DOMMatrix;
global.document={createElement:()=>createCanvas(192,192)};
const Material=require('./docs/possibility.js'),width=960,height=640;
function canvasAt(zoom,center){
  const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
  ctx.setTransform(zoom,0,0,zoom,width/2-center[0]*zoom,height/2-center[1]*zoom);
  return{canvas,ctx};
}
let checked=0,pixels=0,maxError=0,clipEdgeDifferences=0;
for(const zoom of[.2,.65])for(const time of[0,19.25,68.8])for(const center of[[-3100,120],[6000,-3000],[-1000,2100]]){
  const toWorld=(x,y)=>[center[0]+(x-width/2)/zoom,center[1]+(y-height/2)/zoom];
  const rect=(x,y,w,h)=>{const a=toWorld(x,y),b=toWorld(x+w,y+h);return{minX:a[0],maxX:b[0],minY:a[1],maxY:b[1]};};
  // Disjoint, overlapping, clipped and period-boundary windows share one draw.
  const regions=[rect(0,100,86,90),rect(150,125,110,165),rect(192,208,100,130),rect(620,390,180,140),rect(930,580,90,100),{minX:-28*time-35,maxX:-28*time+35,minY:1850,maxY:1950}];
  const full=canvasAt(zoom,center),clipped=canvasAt(zoom,center),selected=canvasAt(zoom,center);
  clipped.ctx.beginPath();for(const r of regions)clipped.ctx.rect(r.minX,r.minY,r.maxX-r.minX,r.maxY-r.minY);clipped.ctx.clip();
  Material.draw(full.ctx,time);Material.draw(clipped.ctx,time);Material.draw(selected.ctx,time,regions);
  const expected=full.ctx.getImageData(0,0,width,height).data,clippedPixels=clipped.ctx.getImageData(0,0,width,height).data,actual=selected.ctx.getImageData(0,0,width,height).data,margin=2/zoom;
  let clipDifferences=0,interior=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const w=toWorld(x+.5,y+.5),inside=regions.some(r=>w[0]>r.minX+margin&&w[0]<r.maxX-margin&&w[1]>r.minY+margin&&w[1]<r.maxY-margin),outside=regions.every(r=>w[0]<r.minX-margin||w[0]>r.maxX+margin||w[1]<r.minY-margin||w[1]>r.maxY+margin),offset=(y*width+x)*4;
    if(inside){let differs=false;for(let c=0;c<4;c++){assert.equal(actual[offset+c],clippedPixels[offset+c],'region cell selection must exactly match drawing every cell under the same clip');const error=Math.abs(actual[offset+c]-expected[offset+c]);maxError=Math.max(maxError,error);differs||=error>0;assert(error<=24,'native clip antialias tolerance '+JSON.stringify({zoom,time,center,x,y,channel:c,error}));}if(differs)clipDifferences++;interior++;pixels++;}
    else if(outside)assert.equal(actual[offset+3],0,'outside the selected material windows remains transparent');
  }
  assert(clipDifferences/interior<.025,'clipping changes only sparse native antialias edge pixels');clipEdgeDifferences+=clipDifferences;checked++;
}
const empty=canvasAt(.2,[0,0]);Material.draw(empty.ctx,2,[]);assert(empty.ctx.getImageData(0,0,width,height).data.every(v=>v===0));
console.log(JSON.stringify({checks:checked,interiorPixels:pixels,cullingMaxChannelError:0,nativeClipMaxChannelError:maxError,nativeClipChangedPixelFraction:clipEdgeDifferences/pixels,zooms:[.2,.65],times:[0,19.25,68.8],disjointAndOverlappingWindows:true,emptyWindows:true}));
