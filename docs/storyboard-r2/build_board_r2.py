#!/usr/bin/env python3
"""Build the offline R2 production board and text exports, using only stdlib."""
from pathlib import Path
import csv
import json
import re
import shutil

BASE = Path(__file__).resolve().parent
REPO = BASE.parents[1] if (BASE.parents[1] / 'docs' / 'app.js').is_file() else BASE.parents[1] / 'ESCFlatland'
HEADINGS = ['剧情', '完整场景与角色', '画风与颜色', '动作与时间节奏', '机位与运镜', '首帧', '尾帧', '连续性与避免']
PRESET_IDS = ['original', 'F2', 'F3', 'F4']


def read(path, default=None):
    p = BASE / path
    return json.loads(p.read_text()) if p.exists() else default


def safe_prompt(text):
    text = re.sub(r'R1A', '颗粒哑光平涂与有机连续色层', str(text), flags=re.I)
    return re.sub(r'\bGift\b', '内在可能性色层', text, flags=re.I)


def prompt_for_palette(text, preset, colors):
    text = safe_prompt(text)
    if preset == 'original':
        return text
    text = text.replace('纯白#FFFFFF', '__PURE_WHITE__')
    names = {
        'F2': dict(paper='奶油白', blue='芥末黄', ink='石墨深灰', night='灰绿暗色', teal='灰绿', lavender='浅灰绿', coral='珊瑚', gold='芥末亮黄'),
        'F3': dict(paper='奶油白', blue='青绿', ink='炭黑', night='暗青绿', teal='浅青绿', lavender='暖灰绿', coral='鲑红', gold='暖赭黄'),
        'F4': dict(paper='纸灰', blue='橄榄绿', ink='深褐', night='深褐暗色', teal='灰橄榄', lavender='灰粉褐', coral='砖红', gold='暖赭'),
    }[preset]
    aliases = {'暖金日光': 'gold', '暖纸石材': 'paper', '外部白底': 'paper', '蓝色建筑': 'blue', '深墨蓝': 'ink', '暖纸白': 'paper',
               '钴蓝': 'blue', '深紫': 'night', '青蓝': 'teal', '薰衣草': 'lavender', '珊瑚': 'coral', '暖金': 'gold',
               '金色': 'gold', '白底': 'paper', '白色': 'paper', '蓝色': 'blue', '黑色': 'ink', '深蓝影': 'ink'}
    pattern = '|'.join(re.escape(x) for x in sorted(aliases, key=len, reverse=True))
    def replace(match):
        word = match.group(1)
        key = aliases[word]
        suffix = '底' if word.endswith('白底') or word == '白底' else ''
        suffix += '建筑' if word == '蓝色建筑' else ''
        suffix += '日光' if word == '暖金日光' else ''
        return names[key] + colors[key].upper() + suffix
    text = re.sub('(' + pattern + r')(?:#[0-9a-fA-F]{6})?', replace, text)
    original_hex = {'0754ee': 'blue', 'f5f1e6': 'paper', '121d2f': 'ink', '241936': 'night', '519fb3': 'teal',
                    'ae96cf': 'lavender', 'ee9884': 'coral', 'edbf70': 'gold', 'ffffff': 'paper', 'f5edda': 'paper',
                    '286ac2': 'blue', '14376a': 'ink', 'e3ba80': 'gold', '000000': 'ink'}
    return re.sub(r'#([0-9a-fA-F]{6})', lambda m: colors[original_hex[m.group(1).lower()]].upper() if m.group(1).lower() in original_hex else m.group(0), text).replace('__PURE_WHITE__', '纯白#FFFFFF')


def image_path(value):
    return value.get('src', value.get('image', value.get('file', ''))) if isinstance(value, dict) else (value or '')


def art_pairs():
    raw = read('art-pairs.json', {})
    rows = raw if isinstance(raw, list) else raw.get('pairs', raw.get('artPairs', raw.get('items', [])))
    result = []
    for row in rows:
        pair = dict(row)
        pair['shotId'] = row.get('shotId', row.get('shot', '001B'))
        pair['palette'] = row.get('palette', row.get('preset', row.get('style', 'F3')))
        pair['id'] = row.get('id', pair['palette'] + '-' + pair['shotId'])
        pair['title'] = row.get('title', pair['shotId'] + ' · ' + pair['palette'] + '手绘候选')
        images = row.get('images', {})
        pair['startImage'] = image_path(row.get('startImage', row.get('firstImage', row.get('start', images.get('start', '')))))
        pair['endImage'] = image_path(row.get('endImage', row.get('lastImage', row.get('end', images.get('end', '')))))
        pair['fullPrompt'] = safe_prompt(row.get('fullPrompt', ''))
        pair['ready'] = bool(pair['startImage'] and pair['endImage'] and all((BASE / pair[k]).is_file() for k in ['startImage', 'endImage']))
        if pair['fullPrompt']:
            assert re.findall(r'【([^】]+)】', pair['fullPrompt']) == HEADINGS, (pair['id'], 'fullPrompt needs the eight complete sections')
        pair['selectable'] = pair['ready'] and bool(pair['fullPrompt'])
        result.append(pair)
    return result


def write_csv(path, shots, preset):
    with path.open('w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, lineterminator='\n')
        writer.writerow(['子镜ID', '母镜', '开始秒', '结束秒', '时长秒', '内容', '动作', '机位', '首帧', '尾帧', '代码首帧', '代码尾帧', '配色', '完整视频提示词'])
        for s in shots:
            writer.writerow([s['id'], s['parentId'], s['start'], s['end'], s['duration'], s['content'], s['action'], s['camera'],
                             s['firstFrameDescription'], s['lastFrameDescription'], s['firstImage'], s['lastImage'], preset, s['prompts'][preset]])


TEMPLATE = r'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>平面国 · 分镜制作表</title>
<style>
:root{color-scheme:light;--paper:#f7f4ec;--panel:#fffdf7;--ink:#203148;--muted:#637182;--line:#d9ddd9;--blue:#23569c;font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink)}button,input,select,textarea{font:inherit;color:inherit}button,a,select{touch-action:manipulation}button{cursor:pointer}a{color:var(--blue);text-underline-offset:3px}button,select,.button-link{border:1px solid var(--line);border-radius:6px;background:var(--panel);padding:8px 13px;font-size:13px;text-decoration:none}button:hover,.button-link:hover{border-color:var(--blue)}button:focus-visible,a:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--blue);outline-offset:3px}button[aria-pressed=true]{background:var(--blue);color:white}.wrap{max-width:1600px;padding:26px 30px 70px;margin:auto}header h1{font-size:25px;margin:0 0 5px;font-weight:600}header p{margin:0 0 18px;font-size:13px;color:var(--muted)}.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 0 20px;border-bottom:1px solid var(--line)}.toolbar label{font-size:13px}.swatches{display:flex;gap:3px}.swatches span{width:17px;height:22px;display:block;border:1px solid #2031481c}.layout{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:26px;align-items:start;margin-top:24px}section{min-width:0}.current-header{display:flex;justify-content:space-between;gap:12px;align-items:start}h2{font-size:20px;margin:0 0 12px}h3{font-size:15px;margin:0 0 12px}.meta,figcaption{font-size:12px;color:var(--muted)}.meta{margin-bottom:14px}.source-chooser{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:16px 0 10px}.frames{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:0}figure button{padding:0;display:block;width:100%;border:1px solid var(--line);overflow:hidden;background:#eeece5}figure img{display:block;width:100%;aspect-ratio:1280/760;object-fit:contain}figcaption{margin:6px 0}.target{font-size:12px;line-height:1.8;margin:8px 0 0}.target strong{display:block;font-size:11px;color:var(--muted);font-weight:500}.prompt-heading{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-top:28px}.prompt-heading h3{margin:0}.prompt-actions{display:flex;gap:7px;flex-wrap:wrap}.prompt-actions button{padding:6px 10px}.prompt-box{display:block;width:100%;height:auto;min-height:500px;resize:none;overflow:hidden;white-space:pre-wrap;font:14px/1.95 ui-monospace,"SFMono-Regular","PingFang SC",monospace;padding:22px;background:var(--panel);border:1px solid #b8c7d6;border-radius:8px;margin:12px 0 6px;tab-size:2}.copy-status{font-size:12px;min-height:1.7em;color:var(--blue)}.overview{position:sticky;top:18px;border:1px solid var(--line);background:var(--panel);border-radius:8px;overflow:hidden}.overview h2{font-size:15px;padding:14px 14px 3px;margin:0}.overview>p{font-size:11px;color:var(--muted);padding:0 14px;margin:0 0 12px}.table-scroll{max-height:calc(100vh - 116px);overflow:auto}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;color:var(--muted);font-weight:500;position:sticky;top:0;background:var(--panel);z-index:1}td,th{padding:8px 7px;border-top:1px solid var(--line);vertical-align:top}tbody tr{cursor:pointer}tbody tr:hover{background:#edf2f7}tbody tr[aria-selected=true]{background:#e2ebf7}td:first-child{white-space:nowrap;font-weight:600;color:var(--blue)}td .range{font-size:10px;font-weight:400;color:var(--muted);display:block}.thumbs{display:grid;grid-template-columns:1fr 1fr;gap:3px;width:112px}.thumbs img{width:54px;height:34px;object-fit:contain;background:#e8e7df}.frame-kind{font-size:9px;color:var(--muted)}.gallery-section{border-top:1px solid var(--line);margin-top:30px;padding-top:22px}.gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.gallery .card{border:1px solid var(--line);padding:10px;background:var(--panel);border-radius:7px}.gallery .card.selected{border-color:var(--blue);box-shadow:0 0 0 1px var(--blue)}.pair-images{display:grid;grid-template-columns:1fr 1fr;gap:5px}.pair-images img{width:100%;aspect-ratio:1280/760;object-fit:contain;display:block}.card h4{font-size:12px;margin:7px 0}.card p{font-size:11px;color:var(--muted);margin:6px 0}.card button{font-size:11px;padding:6px 9px}.previews{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.previews img{width:100%;display:block;aspect-ratio:1280/760;object-fit:contain}.previews button{padding:0;overflow:hidden;display:block;width:100%}.previews figcaption{margin-top:5px}.downloads{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}dialog{width:min(1400px,96vw);max-height:96vh;padding:16px;background:var(--paper);border:1px solid var(--line)}dialog::backdrop{background:#142741b0}dialog img{display:block;max-width:100%;max-height:84vh;margin:auto;object-fit:contain}.dialog-top{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:10px}[hidden]{display:none!important}@media(max-width:1100px){.layout{grid-template-columns:minmax(0,1fr) 340px;gap:18px}.wrap{padding:20px 18px 50px}.thumbs{width:84px}.thumbs img{width:40px;height:27px}.gallery,.previews{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:780px){.layout{display:flex;flex-direction:column}.overview{position:static;width:100%;order:-1}.table-scroll{max-height:310px}.current{width:100%}.frames{grid-template-columns:1fr}.gallery,.previews{grid-template-columns:repeat(2,minmax(0,1fr))}.prompt-box{padding:15px;font-size:13px}header h1{font-size:21px}}
</style></head><body><div class="wrap">
<header><h1>平面国 · 分镜制作表</h1><p id="timing-note">__TIMING_NOTE__</p></header>
<div class="toolbar"><label for="version-select">版本</label><select id="version-select"></select><label for="palette-select">配色</label><select id="palette-select"></select><div class="swatches" id="swatches" aria-label="当前配色"></div><a class="button-link" href="#character-assets">角色素材 ↓</a><a id="animation-link" class="button-link" href="../workbench.html" target="_blank" rel="noopener">动画工作台 · 精调颜色 ↗</a><button id="download-all">下载本方案全部TXT</button><button id="download-csv">下载CSV</button><button id="copy-all">复制本版全部分镜</button></div>
<div class="layout"><main class="current" id="current">
<div class="current-header"><h2 id="current-title"></h2><span id="current-count" class="meta"></span></div><div class="meta" id="current-time"></div><p id="current-content"></p>
<div class="source-chooser"><label for="source-select">画面</label><select id="source-select"></select></div>
<div class="frames"><figure><button id="first-open"><img id="first-image" alt=""></button><figcaption id="first-caption"></figcaption><p class="target"><strong>首帧</strong><span id="first-description"></span></p></figure><figure><button id="last-open"><img id="last-image" alt=""></button><figcaption id="last-caption"></figcaption><p class="target"><strong>尾帧</strong><span id="last-description"></span></p></figure></div>
<div class="prompt-heading"><h3 id="prompt-title">当前镜完整视频提示词</h3><div class="prompt-actions"><button id="select-prompt">全选</button><button id="copy-prompt">复制整段</button><button id="download-prompt">下载本段TXT</button></div></div>
<textarea id="full-prompt" class="prompt-box" readonly aria-label="当前镜完整视频提示词，包含八个中文标题栏" spellcheck="false"></textarea><p id="copy-status" class="copy-status" role="status" aria-live="polite"></p>
<section class="gallery-section" id="character-assets"><h3>角色素材</h3><div id="character-gallery" class="previews"></div></section>
<section class="gallery-section"><h3>家庭配色</h3><div id="family-gallery" class="gallery"></div></section>
<section class="gallery-section"><h3>配色对照</h3><div id="palette-previews" class="previews"></div></section>
<section class="gallery-section"><h3>下载</h3><div class="downloads"><a class="button-link" href="首尾帧图像生成原词.txt" download>图像原词TXT</a><a class="button-link" href="视频提示词-original.txt" download>原配色视频词TXT</a><a class="button-link" href="分镜制作表-original.csv" download>原配色CSV</a></div></section>
</main><aside class="overview" aria-label="当前版本全部分镜"><h2 id="overview-title">全部分镜</h2><div class="table-scroll"><table><thead><tr><th>镜号／时间</th><th>内容</th><th>首帧／尾帧</th></tr></thead><tbody id="overview-body"></tbody></table></div></aside></div>
</div><dialog id="image-dialog"><div class="dialog-top"><span id="image-label"></span><button id="image-close">关闭</button></div><img id="image-large" alt=""></dialog>
<script id="board-data" type="application/json">__DATA__</script>
<script src="palette.js"></script><script>
(()=>{'use strict';
const data=JSON.parse(document.getElementById('board-data').textContent),$=id=>document.getElementById(id),P=window.FlatlandPalette;
const available=data.artPairs.filter(p=>p.selectable),choices=new Map();
const requested=new URLSearchParams(location.search);
let version=data.versions.some(v=>v.id===requested.get('version'))?requested.get('version'):'routine',shots=data.versions.find(v=>v.id===version).shots,byId=new Map(shots.map(s=>[s.id,s]));
let palette=requested.get('palette')||'F2',current=(shots.find(s=>s.id===requested.get('shot')||s.artSourceShotId===requested.get('shot'))||shots[0]).id;
if(!data.presets.some(p=>p.id===palette))palette='F2';
const time=n=>Number(n).toFixed(3),preset=()=>data.presets.find(p=>p.id===palette);
function pairsFor(id){const shot=byId.get(id);return available.filter(p=>p.shotId===shot?.artSourceShotId&&p.versions.includes(version));}
function preferred(id){return pairsFor(id).find(p=>p.palette===palette)||pairsFor(id).find(p=>p.palette==='neutral');}
function selectedPair(id){const value=choices.get(id);if(value==='code')return null;return pairsFor(id).find(p=>p.id===value&&(p.palette===palette||p.palette==='neutral'))||null;}
function activePrompt(shot){return shot.prompts[palette];}
function imageDialog(src,label){$('image-large').src=src;$('image-large').alt=label;$('image-label').textContent=label;$('image-dialog').showModal();}
function download(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function copy(text){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw Error('copy');}$('copy-status').textContent='已复制完整提示词。';}catch{$('full-prompt').focus();$('full-prompt').select();$('copy-status').textContent='已全选，请按 ⌘C / Ctrl+C。';}}
function allText(){return shots.map(s=>activePrompt(s)).join('\n\n'+'='.repeat(64)+'\n\n');}
function resizePrompt(){const e=$('full-prompt');e.style.height='auto';e.style.height=(e.scrollHeight+4)+'px';}
function choose(id,pair){current=(shots.find(s=>s.id===id||s.artSourceShotId===id)||shots[0]).id;id=current;if(!pair&&byId.get(id)?.artSourceShotId==='015A'&&!choices.has(id))pair=pairsFor(id)[0];if(pair){if(pair.palette!=='neutral'){palette=pair.palette;P?.setConfig({preset:palette,colors:{}});}choices.set(id,pair.id);}render();}
function renderOverview(){const body=$('overview-body');body.replaceChildren();for(const s of shots){const pair=selectedPair(s.id),tr=document.createElement('tr');tr.tabIndex=0;tr.setAttribute('aria-selected',String(s.id===current));const a=document.createElement('td');a.textContent=s.id;const range=document.createElement('span');range.className='range';range.textContent=time(s.start)+'–'+time(s.end)+'s';a.append(range);const b=document.createElement('td');b.textContent=s.title;const c=document.createElement('td'),imgs=document.createElement('div');imgs.className='thumbs';for(const [src,label] of [[pair?.startImage||s.firstImage,'首帧'],[pair?.endImage||s.lastImage,'尾帧']]){const img=document.createElement('img');img.src=src;img.alt=s.id+label;img.loading='lazy';imgs.append(img);}const kind=document.createElement('div');kind.className='frame-kind';kind.textContent=pair?(pair.palette==='neutral'?'':pair.palette+' · ')+'手绘帧':'动作帧';c.append(imgs,kind);tr.append(a,b,c);const go=()=>{choose(s.id);if(innerWidth<781)$('current').scrollIntoView({block:'start'});};tr.addEventListener('click',go);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});body.append(tr);}}
function artGallery(container,pairs){container.replaceChildren();for(const pair of pairs){const card=document.createElement('article');card.className='card'+(pair.palette===palette?' selected':'');const images=document.createElement('div');images.className='pair-images';for(const [src,label] of [[pair.startImage,'首帧'],[pair.endImage,'尾帧']]){const img=document.createElement('img');img.src=src;img.alt=pair.title+label;img.loading='lazy';img.addEventListener('click',()=>imageDialog(src,pair.title+' · '+label));images.append(img);}const title=document.createElement('h4');title.textContent=pair.title;const button=document.createElement('button');button.textContent='查看';button.addEventListener('click',()=>{setPalette(pair.palette,false);choose(pair.shotId,pair);$('current').scrollIntoView({block:'start'});});card.append(images,title,button);container.append(card);}}
function renderAssets(){const grid=$('character-gallery');for(const asset of data.characterAssets){const fig=document.createElement('figure'),button=document.createElement('button'),img=document.createElement('img');img.src=asset.image;img.alt=asset.title;img.loading='lazy';button.append(img);button.setAttribute('aria-label','放大 '+asset.title);button.addEventListener('click',()=>imageDialog(asset.image,asset.title));const caption=document.createElement('figcaption');caption.textContent=asset.title;const link=document.createElement('a');link.href=asset.image;link.download=asset.image.split('/').pop();link.textContent=asset.originalImage?'下载当前 PNG':'下载原图 PNG';fig.append(button,caption,link);if(asset.originalImage){const original=document.createElement('a');original.href=asset.originalImage;original.download=asset.originalImage.split('/').pop();original.textContent='原图 PNG';original.style.marginLeft='12px';fig.append(original);}grid.append(fig);}}
function renderPreviews(){const grid=$('palette-previews');grid.replaceChildren();for(const frame of data.paletteFrames.filter(f=>(f.preset||f.palette)===palette&&(!f.version||f.version===version))){const fig=document.createElement('figure'),b=document.createElement('button'),img=document.createElement('img');img.src=frame.src;img.alt=frame.title+' · '+palette+'动作帧';img.loading='lazy';b.append(img);b.addEventListener('click',()=>imageDialog(frame.src,img.alt));const caption=document.createElement('figcaption');caption.textContent=frame.title+' · '+Number(frame.playbackSeconds).toFixed(0)+'s · '+palette+'动作帧';fig.append(b,caption);grid.append(fig);}}
function render(){const s=byId.get(current),pair=selectedPair(current);$('current-title').textContent=s.id+' · '+s.title;$('current-count').textContent=(shots.indexOf(s)+1)+' / '+shots.length;$('current-time').textContent='自动预览 '+time(s.start)+'–'+time(s.end)+'秒 · 本段'+time(s.duration)+'秒 · 母镜'+s.parentId;$('current-content').textContent=s.content;
const source=$('source-select');source.replaceChildren();const code=document.createElement('option');code.value='code';code.textContent='动作帧';source.append(code);for(const item of pairsFor(current)){const o=document.createElement('option');o.value=item.id;o.textContent=item.palette==='neutral'?'手绘帧':'手绘帧 · '+item.palette;source.append(o);}source.value=pair?.id||'code';
for(const [pos,src,description] of [['first',pair?.startImage||s.firstImage,s.firstFrameDescription],['last',pair?.endImage||s.lastImage,s.lastFrameDescription]]){$(pos+'-image').src=src;$(pos+'-image').alt=s.id+' '+(pos==='first'?'首帧':'尾帧');$(pos+'-caption').textContent=(pair?'手绘帧':'动作帧')+' · '+(pos==='first'?'首帧':'尾帧');$(pos+'-description').textContent=description;$(pos+'-open').onclick=()=>imageDialog(src,$(pos+'-caption').textContent+' · '+s.id);}
$('prompt-title').textContent='完整视频提示词';$('full-prompt').value=activePrompt(s);$('copy-status').textContent='';resizePrompt();renderOverview();artGallery($('family-gallery'),available.filter(p=>p.shotId==='001B'));renderPreviews();
$('overview-title').textContent='全部分镜 · '+shots.length+'段';$('version-select').value=version;const url=new URL(location.href);url.searchParams.set('version',version);url.searchParams.set('palette',palette);url.searchParams.set('shot',current);window.history?.replaceState(null,'',url);const animation=new URL($('animation-link').href,location.href);animation.searchParams.set('version',version);animation.searchParams.set('palette',palette);animation.searchParams.set('t',s.start.toFixed(3));animation.searchParams.set('mode','interactive');$('animation-link').href=animation.href;
$('swatches').replaceChildren();for(const color of Object.values(preset().colors)){const swatch=document.createElement('span');swatch.style.background=color;swatch.title=color;$('swatches').append(swatch);}$('palette-select').value=palette;}
function setPalette(id,auto=true){palette=id;const config=P?.getConfig(),colors=config?.preset===id?config.colors:{};const saved=P?.setConfig({preset:id,colors});if(auto){for(const s of shots){const pair=preferred(s.id);if(pair)choices.set(s.id,pair.id);else choices.delete(s.id);}}render();if(saved===false)$('copy-status').textContent='配色仅在本次打开时保留。';}
for(const item of data.versions){const o=document.createElement('option');o.value=item.id;o.textContent=item.label;$('version-select').append(o);}$('version-select').addEventListener('change',e=>{version=e.target.value;shots=data.versions.find(v=>v.id===version).shots;byId=new Map(shots.map(s=>[s.id,s]));current=shots[0].id;for(const shot of shots){const pair=preferred(shot.id);if(pair)choices.set(shot.id,pair.id);}render();});
for(const item of data.presets){const o=document.createElement('option');o.value=item.id;o.textContent=item.label;$('palette-select').append(o);}$('palette-select').addEventListener('change',e=>setPalette(e.target.value));$('source-select').addEventListener('change',e=>{const pair=available.find(p=>p.id===e.target.value);if(pair)choose(current,pair);else{choices.set(current,'code');render();}});
$('select-prompt').addEventListener('click',()=>{$('full-prompt').focus();$('full-prompt').select();});$('copy-prompt').addEventListener('click',()=>copy($('full-prompt').value));$('copy-all').addEventListener('click',()=>copy(allText()));$('download-prompt').addEventListener('click',()=>download(current+'-'+palette+'-视频提示词.txt',$('full-prompt').value));$('download-all').addEventListener('click',()=>download(version+'-视频提示词-'+palette+'.txt',allText()));$('download-csv').addEventListener('click',()=>{const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"',rows=[['子镜ID','开始秒','结束秒','时长秒','内容','首帧','尾帧','来源','完整视频提示词'],...shots.map(s=>{const pair=selectedPair(s.id);return[s.id,s.start,s.end,s.duration,s.content,pair?.startImage||s.firstImage,pair?.endImage||s.lastImage,pair?'手绘帧':'动作帧',activePrompt(s)];})];download('分镜制作表-'+palette+'.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');});
$('image-close').addEventListener('click',()=>$('image-dialog').close());window.addEventListener('resize',resizePrompt);
if(location.protocol==='file:')$('animation-link').href=data.localAnimationHref;else $('animation-link').href=new URL('../workbench.html',location.href).href;
if(palette!=='original')for(const shot of shots){const pair=preferred(shot.id);if(pair)choices.set(shot.id,pair.id);}
if(byId.get(current)?.artSourceShotId==='015A'&&!choices.has(current)){const pair=pairsFor(current)[0];if(pair){if(pair.palette!=='neutral')palette=pair.palette;choices.set(current,pair.id);}}
renderAssets();render();
})();
</script></body></html>'''


def build():
    source = read('shots-detailed.json')
    detailed = read('frames/detailed/manifest.json')
    previews = read('frames/palette-preview/manifest.json')
    assert source and detailed and previews
    versions = [dict(v, shots=[dict(s) for s in v['shots']]) for v in source['versions']]
    shots = [s for v in versions for s in v['shots']]
    for version in versions:
        assert abs(sum(s['duration'] for s in version['shots']) - version['duration']) < .001
    lookup = {(f.get('shotId', f.get('shot')), f['position']): f for f in detailed['frames']}
    presets = [{'id': p['id'], 'label': {'original': '原配色', 'F2': 'F2 · 奶油白／芥末黄／灰绿／珊瑚', 'F3': 'F3 · 奶油白／青绿／鲑红／炭黑', 'F4': 'F4 · 纸灰／橄榄／砖红／深褐'}[p['id']], 'colors': p['colors']} for p in previews['presets']]
    assert [p['id'] for p in presets] == PRESET_IDS
    for shot in shots:
        shot['firstImage'] = lookup[(shot['id'], 'start')]['src']
        shot['lastImage'] = lookup[(shot['id'], 'end')]['src']
        for key in ['firstImage', 'lastImage']:
            assert (BASE / shot[key]).is_file(), shot[key]
        assert re.findall(r'【([^】]+)】', shot['fullPrompt']) == HEADINGS, shot['id']
        shot['prompts'] = {p['id']: safe_prompt(shot['fullPrompt']) if shot.get('paletteInvariant') else prompt_for_palette(shot['fullPrompt'], p['id'], p['colors']) for p in presets}
        for text in shot['prompts'].values():
            assert not re.search(r'R1A|\bGift\b', text, re.I)
            assert re.findall(r'【([^】]+)】', text) == HEADINGS
    pairs = art_pairs()
    for pair in pairs:
        pair['versions'] = ['rhythm'] if pair['shotId'] in ['007A', '007B'] else ['rhythm', 'routine']
        # Drawings remain selectable; the current shot text always supplies the full video prompt.
        if pair['shotId'] == '015A':
            pair['startImage'] = 'frames/ending/POV-start-fair-r19.png'
            pair['endImage'] = 'frames/ending/POV-end-fair-r19.png'
    asset_order = ['ALT-D-girl-running', 'ALT-E-girl-breathing', 'ALT-C-metamorphosis', 'ALT-B-folded-plane']
    titles = {'ALT-B-folded-plane': '平面弯折 · 深度生长', 'ALT-C-metamorphosis': '几何轮廓 · 手绘人形', 'ALT-D-girl-running': '齐刘海女孩 · 持笔奔跑', 'ALT-E-girl-breathing': '齐刘海女孩 · 停下喘气'}
    character_assets = []
    for stem in asset_order:
        original = 'frames/alternative/' + stem + '.png'
        fair = 'frames/alternative/' + stem + '-fair-r19.png'
        asset = {'title': titles[stem], 'image': fair if (BASE / fair).is_file() else original}
        if asset['image'] != original:
            asset['originalImage'] = original
        character_assets.append(asset)
    for name, title in [('start', '第一人称 · 双手初现'), ('end', '第一人称 · 看清双手')]:
        character_assets.append({'title': title, 'image': 'frames/ending/POV-' + name + '-fair-r19.png', 'originalImage': 'frames/ending/POV-' + name + '.png'})
    assert all((BASE / asset['image']).is_file() for asset in character_assets)
    alternatives = character_assets[:4]
    payload = {'title': source['title'], 'duration': versions[1]['duration'], 'headings': HEADINGS, 'shots': versions[1]['shots'], 'versions': versions, 'presets': presets,
               'paletteFrames': previews['frames'], 'artPairs': pairs, 'characterAssets': character_assets,
               'localAnimationHref': (REPO / 'docs' / 'workbench.html').as_uri()}
    for version in versions:
        for preset in PRESET_IDS:
            write_csv(BASE / ('分镜制作表-' + version['id'] + '-' + preset + '.csv'), version['shots'], preset)
            (BASE / ('视频提示词-' + version['id'] + '-' + preset + '.txt')).write_text(('\n\n' + '=' * 64 + '\n\n').join(s['prompts'][preset] for s in version['shots']) + '\n')
    for preset in PRESET_IDS:
        write_csv(BASE / ('分镜制作表-' + preset + '.csv'), versions[1]['shots'], preset)
        (BASE / ('视频提示词-' + preset + '.txt')).write_text(('\n\n' + '=' * 64 + '\n\n').join(s['prompts'][preset] for s in versions[1]['shots']) + '\n')
    records = []
    original_file = BASE / '首尾帧美术生成提示词.json'
    if original_file.exists():
        records.append('来源文件：首尾帧美术生成提示词.json\n以下原样保留该文件文本；是否为计划词或最终实际调用词，以原记录status及字段为准。\n\n' + original_file.read_text())
    if (BASE / 'art-pairs.json').exists():
        records.append('来源文件：art-pairs.json\n图对视频fullPrompt与图像生成词不混称。以下原样保留完整记录用于溯源。\n\n' + (BASE / 'art-pairs.json').read_text())
    (BASE / '首尾帧图像生成原词.txt').write_text(('\n\n' + '=' * 64 + '\n\n').join(records).rstrip() + '\n')
    encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    timing_note = '自动预览时长：' + '／'.join(('A' if v['id'] == 'rhythm' else 'B') + ' ' + format(v['duration'], 'g') + '秒' for v in versions) + '；互动时长随点击、等待与长按变化。'
    output = TEMPLATE.replace('__DATA__', encoded).replace('__TIMING_NOTE__', timing_note)
    assert 'fetch(' not in output and '<details' not in output
    (BASE / '分镜制作表.html').write_text(output)
    shutil.copyfile(REPO / 'docs' / 'palette.js', BASE / 'palette.js')
    report = {'shots': len(shots), 'versions': [{'id':v['id'],'shots':len(v['shots']),'duration':v['duration']} for v in versions], 'codeFrames': len(lookup), 'paletteFrames': len(previews['frames']),
              'promptVariants': sum(len(s['prompts']) for s in shots), 'completeArtPairs': sum(p['selectable'] for p in pairs),
              'pendingArtPairs': [p['id'] for p in pairs if not p['selectable']], 'alternativeImages': len(alternatives), 'htmlBytes': len(output.encode())}
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    build()
