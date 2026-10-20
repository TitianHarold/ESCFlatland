/* Repeated planar offices. The same work clock drives residents, buttons and the distant gate. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./character-geometry.js'),require('./palette.js'),require('./factory.js'));
  else root.FlatlandOfficeWorld=factory(root.FlatlandCharacters,root.FlatlandPalette,root.FlatlandFactory);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,P,Base){
  'use strict';
  const rotation=Base.anchors.localRotation,cs=Math.cos(rotation),sn=Math.sin(rotation),origin=Base.anchors.factoryCenter,clamp=n=>Math.max(0,Math.min(1,n)),mod=(n,d)=>((n%d)+d)%d;
  const world=(x,y)=>({x:origin.x+x*cs-y*sn,y:origin.y+x*sn+y*cs}),local=p=>({x:(p.x-origin.x)*cs+(p.y-origin.y)*sn,y:-(p.x-origin.x)*sn+(p.y-origin.y)*cs});
  const end=local(Base.anchors.discard),center={x:end.x-650,y:end.y+540},pitch={x:1280,y:1000};
  const frozenCurve=points=>Object.freeze(points.map(p=>Object.freeze(p)));
  const entryCurves=Object.freeze({approach:frozenCurve([[-1750,130],[-1980,130],[end.x+150,end.y],[end.x,end.y]]),entry:frozenCurve([[end.x,end.y],[end.x-150,end.y],[center.x+430,center.y-200],[center.x+430,center.y]])});
  const cells=[];for(let r=-1;r<=2;r++)for(let c=-4;c<=0;c++){const main=r===0&&c===0,index=cells.length;cells.push({id:'office-'+(c+4)+'-'+(r+1),index,col:c,row:r,x:center.x+c*pitch.x,y:center.y+r*pitch.y,main,phase:main?0:r===0&&c>=-2?mod((c+2)*10/3,5):mod(index*.71,5),control:r===0&&c>=-2});}
  const shapes=Array.from({length:6},(_,i)=>C.create({sides:i+3,radius:45,regular:true}));
  const gate={id:'office-shared-gate',x:center.x+1200,y:center.y-1600,wall:{x:center.x+1180,y:center.y-2200,w:950,h:1200,r:64},halfOpening:100};
  const ellipse=Array.from({length:257},(_,i)=>{const a=i/256*Math.PI*2;return{x:430*Math.cos(a),y:240*Math.sin(a),a};}),lengths=[0];
  for(let i=1;i<ellipse.length;i++)lengths.push(lengths[i-1]+Math.hypot(ellipse[i].x-ellipse[i-1].x,ellipse[i].y-ellipse[i-1].y));
  function loopPoint(q){const d=mod(q,1)*lengths.at(-1);let i=1;while(i<256&&lengths[i]<d)i++;const u=(d-lengths[i-1])/(lengths[i]-lengths[i-1]),a=ellipse[i-1].a+(ellipse[i].a-ellipse[i-1].a)*u;return{x:430*Math.cos(a),y:240*Math.sin(a),heading:Math.atan2(240*Math.cos(a),-430*Math.sin(a))};}
  // Exact same five-second work cycle as the protagonist's established circuit.
  function workPoint(age){age=mod(age,5);let q,job=0,direction=1;
    if(age<1.7)q=age/1.7*.25;
    else if(age<2.15){q=.25;job=Math.sin((age-1.7)/.45*Math.PI);}
    else if(age<3.9)q=.25+(age-2.15)/1.75*.5;
    else if(age<4.35){q=.75;job=Math.sin((age-3.9)/.45*Math.PI);direction=-1;}
    else q=.75+(age-4.35)/.65*.25;
    const p=loopPoint(q);if(job){p.y+=direction*5*job;p.heading=direction*Math.PI/2;}return{...p,job,jobDirection:direction,age};
  }
  function heroPoint(t){const p=workPoint(t-98);return{...p,x:center.x+p.x,y:center.y+p.y};}
  function offsetFor(cell,i){return cell.main?(i+1)*5/3:i*5/3;}
  function workerPoint(cell,i,t){return workPoint(t-98+cell.phase+offsetFor(cell,i));}
  function signals(t){const buttons=cells.filter(c=>c.control).map(cell=>{const p=workerPoint(cell,0,t),value=p.jobDirection===1?p.job:0;return{id:cell.id+'-button',cellId:cell.id,operatorId:cell.id+'-resident-0',gateId:gate.id,value,point:world(cell.x,cell.y+337)};});return{buttons,gate:{id:gate.id,opening:Math.max(0,...buttons.map(b=>b.value)),point:world(gate.x,gate.y)}};}
  function boundsOfCell(cell){const corners=[[-720,-500],[720,-500],[720,500],[-720,500]].map(([x,y])=>world(cell.x+x,cell.y+y));return{minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minY:Math.min(...corners.map(p=>p.y)),maxY:Math.max(...corners.map(p=>p.y))};}
  cells.forEach(cell=>{cell.bounds=boundsOfCell(cell);cell.walls=[{x:cell.x-560,y:cell.y-390,w:1120,h:73,r:56},{x:cell.x-560,y:cell.y+317,w:1120,h:73,r:56},{x:cell.x-560,y:cell.y-317,w:53,h:634,r:20},{x:cell.x+507,y:cell.y-317,w:53,h:227,r:20},{x:cell.x+507,y:cell.y+90,w:53,h:227,r:20},{x:cell.x-220,y:cell.y-100,w:440,h:200,r:32}];if(cell.main)cell.walls=[{x:cell.x-600,y:cell.y-440,w:900,h:123,r:56},{x:cell.x-600,y:cell.y+317,w:1200,h:123,r:56},{x:cell.x-600,y:cell.y-390,w:93,h:780,r:40},{x:cell.x+507,y:cell.y+100,w:93,h:290,r:40},{x:cell.x-220,y:cell.y-100,w:440,h:200,r:32}];Object.freeze(cell.walls);Object.freeze(cell);});
  function visible(cell,bounds){if(!bounds)return true;const l=bounds.minX??bounds.left,r=bounds.maxX??bounds.right,t=bounds.minY??bounds.top,b=bounds.maxY??bounds.bottom;return cell.bounds.maxX>=l&&cell.bounds.minX<=r&&cell.bounds.maxY>=t&&cell.bounds.minY<=b;}
  function actors(t,bounds){if(t<94||t>=110)return[];const output=[];for(const cell of cells){if(!visible(cell,bounds))continue;for(let i=0;i<(cell.main?2:3);i++){const actor=shapes[(cell.index+i)%shapes.length],p=workerPoint(cell,i,t),position=world(cell.x+p.x,cell.y+p.y),body={...position,angle:0,sx:1,sy:1,bend:0,strain:0,bounce:0,edgeBends:actor.vertices.map(()=>0)};body.angle=p.heading+rotation-actor.headAxis(body).angle;output.push({id:cell.id+'-resident-'+i,actor,body,color:P.black,cavity:false,core:0,office:cell.id,job:p.job,jobDirection:p.jobDirection});}}return output;}
  function rounded(ctx,x,y,w,h,r,color){if(w<=0||h<=0)return;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=color;ctx.fill();}
  function line(ctx,points,color,width){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function setup(ctx){ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(rotation);}
  function detailed(ctx){const m=ctx.getTransform?.();return !m||Math.hypot(m.a,m.b)>.28;}
  function draw(ctx,t,bounds){if(t<94||t>=110)return;const signal=signals(t);setup(ctx);const detail=detailed(ctx);
    ctx.fillStyle=P.paper;ctx.fillRect(center.x-6000,center.y-5000,12000,10000);
    // Rounded masses leave one continuous planar street system between them.
    for(const cell of cells){if(!visible(cell,bounds))continue;const {x,y}=cell;
      if(cell.main){for(const wall of cell.walls){rounded(ctx,wall.x,wall.y,wall.w,wall.h,wall.r,P.night);rounded(ctx,wall.x+6,wall.y+6,wall.w-12,wall.h-12,Math.max(4,wall.r-6),P.industrial);}
        // This permanent upper-right opening contains the existing arrival curve.
        ctx.beginPath();ctx.moveTo(...entryCurves.entry[0]);ctx.bezierCurveTo(...entryCurves.entry[1],...entryCurves.entry[2],...entryCurves.entry[3]);ctx.strokeStyle=P.paper;ctx.lineWidth=166;ctx.lineCap='round';ctx.stroke();
      }else{rounded(ctx,x-600,y-440,1200,880,90,P.night);rounded(ctx,x-560,y-390,1120,780,56,P.industrial);rounded(ctx,x-507,y-317,1014,634,140,P.paper);rounded(ctx,x+490,y-80,150,160,40,P.paper);rounded(ctx,x-220,y-100,440,200,32,P.industrial);}
      for(const side of [-1,1]){rounded(ctx,x-54,y+side*337-9,108,18,5,P.metal);rounded(ctx,x-24,y+side*325-9,48,18,3,P.industrial);}
      const button=signal.buttons.find(b=>b.cellId===cell.id),press=button?.value||0;rounded(ctx,x-22,y+328+press*4,44,18-press*4,5,press>0?P.gold:P.coral);if(press>0)line(ctx,[[x,y+285+5*press],[x,y+328+4*press]],P.metal,5);
      for(let i=0;i<(cell.main?2:3);i++){const p=workerPoint(cell,i,t);if(p.job>0)rounded(ctx,x-13,y+p.jobDirection*(307+p.job*10)-13,26,26,3,P.quiet);}
      if(detail){for(let i=0;i<6;i++){rounded(ctx,x-420+i*155,y-373,72,13,4,P.quiet);rounded(ctx,x-420+i*155,y+360,72,13,4,P.quiet);}line(ctx,[[x+535,y-170],[x+535,y-115]],P.metal,3);}
    }
    ctx.restore();
  }
  function drawSignals(ctx,t,bounds){if(t<94||t>=110)return;const state=signals(t),open=state.gate.opening;setup(ctx);const g=gate;
    rounded(ctx,g.wall.x,g.wall.y,g.wall.w,g.wall.h,g.wall.r,P.industrial);rounded(ctx,g.x-140,g.y-100,1070,200,48,P.paper);
    // The same value that depresses the active button retracts these two panels.
    rounded(ctx,g.x-17,g.y-100,34,100*(1-open),3,P.metal);rounded(ctx,g.x-17,g.y+100*open,34,100*(1-open),3,P.metal);
    rounded(ctx,g.x+80,g.y-64,590,128,16,P.blue);line(ctx,[[g.x+80,g.y],[g.x+670,g.y]],P.paper,28);
    for(let i=0;i<3;i++){const x=g.x+140+i*180;rounded(ctx,x-28,g.y-90,56,42,7,P.metal);rounded(ctx,x-28,g.y+48,56,42,7,P.metal);}
    const emit=state.buttons.some(b=>b.value>0);if(emit){ctx.globalAlpha=.25+.55*open;rounded(ctx,g.x+42,g.y-15,22,30,5,P.gold);ctx.globalAlpha=1;}
    // Recessed terminal lights repeat the remote gate response, without drawing wires across roads.
    for(const button of state.buttons){const cell=cells.find(c=>c.id===button.cellId);if(!visible(cell,bounds))continue;rounded(ctx,cell.x+190,cell.y-77,12,24,4,button.value>0?P.gold:P.quiet);}
    ctx.restore();
  }
  const gateCorners=[[gate.wall.x-120,gate.wall.y],[gate.wall.x+gate.wall.w,gate.wall.y],[gate.wall.x+gate.wall.w,gate.wall.y+gate.wall.h],[gate.wall.x-120,gate.wall.y+gate.wall.h]].map(([x,y])=>world(x,y)),bounds={minX:Math.min(...cells.map(c=>c.bounds.minX),...gateCorners.map(p=>p.x)),maxX:Math.max(...cells.map(c=>c.bounds.maxX),...gateCorners.map(p=>p.x)),minY:Math.min(...cells.map(c=>c.bounds.minY),...gateCorners.map(p=>p.y)),maxY:Math.max(...cells.map(c=>c.bounds.maxY),...gateCorners.map(p=>p.y))};
  const overview={x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2,zoom:Math.min(1100/(bounds.maxX-bounds.minX),620/(bounds.maxY-bounds.minY))};
  const anchors=Object.freeze({work:Object.freeze({...world(center.x,center.y),zoom:.75}),overview:Object.freeze(overview),bounds:Object.freeze(bounds),gate:Object.freeze(world(gate.x,gate.y))});
  return{anchors,actors,draw,drawSignals,signals,workPoint,heroPoint,entryCurves,cells:Object.freeze(cells),gate:Object.freeze(gate),world,local};
});
