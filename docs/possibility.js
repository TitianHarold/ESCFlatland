/* 可能性层。One material field beneath every resident's window. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./palette.js'));
  else root.FlatlandPossibility=factory(root.FlatlandPalette);
})(typeof globalThis!=='undefined'?globalThis:this,function(Palette){
  'use strict';
  const ink = Palette.night;
  const pigment = [Palette.teal,Palette.lavender,Palette.coral,Palette.gold];
  const cream = Palette.cream;
  const periodX = 2600, periodY = 1900, speed = 28;
  let grain,texture,seed=18473;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function prepareGrain(){
    if(grain)return;
    grain=document.createElement('canvas');grain.width=grain.height=192;
    const grainContext=grain.getContext('2d');
    for (let i = 0; i < 6900; i++) {
    grainContext.fillStyle = random() < .55 ? 'rgba(19,12,35,.10)' : 'rgba(249,229,216,.075)';
    grainContext.fillRect(random() * 192, random() * 192, .35 + random() * .65, .35 + random() * .65);
  }
  }
  // Different pools, hairpins and necks, rather than equal parallel waves.
  const routes = [
    {color:0, points:[[-340,790,125],[100,785,82],[390,615,110],[610,450,69],[800,550,53],[1060,580,100],[1400,305,98],[1840,370,137],[2510,535,90]]},
    {color:1, points:[[-210,-40,122],[170,155,64],[460,330,90],[735,490,72],[960,350,72],[1250,460,93],[1530,780,113],[1870,855,49],[2490,1030,116]]},
    {color:2, points:[[130,-410,85],[415,-50,41],[515,245,84],[640,580,38],[860,635,62],[1050,790,93],[1100,1035,45],[1130,1175,70]]},
    {color:3, points:[[-230,1110,68],[140,1010,90],[435,795,51],[635,625,24],[746,505,18],[809,508,21],[866,551,35]]},
    {color:0, points:[[-410,-280,65],[-20,80,39],[210,300,51],[370,210,24],[460,-45,16],[650,-190,56],[1060,-350,96]]},
    {color:3, points:[[1110,205,25],[1250,76,32],[1340,15,34],[1410,45,21],[1490,180,28],[1670,80,79],[1900,-45,114],[2510,115,91]]},
    {color:1, points:[[-340,1390,112],[125,1240,68],[465,1090,72],[735,1240,34],[1090,1110,82],[1380,1060,45],[1710,1120,99],[2110,1420,68],[2530,1510,115]]},
    {color:2, points:[[380,-310,65],[675,-5,80],[920,95,31],[1175,-180,59],[1485,-40,68],[1640,310,35],[1745,610,87],[2040,680,33],[2510,325,105]]}
  ];

  // Evaluate time directly: seeking is deterministic, and motifs share the same map.
  function flow(x, y, t) {
    const movingX = x - speed * t;
    return [
      movingX + 48 * (Math.sin(y / 210 + t * .68) - Math.sin(y / 210))
        + 30 * (Math.sin((movingX + y) / 300 - t * .44) - Math.sin((x + y) / 300)),
      y + 52 * (Math.sin(movingX / 260 - t * .53) - Math.sin(x / 260))
        + 22 * (Math.sin(y / 190 + t * .39) - Math.sin(y / 190))
    ];
  }
  function catmull(a, b, c, d, u) {
    const u2 = u * u, u3 = u2 * u;
    return .5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  }
  function smoothPath(points, closed) {
    const p = new Path2D();
    p.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      p.quadraticCurveTo(points[i][0], points[i][1], (points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2);
    }
    const last = points[points.length - 1]; p.lineTo(last[0], last[1]);
    if (closed) p.closePath();
    return p;
  }
  function setTexture(ctx, t) {
    prepareGrain();
    texture ||= ctx.createPattern(grain, 'repeat');
    // shortcut: grain follows bulk flow, rather than a per-pixel fluid simulation.
    if (texture && texture.setTransform && typeof DOMMatrix !== 'undefined') {
      texture.setTransform(new DOMMatrix([1, .035 * Math.sin(t * .32), .04 * Math.sin(t * .27), 1, -speed * t, 16 * Math.sin(t * .4)]));
    }
  }
  function paint(ctx, p, color) {
    ctx.fillStyle = color; ctx.fill(p);
    if (texture) { ctx.fillStyle = texture; ctx.fill(p); }
  }
  function materialPath(points, ox, oy, t, closed = true) {
    return smoothPath(points.map(p => flow(p[0] + ox, p[1] + oy, t)), closed);
  }
  function line(ctx, points, ox, oy, t, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(materialPath(points, ox, oy, t, false));
  }
  function oval(ctx, x, y, rx, ry, angle, ox, oy, t, color) {
    const points = [];
    for (let i = 0; i <= 28; i++) {
      const a = i * Math.PI / 14, dx = Math.cos(a) * rx, dy = Math.sin(a) * ry;
      points.push([x + dx * Math.cos(angle) - dy * Math.sin(angle), y + dx * Math.sin(angle) + dy * Math.cos(angle)]);
    }
    paint(ctx, materialPath(points, ox, oy, t), color);
  }
  function prepare(route) {
    const knots = route.points, samples = [];
    for (let i = 0; i < knots.length - 1; i++) {
      const a = knots[Math.max(0, i - 1)], b = knots[i], c = knots[i + 1], d = knots[Math.min(knots.length - 1, i + 2)];
      const count = Math.max(6, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 28));
      for (let j = 0; j < count; j++) {
        const u = j / count, q = i + u;
        const width = Math.max(8, catmull(a[2], b[2], c[2], d[2], u));
        samples.push([catmull(a[0], b[0], c[0], d[0], u), catmull(a[1], b[1], c[1], d[1], u), width, q]);
      }
    }
    samples.push([...knots[knots.length - 1], knots.length - 1]);
    return samples.map((p,i) => {
      const before = samples[Math.max(0,i-1)], after = samples[Math.min(samples.length-1,i+1)];
      const dx = after[0]-before[0], dy = after[1]-before[1], length = Math.hypot(dx,dy) || 1;
      return [...p, -dy/length, dx/length];
    });
  }
  routes.forEach(route => { route.samples = prepare(route); });
  function ribbon(ctx, route, index, ox, oy, t) {
    const left = [], right = [];
    for (const [x,y,baseWidth,q,nx,ny] of route.samples) {
      // A travelling squeeze gathers and releases locally, instead of whole-shape bobbing.
      const width = baseWidth * (.88 + .24 * Math.sin(q*1.8-t*.94+index*1.3) + .11 * Math.sin(q*4.1+t*.47));
      left.push(flow(x+ox+nx*width,y+oy+ny*width,t));
      right.push(flow(x+ox-nx*width,y+oy-ny*width,t));
    }
    paint(ctx, smoothPath(left.concat(right.reverse()), true), pigment[route.color]);
  }
  function gifts(ctx, ox, oy, t) {
    // Jazz: this gold current expands into a bell; its key dots stay on the current.
    oval(ctx, 884, 568, 63, 36, .75, ox, oy, t, pigment[3]);
    oval(ctx, 893, 570, 47, 23, .75, ox, oy, t, ink);
    [[748,505],[780,501],[812,513]].forEach(([x,y]) => {
      line(ctx, [[x+2,y+1],[x+5,y+14]], ox, oy, t, cream, 3.5);
      oval(ctx, x, y, 7, 7, 0, ox, oy, t, cream);
    });

    // Plant: leaf bays grow from the cyan stream and share its neck.
    const growth = .5 + .5 * Math.sin(t * .64 - ox * .0003);
    const reach = 28 + growth * 48;
    const leafA = [[169,260],[156,196],[160,126-reach],[205,148-reach],[244,207],[214,276],[169,260]];
    const leafB = [[234,291],[281,266],[340+reach,275],[322+reach,326],[277,347],[231,315],[234,291]];
    paint(ctx, materialPath(leafA, ox, oy, t), pigment[0]);
    paint(ctx, materialPath(leafB, ox, oy, t), pigment[0]);
    line(ctx, [[185,292],[185,243],[178,191],[174,151-reach*.5]], ox, oy, t, Palette.leafVein, 3);
    line(ctx, [[185,292],[241,306],[289,307],[323+reach*.5,299]], ox, oy, t, Palette.leafVein, 3);

    // Brush: unequal bristle gaps make the coral stream itself a brush edge.
    line(ctx, [[1060,1085],[1096,1072],[1136,1086]], ox, oy, t, pigment[1], 12);
    for (let i = 0; i < 3; i++) {
      const x = 1080 + i * 23;
      line(ctx, [[x,1104+i*6],[x+5,1131+i*5],[x-2,1156+i*9]], ox, oy, t, ink, 5-i*.7);
    }

    // Mathematics: a curved trace and tangent belong to the gold pool, without a boxed icon.
    line(ctx, [[1240,96],[1278,56],[1310,30],[1340,22],[1375,35],[1410,71],[1451,139]], ox, oy, t, cream, 4);
    line(ctx, [[1277,68],[1326,30],[1388,-15]], ox, oy, t, Palette.mathTangent, 4);
    oval(ctx, 1326, 30, 5, 5, 0, ox, oy, t, cream);
    // Photography: two open framing corners emerge from the lower lavender river.
    line(ctx, [[1650,1118],[1655,1081],[1692,1078]], ox, oy, t, cream, 5);
    line(ctx, [[1753,1124],[1750,1162],[1715,1168]], ox, oy, t, cream, 5);
  }
  function draw(ctx, time) {
    const t = Number.isFinite(time) ? Math.max(0, time) : 0;
    ctx.save();
    setTexture(ctx, t);
    ctx.fillStyle = ink; ctx.fillRect(-12000, -9000, 24000, 18000);
    if (texture) { ctx.fillStyle = texture; ctx.fillRect(-12000, -9000, 24000, 18000); }
    // The caller supplies the shared, axis-aligned world camera. Cull material cells outside it.
    const m = ctx.getTransform(), canvas = ctx.canvas;
    const x0 = -m.e / m.a, x1 = (canvas.width - m.e) / m.a;
    const y0 = -m.f / m.d, y1 = (canvas.height - m.f) / m.d;
    const firstX = Math.floor((Math.min(x0, x1) + speed * t - 450) / periodX);
    const lastX = Math.floor((Math.max(x0, x1) + speed * t + 450) / periodX);
    const firstY = Math.floor((Math.min(y0, y1) - 450) / periodY);
    const lastY = Math.floor((Math.max(y0, y1) + 450) / periodY);
    for (let iy = firstY; iy <= lastY; iy++) {
      for (let ix = firstX; ix <= lastX; ix++) {
        const ox = ix * periodX, oy = iy * periodY;
        routes.forEach((route, index) => ribbon(ctx, route, index, ox, oy, t));
        gifts(ctx, ox, oy, t);
      }
    }
    ctx.restore();
  }
  return {draw};
});
