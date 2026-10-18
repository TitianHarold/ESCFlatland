/* One material rule drives every rigid shell on the correction line. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./character-geometry.js'),require('./palette.js'),require('./city-map.js'),require('./portals.js'),require('./correction-rules.js'));
  else root.FlatlandFactory=factory(root.FlatlandCharacters,root.FlatlandPalette,root.FlatlandCityMap,root.FlatlandPortals,root.FlatlandCorrectionRules);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,P,CityMap,Portals,Rules){
  'use strict';
  if(!C||!P||!CityMap||!Portals||!Rules)throw new Error('Load characters, palette, city-map, portals and correction-rules before factory.');
  const origin={x:-4000,y:-2800},angle=.4,cs=Math.cos(angle),sn=Math.sin(angle),normal=[-sn,cs];
  const rows=Array.from({length:15},(_,i)=>i<3?-390+i*260:i===3?650:1170+(i-4)*260),stations=[480,-120,-750];
  const ink=P.industrial,correctedBlack=P.black||'#000000',paper=P.conveyor,colors=P.factory.workers,clamp=n=>Math.max(0,Math.min(1,n)),lerp=(a,b,u)=>a+(b-a)*u;
  const ease=n=>{const u=clamp(n);return u*u*u*(u*(u*6-15)+10);},between=(t,a,b)=>ease((t-a)/(b-a));
  const world=(x,y)=>({x:origin.x+x*cs-y*sn,y:origin.y+x*sn+y*cs});
  const local=p=>({x:(p.x-origin.x)*cs+(p.y-origin.y)*sn,y:-(p.x-origin.x)*sn+(p.y-origin.y)*cs});
  const entrance={x:-3000,y:-2100},discard=world(-2200,390),chaseEnd={x:-800,y:discard.y-3300};
  const heroActor=C.create('child'),backgroundActors=rows.map((_,row)=>Array.from({length:3},()=>C.create({sides:row+3,radius:45,regular:false})));
  const guards=Array.from({length:3},()=>new C.Character('guard',[[0,-60],[12,48],[-12,48]],0));
  function hardPose(actor,x,y,heading=angle-Math.PI){
    const body={x,y,angle:0,sx:1,sy:1,bend:0,strain:0,bounce:0,edgeBends:actor.vertices.map(()=>0),edgeStretch:actor.vertices.map(()=>1)};
    body.angle=heading-actor.headAxis(body).angle;return body;
  }
  function lanePose(actor,x,y,rotation=0){const p=world(x,y);return hardPose(actor,p.x,p.y,angle-Math.PI+rotation);}
  function cubic(points,t){const u=1-t,[a,b,c,d]=points;return{x:u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],y:u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1],dx:3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]),dy:3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1])};}
  function makePath(curves,localSpace=true){
    const segments=curves.map(curve=>{const points=localSpace?curve.map(([x,y])=>{const p=world(x,y);return[p.x,p.y];}):curve,lengths=[0];let previous=cubic(points,0);
      for(let i=1;i<=32;i++){const p=cubic(points,i/32);lengths.push(lengths[i-1]+Math.hypot(p.x-previous.x,p.y-previous.y));previous=p;}
      return{points,lengths,length:lengths[32]};});return{segments,length:segments.reduce((sum,s)=>sum+s.length,0)};
  }
  function pathPoint(path,distance){
    let d=Math.max(0,Math.min(path.length,distance)),segment=path.segments[0];
    for(const item of path.segments){segment=item;if(d<=item.length)break;d-=item.length;}
    let i=1;while(i<32&&d>segment.lengths[i])i++;
    const t=(i-1+clamp((d-segment.lengths[i-1])/(segment.lengths[i]-segment.lengths[i-1])))/32,p=cubic(segment.points,t);
    if(distance>=path.length){const end=path.segments.at(-1).points[3];p.x=end[0];p.y=end[1];}
    p.heading=Math.atan2(p.dy,p.dx);return p;
  }
  function pathPose(actor,path,d){const p=pathPoint(path,d);return hardPose(actor,p.x,p.y,p.heading);}
  const entryStart=local(entrance),entryHeading=CityMap.gate.heading-angle;
  const entryCurves=[[[entryStart.x,entryStart.y],[entryStart.x+120*Math.cos(entryHeading),entryStart.y+120*Math.sin(entryHeading)],[1020,130],[900,130]]];
  const entryPath=makePath(entryCurves),entryPortal=CityMap.gate.portal;
  const exitPoint=world(-1750,390),exitPortal={point:[exitPoint.x,exitPoint.y],heading:angle+Math.PI,halfWidth:110,halfDepth:12,wallSpan:180,opening:t=>between(t,100.9,101.45)};
  const escortCurves=[
    [[-150,130],[-350,130],[-550,130],[-750,130]],
    [[-750,130],[-870,130],[-1040,130],[-1040,260]],
    [[-1040,260],[-1040,390],[-1170,390],[-1300,390]],
    [[-1300,390],[-1460,390],[-1640,390],[-1750,390]],
    [[-1750,390],[-1780,390],[-1820,390],[-1850,390]],
    [[-1850,390],[-1970,390],[-2090,390],[-2200,390]]
  ];
  const escortPath=makePath(escortCurves),escortStart=escortPath.segments[0].length,escortTimes=[[98.6,99.6],[99.6,100.8],[100.8,102],[102,102.8]];
  function escortDistance(t){let distance=escortStart;for(let i=0;i<escortTimes.length;i++){const[a,b]=escortTimes[i],length=escortPath.segments[i+1].length;if(t<b)return distance+length*between(t,a,b);distance+=length;}return distance;}
  function escortBody(actor,t,offset=0){
    const from=escortStart+offset,planned=escortDistance(t)+offset,pose=d=>pathPose(actor,escortPath,d);
    const safe=Portals.clampTravel(actor,pose,from,planned,exitPortal,t);return pose(safe);
  }
  const thrownFrom=pathPoint(escortPath,escortDistance(102.8)),throwHeading=angle+Math.PI;
  const throwPath=makePath([[[thrownFrom.x,thrownFrom.y],[thrownFrom.x+90*Math.cos(throwHeading),thrownFrom.y+90*Math.sin(throwHeading)],[discard.x-160,discard.y],[discard.x,discard.y]]],false);
  // One diagonal curve: both world coordinates advance throughout the chase.
  // Squared time accelerates continuously; the reported speed is the exact cubic derivative.
  const chaseCurve=[[discard.x,discard.y],[lerp(discard.x,chaseEnd.x,.25),lerp(discard.y,chaseEnd.y,.30)],[lerp(discard.x,chaseEnd.x,.60),lerp(discard.y,chaseEnd.y,.65)],[chaseEnd.x,chaseEnd.y]];
  function chasePoint(t,lead=0){
    const u=clamp((t-119)/13),q=Math.min(1,u*u+lead),p=cubic(chaseCurve,q);
    p.heading=Math.atan2(p.dy,p.dx);p.speed=Math.hypot(p.dx,p.dy)*2*u/13;return p;
  }
  const heroPressBody=lanePose(heroActor,480,130),heroProgram=Rules.pressProgram(heroActor,heroPressBody,{normal,contactTime:74,material:Rules.materials.hero});
  const programs=backgroundActors.map((line,row)=>line.map(actor=>Rules.pressProgram(actor,lanePose(actor,480,rows[row]),{normal,contactTime:7,material:Rules.materials.ordinary})));
  function materialState(program,time,turns,stamped){const press=Rules.pressState(program,time),mixed=Rules.mixState(press.damage,turns,program.material),judged=Rules.judge(mixed,stamped);return{...press,...mixed,...judged};}
  function heroMaterial(t){return materialState(heroProgram,t,3*between(t,80,87),t>=94.5);}
  function heroBody(t){
    if(t<64){const pose=d=>pathPose(heroActor,entryPath,d),planned=entryPath.length*between(t,58,64),safe=Portals.clampTravel(heroActor,pose,0,planned,entryPortal,t);return pose(safe);}
    if(t<70)return lanePose(heroActor,900,130);
    if(t<72)return lanePose(heroActor,lerp(900,480,between(t,70,72)),130);
    if(t<77)return lanePose(heroActor,480,130);
    if(t<80)return lanePose(heroActor,lerp(480,-120,between(t,77,80)),130);
    if(t<87)return lanePose(heroActor,-120,130,Math.PI*6*between(t,80,87));
    if(t<90)return lanePose(heroActor,lerp(-120,-750,between(t,87,90)),130);
    if(t<98.6)return lanePose(heroActor,-750,130);
    if(t<102.8)return escortBody(heroActor,t);
    if(t<104)return pathPose(heroActor,throwPath,throwPath.length*between(t,102.8,104));
    if(t<119){const attempt=Math.max(0,Math.sin(Math.PI*clamp((t-105)/1.3)))*3*(t<106.3?1:0);return hardPose(heroActor,discard.x+attempt,discard.y-attempt*.3,0);}
    const p=chasePoint(t),body=hardPose(heroActor,p.x,p.y,p.heading);
    body.speed=p.speed;body.strain=clamp(p.speed/1000);body.bounce=.006*Math.sin((t-119)*12)*clamp(p.speed/200);
    body.angle=p.heading-heroActor.headAxis(body).angle;return body;
  }
  function backgroundState(t,row,slot){
    const raw=t-64+row*.83+slot*15,age=((raw%45)+45)%45,actor=backgroundActors[row][slot];let x=900,station=-1,turns=0;
    if(age<5)x=lerp(900,480,between(age,0,5));
    else if(age<10){x=480;station=0;}
    else if(age<14)x=lerp(480,-120,between(age,10,14));
    else if(age<22){x=-120;station=1;turns=3*between(age,14,22);}
    else if(age<26){x=lerp(-120,-750,between(age,22,26));turns=3;}
    else if(age<32){x=-750;station=2;turns=3;}
    else{x=lerp(-750,-1470,between(age,32,45));turns=3;}
    const state=materialState(programs[row][slot],age,turns,age>=30),body=lanePose(actor,x,rows[row],station===1?turns*Math.PI*2:0);
    const corrected=age>=22;
    return makeEntry('worker-'+row+'-'+slot+'-'+Math.floor(raw/45),actor,body,corrected?correctedBlack:colors[row%colors.length],state,{row,slot,age,station,turns,cavity:!corrected});
  }
  // Successful ordinary shells become wholly opaque; failure alone receives a visible label.
  function makeEntry(id,actor,body,color,state,extra={}){return{id,actor,body,color,cavity:true,damage:state.damage,blacken:state.blacken,windowOpen:state.windowOpen,contact:state.contact,headGap:state.headGap,force:state.force,load:state.load,mixDose:state.mixDose,label:state.label==='reject'?'reject':undefined,result:state.result,compression:0,residual:0,machine:state,core:0,...extra};}
  function lightState(t,hero){
    if(t<112)return undefined;
    if(t<116.8){const u=between(t,112,116.8);return{x:hero.x+103*u,y:hero.y-80*u,r:10,glow:0,complete:false};}
    if(t<119){const u=between(t,116.8,119),ahead=chasePoint(119,.022),sway=Math.sin(u*Math.PI*2)*(1-u);return{x:hero.x+lerp(103,ahead.x-discard.x,u)+30*sway,y:hero.y+lerp(-80,ahead.y-discard.y,u)+22*sway,r:10,glow:.55*between(t,116.8,117.5),complete:true};}
    const ahead=chasePoint(t,.022);return{x:ahead.x,y:ahead.y,r:lerp(10,8.5,between(t,119,119.8)),glow:.55,complete:true};
  }
  let memoTime=NaN,memoFrame;
  function frame(time){
    const t=Number.isFinite(time)?Math.max(0,time):0;if(t===memoTime)return memoFrame;memoTime=t;const actors=[];
    if(t<58||t>=132)return memoFrame={actors,hero:null};
    if(t<104)for(let row=0;row<rows.length;row++)if(row!==2)for(let slot=0;slot<3;slot++)actors.push(backgroundState(t,row,slot));
    const hero=heroBody(t),state=heroMaterial(t),entry=makeEntry('hero',heroActor,hero,P.blue,state,{station:t>=72&&t<77?0:t>=80&&t<87?1:t>=90&&t<98.6?2:-1,core:t<112?1:0,coreVisible:t<112,coreGlow:0,emotion:t>=64&&t<66?'question':undefined});actors.push(entry);
    if(t>=97.5&&t<104)[180,-180,-360].forEach((offset,i)=>actors.push({id:'factory-guard-'+i,actor:guards[i],body:escortBody(guards[i],Math.max(98.6,t),offset),color:ink,cavity:false,core:0}));
    const chase=t>=119&&t<132?{x:hero.x,y:hero.y,startX:discard.x,startY:discard.y,speed:hero.speed,heading:chasePoint(t).heading}:undefined;
    return memoFrame={actors,hero,light:lightState(t,hero),burst:between(t,130,131.8),...(chase?{chase}:{})};
  }
  function setup(ctx){ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(angle);}
  function stroke(ctx,points,color,width=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function polygon(ctx,points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
  function drawPortal(ctx,portal,t,panelsOnly=false){const state=Portals.geometry(portal,t);if(!panelsOnly)state.walls.forEach(points=>polygon(ctx,points,P.outside.wall));state.panels.forEach(points=>polygon(ctx,points,P.metal));}
  function receivingBay(ctx){
    const nx=-Math.sin(entryHeading),ny=Math.cos(entryHeading),a=[entryStart.x+nx*150,entryStart.y+ny*150],b=[entryStart.x-nx*150,entryStart.y-ny*150];
    setup(ctx);polygon(ctx,[[900,0],a,b,[900,390]],P.factory.floor);
    stroke(ctx,[[900,50],[900,0],a],P.factory.outline,8);stroke(ctx,[b,[900,390],[900,210]],P.factory.outline,8);ctx.restore();
  }
  function drawEntry(ctx,time){if(time<58||time>=64)return;receivingBay(ctx);drawPortal(ctx,entryPortal,time);}
  function identityMark(ctx,x,y,sides){ctx.beginPath();for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2-Math.PI/2;if(i)ctx.lineTo(x+Math.cos(a)*20,y+Math.sin(a)*20);else ctx.moveTo(x+Math.cos(a)*20,y+Math.sin(a)*20);}ctx.closePath();ctx.fillStyle=ink;ctx.fill();}
  function belt(ctx,y,left,right,t){
    ctx.fillStyle=paper;ctx.fillRect(left,y-68,right-left,136);stroke(ctx,[[left,y-68],[right,y-68]],P.factory.conveyorEdge,3);stroke(ctx,[[left,y+68],[right,y+68]],P.factory.conveyorEdge,3);
    const shift=((t*54)%74+74)%74;for(let x=left-shift;x<right;x+=74)if(x>=left)stroke(ctx,[[x,y-57],[x,y+57]],P.factory.roller,2);
  }
  function drawBase(ctx,time){
    const t=Number.isFinite(time)?time:0;if(t<58||t>=104)return;setup(ctx);const far=rows.at(-1)+400;
    ctx.fillStyle=P.factory.floor;ctx.fillRect(-1750,-650,2650,far+650);
    stroke(ctx,[[-1750,far],[-1750,500]],P.factory.outline,8);stroke(ctx,[[-1750,280],[-1750,-650],[900,-650]],P.factory.outline,8);
    let wallY=-650;for(const y of rows){stroke(ctx,[[900,wallY],[900,y-80]],P.factory.outline,8);wallY=y+80;}stroke(ctx,[[900,wallY],[900,far]],P.factory.outline,8);
    for(let row=0;row<rows.length;row++){
      const y=rows[row];belt(ctx,y,-1390,-555,t);belt(ctx,y,-345,900,t);
      for(let station=0;station<3;station++){
        const x=stations[station];ctx.fillStyle=P.metal;ctx.fillRect(x-160,y-124,320,248);
        if(station===0){stroke(ctx,[[x-158,y-80],[x-158,y-124],[x+158,y-124],[x+158,y-80]],ink,12);stroke(ctx,[[x-158,y+80],[x-158,y+124],[x+158,y+124],[x+158,y+80]],ink,12);}
        else if(station===1){ctx.beginPath();ctx.arc(x,y,96,0,Math.PI*2);ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=9;ctx.stroke();}
        else{ctx.fillStyle=paper;ctx.fillRect(x-120,y-78,240,156);stroke(ctx,[[x-143,y-80],[x-143,y-111],[x+143,y-111],[x+143,y-80]],ink,9);stroke(ctx,[[x-143,y+80],[x-143,y+111],[x+143,y+111],[x+143,y+80]],ink,9);}
      }
      identityMark(ctx,835,y-104,row+3);
    }
    // These seams border real unbuilt gaps; no floor strip covers a belt or a machine.
    stroke(ctx,[[-555,270],[-555,744]],P.factory.aisle,2);stroke(ctx,[[-345,270],[-345,744]],P.factory.aisle,2);
    stroke(ctx,[[-1750,390],[-590,390]],P.factory.aisle,2);ctx.restore();receivingBay(ctx);drawPortal(ctx,entryPortal,t);drawPortal(ctx,exitPortal,t);
  }
  function pressForRow(t,row){
    if(row===2)return Rules.pressState(heroProgram,t);
    for(let slot=0;slot<3;slot++){const item=backgroundState(t,row,slot);if(item.station===0)return item.machine;}
    return{plannedGap:92,upperFace:-92,lowerFace:92,force:0,contact:false,headGap:92};
  }
  function drawOverlay(ctx,time){
    const t=Number.isFinite(time)?time:0;
    if(t>=58&&t<104){setup(ctx);
      for(let row=0;row<rows.length;row++){
        const y=rows[row],press=pressForRow(t,row),x=stations[0];ctx.fillStyle=ink;
        ctx.fillRect(x-118,y+press.upperFace-32,236,32);ctx.fillRect(x-118,y+press.lowerFace,236,32);
        ctx.fillRect(x-42,y-124,84,Math.max(0,124+press.upperFace-32));ctx.fillRect(x-42,y+press.lowerFace+32,84,Math.max(0,124-press.lowerFace-32));
        let rotation=t*.14,scan=(t*.2+row)%1;
        if(row===2){rotation=Math.PI*6*between(t,80,87);scan=between(t,90,94.5);}
        else for(let slot=0;slot<3;slot++){const item=backgroundState(t,row,slot);if(item.station===1)rotation=item.turns*Math.PI*2;if(item.station===2)scan=between(item.age,26,30);}
        ctx.save();ctx.translate(stations[1],y);ctx.rotate(rotation);stroke(ctx,[[0,-94],[0,-72]],ink,8);stroke(ctx,[[94,0],[72,0]],ink,8);ctx.restore();
        stroke(ctx,[[stations[2]-90+180*scan,y-73],[stations[2]-90+180*scan,y+73]],P.quiet,3);
      }
      ctx.restore();drawPortal(ctx,entryPortal,t,true);drawPortal(ctx,exitPortal,t,true);
    }
  }
  const anchors=Object.freeze({entrance:Object.freeze({...entrance}),factoryCenter:Object.freeze({...origin}),sampleStages:Object.freeze({m1:Object.freeze(world(480,-130)),m2:Object.freeze(world(-120,-130)),m3:Object.freeze(world(-750,-130))}),heroStages:Object.freeze({m1:Object.freeze(world(480,130)),m2:Object.freeze(world(-120,130)),m3:Object.freeze(world(-750,130))}),heroPress:Object.freeze(world(480,130)),exit:Object.freeze({...exitPoint}),discard:Object.freeze({...discard}),chaseEnd:Object.freeze({...chaseEnd}),chaseCorner:Object.freeze({x:chasePoint(125.5).x,y:chasePoint(125.5).y}),chaseTurnEnd:Object.freeze({x:chasePoint(128.75).x,y:chasePoint(128.75).y}),throwStart:Object.freeze({...world(-1850,390)}),chaseBounds:Object.freeze({minX:discard.x,maxX:-800,minY:chaseEnd.y,maxY:discard.y}),floorBounds:Object.freeze({left:-1750,right:900,top:-650,bottom:rows.at(-1)+400}),overview:Object.freeze({...world(-40,560),zoom:.22}),localRotation:angle,lanes:Object.freeze([...rows]),stationX:Object.freeze([...stations])});
  return{drawBase,drawEntry,frame,drawOverlay,anchors,portals:{entry:entryPortal,exit:exitPortal},pressProgram:heroProgram};
});
