/* Single-layer XYZ sheets. Event time never writes to the caller's camera. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./character-geometry.js'),require('./palette.js'));
  else root.FlatlandDimension = factory(root.FlatlandCharacters,root.FlatlandPalette);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Characters,Palette) {
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
  const cracks = [
    [[-50, -22], [-29, -13], [-21, 0], [-7, 6]],
    [[6, 2], [23, 13], [33, 11], [51, 25]],
    [[-4, 16], [-10, 30], [-2, 40], [-4, 55]]
  ];
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
  // A fan with concentric subdivisions retains the exact original five straight boundary edges.
  const uv = [[0, 0]], triangles = [], segments = 40, rings = 8;
  for (let ring = 1; ring <= rings; ring++) {
    for (let edge = 0; edge < 5; edge++) {
      for (let j = 0; j < segments / 5; j++) {
        const a = outline[edge], b = outline[(edge + 1) % 5], q = j / (segments / 5);
        uv.push([mix(a[0], b[0], q) * ring / rings, mix(a[1], b[1], q) * ring / rings]);
      }
    }
  }
  for (let j = 0; j < segments; j++) triangles.push([0, 1 + j, 1 + (j + 1) % segments]);
  for (let ring = 1; ring < rings; ring++) {
    const inner = 1 + (ring - 1) * segments, outer = 1 + ring * segments;
    for (let j = 0; j < segments; j++) {
      const k = (j + 1) % segments;
      triangles.push([inner + j, outer + j, outer + k], [inner + j, outer + k, inner + k]);
    }
  }
  const mesh = triangles.map(indices => {
    const center = indices.reduce((a, i) => [a[0] + uv[i][0] / 3, a[1] + uv[i][1] / 3], [0, 0]);
    return {indices, center};
  });
  function pose(time) {
    const t = clamp(finite(time, 132), 132, 158);
    let curl = 0, lean = 0;
    if (t >= 138 && t < 142) {
      curl = .037 * ease(t, 138, 140.2) * (1 - ease(t, 140.5, 142));
      lean = -.43 * ease(t, 138.8, 140.3) * (1 - ease(t, 140.5, 142));
    } else if (t >= 142) {
      curl = .020 * ease(t, 142.3, 145.2);
      lean = -.47 * ease(t, 143, 145.5);
    }
    const forward = ease(t, 154.3, 157.6);
    return {
      hero: {x: 10 * forward, y: -39 * forward, curl, lean, angle: .19 * ease(t, 146.2, 149.2), damaged: true},
      companion: {x: 200 + 5 * forward, y: 10 - 44 * forward, curl: .0205, lean: -.46, angle: -.20 * ease(t, 146.4, 149.6), damaged: false}
    };
  }
  function sheetPoint(u, v, body, lift = 0) {
    const k = body.curl;
    const local = u - minX;
    const bentX = k < .000001 ? local : Math.sin(k * local) / k;
    const bentZ = k < .000001 ? 0 : (1 - Math.cos(k * local)) / k;
    const centerX = k < .000001 ? -minX : Math.sin(k * -minX) / k;
    const lean = body.lean, ca = Math.cos(body.angle), sa = Math.sin(body.angle);
    const x = (bentX - centerX) * Math.cos(lean) + bentZ * Math.sin(lean);
    const z = bentZ * Math.cos(lean) - (bentX - centerX) * Math.sin(lean);
    return [body.x + x * ca - v * sa, body.y + x * sa + v * ca, z + body.floor + lift];
  }
  function grounded(body) {
    const b = {...body, floor: 0};
    b.floor = 2 - Math.min(...uv.map(([u, v]) => sheetPoint(u, v, b)[2]));
    return b;
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
      return [viewport.w / 2 + x * q, viewport.h * defaultProjection.screenY + (y * ct - z * st) * q, depth, q];
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

  function bench(x,y,width){
    for(let i=0;i<5;i++)box(environment,x,y+i*8,x+width,y+i*8+6,43,51,...street.benchSeat,'wood');
    for(let i=0;i<3;i++)box(environment,x,y-5,x+width,y+2,65+i*17,77+i*17,...street.benchBack,'wood');
    for(const side of [x+22,x+width-22]){
      box(environment,side-5,y-4,side+5,y+40,0,44,...street.benchLeg,'metal');
      box(environment,side-5,y-12,side+5,y-4,0,109,...street.benchLeg,'metal');
      box(environment,side-8,y-7,side+8,y+38,70,76,...street.benchLeg,'metal');
    }
    shadow([[x,y],[x+width,y],[x+width-80,y+100],[x-80,y+100]],.23);
  }
  bench(-90,-244,230);bench(720,-205,255);

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
  function paintSurface(ctx,item){
    const texture=surfaceMaterial(item.surface,item.color);if(!texture)return false;
    const texUV=item.points.length===3?[[0,0],[textureSize,0],[textureSize*.5,textureSize]]:[[0,0],[textureSize,0],[textureSize,textureSize],[0,textureSize]];
    for(let i=1;i<item.points.length-1;i++)paintTriangle(ctx,{points:[item.points[0],item.points[i],item.points[i+1]],texUV:[texUV[0],texUV[i],texUV[i+1]]},texture);
    return true;
  }
  function addSheet(list, rawBody) {
    const body = grounded(rawBody), vertices = uv.map(([u,v]) => sheetPoint(u,v,body));
    const x=body.x,y=body.y;
    face(list, [[x-48,y-28,.5],[x+82,y-9,.5],[x+100,y+18,.5],[x-12,y+26,.5]], street.sheetShadow, .15);
    for(const m of mesh) {
      const [u,v]=m.center;
      // The departed center leaves a small irregular opening; no intact core is restored here.
      if(body.damaged && Math.hypot(u*1.08,(v-5)*.94)<11) continue;
      if(body.damaged && u>42 && v>23 && v<34) continue;
      list.push({points:m.indices.map(i=>vertices[i]),uv:m.indices.map(i=>uv[i]),alpha:1,material:true});
    }
    if(body.damaged) for(const crack of cracks) {
      for(let i=0;i<crack.length-1;i++) {
        edge(list,[sheetPoint(...crack[i],body,.13),sheetPoint(...crack[i+1],body,.13)],street.crack,2.5);
        edge(list,[sheetPoint(crack[i][0]+.65,crack[i][1],body,.17),sheetPoint(crack[i+1][0]+.65,crack[i+1][1],body,.17)],street.crackEdge,.65,.6);
      }
    }
  }
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
  function draw(ctx, time, camera = {}, viewport = {}, ambient = time) {
    const w=finite(viewport.w,1280),h=finite(viewport.h,760);
    if(w<=0||h<=0)return;
    const clock=finite(ambient,finite(time,132)),texture=sharedMaterial(clock);
    const p=projection(camera,{w,h}), events=pose(time), primitives=environment.slice();
    addSheet(primitives,events.hero);addSheet(primitives,events.companion);
    const rendered=[];
    for(const primitive of primitives) {
      const points=primitive.points.map(p);
      if(points.some(point=>!point))continue;
      const xs=points.map(q=>q[0]),ys=points.map(q=>q[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
      if(right<-2||left>w+2||bottom<-2||top>h+2)continue;
      rendered.push({...primitive,points,pixelArea:(right-left)*(bottom-top),depth:points.reduce((sum,q)=>sum+q[2],0)/points.length});
    }
    rendered.sort((a,b)=>b.depth-a.depth);
    ctx.save();
    ctx.fillStyle=colors.paper;ctx.fillRect(0,0,w,h);
    ctx.lineJoin='round';ctx.lineCap='round';
    for(const item of rendered) {
      ctx.globalAlpha=item.alpha;
      if(item.material&&texture){paintTriangle(ctx,item,texture);continue;}
      if(item.surface&&item.pixelArea>64&&paintSurface(ctx,item))continue;
      ctx.beginPath();ctx.moveTo(item.points[0][0],item.points[0][1]);
      for(let i=1;i<item.points.length;i++)ctx.lineTo(item.points[i][0],item.points[i][1]);
      if(item.line){ctx.strokeStyle=item.color;ctx.lineWidth=Math.max(.35,item.width*item.points[0][3]);ctx.stroke();}
      else{ctx.closePath();ctx.fillStyle=item.material?colors.blue:item.color;ctx.fill();}
    }
    // Exactly one light; it remains in front/right of the same damaged protagonist.
    const forward=ease(finite(time,132),154.3,157.6);
    const light=p([112+Math.sin(clock*.73)*3,-78-42*forward,68+Math.sin(clock*1.1)*3]);
    if(light){
      const r=Math.max(2,7*light[3]);ctx.globalAlpha=1;
      const glow=ctx.createRadialGradient(light[0],light[1],0,light[0],light[1],r*3.5);
      glow.addColorStop(0,'rgba(252,226,161,.76)');glow.addColorStop(1,'rgba(252,226,161,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(light[0],light[1],r*3.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=street.lightCore;ctx.beginPath();ctx.arc(light[0],light[1],r*.62,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  return Object.freeze({draw, anchor, defaultProjection});
});
