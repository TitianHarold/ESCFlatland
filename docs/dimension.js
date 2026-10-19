/* World-anchored growth and thin XYZ actors share one perspective renderer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./character-geometry.js'),require('./palette.js'),require('./restraint.js'));
  else root.FlatlandDimension = factory(root.FlatlandCharacters,root.FlatlandPalette,root.FlatlandRestraint);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Characters,Palette,Restraint) {
  'use strict';
  const anchor = Object.freeze({x: 0, y: 0, z: 0});
  const defaultProjection = Object.freeze({x: 0, y: 0, zoom: 1.25, tilt: 0, yaw: 0, focal: 1600, screenY: .57});
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (t, a, b) => { const q = clamp((t - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
  const colors = Palette.dimension, street = Palette.street;
  const radius = 75;
  const source = Characters.geometry.childPoints;
  const sourceRadius = Math.max(...source.map(p => Math.hypot(p[0], p[1])));
  const outline = source.map(([x, y]) => [x * radius / sourceRadius, y * radius / sourceRadius]);
  const minX = Math.min(...outline.map(p => p[0])), maxX = Math.max(...outline.map(p => p[0]));
  const span = maxX - minX;
  const materialSize = 512;
  let materialCanvas, materialContext, materialTick = null;
  let noiseSeed = 18473;
  const grain = Array.from({length: 1900}, () => {
    const random = () => {noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0; return noiseSeed / 4294967296;};
    return [random() * materialSize, random() * materialSize, .4 + random() * .65, random() < .5];
  });
  // One procedural moving field is shared by both sheets; triangle boundaries never choose pigment.
  function sharedMaterial(clock) {
    if (!materialCanvas) {
      materialCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(materialSize, materialSize)
        : typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!materialCanvas) return null;
      materialCanvas.width = materialCanvas.height = materialSize;
      materialContext = materialCanvas.getContext('2d');
    }
    const tick = Math.floor(clock * 24);
    if (tick === materialTick) return materialCanvas;
    materialTick = tick;
    const c = materialContext, scale = materialSize / (radius * 2);
    c.setTransform(1,0,0,1,0,0);c.fillStyle=colors.blue;c.fillRect(0,0,materialSize,materialSize);
    c.setTransform(scale,0,0,scale,materialSize/2,materialSize/2);
    c.save();c.beginPath();
    const inset=outline.map(([x,y])=>[x*.83,y*.83]);
    c.moveTo((inset[4][0]+inset[0][0])/2,(inset[4][1]+inset[0][1])/2);
    inset.forEach((point,i)=>{const next=inset[(i+1)%5];c.quadraticCurveTo(point[0],point[1],(point[0]+next[0])/2,(point[1]+next[1])/2);});
    c.closePath();c.fillStyle=colors.ink;c.fill();c.clip();
    const phase=clock*.07,drift=4*Math.sin(phase),bend=5*Math.cos(phase*.77);
    function band(y,width,color,offset) {
      c.beginPath();c.moveTo(-110,y+drift);
      c.bezierCurveTo(-46,y-49+bend+offset,-26,y+37+drift,30,y+15);
      c.bezierCurveTo(65,y+4-bend,85,y-15+drift,110,y-10);
      c.lineTo(110,y-10+width);
      c.bezierCurveTo(85,y-15+drift+width,65,y+4-bend+width,30,y+15+width);
      c.bezierCurveTo(-26,y+37+drift+width,-46,y-49+bend+offset+width,-110,y+width+drift);
      c.closePath();c.fillStyle=color;c.fill();
    }
    band(-43,12,colors.coral,-4);band(-27,15,colors.lilac,1);band(12,24,colors.teal,6);
    c.restore();c.setTransform(1,0,0,1,0,0);
    for (const light of [false,true]) {
      c.fillStyle=light?'rgba(247,229,216,.13)':'rgba(20,15,39,.12)';
      for(const [x,y,size,isLight] of grain)if(isLight===light)c.fillRect(x,y,size,size);
    }
    return materialCanvas;
  }
  function projection(camera, viewport) {
    const c = {...defaultProjection, ...camera};
    for (const key of ['x', 'y', 'zoom', 'tilt', 'yaw']) c[key] = finite(c[key], defaultProjection[key]);
    c.zoom = clamp(c.zoom, .15, 5); c.tilt = clamp(c.tilt, 0, 1.3);
    const scale = Math.min(viewport.w / 1280, viewport.h / 760);
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), ct = Math.cos(c.tilt), st = Math.sin(c.tilt);
    const distance = defaultProjection.focal / c.zoom;
    return point => {
      const dx = point[0] - c.x, dy = point[1] - c.y, z = point[2];
      const x = dx * cy - dy * sy, y = dx * sy + dy * cy;
      const depth = distance - y * st - z * ct;
      if (depth < 50) return null;
      const q = defaultProjection.focal * scale / depth;
      return [viewport.w / 2 + x * q, viewport.h * finite(c.screenY,defaultProjection.screenY) + (y * ct - z * st) * q, depth, q];
    };
  }
  function face(list, points, color, alpha = 1) { list.push({points, color, alpha}); }
  function edge(list, points, color, width = 1, alpha = 1) { list.push({points, color, width, alpha, line: true}); }
  function surface(list,points,color,kind='stucco',alpha=1){list.push({points,color,alpha,surface:kind});}
  function box(list,x0,y0,x1,y1,z0,z1,top,front,side,kind='stucco'){
    surface(list,[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],top,kind);
    surface(list,[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],front,kind);
    surface(list,[[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]],side,kind);
    surface(list,[[x1,y1,z0],[x1,y0,z0],[x1,y0,z1],[x1,y1,z1]],side,kind);
    surface(list,[[x1,y0,z0],[x0,y0,z0],[x0,y0,z1],[x1,y0,z1]],front,kind);
  }
  function tint(a,b,q){
    const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const aa=rgb(a),bb=rgb(b);
    return '#'+aa.map((v,i)=>Math.round(mix(v,bb[i],q)).toString(16).padStart(2,'0')).join('');
  }
  const environment=[];
  const warmWall=tint(colors.paper,street.sunPatch,.34),coolWall=tint(street.building[1],colors.lilac,.25);
  const warmStone=tint(colors.paper,street.curb[0],.35),shadowStone=tint(street.curb[0],street.building[1],.42);
  // Small physical pavers sort against walls and props; a single large ground card cannot.
  for(let x=-1800;x<1800;x+=180)for(let y=-1100;y<165;y+=126){
    const right=x+180,end=Math.min(165,y+126),variation=((x/180+y/126)%3+3)%3;
    surface(environment,[[x+1,y+1,0],[right-1,y+1,0],[right-1,end-1,0],[x+1,end-1,0]],tint(warmStone,street.sunPatch,variation*.025),'stone');
  }
  for(let x=-2000;x<2000;x+=250)for(let y=165;y<1250;y+=210){
    surface(environment,[[x,y,-18],[x+250,y,-18],[x+250,y+210,-18],[x,y+210,-18]],street.road,'asphalt');
  }
  for(let x=-1800;x<1800;x+=150){
    box(environment,x+1,165,x+149,190,-18,0,warmStone,street.curb[1],street.curb[2],'stone');
    if(x%450===0)box(environment,x+36,190,x+115,216,-17.5,-15,street.benchLeg[0],street.benchLeg[1],street.benchLeg[2],'metal');
  }
  // Crosswalk markings and drain slots are on the road plane, not a background image.
  for(let x=-550;x<550;x+=190){
    surface(environment,[[x,340,-17.8],[x+94,340,-17.8],[x+180,850,-17.8],[x+80,850,-17.8]],tint(colors.paper,street.road,.20),'stone');
  }
  for(let i=0;i<7;i++)face(environment,[[300+i*8,200,-14.9],[303+i*8,200,-14.9],[303+i*8,216,-14.9],[300+i*8,216,-14.9]],Palette.industrial);

  function wallPanel(x0,x1,y,z0,z1,color){
    if(x1-x0>.1&&z1-z0>.1)surface(environment,[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],color);
  }
  function aperture(x0,x1,y,z0,z1,base,door=false){
    const recess=door?34:23,back=y-recess;
    // The facade is absent here: reveals and the recessed pane have real XYZ depth.
    surface(environment,[[x0,back,z0],[x1,back,z0],[x1,back,z1],[x0,back,z1]],street.window,'glass');
    surface(environment,[[x0,y,z0],[x0,back,z0],[x0,back,z1],[x0,y,z1]],tint(base,street.building[2],.55));
    surface(environment,[[x1,back,z0],[x1,y,z0],[x1,y,z1],[x1,back,z1]],tint(base,street.sunPatch,.25));
    surface(environment,[[x0,back,z1],[x1,back,z1],[x1,y,z1],[x0,y,z1]],street.building[2]);
    surface(environment,[[x0,y,z0],[x1,y,z0],[x1,back,z0],[x0,back,z0]],warmStone,'stone');
    box(environment,x0-8,y-2,x1+8,y+12,z0-9,z0,warmStone,shadowStone,street.curb[2],'stone');
    const middle=(x0+x1)/2;
    box(environment,middle-2,back,middle+2,y-10,z0,z1,street.windowTrim,street.windowTrim,street.building[2],'metal');
    if(!door)box(environment,x0,back,x1,y-12,(z0+z1)/2-2,(z0+z1)/2+2,street.windowTrim,street.building[1],street.building[2],'metal');
    if(door){
      for(let step=0;step<3;step++){
        const start=y+step*28,z=30-step*10;
        box(environment,x0-18,start,x1+18,start+28,0,z,warmStone,shadowStone,street.curb[2],'stone');
      }
      box(environment,x1+12,y+5,x1+17,y+10,z0+65,z0+100,Palette.gold,street.windowTrim,street.building[2],'metal');
    }
  }
  function building(x0,x1,y0,y1,height,index){
    const base=index%3===1?coolWall:warmWall,side=tint(base,street.building[2],.66);
    surface(environment,[[x0,y0,height],[x1,y0,height],[x1,y1,height],[x0,y1,height]],warmStone,'stone');
    surface(environment,[[x0,y0,0],[x1,y0,0],[x1,y0,height],[x0,y0,height]],side);
    // Split tall sides by floor to keep pigment scale and painter ordering local.
    const floors=3,storey=height/floors;
    for(let floor=0;floor<floors;floor++){
      const z=floor*storey;
      surface(environment,[[x0,y0,z],[x0,y1,z],[x0,y1,z+storey],[x0,y0,z+storey]],side);
      surface(environment,[[x1,y1,z],[x1,y0,z],[x1,y0,z+storey],[x1,y1,z+storey]],tint(base,street.building[1],.38));
      const bays=3,bay=(x1-x0)/bays;
      for(let col=0;col<bays;col++){
        const left=x0+col*bay,right=left+bay,door=floor===0&&col===1;
        const a=left+bay*.23,b=right-bay*.23,low=door?30:z+storey*.20,high=z+storey*.83;
        wallPanel(left,a,y1,z,z+storey,base);wallPanel(b,right,y1,z,z+storey,base);
        wallPanel(a,b,y1,z,door?0:low,base);wallPanel(a,b,y1,high,z+storey,base);
        aperture(a,b,y1,low,high,base,door);
      }
      box(environment,x0-5,y1-3,x1+5,y1+14,z+storey-10,z+storey,warmStone,tint(base,street.building[1],.25),side,'stone');
    }
    const bay=(x1-x0)/3,doorA=x0+bay*1.23,doorB=x0+bay*1.77;
    // Split the plinth around the real doorway instead of painting over a closed wall.
    box(environment,x0-10,y1-8,doorA,y1+15,0,28,shadowStone,side,street.building[2],'stone');
    box(environment,doorB,y1-8,x1+10,y1+15,0,28,shadowStone,side,street.building[2],'stone');
    box(environment,x0-12,y0-8,x1+12,y1+20,height,height+20,warmStone,side,street.building[2],'stone');
    for(let joint=0;joint<3;joint++)edge(environment,[[x0,y1+.3,45+joint*17],[x1,y1+.3,45+joint*17]],tint(base,Palette.navy,.18),.8,.4);
  }
  [[-1800,-1330,-880,-480,560],[-1305,-865,-850,-450,650],[-840,-400,-840,-465,540],
    [-375,45,-900,-490,620],[370,920,-900,-450,680],[945,1540,-960,-500,590]].forEach((b,i)=>building(...b,i));

  function shadow(points,alpha){
    const split=(keepLow)=>{
      const out=[];for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length],inside=p=>keepLow?p[1]<=165:p[1]>=165;
        if(inside(a))out.push(a);
        if(inside(a)!==inside(b)){const u=(165-a[1])/(b[1]-a[1]);out.push([mix(a[0],b[0],u),165]);}
      }return out;
    };
    for(const low of [true,false]){const polygon=split(low);if(polygon.length>2)face(environment,polygon.map(([x,y])=>[x,y,low?.18:-17.7]),street.groundShadow,alpha);}
  }
  // Directional light is baked into palette-derived faces and long ground projections.
  shadow([[-1305,-450],[-865,-450],[-1265,-78],[-1705,-78]],.23);
  shadow([[370,-450],[920,-450],[515,-40],[-35,-40]],.22);

  function limb(a,b,radius){
    const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d),unit=d.map(v=>v/length);
    let u=[unit[1],-unit[0],0];if(Math.hypot(...u)<.01)u=[1,0,0];const ul=Math.hypot(...u);u=u.map(v=>v/ul);
    const v=[unit[1]*u[2]-unit[2]*u[1],unit[2]*u[0]-unit[0]*u[2],unit[0]*u[1]-unit[1]*u[0]];
    const ring=(p,r)=>Array.from({length:5},(_,i)=>p.map((n,k)=>n+r*(Math.cos(i*Math.PI*2/5)*u[k]+Math.sin(i*Math.PI*2/5)*v[k])));
    const lo=ring(a,radius),hi=ring(b,radius*.68);
    for(let i=0;i<5;i++)surface(environment,[lo[i],lo[(i+1)%5],hi[(i+1)%5],hi[i]],street.trunk[i%3],'wood');
  }
  function crown(x,y,z,r,seed){
    const ring=(height,size,offset)=>Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7+offset,rr=r*size*(.9+.09*Math.sin(i*4+seed));return[x+Math.cos(a)*rr,y+Math.sin(a)*rr,z+height*r];});
    const lower=ring(-.4,.72,.16),middle=ring(.16,1,0),top=[x-r*.12,y+r*.03,z+r*.97];
    for(let i=0;i<7;i++){
      const next=(i+1)%7,shade=street.foliage[(i+seed)%street.foliage.length];
      surface(environment,[lower[i],lower[next],middle[i]],shade,'leaf');
      surface(environment,[lower[next],middle[next],middle[i]],street.foliage[(i+seed+2)%street.foliage.length],'leaf');
      surface(environment,[middle[i],middle[next],top],tint(shade,Palette.gold,i<3?.24:.04),'leaf');
    }
    face(environment,lower.slice().reverse(),street.foliageBottom);
    const outline=middle.map(([a,b,c])=>[a-c*.70,b+c*.60]);shadow(outline,.22);
  }
  function tree(x,y,height,seed){
    limb([x,y,0],[x+3,y-2,height*.7],12);
    limb([x+2,y-1,height*.43],[x-47,y+4,height*.82],6);
    limb([x+2,y-1,height*.5],[x+48,y-10,height*.86],6);
    crown(x-42,y+4,height*.77,74,seed);crown(x+46,y-8,height*.80,79,seed+1);crown(x,y-5,height,88,seed+2);
    box(environment,x-31,y-30,x+31,y+30,-1,2,shadowStone,street.curb[1],street.curb[2],'stone');
    shadow([[x-10,y],[x+10,y],[x+10-height*.5,y+height*.6],[x-10-height*.5,y+height*.6]],.3);
  }
  tree(-650,-185,300,0);tree(580,-170,340,2);tree(-1230,-225,275,3);tree(1230,-230,310,1);
  // Ground tiles span too far for mean-depth ordering against small raised actors.
  for(const item of environment){const z=item.points[0][2];if(z<=.6&&item.points.every(point=>Math.abs(point[2]-z)<.001))item.ground=true;}

  const textureSize=256,graySurfaces=new Map(),tintedSurfaces=new Map();
  function makeCanvas(){
    const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(textureSize,textureSize):typeof document!=='undefined'?document.createElement('canvas'):null;
    if(canvas)canvas.width=canvas.height=textureSize;
    return canvas;
  }
  function graySurface(kind){
    if(graySurfaces.has(kind))return graySurfaces.get(kind);
    const canvas=makeCanvas();if(!canvas)return null;const c=canvas.getContext('2d');
    let seed=kind.split('').reduce((n,ch)=>Math.imul(n,31)+ch.charCodeAt(0),5873)>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    if(kind==='pigment'){
      // The same dense, small pigment marks remain legible while the sheets sweep past.
      for(let i=0;i<14500;i++){
        const x=random()*256,y=random()*256;
        c.strokeStyle=i%3?'rgba(245,241,230,.19)':'rgba(24,17,45,.23)';c.lineWidth=.45+random()*.55;
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+random()*4-2,y+random()*4-2,x+random()*4-2,y+random()*4-2);c.stroke();
      }
      graySurfaces.set(kind,canvas);return canvas;
    }
    c.fillStyle='#c5c5c5';c.fillRect(0,0,textureSize,textureSize);
    for(let i=0;i<55;i++){
      const x=random()*256,y=random()*256,r=8+random()*35,g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,random()>.5?'rgba(255,255,255,.21)':'rgba(0,0,0,.13)');g.addColorStop(1,'rgba(128,128,128,0)');
      c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<6700;i++){
      c.fillStyle=random()>.52?'rgba(255,255,255,.19)':'rgba(0,0,0,.18)';
      const size=.25+random()*(kind==='asphalt'?1.5:.9);c.fillRect(random()*256,random()*256,size,size);
    }
    c.lineWidth=kind==='wood'?.75:.4;
    for(let i=0;i<(kind==='wood'?80:110);i++){
      const x=random()*256,y=random()*256,length=kind==='wood'?60+random()*130:2+random()*11;
      c.strokeStyle=random()>.5?'rgba(255,255,255,.13)':'rgba(0,0,0,.13)';c.beginPath();c.moveTo(x,y);
      c.bezierCurveTo(x+length*.3,y-3,x+length*.7,y+3,x+length,y);c.stroke();
    }
    graySurfaces.set(kind,canvas);return canvas;
  }
  function surfaceMaterial(kind,color){
    const key=kind+':'+color;if(tintedSurfaces.has(key))return tintedSurfaces.get(key);
    const gray=graySurface(kind),canvas=makeCanvas();if(!gray||!canvas)return null;
    const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,textureSize,textureSize);
    c.globalCompositeOperation='multiply';c.globalAlpha=.47;c.drawImage(gray,0,0);
    c.globalCompositeOperation='screen';c.globalAlpha=.035;c.drawImage(gray,0,0);
    c.globalCompositeOperation='source-over';c.globalAlpha=1;
    tintedSurfaces.set(key,canvas);return canvas;
  }
  const pigmentPatterns=new WeakMap();
  function paintSurface(ctx,item){
    if(item.surface==='pigment'){
      ctx.beginPath();item.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
      ctx.fillStyle=item.color;ctx.fill();
      let pattern=pigmentPatterns.get(ctx);if(!pattern){const tile=graySurface('pigment');if(tile){pattern=ctx.createPattern(tile,'repeat');pigmentPatterns.set(ctx,pattern);}}
      if(pattern){ctx.fillStyle=pattern;ctx.fill();}return true;
    }
    const texture=surfaceMaterial(item.surface,item.color);if(!texture)return false;
    const texUV=item.points.length===3?[[0,0],[textureSize,0],[textureSize*.5,textureSize]]:item.points.length===4?[[0,0],[textureSize,0],[textureSize,textureSize],[0,textureSize]]:item.points.map((_,i)=>[textureSize*(.5+.5*Math.cos(i*Math.PI*2/item.points.length)),textureSize*(.5+.5*Math.sin(i*Math.PI*2/item.points.length))]);
    for(let i=1;i<item.points.length-1;i++)paintTriangle(ctx,{points:[item.points[0],item.points[i],item.points[i+1]],texUV:[texUV[0],texUV[i],texUV[i+1]]},texture);
    return true;
  }
  let journeyTexture=null,journeyTextureExtent=160;
  function paintTriangle(ctx, item, texture) {
    const src=item.texUV||item.uv.map(([u,v])=>[(u+radius)*materialSize/(radius*2),(v+radius)*materialSize/(radius*2)]);
    const [s0,s1,s2]=src,[p0,p1,p2]=item.points;
    const sx1=s1[0]-s0[0],sy1=s1[1]-s0[1],sx2=s2[0]-s0[0],sy2=s2[1]-s0[1];
    const det=sx1*sy2-sx2*sy1;
    if(Math.abs(det)<1e-8)return;
    const dx1=p1[0]-p0[0],dy1=p1[1]-p0[1],dx2=p2[0]-p0[0],dy2=p2[1]-p0[1];
    const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det;
    const c=(dx2*sx1-dx1*sx2)/det,d=(dy2*sx1-dy1*sx2)/det;
    ctx.save();ctx.beginPath();
    // Subpixel clip overlap hides raster seams without changing the XYZ mesh or its UVs.
    const center=[(p0[0]+p1[0]+p2[0])/3,(p0[1]+p1[1]+p2[1])/3];
    item.points.forEach((p,i)=>{const dx=p[0]-center[0],dy=p[1]-center[1],r=Math.hypot(dx,dy)||1;const x=p[0]+dx/r*.32,y=p[1]+dy/r*.32;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,p0[0]-a*s0[0]-c*s0[1],p0[1]-b*s0[0]-d*s0[1]);
    ctx.drawImage(texture,0,0);ctx.restore();
  }
  function render(ctx,primitives,camera,viewport,texture,background){
    const w=viewport.w,h=viewport.h,p=projection(camera,viewport);
    const rendered=[];
    for(const primitive of primitives) {
      const points=primitive.points.map(p);
      if(points.some(point=>!point))continue;
      if(primitive.frontOnly&&points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)<=0)continue;
      const xs=points.map(q=>q[0]),ys=points.map(q=>q[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
      if(right<-2||left>w+2||bottom<-2||top>h+2)continue;
      rendered.push({...primitive,points,pixelArea:(right-left)*(bottom-top),depth:points.reduce((sum,q)=>sum+q[2],0)/points.length});
    }
    rendered.sort((a,b)=>a.ground!==b.ground?(a.ground?-1:1):b.depth-a.depth);
    ctx.save();
    ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
    ctx.lineJoin='round';ctx.lineCap='round';
    for(const item of rendered) {
      ctx.globalAlpha=item.alpha;
      if(item.texture||(item.material&&texture)){paintTriangle(ctx,item,item.texture||texture);continue;}
      if(item.surface&&item.pixelArea>64&&paintSurface(ctx,item))continue;
      ctx.beginPath();ctx.moveTo(item.points[0][0],item.points[0][1]);
      for(let i=1;i<item.points.length;i++)ctx.lineTo(item.points[i][0],item.points[i][1]);
      if(item.line){ctx.strokeStyle=item.color;ctx.lineWidth=Math.max(.35,item.width*item.points[0][3]);ctx.stroke();}
      else{ctx.closePath();ctx.fillStyle=item.material?colors.blue:item.color;ctx.fill();}
    }
    ctx.restore();return p;
  }
  function paintLight(ctx,p,position,radius=7){
    const light=p(position);
    if(light){
      ctx.save();
      const r=Math.max(2,radius*light[3]);ctx.globalAlpha=1;
      const glow=ctx.createRadialGradient(light[0],light[1],0,light[0],light[1],r*3.5);
      glow.addColorStop(0,'rgba(252,226,161,.76)');glow.addColorStop(1,'rgba(252,226,161,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(light[0],light[1],r*3.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=street.lightCore;ctx.beginPath();ctx.arc(light[0],light[1],r*.62,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }
  // The fixed world-to-city bridge keeps paused scrubs independent of prior frames.
  const journeyStart={x:-6178.207340306721,y:-3297.506565417906},journeyEnd={x:-800,y:-6597.506565417906};
  const journeyDX=journeyEnd.x-journeyStart.x,journeyDY=journeyEnd.y-journeyStart.y;
  const endHeading=Math.atan2(journeyDY*.35,journeyDX*.40),endSpeed=Math.hypot(journeyDX*.40,journeyDY*.35)*6/13;
  const headAngle=Characters.actors.child.headAxis({strain:1}).angle,bridgeAngle=headAngle-endHeading;
  const bridgeCos=Math.cos(bridgeAngle),bridgeSin=Math.sin(bridgeAngle),forward=[Math.cos(headAngle),Math.sin(headAngle)],coastDistance=endSpeed*3;
  function worldToCity(point){const x=point[0]-journeyEnd.x,y=point[1]-journeyEnd.y;return[x*bridgeCos-y*bridgeSin-forward[0]*coastDistance,x*bridgeSin+y*bridgeCos-forward[1]*coastDistance,point[2]||0];}
  function pathPoint(q){
    const a=[journeyStart.x,journeyStart.y],b=[a[0]+journeyDX*.25,a[1]+journeyDY*.30],c=[a[0]+journeyDX*.60,a[1]+journeyDY*.65],d=[journeyEnd.x,journeyEnd.y],s=1-q;
    return{x:s*s*s*a[0]+3*s*s*q*b[0]+3*s*q*q*c[0]+q*q*q*d[0],y:s*s*s*a[1]+3*s*s*q*b[1]+3*s*q*q*c[1]+q*q*q*d[1],heading:Math.atan2(3*s*s*(b[1]-a[1])+6*s*q*(c[1]-b[1])+3*q*q*(d[1]-c[1]),3*s*s*(b[0]-a[0])+6*s*q*(c[0]-b[0])+3*q*q*(d[0]-c[0]))};
  }
  function journeyPose(time,data={}){
    const t=clamp(time,119,138),u=clamp((t-132)/6,0,1),progress=clamp((t-119)/13,0,1),sample=pathPoint(progress*progress);
    const raw=t<132?(data.hero||data.entry?.body||{...sample,angle:sample.heading-headAngle,sx:1,sy:1,strain:progress}):{x:journeyEnd.x,y:journeyEnd.y,angle:endHeading-headAngle,sx:1,sy:1,strain:(1-u),bend:0};
    const center=t<132?worldToCity([raw.x,raw.y,0]):[-forward[0]*coastDistance*(1-u)**2,-forward[1]*coastDistance*(1-u)**2,0];
    return{raw,center,angle:(raw.angle||0)+bridgeAngle,size:mix(1,radius/sourceRadius,ease(t,132,138)),growth:ease(t,125,134),coast:u};
  }
  const journeyObjects=[];
  function placeJourneyObject(point,heading,index){
    const normal=[-Math.sin(heading),Math.cos(heading)];
    const passTime=index<=32?119+13*Math.sqrt(index/32):132+6*(1-Math.sqrt(1-(index-32)/14));
    for(const side of [-1,1]){
      const growAt=clamp(passTime-1.35+(side>0?.18:0),125,132.6);
      journeyObjects.push({x:point[0]+normal[0]*side*((index>=43?610:250)+(index%3)*95),y:point[1]+normal[1]*side*((index>=43?610:250)+(index%3)*95),kind:(index+(side>0?2:0))%5,r:68+(index%4)*16,passTime,index,side,heading,color:[Palette.blue,Palette.teal,Palette.coral,Palette.lavender,Palette.gold][(index+(side>0?1:0))%5],growAt,growUntil:growAt+2.9+(index%3)*.2+(side>0?.1:0)});
    }
  }
  for(let i=0;i<=32;i++){const point=pathPoint(i/32),p=worldToCity([point.x,point.y,0]);placeJourneyObject(p,point.heading+bridgeAngle,i);}
  for(let i=1;i<=14;i++){const d=coastDistance*(1-i/14);placeJourneyObject([-forward[0]*d,-forward[1]*d,0],headAngle,32+i);}
  function distanceAlpha(point,hero){
    const dx=point[0]-hero[0],dy=point[1]-hero[1],along=dx*forward[0]+dy*forward[1];
    return ease(along,-950,-550)*(1-ease(along,1500,2300))*(1-ease(Math.hypot(dx,dy),1800,2600));
  }
  function addJourneyHero(list,state,data){
    const actor=data.entry?.actor||Characters.actors.child,body=state.raw,points=[];
    for(const segment of actor.localSegments(body))for(let i=0;i<8;i++){
      const q=i/8,s=1-q;points.push([s*s*segment.from[0]+2*s*q*segment.control[0]+q*q*segment.to[0],s*s*segment.from[1]+2*s*q*segment.control[1]+q*q*segment.to[1]]);
    }
    const ca=Math.cos(state.angle),sa=Math.sin(state.angle),vertex=(p,z)=>{const x=p[0]*(body.sx??1)*state.size,y=p[1]*(body.sy??1)*state.size;return[state.center[0]+x*ca-y*sa,state.center[1]+x*sa+y*ca,z];};
    const texture=data.heroTexture||journeyTexture,extent=data.textureExtent||journeyTextureExtent,tex=p=>p.map(v=>(v/extent+.5)*(texture?.width||256));
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      list.push({points:[vertex([0,0],4),vertex(a,4),vertex(b,4)],texUV:[tex([0,0]),tex(a),tex(b)],texture,material:true,alpha:1});
      surface(list,[vertex(a,0),vertex(b,0),vertex(b,4),vertex(a,4)],tint(Palette.blue,Palette.navy,.48),'stone');
    }
  }
  function addTag(list,tag,hero){
    if(!tag)return;const center=worldToCity([tag.x,tag.y,tag.z||0]),angle=tag.angle+bridgeAngle,ca=Math.cos(angle),sa=Math.sin(angle),s=tag.scale||1.8;
    const point=(x,y,z=.2)=>[center[0]+(x*ca-y*sa)*s,center[1]+(x*sa+y*ca)*s,center[2]+z];
    const alpha=(tag.opacity??1)*distanceAlpha(center,hero);if(alpha<.002)return;
    for(const part of Restraint.geometry(tag.geometryState||{peel:1,stress:0,fracture:1})){
      const points=part.points.map(p=>point(...p));
      const partAlpha=alpha*(part.opacity??part.alpha??1);
      face(list,points,Palette[part.fill],partAlpha);
      if(part.stroke)edge(list,[...points,points[0]],Palette[part.stroke],part.width,partAlpha);
    }
  }
  function shapeScale(item,time){
    const q=ease(time,item.passTime-3.2,item.passTime+1.5);
    // Each apparition has one direction of size change for its entire passage.
    return item.index%2===0?mix(.22,2.6,q):mix(2.6,.22,q);
  }
  function apparition(list,item,time,clock,alpha){
    const r=item.r*shapeScale(item,time),phase=item.index*.91+item.side*.6;
    const volume=ease(time,Math.max(128.5,item.growAt),Math.max(133.1,item.growUntil));
    const thickness=r*.065*volume,bend=r*.32*volume;
    const turn=clock*.21+phase,ax=.92*Math.sin(phase+clock*.19),ay=.78*Math.cos(phase*.6-clock*.17);
    const ca=Math.cos(turn),sa=Math.sin(turn),cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay);
    const count=item.kind===0||item.kind===3?36:4+item.kind,steps=count*(count<10?3:1);
    const pigments=[item.color,Palette.night,Palette.coral,Palette.lavender,Palette.teal,Palette.cream];
    // Subdivision follows the original warped contour, including every gap and hole.
    const corner=(i,size)=>{const a=i*Math.PI*2/count,warp=1+.10*Math.sin(a*3+phase+clock*.2);return[Math.cos(a)*r*size*warp,Math.sin(a)*r*size*warp];};
    const contour=(u,size)=>{const i=Math.floor(u),q=u-i,a=corner(i,size),b=corner(i+1,size);return[mix(a[0],b[0],q),mix(a[1],b[1],q)];};
    const vertex=([px,py],offset)=>{
      const a=px/r*1.6+phase*.4,b=py/r*1.2-phase;
      const z=bend*(Math.sin(a)-Math.sin(phase*.4)+.28*(Math.sin(b)+Math.sin(phase)));
      const nx=-bend/r*1.6*Math.cos(a),ny=-bend/r*.28*1.2*Math.cos(b),n=Math.hypot(nx,ny,1);
      // Extrude the very same bent sheet along its normal, then rotate the entire sheet.
      const x=px+nx/n*offset,y=py+ny/n*offset,zz=z+offset/n;
      const xx=x*ca-y*sa,yy=x*sa+y*ca,rotatedZ=yy*sx+zz*cx;
      return[item.x+xx*cy+rotatedZ*sy,item.y+yy*cx-zz*sx,22-xx*sy+rotatedZ*cy];
    };
    function panel(points,color,offset,opacity=1){
      const center=points.reduce((sum,p)=>[sum[0]+p[0]/points.length,sum[1]+p[1]/points.length],[0,0]);
      const shade=volume*.20*(.5+.5*Math.cos(center[0]/r*1.6+phase*.4));
      list.push({points:points.map(p=>vertex(p,offset+thickness/2)),color:tint(color,Palette.navy,shade),surface:'pigment',alpha:alpha*opacity,frontOnly:true});
      list.push({points:points.slice().reverse().map(p=>vertex(p,offset-thickness/2)),color:tint(color,Palette.navy,.26*volume),surface:'pigment',alpha:alpha*opacity,frontOnly:true});
    }
    function rim(a,b,color,offset){
      if(thickness<=.002)return;
      surface(list,[vertex(a,offset-thickness/2),vertex(b,offset-thickness/2),vertex(b,offset+thickness/2),vertex(a,offset+thickness/2)],tint(color,Palette.navy,.40),'pigment',alpha);
    }
    const layers=item.kind===3||item.kind===4?4:3;
    for(let layer=0;layer<layers;layer++){
      const outer=1-layer*.20,inner=outer-(layer%2?.13:.18),color=pigments[(item.index+layer)%pigments.length],offset=layer*1.1;
      for(let i=0;i<steps;i++){
        const u=i*count/steps,v=(i+1)*count/steps,a=contour(u,outer),b=contour(v,outer),c=contour(v,inner),d=contour(u,inner);
        panel([a,b,c,d],color,offset);rim(a,b,color,offset);rim(c,d,color,offset);
      }
    }
    if(item.kind<3)for(let i=0;i<steps;i++){
      const a=contour(i*count/steps,.42),b=contour((i+1)*count/steps,.42);
      panel([[0,0],a,b],item.color,4,.85);rim(a,b,item.color,4);
    }
  }
  function addJourneyObjects(list,hero,time,clock=time){
    const exit=1-ease(time,134,138);if(exit<=0)return;
    for(const item of journeyObjects){
      const alpha=distanceAlpha([item.x,item.y],hero)*exit;
      if(alpha>=.002)apparition(list,item,time,clock,alpha);
    }
  }
  const speedRibbons=Array.from({length:148},(_,i)=>{
    const point=pathPoint((i%74)/73),center=worldToCity([point.x,point.y,0]),heading=point.heading+bridgeAngle,side=i<74?-1:1;
    return{center,heading,side,offset:135+(i%7)*76,length:90+(i%5)*65,width:1.5+(i%4)*1.8,color:[Palette.teal,Palette.lavender,Palette.coral,Palette.gold][i%4]};
  });
  function addSpeedRibbons(list,hero,time,data){
    const speed=clamp((data.chase?.speed||0)/1100,0,1),amount=ease(time,119.4,122)*(1-ease(time,132,137));
    if(amount<=0)return;
    for(const item of speedRibbons){
      const alpha=distanceAlpha(item.center,hero)*amount*(.16+.56*speed);if(alpha<.005)continue;
      const c=Math.cos(item.heading),s=Math.sin(item.heading),n=[-s,c],x=item.center[0]+n[0]*item.side*item.offset,y=item.center[1]+n[1]*item.side*item.offset;
      const length=item.length*(.35+2.4*speed),width=item.width;
      const points=[[-length/2,0],[-length*.25,-width],[length/2,0],[length*.22,width]].map(([u,v])=>[x+c*u+n[0]*v,y+s*u+n[1]*v,2]);
      surface(list,points,item.color,'pigment',alpha);
    }
  }
  // A strip of small world-space road cells grows out of the same future street plane.
  // No screen-space rectangle or whole-image transition is used.
  const journeyGround=[];
  const groundPoints=[];
  for(let i=0;i<=32;i++){const p=pathPoint(i/32);groundPoints.push(worldToCity([p.x,p.y,0]));}
  for(let i=1;i<=14;i++){const d=coastDistance*(1-i/14),point=[-forward[0]*d,-forward[1]*d,0];if(point[1]>165)groundPoints.push(point);}
  groundPoints.push([0,165,0]);
  const groundEdges=groundPoints.map((point,i)=>{const before=groundPoints[Math.max(0,i-1)],after=groundPoints[Math.min(groundPoints.length-1,i+1)],h=Math.atan2(after[1]-before[1],after[0]-before[0]);return[-Math.sin(h)*1050,Math.cos(h)*1050];});
  for(let i=0;i<groundPoints.length-1;i++)for(let side=0;side<4;side++){
    const lo=-1+side*.5,hi=lo+.5,a=groundPoints[i],b=groundPoints[i+1],na=groundEdges[i],nb=groundEdges[i+1];
    journeyGround.push({points:[[a[0]+na[0]*lo,a[1]+na[1]*lo,-18],[b[0]+nb[0]*lo,b[1]+nb[1]*lo,-18],[b[0]+nb[0]*hi,b[1]+nb[1]*hi,-18],[a[0]+na[0]*hi,a[1]+na[1]*hi,-18]],center:[(a[0]+b[0])/2,(a[1]+b[1])/2]});
  }
  function addJourneyGround(list,hero,time){
    const amount=ease(time,132,138);if(amount<=0)return;
    const color=tint(Palette.outside.background,street.road,amount);
    for(const tile of journeyGround){const alpha=distanceAlpha(tile.center,hero)*amount;if(alpha<.002)continue;list.push({points:tile.points,color,alpha,ground:true});}
  }
  function addJourneyDarkness(list,hero,time,clock,data){
    if(time<119||time>=132)return;
    const supplied=typeof data.darkness==='number'?data.darkness:data.darkness?.amount;
    const darkness=clamp(finite(supplied,1-ease(time,119,128)),0,1),speed=clamp((data.chase?.speed||0)/1150,0,1),amount=darkness*(1-speed*.65);
    if(amount<.002)return;
    journeyObjects.slice(0,24).forEach((item,index)=>{
      const alpha=distanceAlpha([item.x,item.y],hero)*amount*.85;if(alpha<.002)return;
      for(let strand=0;strand<2;strand++){
        const points=Array.from({length:18},(_,i)=>{const u=i/17,a=u*Math.PI*3+index*.6+strand*1.7,along=(u-.5)*540,across=Math.sin(a)*64+Math.sin(a*2+clock*.15)*22;return[item.x+forward[0]*along-forward[1]*across,item.y+forward[1]*along+forward[0]*across,3+18*Math.pow(Math.sin(a),2)];});
        edge(list,points,strand?Palette.night:Palette.ink,5+strand*3,alpha);
      }
    });
  }
  function drawJourney(ctx,time,camera={},viewport={},ambient=time,data={}){
    const w=finite(viewport.w,1280),h=finite(viewport.h,760);if(w<=0||h<=0)return;
    if(data.heroTexture){journeyTexture=data.heroTexture;journeyTextureExtent=data.textureExtent||160;}
    const state=journeyPose(time,data),list=[],clock=finite(ambient,time);
    addJourneyGround(list,state.center,time);addSpeedRibbons(list,state.center,time,data);addJourneyObjects(list,state.center,time,clock);addJourneyDarkness(list,state.center,time,clock,data);
    const cityHeight=ease(time,130,137.8);
    for(const item of environment){
      const middle=item.points.reduce((sum,p)=>[sum[0]+p[0]/item.points.length,sum[1]+p[1]/item.points.length],[0,0]),alpha=mix(distanceAlpha(middle,state.center),1,ease(time,136.8,138));
      if(alpha<=.002)continue;
      // Grow the existing XYZ in place, preserving facade holes, footprints and material UVs.
      const points=cityHeight<1&&!item.ground?item.points.map(([x,y,z])=>[x,y,z>0?z*cityHeight:z]):item.points;
      list.push({...item,points,alpha:item.alpha*alpha});
    }
    addJourneyHero(list,state,data);if(time<136.5&&data.detachedTag)addTag(list,{...data.detachedTag,opacity:(data.detachedTag.opacity??1)*(1-ease(time,130.5,136.5))},state.center);
    const turn=ease(time,119,130),pathHeading=(time<132&&Number.isFinite(data.chase?.heading)?data.chase.heading:pathPoint(clamp((time-119)/13,0,1)**2).heading)+bridgeAngle;
    const coast=ease(time,132,138),streetTurn=ease(time,134.5,138),tilt=finite(camera.tilt,1.25*ease(time,119,138));
    const screenHeading=-Math.PI/5,groundHeading=Math.atan2(Math.sin(screenHeading)/Math.cos(tilt),Math.cos(screenHeading));
    const yaw=mix(-bridgeAngle,groundHeading-pathHeading,turn);
    const view={...camera,x:state.center[0],y:state.center[1],yaw:finite(camera.yaw,mix(yaw,.32,streetTurn)),zoom:finite(camera.zoom,mix(1.2,1.15,coast)),tilt,screenY:finite(camera.screenY,.5)};
    const p=render(ctx,list,view,{w,h},sharedMaterial(clock),Palette.outside.background);
    let light;
    if(time<132&&data.light)light=worldToCity([data.light.x,data.light.y,68*ease(time,125,138)]);
    else light=[state.center[0]+mix(forward[0]*100,112+Math.sin(clock*.73)*3,coast),state.center[1]+mix(forward[1]*100,-78,coast),68*ease(time,125,138)+Math.sin(clock*1.1)*3*coast];
    paintLight(ctx,p,light,mix(data.light?.r||10,7,coast));
  }
  function draw(ctx,time,camera={},viewport={},ambient=time,data={}){
    drawJourney(ctx,Math.min(time,138),camera,viewport,ambient,data);
  }
  return Object.freeze({draw,drawJourney,anchor,defaultProjection,journeyPose});
});
