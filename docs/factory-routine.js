/* Alternate correction line: a standard shell, indexed paint, then the work circuit. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./factory.js'),require('./character-geometry.js'),require('./palette.js'),require('./motion.js'));
  else root.FlatlandRoutineFactory=factory(root.FlatlandFactory,root.FlatlandCharacters,root.FlatlandPalette,root.FlatlandMotion);
})(typeof globalThis!=='undefined'?globalThis:this,function(Base,C,P,Motion){
  'use strict';
  if(!Base||!C||!P)throw new Error('Load factory, characters and palette before the routine factory.');
  const angle=Base.anchors.localRotation,cs=Math.cos(angle),sn=Math.sin(angle),origin=Base.anchors.factoryCenter;
  const clamp=n=>Math.max(0,Math.min(1,n)),lerp=(a,b,u)=>a+(b-a)*u,ease=n=>{const u=clamp(n);return u*u*(3-2*u);},between=(t,a,b)=>ease((t-a)/(b-a));
  const world=(x,y)=>({x:origin.x+x*cs-y*sn,y:origin.y+x*sn+y*cs});
  const local=p=>({x:(p.x-origin.x)*cs+(p.y-origin.y)*sn,y:-(p.x-origin.x)*sn+(p.y-origin.y)*cs});
  const discard=Base.anchors.discard,finish=local(discard),workCenter={x:finish.x-650,y:finish.y+540};
  const heroActor=C.create('child'),lanes=[-390,-130,130,390,650,910,1170,1430],stations=[480,-170,-890];
  const workActors=[C.create({sides:4,radius:42}),C.create({sides:6,radius:42})];
  const ordinary=lanes.map((_,i)=>[C.create({sides:i+3,radius:42,regular:false}),C.create({sides:i+3,radius:42,regular:false})]);
  function pose(actor,x,y,rotation=0){const p=world(x,y),b={x:p.x,y:p.y,angle:0,sx:1,sy:1,bend:0,strain:0,bounce:0,edgeBends:actor.vertices.map(()=>0),edgeStretch:actor.vertices.map(()=>1)};b.angle=angle-Math.PI+rotation-actor.headAxis(b).angle;return b;}
  function vertices(actor,radius=71){const a=Math.atan2(...[actor.vertices[0][1],actor.vertices[0][0]]);return actor.vertices.map((_,i)=>[Math.cos(a+i*Math.PI*2/actor.vertices.length)*radius,Math.sin(a+i*Math.PI*2/actor.vertices.length)*radius]);}
  function paintAt(t,n,start=83.2,end=94,actor=n===5?heroActor:ordinary[n-3]?.[0]){
    actor=actor||C.create({sides:n,radius:42});const delta=Math.PI*2/n,a0=Math.atan2(actor.vertices[0][1],actor.vertices[0][0]),base=-Math.PI-actor.headAxis({sx:1,sy:1,bend:0,strain:0}).angle,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    let first=0;for(let i=1;i<n;i++)if(Math.abs(wrap(-Math.PI/2-base-a0-(i+.5)*delta))<Math.abs(wrap(-Math.PI/2-base-a0-(first+.5)*delta)))first=i;
    const align=wrap(-Math.PI/2-base-a0-(first+.5)*delta),span=(end-start)/n,q=clamp((t-start)/(end-start)),index=Math.min(n-1,Math.floor(q*n)),phase=q>=1?1:(t-start-index*span)/span,step=between(phase,0,.42),order=Array.from({length:n},(_,i)=>(first+i)%n),side=Array(n).fill(0);
    order.forEach((which,i)=>{side[which]=t>=end?1:i<index?1:i===index?between(phase,.52,.78):0;});
    const previous=index?align-(index-1)*delta:0,target=align-index*delta,rotation=t<start?0:lerp(previous,target,step);
    return{side,angle:rotation,index,sideIndex:order[index],sideOrder:order,phase,spraying:t>=start&&t<end&&phase>=.52&&phase<.80,complete:t>=end};
  }
  function poly(ctx,points,fill){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}}
  function line(ctx,points,color,width){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function rounded(ctx,x,y,w,h,r,fill){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=fill;ctx.fill();}
  function setup(ctx){ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(angle);}
  function shellPolygon(actor){return vertices(actor);}
  function shellState(t,actor){const n=actor.vertices.length,paint=paintAt(t,n,83.2,94,actor),fitted=between(t,71.7,76.7),release=Array.from({length:n},(_,i)=>between(t,123.5+i*.58,124.15+i*.58));return{fitted,compacted:between(t,79.25,79.65),paint:paint.side.map((v,i)=>v*(1-release[i])),release,vertices:shellPolygon(actor),radius:71};}
  function compactAt(t,start=78.5,end=81.6,actor=heroActor,body=pose(heroActor,-170,130)){
    const relative=body.angle-angle,c=Math.cos(relative),s=Math.sin(relative),support=shellPolygon(actor).map(([x,y])=>x*s+y*c),upperSupport=Math.min(...support),lowerSupport=Math.max(...support);
    const closing=between(t,start,start+.75),reopen=between(t,start+1.15,end),u=t<start?0:t<start+.75?closing:t<start+1.15?1:1-reopen;
    const upperFace=lerp(-108,upperSupport,u),lowerFace=lerp(108,lowerSupport,u),contact=t>=start+.75&&t<start+1.15;
    return{gap:(lowerFace-upperFace)/2,upperFace,lowerFace,upperSupport,lowerSupport,contact,force:contact?1:0};
  }
  // Constant-distance sampling keeps the work rhythm separate from the camera.
  const loopSamples=Array.from({length:257},(_,i)=>{const a=i/256*Math.PI*2;return{x:workCenter.x+430*Math.cos(a),y:workCenter.y+240*Math.sin(a),a};}),loopLengths=[0];
  for(let i=1;i<loopSamples.length;i++)loopLengths.push(loopLengths[i-1]+Math.hypot(loopSamples[i].x-loopSamples[i-1].x,loopSamples[i].y-loopSamples[i-1].y));
  const loopLength=loopLengths.at(-1);
  function loopPoint(q){const distance=((q%1)+1)%1*loopLength;let i=1;while(i<256&&loopLengths[i]<distance)i++;const u=(distance-loopLengths[i-1])/(loopLengths[i]-loopLengths[i-1]),a=lerp(loopSamples[i-1].a,loopSamples[i].a,u);return{x:workCenter.x+430*Math.cos(a),y:workCenter.y+240*Math.sin(a),heading:Math.atan2(240*Math.cos(a),-430*Math.sin(a))};}
  function bezier(points,u){const v=1-u,[a,b,c,d]=points;return{x:v*v*v*a[0]+3*v*v*u*b[0]+3*v*u*u*c[0]+u*u*u*d[0],y:v*v*v*a[1]+3*v*v*u*b[1]+3*v*u*u*c[1]+u*u*u*d[1],heading:Math.atan2(3*v*v*(b[1]-a[1])+6*v*u*(c[1]-b[1])+3*u*u*(d[1]-c[1]),3*v*v*(b[0]-a[0])+6*v*u*(c[0]-b[0])+3*u*u*(d[0]-c[0]))};}
  const workApproach=[[-1750,130],[-1980,130],[finish.x+150,finish.y],[finish.x,finish.y]],workEntry=[[finish.x,finish.y],[finish.x-150,finish.y],[workCenter.x+430,workCenter.y-200],[workCenter.x+430,workCenter.y]],workEscape=[...workEntry].reverse();
  function routePoint(t){
    if(t<96){const u=between(t,94,96),initial=-Math.PI+paintAt(94,5).angle,turn=Math.atan2(Math.sin(Math.PI-initial),Math.cos(Math.PI-initial));return{x:lerp(-890,-1750,u),y:130,heading:initial+turn*between(t,94,94.4)};}
    if(t<97)return bezier(workApproach,between(t,96,97));
    if(t<98)return bezier(workEntry,between(t,97,98));
    if(t<108){const age=(t-98)%5;let q,job=0,direction=1;
      if(age<1.7)q=age/1.7*.25;
      else if(age<2.15){q=.25;job=Math.sin((age-1.7)/.45*Math.PI);}
      else if(age<3.9)q=.25+(age-2.15)/1.75*.5;
      else if(age<4.35){q=.75;job=Math.sin((age-3.9)/.45*Math.PI);direction=-1;}
      else q=.75+(age-4.35)/.65*.25;
      const p=loopPoint(q);if(job){p.y+=direction*5*job;p.heading=direction*Math.PI/2;}p.job=job;p.jobDirection=direction;return p;}

    const p=bezier(workEscape,between(t,111,119));if(t<111)p.heading=Math.PI/2-Math.PI*between(t,108,111);const base=Base.frame(119).hero,heading=base.angle+heroActor.headAxis({sx:1,sy:1,bend:0,strain:0,bounce:0,edgeBends:heroActor.vertices.map(()=>0)}).angle-angle,delta=Math.atan2(Math.sin(heading-p.heading),Math.cos(heading-p.heading));p.heading+=delta*between(t,116,119);return p;
  }
  function routineEntry(id,actor,body,color,t,extra={}){return{id,actor,body,color,cavity:true,damage:0,blacken:0,windowOpen:1,compression:0,residual:0,core:0,label:undefined,result:undefined,restraint:undefined,routine:{time:t,...shellState(t,actor)},...extra};}
  function heroAt(t){
    if(t<64){const source=Base.frame(t).actors.find(e=>e.id==='hero');return source?routineEntry('hero',heroActor,{...source.body},P.blue,t):null;}
    let b;if(t<70)b=pose(heroActor,900,130);else if(t<71.7)b=pose(heroActor,lerp(900,480,between(t,70,71.7)),130);else if(t<77)b=pose(heroActor,480,130);else if(t<78.5)b=pose(heroActor,lerp(480,-170,between(t,77,78.5)),130);else if(t<82)b=pose(heroActor,-170,130);else if(t<83.2)b=pose(heroActor,lerp(-170,-890,between(t,82,83.2)),130);else if(t<94)b=pose(heroActor,-890,130,paintAt(t,5).angle);else if(t<119){const p=routePoint(t);b=pose(heroActor,p.x,p.y);b.angle=p.heading+angle-heroActor.headAxis({...b,angle:0}).angle;}
    else{const source=Base.frame(t).actors.find(e=>e.id==='hero');if(!source)return null;b={...source.body,edgeBends:source.body.edgeBends?.map(()=>0)};}
    return routineEntry('hero',heroActor,b,P.blue,t,{routine:{time:t,...shellState(t,heroActor),seed:true,compacting:compactAt(t,78.5,81.6,heroActor,b),work:t>=94&&t<119,job:t>=98&&t<108?routePoint(t).job||0:0}});
  }
  function worker(t,row,slot){const age=((t-64+row*.7+slot*18)%36+36)%36,actor=ordinary[row][slot],mapped=age<5?70+age/5*1.7:age<9?71.7+(age-5)/4*5.3:age<13?77+(age-9)/4*5:age<24?82+(age-13)/11*12:94;let x;
    if(age<5)x=lerp(900,480,age/5);else if(age<9)x=480;else if(age<10.5)x=lerp(480,-170,(age-9)/1.5);else if(age<13)x=-170;else if(age<14)x=lerp(-170,-890,age-13);else if(age<24)x=-890;else x=lerp(-890,-1750,(age-24)/12);
    const paint=paintAt(mapped,actor.vertices.length,83.2,94,actor),entry=routineEntry('routine-worker-'+row+'-'+slot,actor,pose(actor,x,lanes[row],mapped>=83.2&&mapped<94?paint.angle:0),P.factory.workers[row%4],mapped,{row,slot,age});return entry;
  }
  function lightAt(t,hero){if(t<108)return undefined;if(t>=119)return Base.frame(t).light;
    const a=Base.frame(119).light,u=between(t,115,119),near=world(workCenter.x+430+90*Math.cos(t*1.2),workCenter.y-100+50*Math.sin(t*.8));return{x:lerp(near.x,a.x,u),y:lerp(near.y,a.y,u),r:7+3*u,glow:.2+.35*u,reveal:1,complete:true,inside:false,entityId:'hero-seed',phase:t<115?'awaken':'lead'};}
  function frame(t,bounds){if(t<58||t>=132)return{actors:[],hero:null};const e=heroAt(t),actors=[];if(t>=94&&t<119)workActors.forEach((actor,i)=>{const q=98+((t-98+(i+1)*5/3)%5+5)%5,p=routePoint(q),body=pose(actor,p.x,p.y);body.angle=p.heading+angle-actor.headAxis(body).angle;actors.push(routineEntry('daily-worker-'+i,actor,body,P.ink,110,{routine:{...shellState(110,actor),time:110,seed:false,work:true},daily:true}));});if(t<94)for(let r=0;r<lanes.length;r++)if(r!==2)for(let s=0;s<2;s++)actors.push(worker(t,r,s));if(e)actors.push(e);
    const base=t>=119?Base.frame(t):null,result={actors,hero:e?.body||null,light:e?lightAt(t,e.body):undefined,burst:base?.burst||0,chase:base?.chase,routine:true};
    if(bounds){const l=bounds.minX??bounds.left,r=bounds.maxX??bounds.right,top=bounds.minY??bounds.top,bottom=bounds.maxY??bounds.bottom;result.actors=actors.filter(a=>a.id==='hero'||a.body.x>l-90&&a.body.x<r+90&&a.body.y>top-90&&a.body.y<bottom+90);}return result;}
  function belt(ctx,y,t){rounded(ctx,-1750,y-78,2650,156,10,P.conveyor);const shift=t*48%72;for(let x=-1750-shift;x<900;x+=72)line(ctx,[[x,y-65],[x,y+65]],P.factory.roller,1.6);}
  function machine(ctx,x,y,kind,sides){rounded(ctx,x-154,y-124,308,248,18,P.metal);rounded(ctx,x-142,y-114,284,228,13,P.blue);rounded(ctx,x-120,y-91,240,182,10,P.paper);
    if(kind===0){const actor=sides===5?heroActor:ordinary[Math.max(0,sides-3)][0],body=pose(actor,x,y),rotation=body.angle-angle,c=Math.cos(rotation),s=Math.sin(rotation),points=vertices(actor,82).map(([a,b])=>[a*c-b*s,a*s+b*c]);ctx.save();ctx.translate(x,y);poly(ctx,points,P.industrial);poly(ctx,points.map(([a,b])=>[a*.88,b*.88]),P.paper);ctx.restore();}
    if(kind===2){ctx.beginPath();ctx.arc(x,y,100,0,Math.PI*2);ctx.strokeStyle=P.ink;ctx.lineWidth=7;ctx.stroke();rounded(ctx,x-13,y-124,26,31,5,P.industrial);}
  }
  function drawFactory(ctx,t){setup(ctx);rounded(ctx,-1785,-650,2685,2360,28,P.factory.floor);for(let r=0;r<lanes.length;r++){belt(ctx,lanes[r],t);for(let j=0;j<3;j++)machine(ctx,stations[j],lanes[r],j,r+3);}line(ctx,[[-1785,-650],[-1785,43]],P.outside.wall,22);line(ctx,[[-1785,217],[-1785,1710]],P.outside.wall,22);ctx.restore();}
  function drawWork(ctx,t){setup(ctx);const c=workCenter;ctx.fillStyle=P.night;ctx.fillRect(c.x-6000,c.y-6000,12000,12000);
    ctx.lineWidth=154;ctx.strokeStyle=P.paper;ctx.lineJoin='round';ctx.beginPath();ctx.lineCap='round';ctx.moveTo(...workApproach[0]);ctx.bezierCurveTo(...workApproach[1],...workApproach[2],...workApproach[3]);ctx.bezierCurveTo(...workEntry[1],...workEntry[2],...workEntry[3]);ctx.stroke();
    rounded(ctx,c.x-507,c.y-317,1014,634,140,P.paper);ctx.beginPath();ctx.arc(c.x+425,c.y-270,100,0,Math.PI*2);ctx.fillStyle=P.paper;ctx.fill();
    rounded(ctx,c.x-220,c.y-100,440,200,32,P.industrial);rounded(ctx,c.x-720,c.y-535,940,175,40,P.industrial);rounded(ctx,c.x-720,c.y+360,1440,175,40,P.industrial);rounded(ctx,c.x-820,c.y-260,250,520,40,P.industrial);rounded(ctx,c.x+620,c.y+130,200,200,40,P.industrial);
    // Small repeated cells establish the work day without a new literal city.
    for(let side of [-1,1])for(let i=0;i<(side<0?6:10);i++){ctx.globalAlpha=.18;rounded(ctx,c.x-650+i*135,c.y+side*425-16,72,32,5,P.paper);}ctx.globalAlpha=1;
    // Arrival and departure share the same open channel, tangent to the circuit.
    ctx.lineWidth=154;ctx.strokeStyle=P.paper;ctx.beginPath();ctx.moveTo(...workApproach[0]);ctx.bezierCurveTo(...workApproach[1],...workApproach[2],...workApproach[3]);ctx.bezierCurveTo(...workEntry[1],...workEntry[2],...workEntry[3]);ctx.stroke();
    for(const side of [-1,1]){rounded(ctx,c.x-54,c.y+side*337-9,108,18,5,P.metal);rounded(ctx,c.x-24,c.y+side*325-9,48,18,3,P.industrial);}
    if(t>=98&&t<108){const p=routePoint(t),push=p.job||0,side=p.jobDirection||1;rounded(ctx,c.x-13,c.y+side*(307+push*10)-13,26,26,3,P.quiet);}
    if(t>=108){for(let i=0;i<3;i++){const onset=108+i*2.7,q=between(t,onset,onset+.7);if(!q)continue;ctx.globalAlpha=q*(1-between(t,116.5,119));const x=c.x+430+40*i,y=c.y-75-100*i;ctx.beginPath();ctx.arc(x,y,3.5+i,0,Math.PI*2);ctx.fillStyle=P.gold;ctx.fill();ctx.strokeStyle=P.gold;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,11+i*2,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;}ctx.restore();}
  function drawBase(ctx,t){if(t<58||t>=119)return;if(t<64)Base.drawEntry(ctx,t);if(t>=94)drawWork(ctx,t);if(t<97)drawFactory(ctx,t);}
  function drawEntry(ctx,t,bounds){if(t<64)Base.drawEntry(ctx,t,bounds);else drawBase(ctx,t,bounds);}
  function drawOverlay(ctx,t){if(t<64||t>=94)return;setup(ctx);for(let r=0;r<lanes.length;r++){
    const y=lanes[r],entry=r===2?heroAt(t):[worker(t,r,0),worker(t,r,1)].find(e=>Math.abs(local(e.body).x+170)<1),press=compactAt(r===2?t:entry?.routine.time??0,78.5,81.6,entry?.actor||ordinary[r][0],entry?.body||pose(ordinary[r][0],-170,y));const x=-170;
    ctx.save();ctx.beginPath();ctx.rect(x-154,y-124,308,248);ctx.clip();for(let side of [-1,1]){rounded(ctx,x-82,y+(side<0?press.upperFace:press.lowerFace)+(side<0?-42:0),164,42,7,P.industrial);rounded(ctx,x-65,y+(side<0?press.upperFace:press.lowerFace)+(side<0?-7:0),130,7,2,P.coral);}ctx.restore();
    const painting=r===2?heroAt(t):[worker(t,r,0),worker(t,r,1)].find(e=>e.routine.time>=83.2&&e.routine.time<94&&Math.abs(local(e.body).x+890)<1),paint=painting?paintAt(painting.routine.time,painting.actor.vertices.length,83.2,94,painting.actor):{spraying:false};if(paint.spraying){ctx.save();ctx.globalAlpha=.32;poly(ctx,[[-915,y-113],[-865,y-113],[-841,y-30],[-939,y-30]],P.ink);ctx.restore();}
  }ctx.restore();}
  function drawActorOverlay(ctx,entry){const s=entry.routine;if(!s)return;const n=entry.actor.vertices.length,points=s.vertices;
    // Paint is a cumulative spatial mask. The unpainted parts still reveal the live inner window.
    ctx.save();poly(ctx,points);ctx.clip();if(s.paint.every(v=>v>=.999999))poly(ctx,points,P.black);else for(let i=0;i<n;i++){const coverage=s.paint[i];if(!coverage)continue;const a=points[i],b=points[(i+1)%n];ctx.save();ctx.globalAlpha=coverage;poly(ctx,[[0,0],a,b],P.black);ctx.restore();}ctx.restore();
    if(s.fitted){for(let i=0;i<n;i++){const visible=s.fitted*(1-s.release[i]);if(visible<=0)continue;const a=points[i],b=points[(i+1)%n];ctx.save();ctx.globalAlpha=visible;line(ctx,[a,b],P.metal,12);line(ctx,[a,b],P.industrial,2.5);ctx.restore();}}
    // Each strip leaves independently and stays behind, rather than reforming into a badge.
    if(s.time>=123.5&&s.time<130.4){const heading=entry.body.angle+entry.actor.headAxis(entry.body).angle,relative=heading-entry.body.angle;for(let i=0;i<n;i++){const age=s.time-(123.5+i*.58);if(age<=0||age>3.2)continue;const a=points[i],b=points[(i+1)%n],drift=210*age+55*age*age,spread=(i-(n-1)/2)*28*age;ctx.save();ctx.globalAlpha=1-clamp(age/3.2);ctx.translate(-Math.cos(relative)*drift-Math.sin(relative)*spread,-Math.sin(relative)*drift+Math.cos(relative)*spread);ctx.rotate((i%2?1:-1)*age*.55);line(ctx,[a,b],P.metal,12);line(ctx,[a,b],P.industrial,2.5);ctx.restore();}}
    if(s.seed){const awakening=s.time>=108?between(s.time,108,119):0,painted=s.paint.reduce((a,b)=>a+b,0)/n;ctx.save();ctx.beginPath();ctx.arc(-7,7,painted>.2?3.7+awakening*2:6,0,Math.PI*2);ctx.fillStyle=P.gold;ctx.fill();if(awakening){ctx.globalAlpha=.25*awakening;ctx.beginPath();ctx.arc(-7,7,11,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }
  const anchor=(x,y,zoom)=>Object.freeze({...world(x,y),zoom});
  const anchors=Object.freeze({...Base.anchors,overview:anchor(-30,560,.22),approach:anchor(900,130,1.5),mold:anchor(480,130,1.5),compact:anchor(-170,130,1.5),paint:anchor(-890,130,1.5),work:anchor(workCenter.x,workCenter.y,.75),awaken:Object.freeze({...discard,zoom:1.2}),discard,heroStages:Object.freeze({m1:world(480,130),m2:world(-170,130),m3:world(-890,130)}),exit:world(-1785,130),workCenter:world(workCenter.x,workCenter.y)});
  return{frame,drawBase,drawEntry,drawOverlay,drawActorOverlay,anchors,paintAt,compactAt};
});
