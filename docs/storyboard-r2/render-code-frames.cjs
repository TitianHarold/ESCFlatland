'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {createCanvas,Path2D,DOMMatrix,loadImage}=require('/Users/harold/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const repo='/Users/harold/Documents/ChatGPT/视频制作/ESCFlatland',docs=path.join(repo,'docs'),workspace=__dirname;
const shotsFile=path.join(workspace,'shots-detailed.json'),detailed=JSON.parse(fs.readFileSync(shotsFile,'utf8'));
const scripts=[...fs.readFileSync(path.join(docs,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]);
const sources=Object.fromEntries(scripts.map(filename=>[filename,fs.readFileSync(path.join(docs,filename),'utf8')]));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const moduleSHA=Object.fromEntries(Object.entries(sources).map(([filename,source])=>[filename,sha(source)]));
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const sourceWorkingTree=execFileSync('git',['status','--short'],{cwd:repo,encoding:'utf8'}).trim();
const evidence='Offline Node Canvas render of current repository geometry and actual app.js draw functions. This is not a browser screenshot and is not newly generated hand-drawn artwork. Minimal DOM and Canvas rasterization may differ from browser output.';
let endingAssets;
function createStorage(){const values=new Map();return{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};}
function makeRenderer(preset,width,height,version='routine'){
  const localStorage=createStorage();
  // Apply the public API first, then reconstruct every scene module in a fresh VM so baked pigments and materials cannot retain another preset.
  const setup={localStorage};setup.window=setup;setup.globalThis=setup;
  const setupContext=vm.createContext(setup);vm.runInContext(sources['palette.js'],setupContext,{filename:'palette.js'});
  if(!setup.FlatlandPalette.setConfig({preset,colors:{}}))throw Error('setConfig failed: '+preset);
  const nodes=new Map();let created=0;
  function element(id){
    if(nodes.has(id))return nodes.get(id);
    const node=id==='possibility-world'||id==='outer-world'?createCanvas(width,height):{};
    Object.assign(node,{id,dataset:{},style:{setProperty(){}},classList:{contains(){return false;}},addEventListener(){},append(){},replaceChildren(){},setAttribute(){},getBoundingClientRect(){return{x:0,y:0,left:0,top:0,right:width,bottom:height,width,height};},focus(){},setPointerCapture(){}});
    nodes.set(id,node);return node;
  }
  const document={body:{classList:{contains(){return false;}}},hidden:false,getElementById:element,querySelector(){return null;},addEventListener(){},createElement:tag=>tag==='canvas'?createCanvas(300,150):element('created-'+(++created))};
  const sandbox={console,document,localStorage,Path2D,DOMMatrix,FlatlandEndingAssets:endingAssets,URLSearchParams,location:{search:'?mode=auto&version='+version,href:'https://titianharold.github.io/ESCFlatland/?version='+version},performance:{now:()=>0},devicePixelRatio:1,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame(){},OffscreenCanvas:class{constructor(w,h){return createCanvas(w,h);}},setTimeout,clearTimeout};
  sandbox.window=sandbox;sandbox.globalThis=sandbox;const context=vm.createContext(sandbox);
  for(const filename of scripts){
    const source=sources[filename],executable=filename==='app.js'?source.replace(/\}\)\(\);\s*$/,`window.__renderScene=(scene,ambient)=>{seek(timing.playbackAt(scene));encounter.tick(0,{automatic:true,sceneTime:scene});state.reviewPaused=true;state.ambient=ambient;state.last=0;updateCamera(0,true);const v=view();draw(sceneTime(),v);return{sceneTime:sceneTime(),playbackSeconds:player.time,camera:v};};\n})();`):source;
    vm.runInContext(executable,context,{filename});
  }
  if(typeof sandbox.__renderScene!=='function')throw Error('app.js capture injection failed');
  if(sandbox.FlatlandPalette.getConfig().preset!==preset)throw Error('fresh VM preset mismatch');
  const composite=createCanvas(width,height),ctx=composite.getContext('2d');
  return{paletteConfig:sandbox.FlatlandPalette.getConfig(),paletteColors:Object.fromEntries(sandbox.FlatlandPalette.editableKeys.map(({key})=>[key,sandbox.FlatlandPalette[key]])),timing:sandbox.FlatlandStoryVersions.get(version).timing,renderScene(scene){
    const playback=sandbox.FlatlandStoryVersions.get(version).timing.playbackAt(scene),sample=sandbox.__renderScene(scene,playback);
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle=sandbox.FlatlandPalette.outside.background;ctx.fillRect(0,0,width,height);
    ctx.drawImage(element('possibility-world'),0,0);ctx.drawImage(element('outer-world'),0,0);
    return{sample,buffer:composite.toBuffer('image/png')};
  }};
}
function baseManifest(kind){return{id:'flatland-r2-'+kind,generatedAt:new Date().toISOString(),sourceRepository:repo,sourceCommit,sourceCommitRole:'Base revision before the current working-tree edits',sourceState:'R25 working-tree render before commit',sourceWorkingTree,sourceModuleSHA256:moduleSHA,shotsFile:'../../shots-detailed.json',shotsSHA256:sha(fs.readFileSync(shotsFile)),renderer:'@napi-rs/canvas; actual index.html script order and app.js draw functions in fresh VMs; no browser automation',evidenceBoundary:evidence,isNewHandDrawnArtwork:false,isBrowserScreenshot:false,productionCompositionDifference:'Code frames preserve the implemented upper house opening, planar geometry and continuous scene clock. Hand-drawn source images remain selectable visual references.',storyDuration:138,playbackDuration:detailed.versions.find(v=>v.id==='routine').duration,playbackDurations:Object.fromEntries(detailed.versions.map(v=>[v.id,v.duration])),status:'rendering',frames:[]};}
function saveFrame(out,filename,result,extra,width,height){
  fs.writeFileSync(path.join(out,filename),result.buffer);
  return{...extra,file:filename,src:path.relative(workspace,path.join(out,filename)).split(path.sep).join('/'),sceneTime:result.sample.sceneTime,playbackSeconds:result.sample.playbackSeconds,ambientSeconds:result.sample.playbackSeconds,width,height,bytes:result.buffer.length,sha256:sha(result.buffer),camera:result.sample.camera};
}
function renderDetailed(){
  const out=path.join(workspace,'frames/detailed');fs.mkdirSync(out,{recursive:true});
  const allShots=detailed.versions.flatMap(v=>v.shots),manifest=baseManifest('detailed-code-frames');
  Object.assign(manifest,{shotCount:allShots.length,expectedFrameCount:allShots.length*2,sampling:'Start and end use the current version scene clock; end is .01 authored seconds before the boundary. Automatic poses are rendered. Interactive duration can be longer.'});
  for(const version of detailed.versions){
    const renderer=makeRenderer('F2',1280,760,version.id);
    for(const shot of version.shots)for(const position of ['start','end']){
      const scene=position==='start'?shot.sceneStart:Math.max(shot.sceneStart,shot.sceneEnd-.01),result=renderer.renderScene(scene),filename=`shot-${shot.id}-${position}.png`;
      const frame=saveFrame(out,filename,result,{id:shot.id+'-'+position,shot:shot.id,shotId:shot.id,parentId:shot.parentId,version:version.id,shotTitle:shot.title,position,palette:'F2',declaredStart:shot.start,declaredEnd:shot.end},1280,760);manifest.frames.push(frame);manifest.frameCount=manifest.frames.length;
      fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(filename+' playback='+frame.playbackSeconds.toFixed(3)+' bytes='+frame.bytes);
    }
  }
  if(manifest.frames.length!==manifest.expectedFrameCount)throw Error('Detailed frame count mismatch');manifest.status='complete';fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('COMPLETE detailed '+manifest.frameCount+' frames');
}
function renderPalettePreview(){
  const out=path.join(workspace,'frames/palette-preview');fs.mkdirSync(out,{recursive:true});
  const manifest=baseManifest('palette-preview');Object.assign(manifest,{expectedFrameCount:48,width:640,height:380,sampling:'Authored scene moments 4,44,73.4,115,128,135 mapped separately through each version timing. Each preset is applied with FlatlandPalette.setConfig({preset,colors:{}}), followed by loading all scene modules into a newly constructed VM.',presets:[]});
  const moments=[['family','家庭',4],['escort','押送',44],['factory','工厂',73.4],['inner','内心',115],['chase','追光',128],['dimension','双手',135]];
  for(const version of detailed.versions)for(const preset of ['original','F2','F3','F4']){
    const renderer=makeRenderer(preset,640,380,version.id);if(version.id==='rhythm')manifest.presets.push({id:preset,config:renderer.paletteConfig,colors:renderer.paletteColors,freshVM:true});
    for(const[moment,title,scene]of moments){
      const playback=renderer.timing.playbackAt(scene),result=renderer.renderScene(scene),filename=`${version.id}-${preset}-${moment}-t${String(playback).padStart(2,'0')}.png`;
      const frame=saveFrame(out,filename,result,{id:version.id+'-'+preset+'-'+moment,version:version.id,preset,moment,title,requestedPlaybackSeconds:playback,position:'sample',paletteConfig:renderer.paletteConfig},640,380);manifest.frames.push(frame);manifest.frameCount=manifest.frames.length;
      fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(filename+' scene='+scene.toFixed(3)+' bytes='+frame.bytes);
    }
  }
  if(manifest.frames.length!==48)throw Error('Palette frame count mismatch');manifest.status='complete';fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('COMPLETE palette preview 48 frames');
}
function refreshInnerEnding(){
  const out=path.join(workspace,'frames/detailed'),manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
  for(const version of detailed.versions){const renderer=makeRenderer('F2',1280,760,version.id);
    for(const shot of version.shots.filter(s=>['inner','hands'].includes(s.keywords[0])))for(const position of ['start','end']){
      const scene=position==='start'?shot.sceneStart:Math.max(shot.sceneStart,shot.sceneEnd-.01),result=renderer.renderScene(scene),filename=`shot-${shot.id}-${position}.png`;
      const f=saveFrame(out,filename,result,{id:shot.id+'-'+position,shot:shot.id,shotId:shot.id,parentId:shot.parentId,version:version.id,shotTitle:shot.title,position,palette:'F2',declaredStart:shot.start,declaredEnd:shot.end},1280,760),index=manifest.frames.findIndex(v=>v.shotId===shot.id&&v.position===position);if(index<0)throw Error('Unknown '+shot.id);manifest.frames[index]=f;
    }
  }
  manifest.shotsSHA256=sha(fs.readFileSync(shotsFile));manifest.sourceModuleSHA256=moduleSHA;manifest.generatedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Refreshed reconstructed inner and ending frames; chase frames retained');
}
function refreshHands(){
  for(const [folder,width,height,selected] of [['detailed',1280,760,f=>f.sceneTime>=132],['palette-preview',640,380,f=>f.moment==='dimension']]){
    const out=path.join(workspace,'frames',folder),manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'))),renderers=new Map();
    for(let i=0;i<manifest.frames.length;i++){
      const frame=manifest.frames[i];if(!selected(frame))continue;
      const key=frame.version+':'+(frame.preset||frame.palette);if(!renderers.has(key))renderers.set(key,makeRenderer(frame.preset||frame.palette,width,height,frame.version));
      manifest.frames[i]=saveFrame(out,frame.file,renderers.get(key).renderScene(frame.sceneTime),frame,width,height);
    }
    manifest.generatedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  }
  console.log('Refreshed POV hand frames with the actual transparent assets');
}
async function run(){
  const [hands,flexedHands,brushHands,toolsHands]=await Promise.all(['pov-hands-open-fair-r19.png','pov-hands-flexed-fair-r19.png','pov-hands-brush-r23.png','pov-hands-tools-r24.png'].map(file=>loadImage(path.join(docs,'assets',file))));
  endingAssets={hands,flexedHands,brushHands,toolsHands};
  const mode=process.argv[2]||'all';if(!['all','detailed','palette-preview','refresh','hands'].includes(mode))throw Error('Use all, detailed, palette-preview, refresh, or hands');
  if(mode==='all'||mode==='detailed')renderDetailed();if(mode==='all'||mode==='palette-preview')renderPalettePreview();
  if(mode==='refresh')refreshInnerEnding();if(mode==='hands')refreshHands();
}
run().catch(error=>{console.error(error);process.exitCode=1;});
