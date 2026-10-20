/* Alternate correction line: a standard shell, indexed paint, then the work circuit. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./factory.js'),require('./character-geometry.js'),require('./palette.js'),require('./motion.js'),require('./office-world.js'));
  else root.FlatlandRoutineFactory=factory(root.FlatlandFactory,root.FlatlandCharacters,root.FlatlandPalette,root.FlatlandMotion,root.FlatlandOfficeWorld);
})(typeof globalThis!=='undefined'?globalThis:this,function(Base,C,P,Motion,Office){
  'use strict';
  if(!Base||!C||!P||!Office)throw new Error('Load factory, characters, palette and offices before the routine factory.');
  const angle=Base.anchors.localRotation,cs=Math.cos(angle),sn=Math.sin(angle),origin=Base.anchors.factoryCenter;
  const clamp=n=>Math.max(0,Math.min(1,n)),lerp=(a,b,u)=>a+(b-a)*u,ease=n=>{const u=clamp(n);return u*u*(3-2*u);},between=(t,a,b)=>ease((t-a)/(b-a));
  const world=(x,y)=>({x:origin.x+x*cs-y*sn,y:origin.y+x*sn+y*cs});
  const local=p=>({x:(p.x-origin.x)*cs+(p.y-origin.y)*sn,y:-(p.x-origin.x)*sn+(p.y-origin.y)*cs});
  const discard=Base.anchors.discard,workCenter=Office.cells.find(cell=>cell.main);
  const heroActor=C.create('child'),lanes=[-390,-130,130,390,650,910,1170,1430],stations=[480,-170,-890];
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
    const relative=body.angle-angle,c=Math.cos(relative),s=Math.sin(relative),centerline=shellPolygon(actor).map(([x,y])=>[x*c-y*s,x*s+y*c]);
    // The frame is drawn with a 12px stroke. Its outer support planes, not its
    // centre lines, are the die's contact boundary. Every die face uses this shell.
    const n=centerline.length,frameHalfWidth=6,outerScale=1+frameHalfWidth/(71*Math.cos(Math.PI/n)),shell=centerline.map(([x,y])=>[x*outerScale,y*outerScale]);
    const contactTime=start+.75,slamStart=contactTime-.1,holdEnd=start+1.15,phase=t<start?'idle':t<slamStart?'windup':t<contactTime?'slam':t<holdEnd?'hold':t<end?'release':'open';
    const strike=clamp((t-slamStart)/.1),clearance=t<start?16:t<slamStart?16+8*between(t,start,slamStart):t<contactTime?24*(1-strike*strike*strike):t<holdEnd?0:24*between(t,holdEnd,end),thickness=20;
    const age=t-contactTime,impact=age>=0&&age<.16?(1-age/.16)**2:0,recoil=age>=0&&t<holdEnd?3.5*Math.sin(age*110)*Math.exp(-age/.065)+1.8*Math.sin(age*70)*Math.sin(Math.PI*age/(holdEnd-contactTime)):0;
    const faces=shell.map((a,i)=>{const b=shell[(i+1)%n],length=Math.hypot(b[0]-a[0],b[1]-a[1]),normal=[(b[1]-a[1])/length,-(b[0]-a[0])/length],move=(p,d)=>[p[0]+normal[0]*d,p[1]+normal[1]*d],from=move(a,clearance),to=move(b,clearance),support=a[0]*normal[0]+a[1]*normal[1];
      return{index:i,normal,shellFrom:a,shellTo:b,from,to,point:[(from[0]+to[0])/2,(from[1]+to[1])/2],support,faceSupport:support+clearance,gap:clearance,thickness,polygon:[from,to,move(to,thickness),move(from,thickness)],pad:[from,to,move(to,3),move(from,3)]};});
    const contact=t>=start+.75&&t<start+1.15&&faces.every(face=>face.gap<1e-8),upperSupport=Math.min(...shell.map(p=>p[1])),lowerSupport=Math.max(...shell.map(p=>p[1])),upperFace=Math.min(...faces.flatMap(face=>[face.from[1],face.to[1]])),lowerFace=Math.max(...faces.flatMap(face=>[face.from[1],face.to[1]]));
    return{faces,shell,centerline,clearance,thickness,gap:(lowerFace-upperFace)/2,upperFace,lowerFace,upperSupport,lowerSupport,contact,force:contact?1:0,phase,impact,recoil,contactTime,slamStart,holdEnd};
  }
  function bezier(points,u){const v=1-u,[a,b,c,d]=points;return{x:v*v*v*a[0]+3*v*v*u*b[0]+3*v*u*u*c[0]+u*u*u*d[0],y:v*v*v*a[1]+3*v*v*u*b[1]+3*v*u*u*c[1]+u*u*u*d[1],heading:Math.atan2(3*v*v*(b[1]-a[1])+6*v*u*(c[1]-b[1])+3*u*u*(d[1]-c[1]),3*v*v*(b[0]-a[0])+6*v*u*(c[0]-b[0])+3*u*u*(d[0]-c[0]))};}
  const workApproach=Office.entryCurves.approach,workEntry=Office.entryCurves.entry;
  function routePoint(t){
    if(t<96){const u=between(t,94,96),initial=-Math.PI+paintAt(94,5).angle,turn=Math.atan2(Math.sin(Math.PI-initial),Math.cos(Math.PI-initial));return{x:lerp(-890,-1750,u),y:130,heading:initial+turn*between(t,94,94.4)};}
    if(t<97)return bezier(workApproach,between(t,96,97));
    if(t<98)return bezier(workEntry,between(t,97,98));
    return Office.heroPoint(Math.min(t,108));
  }
  function routineEntry(id,actor,body,color,t,extra={}){return{id,actor,body,color,cavity:true,damage:0,blacken:0,windowOpen:1,compression:0,residual:0,core:0,label:undefined,result:undefined,restraint:undefined,routine:{time:t,...shellState(t,actor)},...extra};}
  function heroAt(t){
    if(t<64){const source=Base.frame(t).actors.find(e=>e.id==='hero');return source?routineEntry('hero',heroActor,{...source.body},P.blue,t):null;}
    let b;if(t<70)b=pose(heroActor,900,130);else if(t<71.7)b=pose(heroActor,lerp(900,480,between(t,70,71.7)),130);else if(t<77)b=pose(heroActor,480,130);else if(t<78.5)b=pose(heroActor,lerp(480,-170,between(t,77,78.5)),130);else if(t<82)b=pose(heroActor,-170,130);else if(t<83.2)b=pose(heroActor,lerp(-170,-890,between(t,82,83.2)),130);else if(t<94)b=pose(heroActor,-890,130,paintAt(t,5).angle);else if(t<110){const p=routePoint(t);b=pose(heroActor,p.x,p.y);b.angle=p.heading+angle-heroActor.headAxis({...b,angle:0}).angle;}else if(t<119)b={...Base.frame(119).hero};
    else{const source=Base.frame(t).actors.find(e=>e.id==='hero');if(!source)return null;b={...source.body,edgeBends:source.body.edgeBends?.map(()=>0)};}
    return routineEntry('hero',heroActor,b,P.blue,t,{routine:{time:t,...shellState(t,heroActor),seed:true,compacting:compactAt(t,78.5,81.6,heroActor,b),work:t>=94&&t<110,job:t>=98&&t<108?routePoint(t).job||0:0}});
  }
  function worker(t,row,slot){const age=((t-64+row*.7+slot*18)%36+36)%36,actor=ordinary[row][slot],mapped=age<5?70+age/5*1.7:age<9?71.7+(age-5)/4*5.3:age<13?77+(age-9)/4*5:age<24?82+(age-13)/11*12:94;let x;
    if(age<5)x=lerp(900,480,age/5);else if(age<9)x=480;else if(age<10.5)x=lerp(480,-170,(age-9)/1.5);else if(age<13)x=-170;else if(age<14)x=lerp(-170,-890,age-13);else if(age<24)x=-890;else x=lerp(-890,-1750,(age-24)/12);
    const paint=paintAt(mapped,actor.vertices.length,83.2,94,actor),entry=routineEntry('routine-worker-'+row+'-'+slot,actor,pose(actor,x,lanes[row],mapped>=83.2&&mapped<94?paint.angle:0),P.factory.workers[row%4],mapped,{row,slot,age});return entry;
  }
  function lightAt(t){
    if(t<110)return undefined;if(t>=119)return Base.frame(t).light;
    const guide=Base.frame(119).light,reveal=.04+.14*between(t,110,113.2)+.82*between(t,113.2,116);
    return{...guide,reveal,inside:t<116,glow:.1+.45*reveal,entityId:'hero-seed',phase:t<113.2?'enclosed':t<116?'slit':'emerge'};
  }
  function frame(t,bounds){
    if(t<58||t>=132)return{actors:[],hero:null};const e=heroAt(t),actors=t>=94&&t<110?Office.actors(t,bounds):[];
    if(t<94)for(let r=0;r<lanes.length;r++)if(r!==2)for(let slot=0;slot<2;slot++)actors.push(worker(t,r,slot));if(e)actors.push(e);
    const base=t>=119?Base.frame(t):null,result={actors,hero:e?.body||null,light:e?lightAt(t):undefined,burst:base?.burst||0,chase:base?.chase,routine:true,office:t>=94&&t<110,inner:t>=110&&t<119,outsideDarkness:between(t,104,110)};
    if(bounds){const l=bounds.minX??bounds.left,r=bounds.maxX??bounds.right,top=bounds.minY??bounds.top,bottom=bounds.maxY??bounds.bottom;result.actors=actors.filter(a=>a.id==='hero'||a.body.x>l-90&&a.body.x<r+90&&a.body.y>top-90&&a.body.y<bottom+90);}return result;
  }
  function belt(ctx,y,t){rounded(ctx,-1750,y-78,2650,156,10,P.conveyor);const shift=t*48%72;for(let x=-1750-shift;x<900;x+=72)line(ctx,[[x,y-65],[x,y+65]],P.factory.roller,1.6);}
  function machine(ctx,x,y,kind,sides){rounded(ctx,x-154,y-124,308,248,18,P.metal);rounded(ctx,x-142,y-114,284,228,13,P.blue);rounded(ctx,x-120,y-91,240,182,10,P.paper);
    if(kind===0){const actor=sides===5?heroActor:ordinary[Math.max(0,sides-3)][0],body=pose(actor,x,y),rotation=body.angle-angle,c=Math.cos(rotation),s=Math.sin(rotation),points=vertices(actor,82).map(([a,b])=>[a*c-b*s,a*s+b*c]);ctx.save();ctx.translate(x,y);poly(ctx,points,P.industrial);poly(ctx,points.map(([a,b])=>[a*.88,b*.88]),P.paper);ctx.restore();}
    if(kind===2){ctx.beginPath();ctx.arc(x,y,100,0,Math.PI*2);ctx.strokeStyle=P.ink;ctx.lineWidth=7;ctx.stroke();rounded(ctx,x-13,y-124,26,31,5,P.industrial);}
  }
  function drawFactory(ctx,t){setup(ctx);rounded(ctx,-1785,-650,2685,2360,28,P.factory.floor);for(let r=0;r<lanes.length;r++){belt(ctx,lanes[r],t);for(let j=0;j<3;j++)machine(ctx,stations[j],lanes[r],j,r+3);}line(ctx,[[-1785,-650],[-1785,43]],P.outside.wall,22);line(ctx,[[-1785,217],[-1785,1710]],P.outside.wall,22);ctx.restore();}
  function drawBase(ctx,t,bounds){if(t<58||t>=110)return;if(t<64)Base.drawEntry(ctx,t);if(t>=94)Office.draw(ctx,t,bounds);if(t<97)drawFactory(ctx,t);}
  function drawEntry(ctx,t,bounds){if(t<64)Base.drawEntry(ctx,t,bounds);else drawBase(ctx,t,bounds);}
  function drawOverlay(ctx,t,bounds){if(t>=94){Office.drawSignals(ctx,t,bounds);return;}if(t<64)return;setup(ctx);for(let r=0;r<lanes.length;r++){
    const y=lanes[r],entry=r===2&&t>=78.5&&t<82?heroAt(t):r===2?null:[worker(t,r,0),worker(t,r,1)].find(e=>Math.abs(local(e.body).x+170)<1),actor=entry?.actor||(r===2?heroActor:ordinary[r][0]),press=compactAt(entry?.routine.time??0,78.5,81.6,actor,entry?.body||pose(actor,-170,y));const x=-170;
    ctx.save();ctx.translate(x,y);for(const face of press.faces){
      poly(ctx,face.polygon,P.industrial);poly(ctx,face.pad,P.coral);
      const [nx,ny]=face.normal,tx=-ny,ty=nx,bracket=14;
      // Only the outer brace rattles; the loaded pad stays locked to its real support plane.
      line(ctx,[.22,.78].map(q=>[lerp(face.from[0],face.to[0],q)+nx*bracket+press.recoil,lerp(face.from[1],face.to[1],q)+ny*bracket]),P.metal,2.5);
      if(press.impact&&press.contact){ctx.save();ctx.globalAlpha=press.impact;
        for(const side of [-1,1])line(ctx,[[face.point[0]+nx*3+tx*side*4,face.point[1]+ny*3+ty*side*4],[face.point[0]+nx*13+tx*side*9,face.point[1]+ny*13+ty*side*9]],P.gold,2.4);
        poly(ctx,[[face.point[0]+nx*7,face.point[1]+ny*7],[face.point[0]+nx*12+tx*2,face.point[1]+ny*12+ty*2],[face.point[0]+nx*14-tx*2,face.point[1]+ny*14-ty*2]],P.metal);ctx.restore();
      }
    }ctx.restore();
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
  const anchors=Object.freeze({...Base.anchors,overview:anchor(-30,560,.22),approach:anchor(900,130,1.5),mold:anchor(480,130,1.5),compact:anchor(-170,130,1.5),paint:anchor(-890,130,1.5),work:Office.anchors.work,awaken:Object.freeze({...discard,zoom:1.2}),discard,heroStages:Object.freeze({m1:world(480,130),m2:world(-170,130),m3:world(-890,130)}),exit:world(-1785,130),workCenter:world(workCenter.x,workCenter.y)});
  return{frame,drawBase,drawEntry,drawOverlay,drawActorOverlay,anchors,paintAt,compactAt};
});
