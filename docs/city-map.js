/* Shared plan geometry: streets, households and escort motion use the same doors. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(undefined,require('./portals.js'));
  else root.FlatlandCityMap=factory(root.FlatlandPalette,root.FlatlandPortals);
})(typeof globalThis!=='undefined'?globalThis:this,function(defaultPalette,Portals){
  'use strict';
  if(!Portals)throw new Error('Load portals.js before city-map.js.');
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mainDoor=[800,240];
  const mainHouse={id:'main',x:260,y:240,w:1080,h:840,polygon:[[340,240],[1260,240],[1340,800],[800,1080],[260,800]],door:mainDoor,doorWidth:220};
  const escortCurves=[
    [[800,240],[800,110],[600,30],[370,-90]],
    [[370,-90],[140,-210],[-360,-300],[-600,-600]],
    [[-600,-600],[-840,-900],[-1000,-860],[-1140,-920]],
    [[-1140,-920],[-1280,-980],[-1660,-1110],[-2080,-1200]],
    [[-2080,-1200],[-2280,-1243],[-2430,-1450],[-2550,-1580]],
    [[-2550,-1580],[-2670,-1710],[-2860,-1950],[-3000,-2100]]
  ];
  const homes=[
    {id:'northwest',x:-2490,y:-980,w:820,h:650,adults:[4,'line'],kids:[5,3],offset:3},
    {id:'west',x:-1510,y:-650,w:740,h:550,adults:[4,6],kids:[3],offset:11},
    {id:'north',x:-1150,y:-2600,w:1400,h:850,adults:[7],kids:[],offset:0},
    {id:'upper',x:-90,y:-1520,w:800,h:680,adults:[6,'line'],kids:['line'],offset:17},
    {id:'northeast',x:1000,y:-2350,w:1500,h:900,adults:[7,8,'line'],kids:[6,5],offset:8},
    {id:'east',x:1650,y:-600,w:1050,h:760,adults:[5,6],kids:[6],offset:15},
    {id:'east-solo',x:1820,y:650,w:760,h:560,adults:[3],kids:[],offset:0},
    {id:'south',x:240,y:1390,w:900,h:580,adults:[4,'line'],kids:[4],offset:21},
    {id:'southwest',x:-1180,y:1050,w:760,h:560,adults:[5],kids:[],offset:0}
  ];
  function pentagon(h){return[[h.x+h.w*.10,h.y],[h.x+h.w*.90,h.y],[h.x+h.w,h.y+h.h*.65],[h.x+h.w*.5,h.y+h.h],[h.x,h.y+h.h*.65]];}
  function straight(a,b){return[a,[a[0]+(b[0]-a[0])/3,a[1]+(b[1]-a[1])/3],[a[0]+(b[0]-a[0])*2/3,a[1]+(b[1]-a[1])*2/3],b];}
  homes.forEach(h=>{h.polygon=pentagon(h);h.door=[h.x+h.w/2,h.y];h.doorWidth=220;});
  const west=homes.find(h=>h.id==='west'),northwest=homes.find(h=>h.id==='northwest');
  west.roadJoin=[-1140,-920];west.accessCurves=[[[...west.door],[-1140,-780],[-1030,-873],west.roadJoin]];
  northwest.roadJoin=[-2080,-1200];northwest.accessCurves=[[[...northwest.door],[-2080,-1100],[-1980,-1179],northwest.roadJoin]];
  const joins={north:[-450,-2780],upper:[310,-1640],northeast:[1750,-2530],east:[2175,-1020],'east-solo':[2200,450],south:[690,1220],southwest:[-800,650+150*230/790]};
  homes.forEach(h=>{if(!h.accessCurves){h.roadJoin=joins[h.id];h.accessCurves=[straight(h.door,h.roadJoin)];}});
  const plaza=[[-750,-520],[-590,-680],[-310,-720],[170,-670],[580,-360],[650,-160],[440,110],[140,230],[-300,220],[-665,10]];
  // Unequal loops keep the existing door joins, without a rectangular street grid.
  const ring=[[-600,-600],[-650,-1640],[310,-1640],[830,-1640],[1450,-1020],[1470,-300],[1500,350],[1480,1000],[1300,1220],[690,1220],[-160,1190],[-290,900],[-800,650+150*230/790],[-620,100],[-600,-600]];
  const upperStreet=[[-650,-1640],[-1390,-1640],[-1640,-2460],[-1700,-2920],[-450,-2780],[1050,-2910],[1750,-2530],[2860,-2480],[2960,-1320],[2175,-1020],[1450,-1020]];
  const easternStreet=[[1500,350],[2200,450],[2860,450],[2900,1440],[1520,1470],[1300,1220]];
  const southernStreet=[[-800,650+150*230/790],[-1560,860],[-1540,2040],[-180,2240],[1230,2110],[1520,1470]];
  const eastCurves=[
    [[1500,350],[1770,390],[1980,450],[2200,450]],
    [[2200,450],[2490,450],[2740,370],[2860,450]],
    [[2860,450],[3110,840],[2970,1370],[2800,1440]],
    [[2800,1440],[2400,1560],[1850,1510],[1520,1470]],
    straight([1520,1470],[1300,1220])
  ];
  const southCurves=[
    straight(southernStreet[0],[-1560,860]),
    [[-1560,860],[-1800,1200],[-1800,1850],[-1540,2040]],
    [[-1540,2040],[-1100,2240],[-500,2320],[-180,2240]],
    [[-180,2240],[320,2160],[800,2200],[1230,2110]],
    [[1230,2110],[1420,1960],[1470,1660],[1520,1470]]
  ];
  const neighborhoodCurves=[
    [[-600,-600],[-600,-1000],[-760,-1560],[-650,-1640]],
    [[-650,-1640],[-420,-1710],[80,-1640],[310,-1640]],
    straight([310,-1640],[830,-1640]),
    [[830,-1640],[1110,-1600],[1440,-1310],[1450,-1020]],
    [[1450,-1020],[1460,-700],[1460,-100],[1500,350]],
    [[1500,350],[1520,650],[1550,1050],[1300,1220]],
    [[1300,1220],[1120,1230],[900,1220],[690,1220]],
    [[690,1220],[390,1220],[30,1260],[-160,1190]],
    [[-160,1190],[-230,1070],[-300,920],[-800,650+150*230/790]],
    [[-800,650+150*230/790],[-960,450],[-650,-250],[-600,-600]]
  ];
  const northernCurves=[
    [[-650,-1640],[-970,-1620],[-1250,-1500],[-1390,-1640]],
    [[-1390,-1640],[-1540,-1910],[-1740,-2580],[-1700,-2920]],
    [[-1700,-2920],[-1430,-3150],[-800,-2780],[-450,-2780]],
    [[-450,-2780],[100,-2780],[600,-3030],[1050,-2910]],
    [[1050,-2910],[1290,-2840],[1500,-2530],[1750,-2530]],
    [[1750,-2530],[2100,-2530],[2640,-2630],[2860,-2480]],
    [[2860,-2480],[3100,-2250],[3150,-1580],[2960,-1320]],
    [[2960,-1320],[2800,-1100],[2460,-1020],[2175,-1020]],
    [[2175,-1020],[1900,-1020],[1640,-1090],[1450,-1020]]
  ];
  const westernCurves=[
    [[-1140,-920],[-1500,-960],[-1580,-910],[-1590,-700]],
    [[-1590,-700],[-1600,-450],[-1590,-150],[-1590,60]],
    [[-1590,60],[-1840,240],[-2580,180],[-2760,-150]],
    [[-2760,-150],[-2960,-500],[-2760,-1020],[-2500,-1140]],
    [[-2500,-1140],[-2320,-1200],[-2190,-1200],[-2080,-1200]]
  ];
  const lastRoad=escortCurves[escortCurves.length-1];
  const heading=Math.atan2(lastRoad[3][1]-lastRoad[2][1],lastRoad[3][0]-lastRoad[2][0]),ux=Math.cos(heading),uy=Math.sin(heading),nx=-uy,ny=ux;
  const gatePoint=[-3000,-2100];
  function at(s,t){return[gatePoint[0]+s*ux+t*nx,gatePoint[1]+s*uy+t*ny];}
  const forecourtSlots=[
    ['inspector',-180,320],['guard-1',-430,320],['guard-2',-680,320],['guard-3',-930,320],
    ['detainee-1',-430,-320],['detainee-2',-680,-320],['detainee-3',-930,-320]
  ].map(([id,s,t])=>{const[x,y]=at(s,t);return{id,x,y,point:[x,y],heading,approachCurves:[straight(at(s,0),[x,y])]};});
  const forecourtPolygon=[at(-1080,-500),at(-1080,520),at(-790,620),at(-360,560),at(-90,480),at(-90,-480),at(-720,-540)];
  const gatePortal={point:gatePoint,heading,halfWidth:150,halfDepth:18,wallStart:0,wallEnd:110,wallSpan:480,
    opening:time=>ease((time-56.8)/.8)*(1-ease((time-64)/1.2))};
  const gate={point:gatePoint,width:300,heading,portal:gatePortal,normal:[nx,ny],inward:[ux,uy],slots:forecourtSlots,
    forecourt:{polygon:forecourtPolygon,entry:[-2550,-1580],center:at(-550,0),corridorWidth:220,slots:forecourtSlots},
    innerPoint:at(320,0),innerCurves:[straight(gatePoint,at(320,0))]};
  const road={main:escortCurves,mainWidth:240,ring,ringWidth:140,upper:upperStreet,east:easternStreet,south:southernStreet,eastCurves,southCurves,neighborhoodCurves,northernCurves,westernCurves};
  function palette(value){const p=value||defaultPalette;if(!p)throw new Error('Pass FlatlandPalette to CityMap.drawBase/drawGate.');return p;}
  function shape(ctx,points,fill,stroke,width=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function polyline(ctx,points,color,width){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='butt';ctx.stroke();}
  function curves(ctx,list,color,width){ctx.beginPath();ctx.moveTo(...list[0][0]);list.forEach(c=>ctx.bezierCurveTo(...c[1],...c[2],...c[3]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='butt';ctx.stroke();}
  function lerpPoint(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
  function bezier(c,t){const s=1-t;return[0,1].map(i=>s*s*s*c[0][i]+3*s*s*t*c[1][i]+3*s*t*t*c[2][i]+t*t*t*c[3][i]);}
  const artery=escortCurves.flatMap((c,i)=>Array.from({length:25},(_,j)=>({point:bezier(c,j/24),width:[210,260,230,240,250,310][i]+([260,230,240,250,310,300][i]-[210,260,230,240,250,310][i])*ease(j/24)})).filter((_,j)=>j%25!==0||j===0));
  function ribbon(ctx,samples,color,extra=0){
    const left=[],right=[];
    samples.forEach((s,i)=>{const a=samples[Math.max(0,i-1)].point,b=samples[Math.min(samples.length-1,i+1)].point,dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,w=(s.width+extra)/2;left.push([s.point[0]-dy/l*w,s.point[1]+dx/l*w]);right.push([s.point[0]+dy/l*w,s.point[1]-dx/l*w]);});
    shape(ctx,[...left,...right.reverse()],color);
  }
  let grainTile,grainKey;
  function grain(ctx,p){
    if(!ctx.createPattern)return;
    const key=p.paper+p.ink;
    if(!grainTile||grainKey!==key){
      grainTile=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(192,192):typeof document!=='undefined'?document.createElement('canvas'):null;
      if(!grainTile)return;grainTile.width=grainTile.height=192;grainKey=key;
      const g=grainTile.getContext('2d');let seed=167;
      for(let i=0;i<950;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%192;seed=(seed*1664525+1013904223)>>>0;const y=seed%192;g.fillStyle=i%3?p.paper:p.ink;g.globalAlpha=.045;g.fillRect(x,y,i%4===0?2:1,1);}
    }
    const pattern=ctx.createPattern(grainTile,'repeat');if(pattern){ctx.fillStyle=pattern;ctx.fillRect(-8000,-6500,14000,11500);}
  }
  function house(ctx,h,p){
    shape(ctx,h.polygon,p.paper);
    // A plan cut exposes the family, with one real opening in the flat north wall.
    const a=h.polygon[0],b=h.polygon[1],half=h.doorWidth/2;
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),tx=dx/length,ty=dy/length;
    const left=[h.door[0]-tx*half,h.door[1]-ty*half],right=[h.door[0]+tx*half,h.door[1]+ty*half];
    polyline(ctx,[right,...h.polygon.slice(1),a,left],p.ink,8);
  }
  function localRect(ctx,s0,t0,s1,t1,color){shape(ctx,[at(s0,t0),at(s0,t1),at(s1,t1),at(s1,t0)],color);}
  function institution(ctx,p){
    shape(ctx,[at(-120,-1150),at(1350,-1400),at(2050,0),at(1350,1400),at(-120,1150)],p.outside.wall);
    // A single recessed frontage joins the gatehouses to the institution itself.
    shape(ctx,[at(-150,-480),at(-150,480),at(0,480),at(0,150),at(210,150),at(210,-150),at(0,-150),at(0,-480)],p.paper);
    polyline(ctx,[at(-120,-1150),at(-120,-480),at(0,-480),at(0,-150)],p.blue,14);
    polyline(ctx,[at(-120,1150),at(-120,480),at(0,480),at(0,150)],p.blue,14);
    // These are flat courtyards cut into two unequal wings, not roofs or windows.
    shape(ctx,[at(430,-1080),at(1010,-1140),at(1160,-760),at(430,-650)],p.navy);
    shape(ctx,[at(600,600),at(1130,680),at(1200,1060),at(600,990)],p.navy);
  }
  function drawBase(ctx,time,value){
    const p=palette(value);ctx.save();
    ctx.fillStyle=p.navy;ctx.fillRect(-8000,-6500,14000,11500);
    // Garden-suburb groups share streets and setbacks; the outer fields remain largely empty.
    const parcels=[[
      [-3640,-780],[-2680,-1230],[-1920,-2240],[-1750,-3650],[1420,-3660],
      [3780,-2860],[3830,-1030],[4520,380],[4190,2200],[1660,2230],
      [970,3100],[-2200,2980],[-2770,2040],[-2650,970],[-3200,1070],[-3650,300]
    ]];
    parcels.forEach(points=>shape(ctx,points,p.blue));
    // The continuous perimeter streets enclose unequal blocks, rather than ending at each house.
    curves(ctx,northernCurves,p.paper,180);
    curves(ctx,neighborhoodCurves,p.paper,140);
    curves(ctx,westernCurves,p.paper,120);
    curves(ctx,eastCurves,p.paper,160);
    curves(ctx,southCurves,p.paper,170);
    polyline(ctx,[[650,-160],[1180,-40],[1487,80]],p.paper,150);
    ribbon(ctx,artery,p.paper);
    shape(ctx,plaza,p.paper);
    // These shared forecourts contain the accepted access paths without drawing driveway fingers.
    shape(ctx,[[200,80],[480,-80],[1160,-80],[1380,100],[1260,240],[340,240]],p.paper);
    shape(ctx,[[-1390,-910],[-930,-900],[-850,-780],[-844,-650],[-1436,-650],[-1480,-790]],p.paper);
    shape(ctx,[[-2340,-1200],[-1830,-1170],[-1730,-1080],[-1752,-980],[-2408,-980],[-2500,-1070]],p.paper);
    const closedHomes=[
      [-2520,-240,170,150],[-2220,-250,180,160],[-1920,-240,170,155],
      [-1450,100,285,245],[-1410,440,280,240],
      [-3440,-400,260,250],[-3390,20,265,250],[-3330,450,280,260],
      [-1450,-2550,200,240],[380,-2500,320,330],[390,-2050,300,300],
      [-1160,-3420,240,240],[-640,-3380,235,235],[-90,-3500,260,245],[490,-3510,255,245],[1080,-3400,260,250],
      [3330,-2250,260,260],[3390,-1760,260,250],[3390,-1260,270,250],
      [3330,500,300,310],[3750,700,340,350],[3320,1080,310,330],
      [-370,1460,160,185],[-180,1720,165,190],
      [-2420,1250,250,240],[-2360,1680,255,240]
    ];
    closedHomes.forEach(([x,y,w,h])=>shape(ctx,pentagon({x,y,w,h}),p.ink));
    // A few larger public footprints balance the smaller residential groups.
    shape(ctx,[[860,-790],[1120,-850],[1270,-720],[1230,-420],[840,-330]],p.ink);
    shape(ctx,[[-490,365],[-150,330],[120,530],[80,680],[-230,780],[-500,620]],p.ink);
    shape(ctx,[[-350,440],[-170,415],[-30,545],[-60,620],[-240,675],[-370,580]],p.paper);
    shape(ctx,[[-200,230],[-100,230],[-100,440],[-200,440]],p.paper);
    institution(ctx,p);
    shape(ctx,forecourtPolygon,p.paper);
    curves(ctx,[straight(at(-1080,0),at(210,0))],p.paper,300);
    homes.forEach(h=>house(ctx,h,p));house(ctx,mainHouse,p);
    grain(ctx,p);
    ctx.restore();
  }
  function drawGate(ctx,time,value){
    const p=palette(value),t=Number.isFinite(time)?time:0;
    const state=Portals.geometry(gatePortal,t);
    ctx.save();
    // The two gate jambs belong to the same recessed frontage, not detached huts.
    state.walls.forEach(polygon=>shape(ctx,polygon,p.outside.wall));
    state.panels.forEach(polygon=>shape(ctx,polygon,p.metal||p.line));
    polyline(ctx,[at(-36,-150),at(-36,150)],p.quiet||p.line,6);
    ctx.restore();
  }
  return{drawBase,drawGate,homes,mainHouse,mainDoor,escortCurves,gate,forecourtSlots,road,plaza,detaineeHomeIds:['west','northwest']};
});
