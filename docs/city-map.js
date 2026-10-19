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
  function houseAsset(h){
    h.boundary=Portals.houseBoundary({id:h.id,polygon:h.polygon||pentagon(h),door:h.door||[h.x+h.w/2,h.y],doorWidth:h.doorWidth??220,cornerRadius:Math.min(42,Math.min(h.w,h.h)*.065),thickness:8});
    h.polygon=h.boundary.polygon;h.door=h.boundary.door.point;h.doorWidth=h.boundary.door.width;return h;
  }
  houseAsset(mainHouse);homes.forEach(h=>houseAsset(h));
  const backgroundHomes=[
    [-2520,-240,170,150],[-2220,-250,180,160],[-1920,-240,170,155],
    [-1450,100,285,245],[-1410,440,280,240],
    [-3440,-400,260,250],[-3390,20,265,250],[-3330,450,280,260],
    [-1450,-2550,200,240],[380,-2500,320,330],[390,-2050,300,300],
    [-1160,-3420,240,240],[-640,-3380,235,235],[-90,-3500,260,245],[490,-3510,255,245],[1080,-3400,260,250],
    [3330,-2250,260,260],[3390,-1760,260,250],[3390,-1260,270,250],
    [3330,500,300,310],[3750,700,340,350],[3320,1080,310,330],
    [-370,1460,160,185],[-180,1720,165,190],
    [-2420,1250,250,240],[-2360,1680,255,240]
  ].map(([x,y,w,h],i)=>houseAsset({id:'background-'+i,x,y,w,h,doorWidth:Math.min(110,w*.38)}));
  const houseBoundaries=[mainHouse,...homes,...backgroundHomes].map(h=>h.boundary),walls=houseBoundaries.flatMap(h=>h.walls);
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
  function softShape(ctx,points,fill,radius=32){shape(ctx,Portals.roundedPolygon(points,radius),fill);}
  function polyline(ctx,points,color,width){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
  function curves(ctx,list,color,width){ctx.beginPath();ctx.moveTo(...list[0][0]);list.forEach(c=>ctx.bezierCurveTo(...c[1],...c[2],...c[3]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
  function lerpPoint(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
  function bezier(c,t){const s=1-t;return[0,1].map(i=>s*s*s*c[0][i]+3*s*s*t*c[1][i]+3*s*t*t*c[2][i]+t*t*t*c[3][i]);}
  const artery=escortCurves.flatMap((c,i)=>Array.from({length:25},(_,j)=>({point:bezier(c,j/24),width:[210,260,230,240,250,310][i]+([260,230,240,250,310,300][i]-[210,260,230,240,250,310][i])*ease(j/24)})).filter((_,j)=>j%25!==0||j===0));
  const externalCurves=[[[ -4600,-650],[-3800,-650],[-3030,-850],[-2760,-150]]];
  const externalNorthwestCurves=[[[-4600,-650],[-3800,-1500],[-2700,-1070],[-2500,-1140]]];
  const externalNorthwestApproachCurves=[[[ -2500,-1140],[-2500,-1240],[-2440,-1310],[-2360,-1310]],[[-2360,-1310],[-2260,-1310],[-2180,-1221],[-2080,-1200]]];
  const northwestDepartureCurves=[[[ -2080,-980],[-2080,-1040],[-2160,-1050],[-2230,-1050]],[[-2230,-1050],[-2340,-1050],[-2510,-1080],[-2510,-1150]],[[-2510,-1150],[-2510,-1260],[-2650,-1450],[-2550,-1580]]];
  Object.assign(road,{externalCurves,externalNorthwestCurves,externalNorthwestApproachCurves,northwestDepartureCurves});
  const streetSpecs=[
    {curves:northernCurves,width:180},{curves:neighborhoodCurves,width:140},
    {curves:westernCurves,width:120},{curves:eastCurves,width:160},
    {curves:southCurves,width:170},{curves:externalCurves,width:130},
    {curves:externalNorthwestCurves,width:130},{curves:externalNorthwestApproachCurves,width:130},{curves:northwestDepartureCurves,width:150},
    {curves:[straight([650,-160],[1180,-40]),straight([1180,-40],[1487,80])],width:150}
  ];
  const publicCourt=[[-490,365],[-150,330],[120,530],[80,680],[-230,780],[-500,620]];
  const courtFloor=[[-350,440],[-170,415],[-30,545],[-60,620],[-240,675],[-370,580]];
  const publicBuilding=[[860,-790],[1120,-850],[1270,-720],[1230,-420],[840,-330]];
  const courtEntry=[[-150,200],[-170,330],[-205,465],[-200,520]];
  const forecourts=[
    [[200,80],[480,-80],[1160,-80],[1380,100],[1260,240],[340,240]],
    [[-1390,-910],[-930,-900],[-850,-780],[-844,-650],[-1436,-650],[-1480,-790]],
    [[-2340,-1200],[-1830,-1170],[-1730,-1080],[-1752,-980],[-2408,-980],[-2500,-1070]]
  ];
  function sampleCurves(list){
    return list.flatMap((c,i)=>{
      const length=c.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p[0]-c[j][0],p[1]-c[j][1]),0),count=Math.max(8,Math.ceil(length/18));
      return Array.from({length:count+1},(_,j)=>bezier(c,j/count)).filter((_,j)=>!i||j);
    });
  }
  function inPolygon(point,polygon){
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function segmentDistance(point,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],q=clamp(((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1));
    return Math.hypot(point[0]-a[0]-q*dx,point[1]-a[1]-q*dy);
  }
  function simplify(points,tolerance){
    if(points.length<3)return points;
    const keep=new Uint8Array(points.length),stack=[[0,points.length-1]];keep[0]=keep[points.length-1]=1;
    while(stack.length){
      const[a,b]=stack.pop();let distance=tolerance,index=-1;
      for(let i=a+1;i<b;i++){const d=segmentDistance(points[i],points[a],points[b]);if(d>distance){distance=d;index=i;}}
      if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}
    }
    return points.filter((_,i)=>keep[i]);
  }
  function routeAccesses(targets){
    const step=16,x0=-5000,y0=-3900,w=610,h=455,n=w*h,known=new Uint8Array(n);let clearance=44;
    const obstacles=[...houseBoundaries.map(h=>({polygon:h.polygon,bounds:h.bounds})),...[publicBuilding,publicCourt].map(polygon=>({polygon,bounds:{minX:Math.min(...polygon.map(p=>p[0])),maxX:Math.max(...polygon.map(p=>p[0])),minY:Math.min(...polygon.map(p=>p[1])),maxY:Math.max(...polygon.map(p=>p[1]))}}))];
    const point=i=>[x0+(i%w)*step,y0+Math.floor(i/w)*step];
    const cell=p=>Math.round((p[1]-y0)/step)*w+Math.round((p[0]-x0)/step);
    function blocked(i){
      if(i<0||i>=n)return true;if(known[i])return known[i]===2;
      const p=point(i),padding=clearance;
      const hit=obstacles.some(o=>{
        const b=o.bounds;if(p[0]<b.minX-padding||p[0]>b.maxX+padding||p[1]<b.minY-padding||p[1]>b.maxY+padding)return false;
        return inPolygon(p,o.polygon)||o.polygon.some((a,j)=>segmentDistance(p,a,o.polygon[(j+1)%o.polygon.length])<padding);
      });
      known[i]=hit?2:1;return hit;
    }
    const goals=[...new Set(targets.map(cell))].filter(i=>!blocked(i));
    function route(start,padding){
      clearance=padding;known.fill(0);
      const source=cell(start),goal=goals.filter(i=>!blocked(i)).reduce((best,i)=>{const p=point(i),d=Math.hypot(p[0]-start[0],p[1]-start[1]);return d<best.d?{i,d}:best;},{d:Infinity}).i;
      if(blocked(source)||goal===undefined)throw new Error('No clear house access start.');
      const g=new Float32Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n),heap=[];
      const target=point(goal),heuristic=i=>{const p=point(i);return Math.hypot(p[0]-target[0],p[1]-target[1])/step;};
      function push(i,cost){let k=heap.length;heap.push({i,cost});while(k){const j=(k-1)>>1;if(heap[j].cost<=cost)break;heap[k]=heap[j];k=j;}heap[k]={i,cost};}
      function pop(){const top=heap[0],last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let j=k*2+1;if(j+1<heap.length&&heap[j+1].cost<heap[j].cost)j++;if(heap[j].cost>=last.cost)break;heap[k]=heap[j];k=j;}heap[k]=last;}return top.i;}
      g[source]=0;push(source,heuristic(source));
      while(heap.length){
        const i=pop();if(closed[i])continue;if(i===goal){const path=[];for(let j=i;j>=0;j=parent[j])path.push(point(j));return simplify(path.reverse(),step*.7);}
        closed[i]=1;const x=i%w,y=Math.floor(i/w);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if((!dx&&!dy)||x+dx<0||x+dx>=w||y+dy<0||y+dy>=h)continue;
          const j=i+dy*w+dx;if(closed[j]||blocked(j)||(dx&&dy&&(blocked(i+dx)||blocked(i+dy*w))))continue;
          const cost=g[i]+(dx&&dy?Math.SQRT2:1);if(cost<g[j]){g[j]=cost;parent[j]=i;push(j,cost+heuristic(j));}
        }
      }
      throw new Error('House access cannot reach a street.');
    }
    const accesses=[{houseId:'main',points:sampleCurves([escortCurves[0]]),width:210,join:escortCurves[0][3]}];
    for(const home of homes)accesses.push({houseId:home.id,points:sampleCurves(home.accessCurves),width:Math.min(200,home.doorWidth*.9),join:home.roadJoin});
    for(const home of backgroundHomes){
      const normal=home.boundary.door.normal,width=Math.max(54,Math.min(80,home.doorWidth*.75)),start=home.door.map((v,i)=>v-normal[i]*60),points=[home.door,start,...route(start,width/2+6)];
      accesses.push({houseId:home.id,points,width,join:points[points.length-1]});
    }
    return accesses;
  }
  function strokePolygons(points,width){
    const left=[],right=[],widthAt=i=>typeof width==='number'?width:width[i];
    points.forEach((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,r=widthAt(i)/2;left.push([p[0]-dy/length*r,p[1]+dx/length*r]);right.push([p[0]+dy/length*r,p[1]-dx/length*r]);});
    return[[...left,...right.reverse()],...[0,points.length-1].map(i=>Array.from({length:24},(_,j)=>{const a=j*Math.PI/12,r=widthAt(i)/2;return[points[i][0]+Math.cos(a)*r,points[i][1]+Math.sin(a)*r];}))];
  }
  function rasterPolygon(mask,w,h,bounds,step,polygon){
    const minY=Math.max(0,Math.ceil((Math.min(...polygon.map(p=>p[1]))-bounds.minY)/step-.5)),maxY=Math.min(h-1,Math.floor((Math.max(...polygon.map(p=>p[1]))-bounds.minY)/step-.5));
    for(let y=minY;y<=maxY;y++){
      const worldY=bounds.minY+(y+.5)*step,cuts=[];
      polygon.forEach((a,i)=>{const b=polygon[(i+1)%polygon.length];if((a[1]>worldY)!==(b[1]>worldY))cuts.push(a[0]+(worldY-a[1])*(b[0]-a[0])/(b[1]-a[1]));});cuts.sort((a,b)=>a-b);
      for(let i=0;i+1<cuts.length;i+=2){const a=Math.max(0,Math.ceil((cuts[i]-bounds.minX)/step-.5)),b=Math.min(w-1,Math.floor((cuts[i+1]-bounds.minX)/step-.5));if(b>=a)mask.fill(1,y*w+a,y*w+b+1);}
    }
  }
  function distanceField(mask,w,h,value){
    const size=Math.max(w,h),f=new Float64Array(size),d=new Float64Array(size),v=new Int32Array(size),z=new Float64Array(size+1),temp=new Float32Array(w*h),out=new Float32Array(w*h);
    function line(length){
      let k=0;v[0]=0;z[0]=-Infinity;z[1]=Infinity;
      for(let q=1;q<length;q++){let s;do{s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*(q-v[k]));if(s>z[k])break;k--;}while(k>=0);k++;v[k]=q;z[k]=s;z[k+1]=Infinity;}
      k=0;for(let q=0;q<length;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+f[v[k]];}
    }
    for(let y=0;y<h;y++){for(let x=0;x<w;x++)f[x]=mask[y*w+x]===value?0:1e12;line(w);for(let x=0;x<w;x++)temp[y*w+x]=d[x];}
    for(let x=0;x<w;x++){for(let y=0;y<h;y++)f[y]=temp[y*w+x];line(h);for(let y=0;y<h;y++)out[y*w+x]=d[y];}
    return out;
  }
  function morph(mask,w,h,radius,dilate){
    const distances=distanceField(mask,w,h,dilate?1:0),out=new Uint8Array(mask.length),r2=radius*radius;
    for(let i=0;i<mask.length;i++)out[i]=dilate?(distances[i]<=r2?1:0):(distances[i]>r2?1:0);
    return out;
  }
  function smoothContour(points){
    // Raw contour samples have equal arc length; remove grid-scale ripples before fitting the closed curve.
    const radius=10,weights=Array.from({length:radius*2+1},(_,i)=>Math.exp(-((i-radius)*(i-radius))/32)),total=weights.reduce((a,b)=>a+b,0),n=points.length;
    return points.map((_,i)=>{const p=[0,0];weights.forEach((weight,j)=>{const q=points[(i+j-radius+n)%n];p[0]+=q[0]*weight;p[1]+=q[1]*weight;});return p.map(v=>v/total);});
  }
  function pavementCorners(points){
    return points.map((point,i)=>{
      const before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length],a=Math.hypot(before[0]-point[0],before[1]-point[1]),b=Math.hypot(after[0]-point[0],after[1]-point[1]),cut=Math.min(24,a*.35,b*.35);
      return{point,from:lerpPoint(point,before,cut/a),to:lerpPoint(point,after,cut/b)};
    });
  }
  function sampledPavement(points){
    const result=[];
    for(const{point:p,from:a,to:b}of pavementCorners(points)){
      const count=Math.max(2,Math.ceil((Math.hypot(p[0]-a[0],p[1]-a[1])+Math.hypot(b[0]-p[0],b[1]-p[1]))/6));
      for(let j=0;j<=count;j++){const t=j/count,s=1-t;result.push([s*s*a[0]+2*s*t*p[0]+t*t*b[0],s*s*a[1]+2*s*t*p[1]+t*t*b[1]]);}
    }
    return result;
  }
  function contours(mask,w,h,bounds,step){
    const stride=w+1,edges=[],starts=new Map();
    function edge(a,b,dir){const item={a,b,dir,used:false};edges.push(item);if(!starts.has(a))starts.set(a,[]);starts.get(a).push(item);}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){
      const a=y*stride+x,b=a+1,c=b+stride,d=a+stride;
      if(!y||!mask[(y-1)*w+x])edge(a,b,0);if(x===w-1||!mask[y*w+x+1])edge(b,c,1);
      if(y===h-1||!mask[(y+1)*w+x])edge(c,d,2);if(!x||!mask[y*w+x-1])edge(d,a,3);
    }
    const result=[],world=i=>[bounds.minX+(i%stride)*step,bounds.minY+Math.floor(i/stride)*step];
    for(const first of edges){
      if(first.used)continue;let item=first,loop=[];
      do{item.used=true;loop.push(world(item.a));const options=(starts.get(item.b)||[]).filter(e=>!e.used),priority=[(item.dir+1)%4,item.dir,(item.dir+3)%4,(item.dir+2)%4];item=options.sort((a,b)=>priority.indexOf(a.dir)-priority.indexOf(b.dir))[0];}while(item&&item!==first);
      if(loop.length<4)continue;
      loop=smoothContour(loop);
      let split=1,distance=0;loop.forEach((p,i)=>{const d=Math.hypot(p[0]-loop[0][0],p[1]-loop[0][1]);if(d>distance){distance=d;split=i;}});
      const points=[...simplify(loop.slice(0,split+1),10).slice(0,-1),...simplify([...loop.slice(split),loop[0]],10).slice(0,-1)];
      if(points.length>=3)result.push(points);
    }
    return result;
  }
  let pavementAsset,pavementPath;
  function getPavement(){
    if(pavementAsset)return pavementAsset;
    const streets=streetSpecs.map(spec=>({points:sampleCurves(spec.curves),width:spec.width}));
    const targets=[...streets.flatMap(s=>s.points),...artery.map(s=>s.point)];
    const accesses=routeAccesses(targets),polygons=streets.flatMap(s=>strokePolygons(s.points,s.width));
    polygons.push(...strokePolygons(artery.map(s=>s.point),artery.map(s=>s.width)),plaza,...forecourts,forecourtPolygon,
      ...strokePolygons(sampleCurves([straight(at(-1080,0),at(210,0))]),300),courtFloor,
      ...strokePolygons(sampleCurves([courtEntry]),150),...houseBoundaries.map(h=>h.polygon));
    accesses.forEach(access=>polygons.push(...strokePolygons(access.points,access.width)));
    const points=polygons.flat(),step=8,closeRadius=88,openRadius=24,pad=closeRadius*3;
    const bounds={minX:Math.floor((Math.min(...points.map(p=>p[0]))-pad)/step)*step,minY:Math.floor((Math.min(...points.map(p=>p[1]))-pad)/step)*step,maxX:Math.ceil((Math.max(...points.map(p=>p[0]))+pad)/step)*step,maxY:Math.ceil((Math.max(...points.map(p=>p[1]))+pad)/step)*step};
    const w=Math.ceil((bounds.maxX-bounds.minX)/step),h=Math.ceil((bounds.maxY-bounds.minY)/step);let mask=new Uint8Array(w*h);
    polygons.forEach(polygon=>rasterPolygon(mask,w,h,bounds,step,polygon));
    // Smooth the completed union, including its blue negative spaces, instead of rounding each overlapping street separately.
    mask=morph(morph(mask,w,h,closeRadius/step,true),w,h,closeRadius/step,false);
    mask=morph(morph(mask,w,h,openRadius/step,false),w,h,openRadius/step,true);
    const loops=contours(mask,w,h,bounds,step),outlines=loops.map(sampledPavement);
    pavementAsset={loops,bounds,step,closeRadius,openRadius,accesses,courtEntry,externalCurves,externalNorthwestCurves,
      contains:point=>outlines.reduce((inside,outline)=>inPolygon(point,outline)?!inside:inside,false)};
    road.accesses=accesses;return pavementAsset;
  }
  function tracePavement(path,loops){
    for(const points of loops){const corners=pavementCorners(points);path.moveTo(...corners[0].from);corners.forEach(({point,from,to},i)=>{if(i)path.lineTo(...from);path.quadraticCurveTo(...point,...to);});path.closePath();}
  }
  function drawPavement(ctx,color){
    const asset=getPavement();ctx.fillStyle=color;
    if(typeof Path2D!=='undefined'){if(!pavementPath){pavementPath=new Path2D();tracePavement(pavementPath,asset.loops);}ctx.fill(pavementPath,'evenodd');}
    else{ctx.beginPath();tracePavement(ctx,asset.loops);ctx.fill('evenodd');}
  }
  road.getPavement=getPavement;
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
  function offsetWallPath(boundary,distance){
    const points=boundary.wallPath,winding=Math.sign(boundary.polygon.reduce((area,a,i)=>{const b=boundary.polygon[(i+1)%boundary.polygon.length];return area+a[0]*b[1]-b[0]*a[1];},0))||1;
    const outward=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;return[winding*dy/length,-winding*dx/length];};
    return points.map((point,i)=>{
      const a=outward(points[Math.max(0,i-1)],points[Math.max(1,i)]),b=outward(points[Math.min(points.length-2,i)],points[Math.min(points.length-1,i+1)]);
      const x=a[0]+b[0],y=a[1]+b[1],scale=(Array.isArray(distance)?distance[i]:distance)/Math.max(.5,x*a[0]+y*a[1]);
      return[point[0]+x*scale,point[1]+y*scale];
    });
  }
  function wallBounds(points){return{minX:Math.min(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxX:Math.max(...points.map(p=>p[0])),maxY:Math.max(...points.map(p=>p[1]))};}
  function makeWallMass(boundary,width,roundCaps=true){
    // The open path begins and ends at the existing doorway jambs. No polygon closes across it.
    const rawOuter=offsetWallPath(boundary,width),rawInner=offsetWallPath(boundary,-4),outer=[],inner=[];
    const add=(a,b)=>{outer.push(a);inner.push(b);},last=rawOuter.length-1;
    const quadratic=(a,b,c,t)=>[0,1].map(i=>(1-t)*(1-t)*a[i]+2*(1-t)*t*b[i]+t*t*c[i]);
    const roundEnd=(index,neighbor,start)=>{
      const o=rawOuter[index],inside=rawInner[index],next=rawOuter[neighbor],nextInner=rawInner[neighbor];
      const r=Math.min(18,Math.hypot(o[0]-inside[0],o[1]-inside[1])*.4,Math.hypot(next[0]-o[0],next[1]-o[1])*.2);
      const cap=lerpPoint(o,inside,r/(Math.hypot(o[0]-inside[0],o[1]-inside[1])||1)),q=r/(Math.hypot(next[0]-o[0],next[1]-o[1])||1),edge=lerpPoint(o,next,q),innerEdge=lerpPoint(inside,nextInner,q);
      for(let j=0;j<=4;j++){const t=start?j/4:1-j/4;add(quadratic(cap,o,edge,t),lerpPoint(inside,innerEdge,t));}
    };
    // Round the exposed jamb caps inward, preserving every original inner-wall segment.
    if(roundCaps)roundEnd(0,1,true);else add(rawOuter[0],rawInner[0]);
    for(let i=1;i<last;i++)add(rawOuter[i],rawInner[i]);
    if(roundCaps)roundEnd(last,last-1,false);else add(rawOuter[last],rawInner[last]);
    const walls=outer.slice(1).map((point,i)=>[outer[i],point,inner[i+1],inner[i]]);
    return{outer,inner,opening:[outer[0],outer[outer.length-1],inner[inner.length-1],inner[0]],
      polygon:[...outer,...inner.slice().reverse()],walls,width:Array.isArray(width)?Math.max(...width):width,outerWidths:Array.isArray(width)?width.slice():rawOuter.map(()=>width),innerOffset:4};
  }
  function massDistance(point,mass){
    let distance=Infinity;
    for(const polygon of mass.walls){
      if(inPolygon(point,polygon))return 0;
      for(let i=0;i<polygon.length;i++)distance=Math.min(distance,segmentDistance(point,polygon[i],polygon[(i+1)%polygon.length]));
    }
    return distance;
  }
  function initializeWallMasses(){
    // Freeze the existing access routes first; adding wall mass must not re-route the story.
    const accesses=getPavement().accesses;
    const streets=streetSpecs.flatMap(spec=>sampleCurves(spec.curves).map(point=>({point,radius:spec.width/2})))
      .concat(artery.map(({point,width})=>({point,radius:width/2})),accesses.flatMap(access=>access.points.map(point=>({point,radius:access.width/2}))));
    for(const h of [mainHouse,...homes,...backgroundHomes]){
      const boundary=h.boundary,desired=Math.max(24,Math.min(76,Math.min(h.w,h.h)*.085)),bounds=boundary.bounds;
      const nearby=streets.filter(({point,radius})=>point[0]>=bounds.minX-desired-radius&&point[0]<=bounds.maxX+desired+radius&&point[1]>=bounds.minY-desired-radius&&point[1]<=bounds.maxY+desired+radius);
      const baseline=makeWallMass(boundary,4,false),outerWidths=boundary.wallPath.map(()=>desired);
      // Taper only the affected stretches, keeping broad walls away from the street intact.
      for(let i=0;i<baseline.walls.length;i++){
        const oldWall=baseline.walls[i],limits=nearby.map(({point,radius})=>Math.min(radius,massDistance(point,{walls:[oldWall]})));
        const fits=quad=>nearby.every(({point},j)=>massDistance(point,{walls:[quad]})>=limits[j]-.15);
        let quad=makeWallMass(boundary,outerWidths,false).walls[i];
        if(!fits(quad)){
          const a=outerWidths[i],b=outerWidths[i+1];let lo=0,hi=1;
          for(let j=0;j<7;j++){
            const q=(lo+hi)/2,trial=outerWidths.slice();trial[i]=4+(a-4)*q;trial[i+1]=4+(b-4)*q;
            if(fits(makeWallMass(boundary,trial,false).walls[i]))lo=q;else hi=q;
          }
          outerWidths[i]=4+(a-4)*lo;outerWidths[i+1]=4+(b-4)*lo;
        }
      }
      // Spread a narrowed stretch smoothly along the perimeter rather than making corner spikes.
      for(let i=1;i<outerWidths.length;i++)outerWidths[i]=Math.min(outerWidths[i],outerWidths[i-1]+.35*Math.hypot(boundary.wallPath[i][0]-boundary.wallPath[i-1][0],boundary.wallPath[i][1]-boundary.wallPath[i-1][1]));
      for(let i=outerWidths.length-2;i>=0;i--)outerWidths[i]=Math.min(outerWidths[i],outerWidths[i+1]+.35*Math.hypot(boundary.wallPath[i+1][0]-boundary.wallPath[i][0],boundary.wallPath[i+1][1]-boundary.wallPath[i][1]));
      const mass=makeWallMass(boundary,outerWidths);
      h.wallMass=boundary.wallMass=mass;
      boundary.walls=mass.walls;boundary.wallBounds=mass.walls.map(wallBounds);boundary.bounds=wallBounds(mass.walls.flat());
      boundary.thickness=mass.width+mass.innerOffset;
    }
    walls.splice(0,walls.length,...houseBoundaries.flatMap(boundary=>boundary.walls));
  }
  initializeWallMasses();
  function house(ctx,h,p){
    shape(ctx,h.boundary.polygon,p.paper);
    shape(ctx,h.wallMass.polygon,p.ink);
  }
  function localRect(ctx,s0,t0,s1,t1,color){shape(ctx,[at(s0,t0),at(s0,t1),at(s1,t1),at(s1,t0)],color);}
  function institution(ctx,p){
    softShape(ctx,[at(-120,-1150),at(1350,-1400),at(2050,0),at(1350,1400),at(-120,1150)],p.outside.wall,80);
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
    parcels.forEach(points=>softShape(ctx,points,p.blue,100));
    // Public court walls are drawn before the same pavement asset opens its entrance.
    softShape(ctx,publicBuilding,p.ink,30);
    softShape(ctx,publicCourt,p.ink,30);
    institution(ctx,p);
    drawPavement(ctx,p.paper);
    backgroundHomes.forEach(h=>house(ctx,h,p));
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
  return{drawBase,drawGate,getPavement,homes,backgroundHomes,mainHouse,mainDoor,houseBoundaries,walls,escortCurves,gate,forecourtSlots,road,plaza,detaineeHomeIds:['west','northwest']};
});
