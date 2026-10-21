/* World-anchored growth and thin XYZ actors share one perspective renderer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./character-geometry.js'),require('./palette.js'),require('./restraint.js'),require('./motion.js'),require('./factory.js'),require('./ending-progress.js'),require('./inner-world.js'));
  else root.FlatlandDimension = factory(root.FlatlandCharacters,root.FlatlandPalette,root.FlatlandRestraint,root.FlatlandMotion,root.FlatlandFactory,root.FlatlandEndingProgress,root.FlatlandInner);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Characters,Palette,Restraint,Motion,Factory,Ending,Inner) {
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
    const focal=clamp(finite(c.focal,defaultProjection.focal),600,2400),distance=focal/c.zoom;
    return point => {
      const dx = point[0] - c.x, dy = point[1] - c.y, z = point[2];
      const x = dx * cy - dy * sy, y = dx * sy + dy * cy;
      const depth = distance - y * st - z * ct;
      if (depth < 50) return null;
      const q = focal * scale / depth;
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
  function paintSeedGlow(ctx,x,y,r,opacity=1){
    const extent=Math.max(.1,r)*4.5,glow=ctx.createRadialGradient(x,y,0,x,y,extent);
    glow.addColorStop(0,'rgba(255,255,248,1)');glow.addColorStop(.08,'rgba(255,246,211,.97)');
    glow.addColorStop(.22,'rgba(250,215,139,.73)');glow.addColorStop(.50,'rgba(236,181,78,.22)');glow.addColorStop(1,'rgba(236,181,78,0)');
    ctx.save();ctx.globalAlpha*=opacity;ctx.fillStyle=glow;ctx.fillRect(x-extent,y-extent,extent*2,extent*2);ctx.restore();
  }
  function paintLight(ctx,p,position,radius=7){
    const light=p(position);if(light)paintSeedGlow(ctx,light[0],light[1],Math.max(2,radius*light[3]));
  }
  // The fixed world-to-city bridge keeps paused scrubs independent of prior frames.
  const journeyStart=Factory.anchors.discard,journeyEnd=Factory.anchors.chaseEnd;
  const journeyDX=journeyEnd.x-journeyStart.x,journeyDY=journeyEnd.y-journeyStart.y;
  const endHeading=Math.atan2(journeyDY*.35,journeyDX*.40),endSpeed=Math.hypot(journeyDX*.40,journeyDY*.35)*3*Motion.chaseProgress(132).qSpeed;
  const headAngle=Characters.actors.child.headAxis({strain:1}).angle,bridgeAngle=headAngle-endHeading;
  const bridgeCos=Math.cos(bridgeAngle),bridgeSin=Math.sin(bridgeAngle),forward=[Math.cos(headAngle),Math.sin(headAngle)],coastDistance=endSpeed*3;
  function worldToCity(point){const x=point[0]-journeyEnd.x,y=point[1]-journeyEnd.y;return[x*bridgeCos-y*bridgeSin-forward[0]*coastDistance,x*bridgeSin+y*bridgeCos-forward[1]*coastDistance,point[2]||0];}
  function curvePoint(q){
    const a=[journeyStart.x,journeyStart.y],b=[a[0]+journeyDX*.25,a[1]+journeyDY*.30],c=[a[0]+journeyDX*.60,a[1]+journeyDY*.65],d=[journeyEnd.x,journeyEnd.y],s=1-q;
    return{x:s*s*s*a[0]+3*s*s*q*b[0]+3*s*q*q*c[0]+q*q*q*d[0],y:s*s*s*a[1]+3*s*s*q*b[1]+3*s*q*q*c[1]+q*q*q*d[1],heading:Math.atan2(3*s*s*(b[1]-a[1])+6*s*q*(c[1]-b[1])+3*q*q*(d[1]-c[1]),3*s*s*(b[0]-a[0])+6*s*q*(c[0]-b[0])+3*q*q*(d[0]-c[0]))};
  }
  const pathLengths=[0];for(let i=1;i<=32;i++){const a=curvePoint((i-1)/32),b=curvePoint(i/32);pathLengths.push(pathLengths[i-1]+Math.hypot(b.x-a.x,b.y-a.y));}
  function pathPoint(q){const d=clamp(q,0,1)*pathLengths[32];let i=1;while(i<32&&d>pathLengths[i])i++;return curvePoint((i-1+(d-pathLengths[i-1])/(pathLengths[i]-pathLengths[i-1]))/32);}
  function journeyPose(time,data={}){
    const t=clamp(time,119,138),progress=Motion.chaseProgress(Math.min(t,132)).q,sample=pathPoint(progress);
    const source=t<132?(data.hero||data.entry?.body||{...sample,angle:sample.heading-headAngle,sx:1,sy:1,speed:pathLengths[32]*Motion.chaseProgress(t).qSpeed}):{x:journeyEnd.x,y:journeyEnd.y,angle:endHeading-headAngle,sx:1,sy:1,bend:0,speed:0,effort:0,bounce:0};
    const speed=finite(data.chase?.speed,source.speed||0),shape=Motion.speedShape(speed),raw={...source,...shape,speed};
    // localSegments already applies the body response; only add the remaining perspective stretch.
    const sprintStretch=shape.perspectiveStretch/((1+.04*shape.strain)*(1+shape.axialStretch));
    return{raw,center:worldToCity([raw.x,raw.y,0]),angle:(raw.angle||0)+bridgeAngle,size:1,sprintStretch,growth:ease(Math.min(t,132),125,134),coast:0,phase:t<132?'chase':'pov'};
  }
  const journeyObjects=[],journeyObjectCount=120;
  function chasePassTime(q){let a=122,b=132;for(let i=0;i<20;i++){const m=(a+b)/2;if(Motion.chaseProgress(m).q<q)a=m;else b=m;}return(a+b)/2;}
  function placeJourneyObject(point,heading,index){
    const normal=[-Math.sin(heading),Math.cos(heading)];
    const passTime=chasePassTime(index/journeyObjectCount);
    for(const side of [-1,1]){
      const growAt=clamp(passTime-1.2+(side>0?.12:0),124.8,129.5),enterAt=passTime-mix(.35,1.45,clamp(index/(journeyObjectCount*.94),0,1))+(side>0?.08:0);
      journeyObjects.push({x:point[0]+normal[0]*side*(250+(index%3)*95),y:point[1]+normal[1]*side*(250+(index%3)*95),routeDistance:index/journeyObjectCount*pathLengths[32],laneOffset:side*(250+(index%3)*95),kind:(index+(side>0?2:0))%5,r:68+(index%4)*16,passTime,index,side,heading,color:[Palette.blue,Palette.teal,Palette.coral,Palette.lavender,Palette.gold][(index+(side>0?1:0))%5],enterAt,growAt,growUntil:growAt+1.1+(index%3)*.12});
    }
  }
  for(let i=0;i<=journeyObjectCount;i++){const point=pathPoint(i/journeyObjectCount),p=worldToCity([point.x,point.y,0]);placeJourneyObject(p,point.heading+bridgeAngle,i);}
  function distanceAlpha(point,hero){
    const dx=point[0]-hero[0],dy=point[1]-hero[1],along=dx*forward[0]+dy*forward[1];
    return ease(along,-650,-250)*(1-ease(along,900,1700))*(1-ease(Math.hypot(dx,dy),1600,2200));
  }
  function addJourneyHero(list,state,data){
    const actor=data.entry?.actor||Characters.actors.child,body=state.raw,points=[];
    for(const segment of actor.localSegments(body))for(let i=0;i<8;i++){
      const q=i/8,s=1-q;points.push([s*s*segment.from[0]+2*s*q*segment.control[0]+q*q*segment.to[0],s*s*segment.from[1]+2*s*q*segment.control[1]+q*q*segment.to[1]]);
    }
    const ca=Math.cos(state.angle),sa=Math.sin(state.angle),axis=actor.headAxis(body).angle,fx=Math.cos(axis),fy=Math.sin(axis),stretch=state.sprintStretch;
    const vertex=(p,z)=>{const along=(p[0]*fx+p[1]*fy)*stretch,across=(-p[0]*fy+p[1]*fx)/stretch,x=(along*fx-across*fy)*(body.sx??1)*state.size,y=(along*fy+across*fx)*(body.sy??1)*state.size;return[state.center[0]+x*ca-y*sa,state.center[1]+x*sa+y*ca,z];};
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
    const depth=ease(item.index,0,journeyObjectCount*.94),base=mix(.30,3.2,depth),q=ease(time,item.passTime-.6,item.passTime+.25);
    // The route has small forms first and large forms farther on; local motion cannot reveal a huge early ring.
    return base*(item.index<18?mix(.82,1.10,q):item.index%2===0?mix(.85,1.12,q):mix(1.12,.92,q));
  }
  function referenceDeformation(speed,index=0,side=1){
    const response=(Motion.speedShape(speed).perspectiveStretch-1)/2;
    const stretch=1+response*(2.3+(index%5)*.24);
    return{stretch,across:1/Math.sqrt(stretch),shear:side*.22*response,response};
  }
  function deformReference(point,heading,deformation){
    const c=Math.cos(heading),s=Math.sin(heading),along=point[0]*c+point[1]*s,across=-point[0]*s+point[1]*c;
    const u=along*deformation.stretch+across*deformation.shear,v=across*deformation.across;
    return[c*u-s*v,s*u+c*v,point[2]];
  }
  const journeyFlowLength=pathLengths[32];
  function journeyRoutePoint(distance){
    const d=clamp(distance,0,journeyFlowLength),point=pathPoint(d/journeyFlowLength),extra=distance-d,heading=point.heading+bridgeAngle,center=worldToCity([point.x,point.y,0]);
    return{x:center[0]+Math.cos(heading)*extra,y:center[1]+Math.sin(heading)*extra,heading};
  }
  function referenceFlow(item,hero,time,data){
    const base=finite(data.chase?.baseTravel,time-119),travel=finite(data.chase?.travel,base),extra=Math.max(0,travel-base)*journeyFlowLength*Motion.chaseProgress(132).qSpeed;
    if(!Number.isFinite(item.routeDistance))return item;
    let distance=item.routeDistance-extra,repeat=0;
    const heroDistance=Motion.chaseProgress(Math.min(time,132)).q*journeyFlowLength;
    if(Number.isFinite(data.chase?.travel)||time>130){
      // Repeat the route coordinate, then sample its tangent and normal together.
      // Translating old curved points along a fixed axis moved an entire lane across
      // the hero at the end of a hold. Every repeated pair now keeps its own side.
      const behind=heroDistance-900;
      if(distance<behind){repeat=Math.ceil((behind-distance)/journeyFlowLength);distance+=repeat*journeyFlowLength;}
    }
    if(!extra&&!repeat)return item;
    const center=journeyRoutePoint(distance),normal=[-Math.sin(center.heading),Math.cos(center.heading)],offset=item.laneOffset||0;
    return{...item,x:center.x+normal[0]*offset,y:center.y+normal[1]*offset,heading:center.heading,index:item.index+repeat*journeyObjectCount};
  }
  function apparition(list,item,time,clock,alpha,speed=0){
    const r=item.r*shapeScale(item,time),phase=item.index*.91+item.side*.6;
    const deformation=referenceDeformation(speed,item.index,item.side);
    const volume=ease(time,item.growAt,item.growUntil);
    const thickness=r*.038*volume,bend=r*.32*volume;
    const turn=clock*.21+phase,ax=.92*Math.sin(phase+clock*.19),ay=.78*Math.cos(phase*.6-clock*.17);
    const ca=Math.cos(turn),sa=Math.sin(turn),cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay);
    const count=item.kind===0||item.kind===3?36:4+item.kind;
    const steps=count*(volume>0?(count<10?Math.max(5,Math.ceil(36/count)):1):(count<10?3:1));
    const radialSteps=volume>0?2:1,centerSteps=volume>0?3:1;
    const pigments=[item.color,Palette.night,Palette.coral,Palette.lavender,Palette.teal,Palette.cream];
    // Subdivision follows the original warped contour, including every gap and hole.
    const corner=(i,size)=>{const a=i*Math.PI*2/count,warp=1+.10*Math.sin(a*3+phase+clock*.2);return[Math.cos(a)*r*size*warp,Math.sin(a)*r*size*warp];};
    const contour=(u,size)=>{const i=Math.floor(u),q=u-i,a=corner(i,size),b=corner(i+1,size);return[mix(a[0],b[0],q),mix(a[1],b[1],q)];};
    const vertex=([px,py],offset)=>{
      const a=px/r*1.6+phase*.4,b=py/r*1.2-phase;
      const z=bend*(Math.sin(a)-Math.sin(phase*.4)+.28*(Math.sin(b)+Math.sin(phase)));
      const nx=-bend/r*1.6*Math.cos(a),ny=-bend/r*.28*1.2*Math.cos(b),n=Math.hypot(nx,ny,1);
      // Both sides still follow this sheet's own contour. Vary the small normal
      // separation and shear continuously, rather than making parallel solid slices.
      const separation=offset*(1+volume*(.18*Math.sin(a+b*.35)+.09*Math.cos(b*1.4)));
      const shear=volume*offset*.16;
      const x=px+nx/n*separation+shear*Math.sin(b),y=py+ny/n*separation+shear*Math.cos(a),zz=z+separation/n;
      const xx=x*ca-y*sa,yy=x*sa+y*ca,rotatedZ=yy*sx+zz*cx;
      const warped=deformReference([xx*cy+rotatedZ*sy,yy*cx-zz*sx,-xx*sy+rotatedZ*cy],item.heading,deformation);
      return[item.x+warped[0],item.y+warped[1],22+warped[2]];
    };
    function panel(points,color,offset,opacity=1){
      const center=points.reduce((sum,p)=>[sum[0]+p[0]/points.length,sum[1]+p[1]/points.length],[0,0]);
      const shade=volume*.12*(.5+.5*Math.cos(center[0]/r*1.6+phase*.4));
      list.push({points:points.map(p=>vertex(p,offset+thickness/2)),color:tint(color,Palette.navy,shade),surface:'pigment',alpha:alpha*opacity,frontOnly:true});
      list.push({points:points.slice().reverse().map(p=>vertex(p,offset-thickness/2)),color:tint(color,Palette.navy,volume*(.10+shade*.6)),surface:'pigment',alpha:alpha*opacity,frontOnly:true});
    }
    function rim(a,b,color,offset){
      if(thickness<=.002)return;
      surface(list,[vertex(a,offset-thickness/2),vertex(b,offset-thickness/2),vertex(b,offset+thickness/2),vertex(a,offset+thickness/2)],tint(color,Palette.navy,.22),'pigment',alpha);
    }
    const layers=item.kind===3||item.kind===4?4:3;
    for(let layer=0;layer<layers;layer++){
      const outer=1-layer*.20,inner=outer-(layer%2?.13:.18),color=pigments[(item.index+layer)%pigments.length],offset=layer*1.1;
      for(let i=0;i<steps;i++){
        const u=i*count/steps,v=(i+1)*count/steps;
        // Sample through the band as well as around it: a single wide quad
        // bridges the bend and reads as a rigid bevel even with a curved rim.
        for(let j=0;j<radialSteps;j++){
          const outside=mix(outer,inner,j/radialSteps),inside=mix(outer,inner,(j+1)/radialSteps);
          panel([contour(u,outside),contour(v,outside),contour(v,inside),contour(u,inside)],color,offset);
        }
        rim(contour(u,outer),contour(v,outer),color,offset);rim(contour(v,inner),contour(u,inner),color,offset);
      }
    }
    if(item.kind<3)for(let i=0;i<steps;i++){
      const u=i*count/steps,v=(i+1)*count/steps;
      for(let j=0;j<centerSteps;j++){
        const inner=.42*j/centerSteps,outer=.42*(j+1)/centerSteps,a=contour(u,outer),b=contour(v,outer);
        panel(j?[a,b,contour(v,inner),contour(u,inner)]:[[0,0],a,b],item.color,4,.85);
      }
      rim(contour(u,.42),contour(v,.42),item.color,4);
    }
  }
  function addJourneyObjects(list,hero,time,clock=time,data={}){
    const exit=ease(time,122.15,122.45);if(exit<=0)return;
    for(const original of journeyObjects){
      const item=referenceFlow(original,hero,time,data);
      if(item.index<18&&item.side!==(item.index%2?1:-1))continue;
      const alpha=distanceAlpha([item.x,item.y],hero)*exit*ease(time,item.enterAt,item.enterAt+.45);
      if(alpha>=.002)apparition(list,item,time,clock,alpha,data.chase?.speed||0);
    }
  }
  const speedRibbons=Array.from({length:560},(_,i)=>{
    const point=pathPoint((i%280)/279),center=worldToCity([point.x,point.y,0]),heading=point.heading+bridgeAngle,side=i<280?-1:1;
    return{center,heading,side,routeDistance:(i%280)/279*journeyFlowLength,laneOffset:0,offset:135+(i%7)*76,length:90+(i%5)*65,width:1.5+(i%4)*1.8,color:[Palette.teal,Palette.lavender,Palette.coral,Palette.gold][i%4]};
  });
  function addSpeedRibbons(list,hero,time,data){
    const speed=(Motion.speedShape(data.chase?.speed||0).perspectiveStretch-1)/2,kick=clamp(data.chase?.effort||0,0,1);
    const amount=ease(time,122,122.3)*(1-ease(time,132,137));
    if(amount<=0)return;
    for(const original of speedRibbons){
      const moved=referenceFlow({...original,x:original.center[0],y:original.center[1],index:0},hero,time,data),item={...original,heading:moved.heading,center:[moved.x,moved.y]};
      const alpha=distanceAlpha(item.center,hero)*amount*(.18+.62*speed+.18*kick);if(alpha<.005)continue;
      const c=Math.cos(item.heading),s=Math.sin(item.heading),n=[-s,c],x=item.center[0]+n[0]*item.side*item.offset,y=item.center[1]+n[1]*item.side*item.offset;
      const length=item.length*(.7+7.8*speed),width=item.width*(1+.25*speed);
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
    if(time<122||time>=132)return;
    const supplied=typeof data.darkness==='number'?data.darkness:data.darkness?.amount;
    const darkness=clamp(finite(supplied,1-ease(time,119,128)),0,1),speed=clamp((data.chase?.speed||0)/1150,0,1),amount=darkness*(1-speed*.65)*ease(time,122,124);
    if(amount<.002)return;
    journeyObjects.slice(0,24).forEach((original,index)=>{
      const item=referenceFlow(original,hero,time,data);
      const alpha=distanceAlpha([item.x,item.y],hero)*amount*.85;if(alpha<.002)return;
      for(let strand=0;strand<2;strand++){
        const points=Array.from({length:18},(_,i)=>{const u=i/17,a=u*Math.PI*3+index*.6+strand*1.7,along=(u-.5)*540,across=Math.sin(a)*64+Math.sin(a*2+clock*.15)*22;return[item.x+forward[0]*along-forward[1]*across,item.y+forward[1]*along+forward[0]*across,3+18*Math.pow(Math.sin(a),2)];});
        edge(list,points,strand?Palette.night:Palette.ink,5+strand*3,alpha);
      }
    });
  }
  const endingAssets={open:null,flexed:null,brush:null,status:'empty',version:0,layout:{left:[0,0,.5,1],right:[.5,0,.5,1],wristLeft:[.525,.60],wristRight:[.55,.60]}};
  const endingSprites=new Map();
  function setEndingAssets(config={}){
    const version=++endingAssets.version;endingSprites.clear();
    endingAssets.open=null;endingAssets.flexed=null;endingAssets.brush=null;endingAssets.status='loading';
    if(config.layout)Object.assign(endingAssets.layout,config.layout);
    function load(value,key){
      if(!value)return Promise.resolve(false);
      if(typeof value!=='string'){endingAssets[key]=value;return Promise.resolve(true);}
      if(typeof Image==='undefined')return Promise.resolve(false);
      return new Promise(resolve=>{const image=new Image();image.onload=()=>{if(version===endingAssets.version){endingAssets[key]=image;endingSprites.clear();}resolve(true);};image.onerror=()=>resolve(false);image.src=value;});
    }
    return Promise.all([load(config.hands||config.open,'open'),load(config.flexedHands||config.flexed,'flexed'),load(config.brushHands||config.brush,'brush')]).then(()=>{
      if(version===endingAssets.version)endingAssets.status=endingAssets.open?'ready':'empty';
      return{status:endingAssets.status,open:!!endingAssets.open,flexed:!!endingAssets.flexed,brush:!!endingAssets.brush};
    });
  }
  function endingPose(time,state=Ending.snapshotAt(time)){
    return{...state,left:{raise:state.raise,turn:state.flex,flex:state.flex,grasp:state.grasp,opacity:state.handsOpacity,rotation:mix(-.10,.055,state.flex)},
      right:{raise:ease(state.raise,.05,1),turn:state.flex,flex:state.flex,grasp:state.grasp,opacity:state.handsOpacity,rotation:mix(.085,-.045,state.flex)}};
  }
  function endingSprite(key,side){
    const image=endingAssets[key];if(!image)return null;
    const cacheKey=endingAssets.version+':'+key+':'+side;if(endingSprites.has(cacheKey))return endingSprites.get(cacheKey);
    const rect=endingAssets.layout[side],iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    if(!iw||!ih)return null;
    const canvas=makeCanvas();if(!canvas)return null;
    canvas.width=768;canvas.height=Math.round(768*(ih*rect[3])/(iw*rect[2]));
    canvas.getContext('2d').drawImage(image,iw*rect[0],ih*rect[1],iw*rect[2],ih*rect[3],0,0,canvas.width,canvas.height);
    endingSprites.set(cacheKey,canvas);return canvas;
  }
  function drawEndingHand(ctx,side,pose,w,h){
    if(pose.raise<=0)return;
    const open=endingSprite('open',side);if(!open)return;
    const flexed=endingSprite('flexed',side),brush=endingSprite('brush',side);
    // Each hand rolls briefly toward its edge before changing finger pose; no doubled finger silhouettes.
    const roll=Math.max(flexed?Math.sin(Math.PI*pose.flex):0,brush?Math.sin(Math.PI*pose.grasp):0);
    const texture=brush&&pose.grasp>=.5?brush:flexed&&pose.flex>=.5?flexed:open;
    const wrist=endingAssets.layout[side==='left'?'wristLeft':'wristRight'],height=h*.78,width=height*texture.width/texture.height;
    const angle=pose.rotation,anchor=[w*(side==='left'?.355:.655),h*mix(1.29,.71,pose.raise)];
    // Separate wrist pivots and pose atlases preserve the fine hand drawing without mesh clip seams.
    ctx.save();ctx.globalAlpha=ease(pose.raise,0,.15)*(pose.opacity??1);ctx.imageSmoothingEnabled=true;
    ctx.translate(...anchor);ctx.rotate(angle);
    ctx.transform((1-.075*pose.turn)*(1-.78*roll),pose.turn*height*.027/width,0,1-.025*roll,0,0);
    ctx.drawImage(texture,-wrist[0]*width,-wrist[1]*height,width,height);
    ctx.restore();
  }
  function endingLight(time,viewport={},state=Ending.snapshotAt(time),lightOrigin){
    const w=finite(viewport.w,1280),h=finite(viewport.h,760),t=state.clock,settle=ease(t,0,2.4),drop=state.lightDrop,center=state.seedCenter;
    const startX=clamp(finite(lightOrigin?.x,.70),0,1),startY=clamp(finite(lightOrigin?.y,.28),0,1),baseRadius=Math.max(3.8,Math.min(w,h)*.008);
    const x=mix(mix(startX,.52,settle)+Math.sin(t*1.2)*.006,.655,drop),y=mix(mix(startY,.40,settle)+Math.sin(t*1.7)*.008,.55,drop);
    return{entityId:'hero-seed',x:w*mix(x,.5,center),y:h*mix(y,.48,center),r:mix(finite(lightOrigin?.r,baseRadius/Math.min(w,h))*Math.min(w,h),baseRadius,settle),phase:state.phase};
  }
  let endingWorldCanvas;
  function drawEnding(ctx,time,viewport={},options={}){
    const w=finite(viewport.w,1280),h=finite(viewport.h,760),state=options.state||Ending.snapshotAt(time),pose=endingPose(time,state),light=endingLight(time,{w,h},state,options.lightOrigin);
    ctx.save();ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
    // An unloaded asset leaves the deliberate white stop; no schematic hands are substituted.
    if(endingAssets.open){drawEndingHand(ctx,'left',pose.left,w,h);drawEndingHand(ctx,'right',pose.right,w,h);}
    if(state.expansion>0){
      const drawContents=options.drawContents||(Inner||globalThis.FlatlandInner)?.drawContents;
      if(drawContents){
        if(!endingWorldCanvas)endingWorldCanvas=makeCanvas();
        if(endingWorldCanvas){
          if(endingWorldCanvas.width!==Math.ceil(w)||endingWorldCanvas.height!==Math.ceil(h)){endingWorldCanvas.width=Math.ceil(w);endingWorldCanvas.height=Math.ceil(h);}
          const field=endingWorldCanvas.getContext('2d');field.setTransform(1,0,0,1,0,0);field.globalAlpha=1;field.globalCompositeOperation='source-over';field.clearRect(0,0,w,h);
          drawContents(field,{w,h},options.ambient??state.clock);
          if(state.expansion<1){
            const radius=light.r+Math.hypot(w,h)*Math.pow(state.expansion,.9),mask=field.createRadialGradient(light.x,light.y,0,light.x,light.y,radius);
            mask.addColorStop(0,'#ffffff');mask.addColorStop(.68,'#ffffff');mask.addColorStop(1,'#ffffff00');field.globalCompositeOperation='destination-in';field.fillStyle=mask;field.fillRect(0,0,w,h);field.globalCompositeOperation='source-over';
          }
          ctx.drawImage(endingWorldCanvas,0,0,w,h);
        }
      }
    }
    if(state.expansion<1)paintSeedGlow(ctx,light.x,light.y,light.r,1-state.expansion);
    if(state.textOpacity>0){
      ctx.save();ctx.globalAlpha=state.textOpacity;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 '+Math.max(14,Math.min(28,w*.025))+'px Georgia, serif';ctx.fillStyle=Palette.cream;ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=9;ctx.fillText(state.text,w/2,h/2,w*.88);ctx.restore();
    }
    ctx.restore();return{...pose,light,assetStatus:endingAssets.status};
  }
  function seedLight(time,entry,guide){
    if(!entry?.body||!guide)return guide;
    const body=entry.body,local=entry.routine?[-7,7]:[0,0],c=Math.cos(body.angle||0),s=Math.sin(body.angle||0);
    const x=local[0]*(body.sx??1),y=local[1]*(body.sy??1),origin=[body.x+c*x-s*y,body.y+s*x+c*y];
    const flight=ease(time,119.6,121.7);
    return{...guide,x:mix(origin[0],guide.x,flight),y:mix(origin[1],guide.y,flight),z:4,
      r:mix(6,guide.r||10,flight),inside:flight===0,phase:flight===0?'enclosed':flight<1?'emerge':guide.phase,entityId:'hero-seed'};
  }
  function paintArrivalLight(ctx,point,time,radius,w,h,enclosed=false){
    if(!point)return;const arrival=ease(time,131,132),r=mix(Math.max(3.3,radius*point[3]),endingLight(132,{w,h}).r,arrival),spread=r*4+Math.hypot(w,h)*Math.pow(arrival,2.2)*1.3;
    ctx.save();paintSeedGlow(ctx,point[0],point[1],r);
    if(arrival>0){
      const halo=ctx.createRadialGradient(point[0],point[1],0,point[0],point[1],Math.max(1,spread));
      halo.addColorStop(0,'rgba(255,255,255,1)');halo.addColorStop(Math.min(.72,.12+arrival*.6),'rgba(255,255,255,'+(.28+.72*arrival)+')');halo.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
    }
    const complete=ease(time,131.72,132);if(complete>0){ctx.globalAlpha=complete;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);}
    ctx.restore();
  }
  function journeyView(time,camera,viewport,data,state=journeyPose(time,data)){
    const w=finite(viewport.w,1280),h=finite(viewport.h,760);
    const pathHeading=(Number.isFinite(data.chase?.heading)?data.chase.heading:pathPoint(Motion.chaseProgress(time).q).heading)+bridgeAngle;
    const lower=ease(time,128,131.6),tilt=mix(finite(camera.tilt,1.25*ease(time,122,138)),1.25,lower),screenHeading=-Math.PI/5;
    const groundHeading=Math.atan2(Math.sin(screenHeading)/Math.cos(tilt),Math.cos(screenHeading));
    const focus=time<122?worldToCity([finite(camera.x,journeyStart.x),finite(camera.y,journeyStart.y),0]):state.center;
    const view={...camera,x:focus[0],y:focus[1],yaw:time<122?finite(camera.yaw,-bridgeAngle):groundHeading-pathHeading,zoom:1.2,tilt,focal:mix(1600,620,ease(time,123.5,130)),screenY:.5};
    return{state,view,w,h,pathHeading};
  }
  function projectJourneyLight(time,layout,data,project=projection(layout.view,layout)){
    const {state,pathHeading,w,h}=layout,guide=data.light;
    const near=guide?[guide.x,guide.y]:[state.raw.x+Math.cos(pathHeading-bridgeAngle)*100,state.raw.y+Math.sin(pathHeading-bridgeAngle)*100];
    // At the held story gate the world current keeps moving, including its one guiding seed.
    const extra=Math.max(0,finite(data.chase?.travel,time-119)-finite(data.chase?.baseTravel,time-119));
    if(time>=122&&guide?.guideOffset&&extra){const offset=Factory.guideOffset(time+extra,guide.guideHeading),distance=finite(guide.guideDistanceScale,1);near[0]+=offset[0]*distance-guide.guideOffset[0];near[1]+=offset[1]*distance-guide.guideOffset[1];}
    const lightPoint=project(worldToCity([near[0],near[1],guide?.z||0]));
    if(lightPoint){const settle=ease(chaseArrivalTime(time,data),131,132),end=endingLight(132,{w,h});lightPoint[0]=mix(lightPoint[0],end.x,settle);lightPoint[1]=mix(lightPoint[1],end.y,settle);}
    return lightPoint;
  }
  function journeyLightPoint(time,camera={},viewport={},data={}){
    if(time>=132)return null;
    return projectJourneyLight(time,journeyView(time,camera,viewport,data),data);
  }
  function chaseArrivalTime(time,data){
    return data.chase?.holdGate?Math.min(time,131+.7*ease(data.chase.charge||0,.8,1)):time;
  }
  function drawJourney(ctx,time,camera={},viewport={},ambient=time,data={}){
    const w=finite(viewport.w,1280),h=finite(viewport.h,760);if(w<=0||h<=0)return;
    if(time>=132){drawEnding(ctx,time,{w,h});return;}
    if(data.heroTexture){journeyTexture=data.heroTexture;journeyTextureExtent=data.textureExtent||160;}
    const layout=journeyView(time,camera,viewport,data),state=layout.state,list=[],clock=finite(ambient,time);
    addSpeedRibbons(list,state.center,time,data);addJourneyObjects(list,state.center,time,clock,data);addJourneyDarkness(list,state.center,time,clock,data);
    addJourneyHero(list,state,data);if(data.detachedTag)addTag(list,{...data.detachedTag,opacity:(data.detachedTag.opacity??1)*(1-ease(time,130.5,132))},state.center);
    const project=render(ctx,list,layout.view,{w,h},sharedMaterial(clock),Palette.outside.background),lightPoint=projectJourneyLight(time,layout,data,project);
    if(!data.hideLight)paintArrivalLight(ctx,lightPoint,chaseArrivalTime(time,data),data.light?.r||10,w,h,data.light?.inside);
  }
  function draw(ctx,time,camera={},viewport={},ambient=time,data={}){
    drawJourney(ctx,Math.min(time,138),camera,viewport,ambient,data);
  }
  return Object.freeze({draw,drawJourney,drawEnding,setEndingAssets,endingPose,endingLight,anchor,defaultProjection,journeyPose,journeyLightPoint,paintArrivalLight,paintSeedGlow,seedLight});
});
