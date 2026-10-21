'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'docs/storyboard-r2'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),data=JSON.parse(html.match(/<script id="board-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
for(const v of data.versions){assert.equal(v.shots.length,35);assert(Math.abs(v.shots.reduce((n,s)=>n+s.duration,0)-v.duration)<1e-6);for(let i=0;i<v.shots.length;i++){const s=v.shots[i];if(i)assert.equal(v.shots[i-1].sceneEnd,s.sceneStart);assert(!s.id.endsWith('004A')&&!s.id.endsWith('004B'));for(const p of Object.values(s.prompts)){assert.deepEqual([...p.matchAll(/【([^】]+)】/g)].map(m=>m[1]),data.headings);assert(!/西侧队伍入屋|其他孩子被押出|西北侧两个孩子|转身向后跑|0\.8秒连续后退/.test(p));}for(const img of [s.firstImage,s.lastImage])assert(fs.existsSync(path.join(root,img)));}}
for(const v of data.versions){
  for(const shot of v.shots.filter(s=>s.sceneStart<17.3))assert(shot.interaction.includes('实时寻路')&&shot.interaction.includes('顺序自由'),'family movement and contact order use real targets');
  for(const shot of v.shots.filter(s=>s.sceneStart<119))assert(!/不改变镜头时钟|镜头和押送流程始终前进/.test(shot.fullPrompt),'travelling cameras follow actual motion');
  const hands=v.shots.find(s=>s.keywords[0]==='hands');assert(hands.lastFrameDescription.includes('同一颗黄金光种子')&&hands.interaction.includes('重新播放'));
  const overview=v.shots.find(s=>s.artSourceShotId==='006A');assert(overview.scene.includes(v.id==='routine'?'保留12排':'保留19排'));assert(overview.content.includes('铺满画面四边'));
}
for(const id of ['B-007A','B-008A','B-009A']){const shot=data.versions.find(v=>v.id==='routine').shots.find(s=>s.id===id);assert(shot.action.includes('阻尼')&&shot.action.includes('长按')&&shot.action.includes('满格瞬间变红'));assert(!shot.fullPrompt.includes('体力'));}
const routine=data.versions.find(v=>v.id==='routine'),overview=routine.shots.find(s=>s.id==='B-006A'),fade=routine.shots.find(s=>s.id==='B-010D');
assert(Math.abs(overview.duration-3)<1e-9);assert(Math.abs(fade.duration-4.5)<1e-9);assert(fade.action.includes('不再点击'));assert(fade.content.includes('自动开始连续变黑'));assert(!fade.fullPrompt.includes('再点一下启动'));
const versions=require('./docs/story-versions.js'),district=require('./docs/district.js');
for(const version of data.versions){assert.equal(version.duration,versions.get(version.id).duration);const inspector=version.shots.find(s=>s.artSourceShotId==='001E'),soldiers=version.shots.find(s=>s.artSourceShotId==='002A'),poke=version.shots.find(s=>s.artSourceShotId==='002B');assert.equal(inspector.sceneEnd,district.timing.guardsEntry[0]);assert.equal(soldiers.sceneEnd,district.timing.takeAway);assert.equal(poke.sceneEnd,district.timing.firstMove);}
assert(html.includes('A 93.65秒／B 104.7秒'));
for(const v of data.versions)for(const s of v.shots){assert.equal(s.start,versions.get(v.id).timing.playbackAt(s.sceneStart));assert.equal(s.end,versions.get(v.id).timing.playbackAt(s.sceneEnd));}
assert.equal(data.characterAssets.length,6);for(const asset of data.characterAssets){assert(fs.existsSync(path.join(root,asset.image)));if(asset.originalImage)assert(fs.existsSync(path.join(root,asset.originalImage)));}
class Element{constructor(id){this.id=id;this.children=[];this.listeners={};this.style={};this.scrollHeight=100;this.value='';this.textContent='';}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}setAttribute(k,v){this[k]=v;}addEventListener(k,f){this.listeners[k]=f;}focus(){}select(){}scrollIntoView(){}remove(){}click(){this.listeners.click?.();}get href(){return this._href||'https://titianharold.github.io/ESCFlatland/workbench.html';}set href(v){this._href=v;}}
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};el('board-data').textContent=JSON.stringify(data);
const location={search:'',href:'https://titianharold.github.io/ESCFlatland/storyboard-r2/',protocol:'https:'};
const document={getElementById:el,createElement:tag=>new Element(tag),body:new Element('body')},sandbox={document,location,URL,URLSearchParams,Blob,setTimeout,clearTimeout,innerWidth:1200,navigator:{},console,history:{replaceState(_a,_b,url){location.href=String(url);}},addEventListener(){},FlatlandPalette:{getConfig:()=>({preset:'F2',colors:{}}),setConfig:()=>true}};sandbox.window=sandbox;
const script=html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/)[1];vm.runInNewContext(script,sandbox,{filename:'storyboard-r2.js'});
assert.equal(el('version-select').value,'routine');assert.equal(el('palette-select').value,'F2');assert.equal(el('overview-body').children.length,35);assert.equal(el('character-gallery').children.length,6);
// Selecting retained hand-drawn frames never restores the old video script.
el('overview-body').children[1].click();el('palette-select').listeners.change({target:{value:'F3'}});el('source-select').listeners.change({target:{value:'F3-001B'}});
assert(el('first-image').src.includes('F3'));assert(el('full-prompt').value.startsWith('B-001B'));assert(el('full-prompt').value.includes('0.09秒快速'));assert(el('full-prompt').value.includes('叹号保留约1.25秒'));
el('version-select').listeners.change({target:{value:'rhythm'}});assert.equal(el('overview-body').children.length,35);assert(el('full-prompt').value.startsWith('001A'));assert(new URL(el('animation-link').href).searchParams.get('version')==='rhythm');
console.log('PASS storyboard: 35 shots per A/B version; real family paths, slow inspector entry, continuous actual-position camera, edge-filled factory, slower long-hold resistance, automatic fade and POV seed; complete independent prompts and materials preserved.');
