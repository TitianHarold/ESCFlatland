'use strict';
const assert=require('node:assert/strict'),Inner=require('./docs/inner-discovery.js');
const viewport={w:1280,h:760},session=new Inner.Session();
const first=session.snapshot(viewport);session.update(12);const idle=session.snapshot(viewport);
assert.equal(idle.progress,0);assert.equal(idle.done,false);assert.equal(idle.phase,'discover');
assert.notDeepEqual(idle.points.map(p=>[p.x,p.y]),first.points.map(p=>[p.x,p.y]),'waiting keeps the small lights moving');
assert.equal(idle.points.filter(p=>p.visible&&!p.collected).length,2);
assert.equal(session.tap(-500,-500,viewport),false);assert.equal(session.snapshot(viewport).progress,0);
const p=idle.points.find(p=>p.visible&&!p.collected);assert(session.tap(p.x,p.y,viewport));assert.equal(session.tap(p.x,p.y,viewport),false);
assert.equal(session.snapshot(viewport).collected,1);
for(let count=1;count<6;count++){const before=session.snapshot(viewport),next=before.points.find(p=>p.visible&&!p.collected);assert(next);assert(session.tap(next.x,next.y,viewport));assert.equal(session.snapshot(viewport).collected,count+1);session.update(.1);}
assert.equal(session.snapshot(viewport).phase,'break');session.update(1);const held=session.snapshot(viewport);session.update(3,{advance:false});const pause=session.snapshot(viewport);
assert.equal(pause.breakProgress,held.breakProgress);assert.deepEqual(pause.reveals,held.reveals);assert(pause.clock>held.clock);
session.update(1);assert.equal(session.snapshot(viewport).phase,'done');assert.equal(session.snapshot(viewport).progress,1);
assert(session.snapshot(viewport).points.every(p=>p.alpha===0),'markers vanish before the single seed leaves');
const frozen=new Inner.Session();frozen.update(2,{advance:false});assert(frozen.snapshot(viewport).points.some(p=>p.alpha>0),'ambient point arrival stays visible even while action is paused');
const resized=new Inner.Session(),mobile={w:360,h:640};resized.update(1);const small=resized.snapshot(mobile).points.find(p=>p.visible);assert(small.hitRadius>=24);assert(resized.tap(small.x+small.hitRadius-1,small.y,mobile));
const reveal=resized.snapshot(mobile).reveals[0];assert(Math.abs(resized.snapshot(viewport).reveals[0].x/viewport.w-reveal.x/mobile.w)<1e-12,'the discovery stays in the same normalized place after resize');
for(const box of [viewport,mobile]){
  const moving=new Inner.Session(),positions=[];moving.update(.6);
  for(let i=0;i<240;i++){moving.update(1/60);const dot=moving.snapshot(box).points[0];positions.push(dot);assert(dot.r>=2.8&&dot.alpha>=.68,'the moving light stays bright and readable');assert(Math.hypot(dot.trail.at(-1).x-dot.x,dot.trail.at(-1).y-dot.y)<1e-8,'the visible trail ends at the real hit target');if(i)assert(Math.hypot(dot.x-positions[i-1].x,dot.y-positions[i-1].y)<2,'the light glides without teleporting');}
  assert(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))>25,'the light travels far enough to invite catching');
  const dot=moving.snapshot(box).points[0];assert(moving.tap(dot.x,dot.y,box),'the moving light is caught at its visible position');const fixed=moving.snapshot(box).reveals[0];moving.update(2);assert.deepEqual(moving.snapshot(box).reveals[0].x,fixed.x,'caught light leaves its discovery where it was caught');
}
for(const duration of [7.2,8,8.18]){const auto=new Inner.Session({autoDuration:duration}),counts=[];for(let t=0;t<duration+.05;t+=.01){const before=auto.snapshot(viewport).collected;auto.update(.01,{automatic:true});const after=auto.snapshot(viewport).collected;if(after>before)counts.push(after);}assert.deepEqual(counts,[1,2,3,4,5,6]);assert(auto.snapshot(viewport).done);const jump=new Inner.Session({autoDuration:duration});jump.update(duration,{automatic:true});assert(jump.snapshot(viewport).done,'a long frame keeps the same scheduled collection and break duration');}
for(const progress of [0,.12,.35,.72,.86,1]){const a=new Inner.Session().seek(progress),b=new Inner.Session().seek(progress);assert.deepEqual(a.snapshot(viewport),b.snapshot(viewport));assert.equal(a.autoElapsed,progress*a.autoDuration);if(progress>=.72)assert(Math.abs(a.snapshot(viewport).progress-progress)<1e-12);}
const mixed=new Inner.Session();mixed.update(30);assert.equal(mixed.autoElapsed,0,'interactive waiting never spends the automatic collection schedule');
mixed.update(.5,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,0);
mixed.update(.5,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,1);
const manual=mixed.snapshot(viewport).points.find(p=>p.visible&&!p.collected);assert(mixed.tap(manual.x,manual.y,viewport));
const captured=mixed.snapshot(viewport).reveals.map(r=>[r.id,r.x,r.y]);assert.equal(mixed.autoElapsed,2);
mixed.update(30);assert.equal(mixed.autoElapsed,2);mixed.update(.9,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,2,'switching from idle or manual hits to auto waits for the next interval');
mixed.update(.1,{automatic:true});assert.equal(mixed.snapshot(viewport).collected,3);assert.deepEqual(mixed.snapshot(viewport).reveals.slice(0,2).map(r=>[r.id,r.x,r.y]),captured,'automatic assistance preserves manually captured reveal positions');
assert(/^#[0-9a-f]{6}$/.test(Inner.background));
let renderedReveal=false;
if(process.env.FLATLAND_CANVAS_MODULE){
  const {createCanvas}=require(process.env.FLATLAND_CANVAS_MODULE),fs=require('node:fs'),path=require('node:path');
  global.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h);}};
  const output=process.env.FLATLAND_REVEAL_OUTPUT;
  if(output)fs.mkdirSync(output,{recursive:true});
  const capture=(box,wait)=>{const s=new Inner.Session();s.update(wait);for(let i=0;i<6;i++){const dot=s.snapshot(box).points.find(p=>p.visible&&!p.collected);assert(s.tap(dot.x,dot.y,box));s.update(.11);}return s;};
  const pixels=(s,box,b,contents=false)=>{
    s.breakAge=b*2;const c=createCanvas(box.w,box.h),ctx=c.getContext('2d');
    Inner.draw(ctx,box,s.snapshot(box),{drawContents:contents?undefined:g=>{g.fillStyle='#ffffff';g.fillRect(0,0,box.w,box.h);}});
    return{canvas:c,data:ctx.getImageData(0,0,box.w,box.h).data};
  };
  for(const box of [{w:1280,h:760},{w:760,h:1280}]){
    const early=capture(box,.6),late=capture(box,4.8);
    assert.notDeepEqual(early.found.map(p=>[p.u,p.v]),late.found.map(p=>[p.u,p.v]),'real catch times leave different reveal centres');
    const a=pixels(early,box,.08).data,b=pixels(late,box,.08).data;
    let difference=0;for(let i=0;i<a.length;i+=4)difference+=Math.abs(a[i]-b[i]);
    assert(difference>box.w*box.h*2,'the growing mask follows the actual catch positions, rather than the same preset slit');
    for(const progress of [.71,.72,1]){
      const lit=pixels(early,box,progress).data;
      let darkest=255;for(let i=0;i<lit.length;i+=4)darkest=Math.min(darkest,lit[i],lit[i+1],lit[i+2]);
      assert.equal(darkest,255,'the whole inner world, including all corners, is illuminated before the seed returns');
    }
    if(output)for(const progress of [0,.12,.32,.56,.72])fs.writeFileSync(path.join(output,`inner-${box.w}x${box.h}-${progress}.png`),pixels(early,box,progress,true).canvas.toBuffer('image/png'));
  }
  renderedReveal=true;
}
console.log(JSON.stringify({pass:true,visibleTargets:2,discoveries:6,ambientIndependent:true,pausedActionFrozen:true,automaticSameCollection:true,deterministicSeek:true,renderedReveal}));
