/* A fixed world grid of offices; the viewport only selects which cells to draw. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./character-geometry.js'),require('./palette.js'),require('./factory.js'));
  else root.FlatlandOfficeWorld=factory(root.FlatlandCharacters,root.FlatlandPalette,root.FlatlandFactory);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,P,Base){
  'use strict';
  const rotation=Base.anchors.localRotation,cs=Math.cos(rotation),sn=Math.sin(rotation),origin=Base.anchors.factoryCenter,mod=(n,d)=>((n%d)+d)%d;
  const world=(x,y)=>({x:origin.x+x*cs-y*sn,y:origin.y+x*sn+y*cs}),local=p=>({x:(p.x-origin.x)*cs+(p.y-origin.y)*sn,y:-(p.x-origin.x)*sn+(p.y-origin.y)*cs});
  const end=local(Base.anchors.discard),center={x:end.x-650,y:end.y+540},pitch=Object.freeze({x:1280,y:1000});
  let workTime=null;
  function setWorkTime(raw){workTime=Number.isFinite(raw)?raw:null;}
  const clock=t=>workTime===null?t:workTime;
  const frozenCurve=points=>Object.freeze(points.map(p=>Object.freeze(p)));
  // The factory door cuts to the interior side of this permanent office entrance.
  const entryCurves=Object.freeze({entry:frozenCurve([[center.x+470,center.y-260],[center.x+470,center.y-220],[center.x+430,center.y-100],[center.x+430,center.y]])});
  const shapes=Array.from({length:6},(_,i)=>C.create({sides:i+3,radius:45,regular:true}));
  const ellipse=Array.from({length:257},(_,i)=>{const a=i/256*Math.PI*2;return{x:430*Math.cos(a),y:240*Math.sin(a),a};}),lengths=[0];
  for(let i=1;i<ellipse.length;i++)lengths.push(lengths[i-1]+Math.hypot(ellipse[i].x-ellipse[i-1].x,ellipse[i].y-ellipse[i-1].y));
  function loopPoint(q){const d=mod(q,1)*lengths.at(-1);let i=1;while(i<256&&lengths[i]<d)i++;const u=(d-lengths[i-1])/(lengths[i]-lengths[i-1]),a=ellipse[i-1].a+(ellipse[i].a-ellipse[i-1].a)*u;return{x:430*Math.cos(a),y:240*Math.sin(a),heading:Math.atan2(240*Math.cos(a),-430*Math.sin(a))};}
  function workPoint(age){age=mod(age,5);let q,job=0,direction=1;
    if(age<1.7)q=age/1.7*.25;
    else if(age<2.15){q=.25;job=Math.sin((age-1.7)/.45*Math.PI);}
    else if(age<3.9)q=.25+(age-2.15)/1.75*.5;
    else if(age<4.35){q=.75;job=Math.sin((age-3.9)/.45*Math.PI);direction=-1;}
    else q=.75+(age-4.35)/.65*.25;
    const p=loopPoint(q);if(job){p.y+=direction*5*job;p.heading=direction*Math.PI/2;}return{...p,job,jobDirection:direction,age};
  }
  function heroPoint(t){const p=workPoint(clock(t)-98);return{...p,x:center.x+p.x,y:center.y+p.y};}
  function boundsOfCell(cell){const corners=[[-640,-500],[640,-500],[640,500],[-640,500]].map(([x,y])=>world(cell.x+x,cell.y+y));return{minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minY:Math.min(...corners.map(p=>p.y)),maxY:Math.max(...corners.map(p=>p.y))};}
  function cellAt(col,row){const main=row===0&&col===0,index=mod(col*17+row*31,6),cell={id:'office-'+col+'-'+row,index,col,row,x:center.x+col*pitch.x,y:center.y+row*pitch.y,main,phase:0};
    cell.walls=[{x:cell.x-560,y:cell.y-390,w:1120,h:73,r:56},{x:cell.x-560,y:cell.y+317,w:1120,h:73,r:56},{x:cell.x-560,y:cell.y-317,w:53,h:634,r:20},{x:cell.x+507,y:cell.y-317,w:53,h:227,r:20},{x:cell.x+507,y:cell.y+90,w:53,h:227,r:20},{x:cell.x-220,y:cell.y-100,w:440,h:200,r:32}];
    if(main)cell.walls=[{x:cell.x-600,y:cell.y-440,w:900,h:123,r:56},{x:cell.x-600,y:cell.y+317,w:1200,h:123,r:56},{x:cell.x-600,y:cell.y-390,w:93,h:780,r:40},{x:cell.x+507,y:cell.y+100,w:93,h:290,r:40},{x:cell.x-220,y:cell.y-100,w:440,h:200,r:32}];
    cell.bounds=boundsOfCell(cell);return cell;
  }
  function visibleCells(bounds){
    if(!bounds)bounds={minX:anchors.work.x-2600,maxX:anchors.work.x+2600,minY:anchors.work.y-2300,maxY:anchors.work.y+2300};
    const left=bounds.minX??bounds.left,right=bounds.maxX??bounds.right,top=bounds.minY??bounds.top,bottom=bounds.maxY??bounds.bottom;
    const corners=[[left,top],[right,top],[right,bottom],[left,bottom]].map(([x,y])=>local({x,y})),minCol=Math.floor((Math.min(...corners.map(p=>p.x))-center.x)/pitch.x)-1,maxCol=Math.ceil((Math.max(...corners.map(p=>p.x))-center.x)/pitch.x)+1,minRow=Math.floor((Math.min(...corners.map(p=>p.y))-center.y)/pitch.y)-1,maxRow=Math.ceil((Math.max(...corners.map(p=>p.y))-center.y)/pitch.y)+1,result=[];
    for(let row=minRow;row<=maxRow;row++)for(let col=minCol;col<=maxCol;col++){const cell=cellAt(col,row),b=cell.bounds;if(b.maxX>=left&&b.minX<=right&&b.maxY>=top&&b.minY<=bottom)result.push(cell);}return result;
  }
  function workerPoint(cell,i,t){return workPoint(clock(t)-98+cell.phase+(cell.main?i+1:i)*5/3);}
  const tinyResidents=bounds=>Boolean(bounds&&(Number.isFinite(bounds.scale)?bounds.scale<.075:(bounds.maxX??bounds.right)-(bounds.minX??bounds.left)>16000));
  function actors(t,bounds){if(t<96||t>=110||tinyResidents(bounds))return[];const output=[];for(const cell of visibleCells(bounds))for(let i=0;i<(cell.main?2:3);i++){const actor=shapes[(cell.index+i)%shapes.length],p=workerPoint(cell,i,t),position=world(cell.x+p.x,cell.y+p.y),body={...position,angle:0,sx:1,sy:1,bend:0,strain:0,bounce:0,edgeBends:actor.vertices.map(()=>0)};body.angle=p.heading+rotation-actor.headAxis(body).angle;output.push({id:cell.id+'-resident-'+i,actor,body,color:P.black,cavity:false,core:0,office:cell.id,job:p.job,jobDirection:p.jobDirection});}return output;}
  function rounded(ctx,x,y,w,h,r,color){if(w<=0||h<=0)return;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=color;ctx.fill();}
  function drawCell(ctx,cell,t,detail){const {x,y}=cell;
    if(cell.main){for(const wall of cell.walls)rounded(ctx,wall.x,wall.y,wall.w,wall.h,wall.r,P.industrial);}
    else{rounded(ctx,x-600,y-440,1200,880,90,P.industrial);rounded(ctx,x-507,y-317,1014,634,140,P.paper);rounded(ctx,x+490,y-80,150,160,40,P.paper);rounded(ctx,x-220,y-100,440,200,32,P.industrial);}
    for(const side of [-1,1]){rounded(ctx,x-54,y+side*337-9,108,18,5,P.metal);rounded(ctx,x-24,y+side*325-9,48,18,3,P.industrial);}
    const operator=workerPoint(cell,0,t),press=operator.jobDirection===1?operator.job:0;rounded(ctx,x-22,y+328+press*4,44,18-press*4,5,press>0?P.gold:P.coral);
    for(let i=0;i<(cell.main?2:3);i++){const p=workerPoint(cell,i,t);if(p.job>0)rounded(ctx,x-13,y+p.jobDirection*(307+p.job*10)-13,26,26,3,P.quiet);}
    if(detail)for(let i=0;i<6;i++){rounded(ctx,x-420+i*155,y-373,72,13,4,P.quiet);rounded(ctx,x-420+i*155,y+360,72,13,4,P.quiet);}
  }
  function drawTinyResidents(ctx,cells,t){
    ctx.beginPath();for(const cell of cells)for(let i=0;i<(cell.main?2:3);i++){
      const p=workerPoint(cell,i,t),actor=shapes[(cell.index+i)%shapes.length],heading=p.heading-actor.headAxis({sx:1,sy:1,bend:0,strain:0}).angle,c=Math.cos(heading),s=Math.sin(heading);
      actor.vertices.forEach(([a,b],j)=>{const x=cell.x+p.x+a*c-b*s,y=cell.y+p.y+a*s+b*c;j?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();
    }ctx.fillStyle=P.black;ctx.fill();
  }
  let tileCanvas;
  function drawRepeated(ctx,t,bounds){
    if(!tileCanvas){if(typeof OffscreenCanvas!=='undefined')tileCanvas=new OffscreenCanvas(576,450);else if(typeof document!=='undefined'){tileCanvas=document.createElement('canvas');tileCanvas.width=576;tileCanvas.height=450;}}
    if(!tileCanvas)return false;
    // A 6 by 6 pattern retains the polygon sequence, shared clock and exact world pitch.
    const tw=96,th=75,tc=tileCanvas.getContext('2d');tc.setTransform(1,0,0,1,0,0);tc.fillStyle=P.paper;tc.fillRect(0,0,576,450);tc.setTransform(tw/pitch.x,0,0,th/pitch.y,(pitch.x/2-center.x)*tw/pitch.x,(pitch.y/2-center.y)*th/pitch.y);
    const cells=[];for(let row=0;row<6;row++)for(let col=0;col<6;col++){const cell=cellAt(col,row);cell.main=false;cells.push(cell);drawCell(tc,cell,t,false);}drawTinyResidents(tc,cells,t);
    const corners=[[bounds.minX??bounds.left,bounds.minY??bounds.top],[bounds.maxX??bounds.right,bounds.minY??bounds.top],[bounds.maxX??bounds.right,bounds.maxY??bounds.bottom],[bounds.minX??bounds.left,bounds.maxY??bounds.bottom]].map(([x,y])=>local({x,y})),left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
    ctx.save();ctx.translate(center.x-pitch.x/2,center.y-pitch.y/2);ctx.scale(pitch.x/tw,pitch.y/th);ctx.fillStyle=ctx.createPattern(tileCanvas,'repeat');ctx.fillRect((left-center.x+pitch.x/2)*tw/pitch.x-1,(top-center.y+pitch.y/2)*th/pitch.y-1,(right-left)*tw/pitch.x+2,(bottom-top)*th/pitch.y+2);ctx.restore();
    // The protagonist's existing entrance remains the same asset at every zoom.
    const main=cellAt(0,0);ctx.fillStyle=P.paper;ctx.fillRect(main.x-pitch.x/2,main.y-pitch.y/2,pitch.x,pitch.y);drawCell(ctx,main,t,false);drawTinyResidents(ctx,[main],t);return true;
  }
  function draw(ctx,t,bounds){if(t<96||t>=110)return;const m=ctx.getTransform?.(),scale=m?Math.hypot(m.a,m.b):1,detail=scale>.16;
    ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(rotation);
    if(tinyResidents(bounds)&&drawRepeated(ctx,t,bounds)){ctx.restore();return;}
    const cells=visibleCells(bounds);for(const cell of cells)drawCell(ctx,cell,t,detail);if(tinyResidents(bounds))drawTinyResidents(ctx,cells,t);ctx.restore();
  }
  const anchors=Object.freeze({work:Object.freeze({...world(center.x,center.y),zoom:.75}),entry:Object.freeze({...world(...entryCurves.entry[0]),zoom:1.2}),overview:Object.freeze({...world(center.x,center.y),zoom:.035})});
  return{anchors,actors,draw,cellAt,visibleCells,workPoint,heroPoint,entryCurves,setWorkTime,clock,pitch,world,local};
});
