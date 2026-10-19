(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./character-geometry.js'), require('./motion.js'), require('./city-map.js'), require('./palette.js'), require('./portals.js'), require('./collision-world.js'));
  else root.FlatlandDistrict = factory(root.FlatlandCharacters, root.FlatlandMotion, root.FlatlandCityMap, root.FlatlandPalette, root.FlatlandPortals,root.FlatlandCollisionWorld);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, Motion, CityMap, Palette, Portals, CollisionWorld) {
  'use strict';
  if (!C || !Motion || !CityMap || !Palette || !Portals) throw new Error('Load characters, motion, portals, city-map and palette before district.js.');
  const {ink,blue,teal,coral,lavender}=Palette;
  const clamp = t => Math.max(0, Math.min(1, t));
  const ease = t => {t = clamp(t); return t * t * (3 - 2 * t);};
  const ratio=2/3, duration=Motion.duration||20;
  const main = Motion.pose(1), heroActor = C.actors.child;
  function cubic(p, t) {
    const u = 1 - t, [a, b, c, d] = p;
    return {x: u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0], y: u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1], dx:3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]),dy:3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1])};
  }
  function path(curves, initialHeading) {
    let heading = initialHeading;
    const segments = curves.map(points => {
      const lengths=[0], headings=[]; let previous;
      for(let i=0;i<=32;i++) {
        const p=cubic(points,i/32); let a=Math.atan2(p.dy,p.dx);
        if(heading!==undefined)a+=Math.round((heading-a)/(2*Math.PI))*2*Math.PI; heading=a; headings.push(a);
        if(previous)lengths.push(lengths[i-1]+Math.hypot(p.x-previous.x,p.y-previous.y)); previous=p;
      }
      return {points,lengths,headings,length:lengths[32]};
    });
    return {segments,length:segments.reduce((sum,s)=>sum+s.length,0)};
  }
  function sample(route,distance) {
    if(distance>=route.length){const last=route.segments[route.segments.length-1],p=cubic(last.points,1);p.heading=Math.atan2(p.dy,p.dx);p.heading+=Math.round((last.headings[32]-p.heading)/(2*Math.PI))*2*Math.PI;return p;}
    let d=Math.max(0,Math.min(route.length,distance)),segment=route.segments[0];
    for(const s of route.segments){segment=s;if(d<=s.length)break;d-=s.length;}
    let i=1;while(i<32&&d>segment.lengths[i])i++;
    const t=(i-1+clamp((d-segment.lengths[i-1])/(segment.lengths[i]-segment.lengths[i-1])))/32,p=cubic(segment.points,t);
    if(distance>=route.length){const end=route.segments[route.segments.length-1].points[3];p.x=end[0];p.y=end[1];}
    p.heading=Math.atan2(p.dy,p.dx);p.heading+=Math.round((segment.headings[i-1]-p.heading)/(2*Math.PI))*2*Math.PI;return p;
  }
  function poseOn(actor,route,distance,speed=0) {
    const p=sample(route,distance),body={x:p.x,y:p.y,angle:0,sx:1,sy:1,bend:0,fear:0,speed,strain:Math.min(.45,speed/750),bounce:0};
    body.angle=p.heading-actor.headAxis(body).angle;return body;
  }
  function walking(elapsed,speed){return elapsed<=0?0:elapsed<.5?speed*elapsed*elapsed:speed*(elapsed-.25);}
  function walkSpeed(elapsed,speed){return elapsed<=0?0:Math.min(1,elapsed/.5)*speed;}
  function still(actor,x,y,heading=0){const body={x,y,angle:0,sx:1,sy:1,bend:0,strain:0,bounce:0};body.angle=heading-actor.headAxis(body).angle;return body;}
  function record(id,actor,body,color=ink,cavity=false){return{id,actor,body,color,cavity};}
  function emotion(actor,type,elapsed,duration,strength=1){if(elapsed>=0&&elapsed<duration)Object.assign(actor,{emotion:type,emotionElapsed:elapsed,emotionDuration:duration,emotionStrength:strength});return actor;}
  function interpolateWalk(actor,route,time,start,end) {
    const u=clamp((time-start)/(end-start)),body=poseOn(actor,route,ease(u)*route.length,u>0&&u<1?route.length*6*u*(1-u)/(end-start):0);
    return body;
  }
  function headingOf(actor,body){return body.angle+actor.headAxis(body).angle;}
  function connection(actor,body,end,endHeading,bend=100){
    const a=headingOf(actor,body);return path([[[body.x,body.y],[body.x+Math.cos(a)*bend,body.y+Math.sin(a)*bend],[end[0]-Math.cos(endHeading)*bend,end[1]-Math.sin(endHeading)*bend],end]],a);
  }
  function adultRest(person,index){
    const body=still(person.actor,person.x,person.y);
    // A relaxed straight edge faces the child; thin rectangles retain four upright boundaries.
    body.angle=person.line?0:Math.PI/2-Math.PI/person.actor.vertices.length+(index===0?0:Math.PI);
    return body;
  }
  // A horizontal approach meets the actual adult edge, rather than its bounding circle.
  function contactEdge(person,index,y){
    const points=person.actor.outline(adultRest(person,index)),hits=[];
    points.forEach((a,edge)=>{const b=points[(edge+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))hits.push({x:a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]),edge});});
    return hits.sort((a,b)=>index===0?b.x-a.x:a.x-b.x)[0];
  }

  const homes=CityMap.homes;
  const households = homes.map((home,index)=>{
    const cx=home.x+home.w/2,cy=home.y+home.h/2,solo=home.adults.length===1;
    const adults=home.adults.map((n,i)=>({id:home.id+'-adult-'+i,actor:n==='line'?C.create('mother'):C.create({sides:n,regular:true,radius:55+(index+i)%3*6,headIndex:0}),x:cx+(solo?0:i===0?-190:i===1?190:0),y:cy+(i===2?-170:-25),line:n==='line'}));
    const kids=home.kids.map((n,i)=>({id:home.id+'-child-'+i,actor:n==='line'?C.create('mother'):C.create({sides:n,regular:false,radius:i?35:44,headIndex:0}),line:n==='line',secondary:i>0,home,cx,cy}));
    const neutral={sx:kids[0]?.line ? .7 : 1,sy:kids[0]?.line ? .53 : 1,strain:0,bend:0,bounce:0},head=kids[0]?.actor.headAxis(neutral),headLength=head?Math.hypot(head.x,head.y):44,row=cy-10;
    const contacts=kids.length?[contactEdge(adults[0],0,row),contactEdge(adults[1],1,row)]:[];
    // Subpixel clearance prevents floating-point edge crossings at the shared touch point.
    const left=[contacts.length?contacts[0].x+headLength+.0001:cx-60,row],right=[contacts.length?contacts[1].x-headLength-.0001:cx+60,row],bottom=[left[0]+20,cy+140];
    const childRoute=path([
      [[cx,cy+105],[cx,cy+40],[left[0]+45,row],left],
      [left,[left[0]-55,row],[left[0]-55,cy+140],bottom],
      [bottom,[bottom[0]+80,cy+140],[right[0]-60,row],right],
      [right,[right[0]+35,row],[cx,cy+170],[cx,cy+105]]
    ],-Math.PI/2);
    const soloRoute=path([[[cx-50,cy],[cx-50,cy-80],[cx+75,cy-80],[cx+75,cy]],[[cx+75,cy],[cx+75,cy+80],[cx-50,cy+80],[cx-50,cy]]],-Math.PI/2);
    return{...home,cx,cy,adults,kids,childRoute,soloRoute,contacts};
  });
  function familyState(home,time){
    const cycle=((time/ratio+home.offset)%26)/26;
    return{cycle};
  }
  function householdAdult(person,index,home,cycle){
    const body=adultRest(person,index),contact=index===0?.18:.62,elapsed=(cycle-contact)*26;
    if(index>1||!home.kids.length||elapsed<0)return body;
    const onset=1-Math.pow(1-clamp(elapsed/.20),3),returnAt=index===0?.45:.90;
    const retreat=32*onset*(1-ease((cycle-returnAt)/.08));
    body.x+=(index===0?-1:1)*retreat;body.y-=retreat*.12;
    body.edgeBends=person.actor.vertices.map(()=>0);
    body.edgeBends[home.contacts[index].edge]=.8*onset*(1-ease((elapsed-.23)/.95));
    return body;
  }
  function householdChild(kid,time){
    const home=households.find(h=>h.id===kid.home.id),{cycle}=familyState(home,time);
    let body;
    if(kid.secondary){const a=time*.16+home.offset;const x=kid.cx+190+Math.cos(a)*8,y=kid.cy+160+Math.sin(a)*8;body=still(kid.actor,x,y,a+Math.PI/2);body.strain=.08;}
    else {
      const segments=home.childRoute.segments,lengths=segments.map(s=>s.length);let d,u=0;
      if(cycle<.18){u=cycle/.18;d=ease(u)*lengths[0];}
      else if(cycle<.28)d=lengths[0];
      else if(cycle<.45){u=(cycle-.28)/.17;d=lengths[0]+ease(u)*lengths[1];}
      else if(cycle<.62){u=(cycle-.45)/.17;d=lengths[0]+lengths[1]+ease(u)*lengths[2];}
      else if(cycle<.72)d=lengths[0]+lengths[1]+lengths[2];
      else{u=(cycle-.72)/.28;d=lengths[0]+lengths[1]+lengths[2]+ease(u)*lengths[3];}
      body=poseOn(kid.actor,home.childRoute,d,u?38:0);
      const heading=headingOf(kid.actor,body);body.strain=.35*Math.pow(Math.sin(Math.PI*u),2);body.angle=heading-kid.actor.headAxis(body).angle;
    }
    if(kid.line){const heading=headingOf(kid.actor,body);body.sx=.7;body.sy=.53;body.angle=heading-kid.actor.headAxis(body).angle;}
    return body;
  }

  const inspector=C.create({sides:7,regular:true,radius:67,headIndex:0});
  const guardPoints=[[0,-78],[26,44],[-26,44]].map(([x,y])=>[x,y-10/3]);
  const guards=Array.from({length:3},()=>new C.Character('triangle-guard',guardPoints,0));
  const door=CityMap.mainDoor,gate=CityMap.gate.point,road=CityMap.escortCurves;
  const hx=main.child.x,hy=main.child.y;
  const formation=[[hx-170,hy],[hx+30,hy+230],[hx+147,hy+85],[hx-85,hy+147]];
  const entryStarts=[20.55,21.1,21.9,22.7].map(t=>t*ratio),entryEnds=[21.25,21.75,22.55,23.35].map(t=>t*ratio);
  const entryFinish=[21.85,23,24,24.1].map(t=>t*ratio);
  const police=[inspector,...guards].map((actor,i)=>{
    const [x,y]=formation[i],heading=Math.atan2(hy-y,hx-x);
    const approach=path([[[door[0],door[1]-210],[door[0],door[1]-160],[door[0],door[1]+15],[door[0],door[1]+70]]],Math.PI/2);
    const inside=[door[0],door[1]+70],last=[x-Math.cos(heading)*45,y-Math.sin(heading)*45];
    const curves=i===0?[[inside,[door[0],hy],[x-50,hy],[x,y]]]:i===1?[
      [inside,[door[0],door[1]+130],[650,350],[650,hy]],
      [[650,hy],[650,hy+210],[850,hy+260],[960,hy+260]],
      [[960,hy+260],[x,hy+260],[x,y+20],[x,y]]
    ]:i===2?[
      [inside,[door[0]+120,door[1]+70],[x,door[1]+95],[x,hy-40]],
      [[x,hy-40],[x,hy+10],last,[x,y]]
    ]:[
      [inside,[door[0],door[1]+130],[650,350],[650,hy]],
      [[650,hy],[650,hy+160],last,[x,y]]
    ];
    const fan=path(curves,Math.PI/2),body=poseOn(actor,fan,fan.length);
    return{id:i?'guard-'+i:'inspector',actor,approach,fan,body};
  });
  function entrance(person,index,time){
    if(time<=entryEnds[index])return interpolateWalk(person.actor,person.approach,time,entryStarts[index],entryEnds[index]);
    return interpolateWalk(person.actor,person.fan,time,entryEnds[index],entryFinish[index]);
  }
  function gatedDistance(actor,route,distance,time,speed=0){
    const from=Math.max(0,route.length-1400);
    if(distance<=from)return distance;
    return Portals.clampTravel(actor,d=>poseOn(actor,route,d,speed),from,distance,CityMap.gate.portal,time);
  }
  function joinAt(actor,body,point,heading,bend=65){return connection(actor,body,point,heading,bend).segments.map(segment=>segment.points);}
  const heroCurves=[[[hx,hy],[hx+(door[0]-hx)/3,hy+(door[1]-hy)/3],[hx+(door[0]-hx)*2/3,hy+(door[1]-hy)*2/3],door],...road];
  const takeAway=24.1*ratio,firstMove=takeAway+.38,cruiseStart=firstMove;
  const heroRoute=path(heroCurves),heroCruise=heroRoute.length/(58-cruiseStart-.25),heroDoorDistance=heroRoute.segments[0].length;
  function heroDistance(time){
    return Math.min(heroRoute.length,walking(time-firstMove,heroCruise));
  }
  function heroSpeed(time){return time>=58?0:walkSpeed(time-firstMove,heroCruise);}
  function heroBody(time,opening){
    if(time<firstMove)return {...(opening||Motion.pose(Math.min(time/duration,1))).child};
    const wanted=heroDistance(time),speed=heroSpeed(time),d=gatedDistance(heroActor,heroRoute,wanted,time,speed);
    const body=poseOn(heroActor,heroRoute,d,d<wanted?0:speed),turn=ease((time-firstMove)/.2);
    const delta=Math.atan2(Math.sin(body.angle-main.child.angle),Math.cos(body.angle-main.child.angle));
    body.angle=main.child.angle+delta*turn;return body;
  }
  // Each pointed advance ends at the child's actual outline, before the child takes a step.
  function threateningRoute(body,target){
    const heading=headingOf(guards[1],body),dx=target.x-body.x,dy=target.y-body.y;
    const length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,stagingDistance=Math.min(160,length-2),handle=Math.min(18,(length-stagingDistance)/3),staging=[target.x-ux*stagingDistance,target.y-uy*stagingDistance];
    const route=path([
      [[body.x,body.y],[body.x+Math.cos(heading)*handle,body.y+Math.sin(heading)*handle],[staging[0]-ux*handle,staging[1]-uy*handle],staging],
      [staging,[staging[0]+ux*25,staging[1]+uy*25],[target.x-ux*25,target.y-uy*25],[target.x,target.y]]
    ],heading);
    const silhouette=heroActor.outline(target);let low=0,high=route.length;
    for(let i=0;i<24;i++){const mid=(low+high)/2,candidate=poseOn(guards[1],route,mid);if(C.distance(guards[1].outline(candidate),silhouette)>.0001)low=mid;else high=mid;}
    return {route,distance:low};
  }
  const firstThreat=threateningRoute(police[2].body,heroBody(takeAway));
  const firstThreatEnd=poseOn(guards[1],firstThreat.route,firstThreat.distance);
  function threatBody(time){
    return poseOn(guards[1],firstThreat.route,firstThreat.distance*ease((time-takeAway)/.38));
  }
  const slots=CityMap.forecourtSlots;
  function slotFor(id,index){return Array.isArray(slots)?slots.find(slot=>slot.id===id)||slots[index]:slots[id];}
  function courtyardCurves(id,index,join){
    const slot=slotFor(id,index),end=Array.isArray(slot)?slot:slot.point||[slot.x,slot.y],last=road[road.length-1];
    const dx=gate[0]-last[2][0],dy=gate[1]-last[2][1],heading=Array.isArray(slot)||slot.heading===undefined?Math.atan2(dy,dx):slot.heading;
    const start=join?road.findIndex(curve=>Math.hypot(curve[0][0]-join[0],curve[0][1]-join[1])<.01):0;
    if(start<0)throw new Error('A household access path must meet the shared escort road.');
    return [...road.slice(start,-1),[last[0],last[1],[end[0]-Math.cos(heading)*90,end[1]-Math.sin(heading)*90],end]];
  }
  const policeStarts=[takeAway,firstMove,firstMove,firstMove];
  const releaseDirection=[firstThreatEnd.x-hx,firstThreatEnd.y-hy],releaseLength=Math.hypot(...releaseDirection);
  const releasedPoke={...firstThreatEnd,x:firstThreatEnd.x+releaseDirection[0]/releaseLength*22,y:firstThreatEnd.y+releaseDirection[1]/releaseLength*22};
  function escortLane(curves,offset){
    return curves.map((curve,i)=>{
      const a=Math.atan2(curve[1][1]-curve[0][1],curve[1][0]-curve[0][0]),b=Math.atan2(curve[3][1]-curve[2][1],curve[3][0]-curve[2][0]);
      return curve.map(([x,y],j)=>{const h=j<2?a:b,d=(j<2?i===0:i===curves.length-1)?0:offset;return[x-Math.sin(h)*d,y+Math.cos(h)*d];});
    });
  }
  police.forEach((person,i)=>{
    const body=i===2?releasedPoke:person.body,h=headingOf(person.actor,body);
    // All three guards merge behind the child's starting point before using the same doorway spine.
    const departure=i===0?joinAt(person.actor,body,door,-Math.PI/2,90):[...joinAt(person.actor,body,[hx,hy],Math.atan2(door[1]-hy,door[0]-hx),35),heroCurves[0]];
    const street=courtyardCurves(person.id,i);
    person.exit=path([...departure,...escortLane(street,i===1?-95:i===3?95:0)],h);
    person.roadOffset=path(departure,h).length;
  });
  const escortGaps=[360,-140,-260,-140],doorwayGaps=[360,-420,-140,-280];
  function policeDistance(person,time,index){
    const fan=ease((heroDistance(time)-heroDoorDistance-480)/260),gap=doorwayGaps[index]+(escortGaps[index]-doorwayGaps[index])*fan;
    const wanted=person.roadOffset+heroDistance(time)-heroDoorDistance+gap;
    return Math.min(person.exit.length,Math.max(0,wanted)*ease((time-policeStarts[index])/1.2));
  }
  function policeBody(person,time,index){
    if(time<takeAway)return entrance(person,index,time);
    if(index===2&&time<firstMove)return threatBody(time);
    if(index===2&&time<firstMove+.16){const u=ease((time-firstMove)/.16);return{...firstThreatEnd,x:firstThreatEnd.x+(releasedPoke.x-firstThreatEnd.x)*u,y:firstThreatEnd.y+(releasedPoke.y-firstThreatEnd.y)*u};}
    if(time<policeStarts[index])return {...person.body};
    // Everyone shares the child's route distance, rather than catching up on independent clocks.
    const wanted=policeDistance(person,time,index),speed=Math.max(0,(policeDistance(person,time+.005,index)-policeDistance(person,time-.005,index))/.01);
    const d=gatedDistance(person.actor,person.exit,wanted,time,speed);
    return poseOn(person.actor,person.exit,d,d<wanted?0:speed);
  }
  const westKid=households.find(h=>h.id==='west').kids[0],nwKids=households.find(h=>h.id==='northwest').kids;
  const detainees=[{kid:westKid,lag:640},{kid:nwKids[0],lag:1140},{kid:nwKids[1],lag:1460}];
  detainees.forEach((item,index)=>{
    const home=households.find(h=>h.id===item.kid.home.id),access=home.accessCurves,join=home.roadJoin;
    const segmentIndex=road.findIndex(curve=>Math.hypot(curve[0][0]-join[0],curve[0][1]-join[1])<.01);
    if(segmentIndex<0)throw new Error('Recruited children must enter at a shared road junction.');
    item.joinDistance=segmentIndex?path(road.slice(0,segmentIndex)).length:0;
    // Join behind the child already being taken away, before the distant gate shot.
    item.joinTime=cruiseStart+.25+(heroDoorDistance+item.joinDistance+item.lag)/heroCruise;
    item.start=item.joinTime-3.1;

  });
  function lineCurve(a,b){return[a,[a[0]+(b[0]-a[0])/3,a[1]+(b[1]-a[1])/3],[a[0]+(b[0]-a[0])*2/3,a[1]+(b[1]-a[1])*2/3],b];}
  function roundedRoute(points,radius=24){
    const curves=[];let current=points[0];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],corner=points[i],b=points[i+1],first=Math.hypot(corner[0]-a[0],corner[1]-a[1]),last=Math.hypot(b[0]-corner[0],b[1]-corner[1]),cut=Math.min(radius,first*.3,last*.3);
      const enter=[corner[0]+(a[0]-corner[0])*cut/first,corner[1]+(a[1]-corner[1])*cut/first],leave=[corner[0]+(b[0]-corner[0])*cut/last,corner[1]+(b[1]-corner[1])*cut/last];
      if(Math.hypot(enter[0]-current[0],enter[1]-current[1])>.001)curves.push(lineCurve(current,enter));
      curves.push([enter,[enter[0]+(corner[0]-enter[0])*2/3,enter[1]+(corner[1]-enter[1])*2/3],[leave[0]+(corner[0]-leave[0])*2/3,leave[1]+(corner[1]-leave[1])*2/3],leave]);current=leave;
    }
    curves.push(lineCurve(current,points.at(-1)));return curves;
  }
  const tailRoad=path(road),tailSamples=Array.from({length:Math.ceil(tailRoad.length/20)+1},(_,i)=>{const d=Math.min(tailRoad.length,i*20),p=sample(tailRoad,d);return{x:p.x,y:p.y,d};}),tailArcCache=[];
  function projectRoad(body){
    let best=Infinity,arc=0;
    for(let i=1;i<tailSamples.length;i++){const a=tailSamples[i-1],b=tailSamples[i],dx=b.x-a.x,dy=b.y-a.y,u=clamp(((body.x-a.x)*dx+(body.y-a.y)*dy)/(dx*dx+dy*dy||1)),distance=Math.hypot(body.x-a.x-u*dx,body.y-a.y-u*dy);if(distance<best){best=distance;arc=a.d+(b.d-a.d)*u;}}
    return arc;
  }
  // A forecourt turn can project backward on the street; cap followers before that final turn too.
  const finalMainTailArc=Math.min(...police.slice(1).map((person,i)=>projectRoad(policeBody(person,58,i+1))));
  function mainTailArc(time){
    while(tailArcCache.length<resolvedFrames.length){const i=tailArcCache.length,tail=resolvedFrames[i].actors.filter(entry=>/^guard-[123]$/.test(entry.id));tailArcCache.push(Math.max(tailArcCache[i-1]||0,tail.length?Math.min(...tail.map(entry=>projectRoad(entry.body))):0));}
    const index=Math.min(tailArcCache.length-1,Math.max(0,Math.floor(time/collisionStep)-1));
    return Math.min(finalMainTailArc,tailArcCache[index]||Math.max(0,heroDistance(time)-heroDoorDistance-140));
  }
  const teams=['west','northwest'].map((homeId,teamIndex)=>{
    const group=detainees.filter(item=>item.kid.home.id===homeId),lead=group[0],home=households.find(h=>h.id===homeId),scheduledStart=lead.start;
    if(teamIndex)lead.start=49;
    // Clear the shared west junction before the larger main escort reaches it.
    const enterStart=scheduledStart-10-(teamIndex?8:4),freezeReference=scheduledStart-10-(teamIndex?8:0);
    // Pause at a naturally reached, spacious rest pose before the arrest team arrives.
    const freezeAt=(Math.floor((freezeReference/ratio+home.offset)/26)*26-home.offset)*ratio;
    group.forEach(item=>{item.freezeAt=freezeAt;item.captured=householdChild(item.kid,freezeAt);});
    const back=[home.cx,home.cy+210],homeDoor=home.door;
    // The whole outbound group shares this center aisle, door and street: no crossing exit fans.
    const inside=[lineCurve(back,homeDoor)],pocket=[home.cx-430,homeDoor[1]-170];
    const localExit=teamIndex?[[homeDoor,[home.cx,homeDoor[1]-60],[home.cx-80,homeDoor[1]-70],[home.cx-150,homeDoor[1]-70]],[[home.cx-150,homeDoor[1]-70],[home.cx-260,homeDoor[1]-70],[home.cx-430,homeDoor[1]-100],pocket]]:home.accessCurves;
    const forecourtEntry=CityMap.gate.forecourt.entry;
    const beyondPocket=[pocket,[pocket[0],pocket[1]-110],[-2650,-1450],forecourtEntry];
    const outside=teamIndex?[beyondPocket,...courtyardCurves('detainee-2',5,forecourtEntry)]:courtyardCurves('detainee-1',4,home.roadJoin);
    const spine=path([...inside,...localExit,...outside]),joinDistance=path([...inside,...localExit]).length,childOrigin=105,joinTravel=joinDistance-childOrigin;
    const followSamples=Array.from({length:Math.ceil(spine.length/12)+1},(_,i)=>{const d=Math.min(spine.length,i*12),p=sample(spine,d);return{d,arc:projectRoad(p)};});
    for(let i=1;i<followSamples.length;i++)followSamples[i].arc=Math.max(followSamples[i].arc,followSamples[i-1].arc);
    function followDistance(arc){for(let i=1;i<followSamples.length;i++){const a=followSamples[i-1],b=followSamples[i];if(b.arc>arc)return a.d+(b.d-a.d)*clamp((arc-a.arc)/(b.arc-a.arc||1));}return spine.length;}
    const speed=joinTravel/2.15,reverse=home.accessCurves.slice().reverse().map(curve=>curve.slice().reverse());
    const second=group[1],secondDelay=0;
    const sideExit=second?roundedRoute([[second.captured.x,second.captured.y],[home.cx+70,home.cy+135],[home.cx+70,homeDoor[1]+75],[home.cx+70,homeDoor[1]-105],[home.cx-200,homeDoor[1]-115],pocket],20):null;
    const merge=second?path([...sideExit,beyondPocket,...courtyardCurves('detainee-3',6,forecourtEntry)]):null;
    function travel(time){
      if(time<lead.start)return 0;
      const street=heroDistance(Math.min(time,58))-heroDoorDistance-lead.lag-lead.joinDistance;
      const desired=joinTravel+Math.max(0,street),brisk=Math.min(desired,walking(time-lead.start,speed));
      // Approach the door briskly, then give the entire main escort a physical head start.
      const insideLimit=Math.max(0,home.cy+210-homeDoor[1]-315-70);
      const followLimit=Math.max(insideLimit,followDistance(mainTailArc(time)-160)-315);
      return Math.min(brisk,followLimit);
    }
    function velocity(time){return Math.max(0,(travel(time+.005)-travel(time-.005))/.01);}
    function onSpine(actor,d,time){const wanted=Math.max(0,Math.min(spine.length,d)),v=velocity(time),safe=gatedDistance(actor,spine,wanted,time,v);return poseOn(actor,spine,safe,safe<wanted?0:v);}
    const western=CityMap.road.westernCurves;
    const exterior=teamIndex?(CityMap.road.externalNorthwestCurves||[[[-4600,-650],[-3800,-1500],[-2700,-1070],[-2500,-1140]]]):(CityMap.road.externalCurves||[[[-4600,-650],[-3800,-650],[-3030,-850],[-2760,-150]]]);
    const northwestApproach=CityMap.road.externalNorthwestApproachCurves||[[[-2500,-1140],[-2500,-1240],[-2440,-1310],[-2360,-1310]],[[-2360,-1310],[-2260,-1310],[-2180,-1221],[-2080,-1200]]];
    const outerEntry=[...exterior,...(teamIndex?northwestApproach:western.slice(0,3).reverse().map(curve=>curve.slice().reverse()))];
    const members=[C.create({sides:7,regular:true,radius:25,headIndex:0}),new C.Character('local-triangle',[[0,-30],[10,19],[-10,19]],0),new C.Character('local-triangle',[[0,-30],[10,19],[-10,19]],0)].map((actor,i)=>{
      const origin=i===0?205:i===1?315:15,slot=sample(spine,origin),inner=i===2?roundedRoute([homeDoor,[home.cx-90,homeDoor[1]+100],[home.cx-90,home.cy+185],[home.cx,home.cy+210],[slot.x,slot.y]],18):[lineCurve(homeDoor,[slot.x,slot.y])],incoming=path([...outerEntry,...reverse,...inner]);
      let jab=null,jabEnd=origin;
      if(i===2){const child=lead.kid.actor.outline(lead.captured);let low=origin,high=childOrigin;for(let n=0;n<20;n++){const mid=(low+high)/2;if(C.distance(actor.outline(poseOn(actor,spine,mid)),child)>.001)low=mid;else high=mid;}jab={from:origin,to:low};jabEnd=low;}
      return{id:homeId+'-escort-'+i,actor,incoming,origin,jab,jabEnd,start:lead.start,entryStart:enterStart+i*1.0,entryEnd:scheduledStart-1.15+i*.25-(teamIndex?8:4)};
    });
    const team={homeId,home,enterStart,freezeAt,members,lead,group,spine,travel,velocity,onSpine,childOrigin,merge,secondDelay};
    group.forEach((item,i)=>{item.team=team;item.memberIndex=i;if(i){item.start=lead.start+(secondDelay ? .25+secondDelay/speed : 0);item.joinTime=lead.start+.25+(secondDelay+path(sideExit).length)/speed;}});
    return team;
  });
  function detainedBody(item,time){
    if(time<item.freezeAt)return householdChild(item.kid,time);
    const team=item.team,g=team.travel(time);
    if(!item.memberIndex){if(time<team.lead.start)return {...item.captured};return team.onSpine(item.kid.actor,team.childOrigin+g,time);}
    if(g<=team.secondDelay)return {...item.captured};
    const d=g-team.secondDelay;
    const distance=Math.min(team.merge.length,d),v=team.velocity(time),safe=gatedDistance(item.kid.actor,team.merge,distance,time,v);return poseOn(item.kid.actor,team.merge,safe,safe<distance?0:v);
  }
  function localPoliceBody(member,team,time){
    if(time<member.entryEnd)return interpolateWalk(member.actor,member.incoming,time,member.entryStart,member.entryEnd);
    const g=team.travel(time);
    if(member.jab){
      if(time<team.lead.start){const u=ease((time-(team.lead.start-.55))/.4);return poseOn(member.actor,team.spine,member.jab.from+(member.jab.to-member.jab.from)*u);}
      return team.onSpine(member.actor,member.jabEnd+Math.max(0,g-(team.group.length>1?120:40)),time);
    }
    return team.onSpine(member.actor,member.origin+g,time);
  }
  const yieldStart=21.5*ratio,yieldSources=Motion.pose(yieldStart/duration),yieldPaths={
    father:connection(C.actors.father,yieldSources.father,[435,620],Math.PI,65),
    // Back away along her axis, keeping her head up instead of turning around in place.
    mother:connection(C.actors.mother,{...yieldSources.mother,angle:yieldSources.mother.angle+Math.PI},[1170,730],Math.PI/2,65)
  };
  function mainParent(kind,time,opening){
    if(time<=yieldStart)return {...opening[kind]};
    const actor=C.actors[kind],body=interpolateWalk(actor,yieldPaths[kind],time,yieldStart,kind==='mother'?22.65*ratio:23.5*ratio),heading=headingOf(actor,body),fade=1-ease((time-yieldStart)/.55);
    body.fear=yieldSources[kind].fear*fade;body.bounce=yieldSources[kind].bounce*fade;body.edgeBends=yieldSources[kind].edgeBends.map(value=>value*fade);body.angle=heading-actor.headAxis(body).angle+(kind==='mother'?Math.PI:0);return body;
  }
  function curiosity(entry,time,contact){return emotion(entry,'curiosity',time-(contact-2.4),2.2,1);}
  function plannedFrame(value){
    const time=Number.isFinite(value)?Math.max(0,value):0,actors=[],opening=Motion.pose(Math.min(time/duration,1));
    for(const kind of ['father','mother']){
      const actor=C.actors[kind],body=mainParent(kind,time,opening),entry=record(kind,actor,body);
      emotion(entry,'exclamation',time-Motion.contactTimes[kind]*duration,.85,.9);actors.push(entry);
    }
    const hero=heroBody(time,opening);
    if(time<58){
      const entry=record('hero',heroActor,hero,blue,true);
      for(const kind of ['father','mother']){const contact=Motion.contactTimes[kind]*duration;curiosity(entry,time,contact);emotion(entry,'question',time-contact-.35,1.5,1.4);}
      actors.push(entry);
    }
    for(const home of households){
      const departure=detainees.find(item=>item.kid===home.kids[0]),familyActive=!departure||time<departure.freezeAt,state=familyState(home,familyActive?time:departure.freezeAt);
      home.adults.forEach((person,i)=>{
        let body;
        if(home.adults.length===1)body=poseOn(person.actor,home.soloRoute,((time*.035)%1)*home.soloRoute.length,12);
        else body=householdAdult(person,i,home,state.cycle);
        const entry=record(person.id,person.actor,body);
        if(familyActive&&home.kids.length&&i<2)emotion(entry,'exclamation',(state.cycle-(i===0?.18:.62))*26,.85,.8);actors.push(entry);
      });
      home.kids.forEach(kid=>{
        const item=detainees.find(item=>item.kid===kid),body=item?detainedBody(item,time):householdChild(kid,time),entry=record(kid.id,kid.actor,body,[blue,teal,coral,lavender][home.offset%4],true);
        if(!kid.secondary&&(!item||time<item.start)){
          const elapsed=(state.cycle-(state.cycle>=.45?.62:.18))*26;
          emotion(entry,'curiosity',elapsed+1.9,1.7,1);emotion(entry,'question',elapsed-.35,1.5,1);
        }
        actors.push(entry);
      });
    }
    teams.forEach(team=>team.members.forEach(member=>{if(time>=member.entryStart)actors.push(record(member.id,member.actor,localPoliceBody(member,team,time)));}));
    police.forEach((person,i)=>{if(time>=entryStarts[i])actors.push(record(person.id,person.actor,policeBody(person,time,i)));});
    return{actors,hero:{...hero,id:'hero',actor:heroActor,body:hero,active:time<58},phase:time<20.55*ratio?'families':time<takeAway?'arrival':time<58?'escort':'handoff',handoff:time>=58};
  }
  const collisionWorld=new CollisionWorld(CityMap.houseBoundaries),collisionStep=.05,resolvedFrames=[];
  const routeStarts=new Map([...detainees.map(item=>[item.kid.id,item.start]),...teams.flatMap(team=>team.members.map(member=>[member.id,member.start]))]);
  function resolvedAt(time,previous){
    const plan=plannedFrame(time),before=new Map((previous?.actors||[]).map(actor=>[actor.id,actor])),sampled=new Map([[time,plan]]),dt=time-(previous?.time??time);
    const intents=plan.actors.map(entry=>{
      const last=before.get(entry.id),routeControlled=time>=(routeStarts.get(entry.id)??Infinity),motionTime=last&&routeControlled?Math.min(time,last.motionTime+dt*1.2):time;
      if(!sampled.has(motionTime))sampled.set(motionTime,plannedFrame(motionTime));
      const pose=sampled.get(motionTime).actors.find(actor=>actor.id===entry.id);
      return{...entry,body:pose?.body||last?.body||entry.body,motionTime,routeControlled};
    });
    const actors=collisionWorld.resolve(previous?.actors||[],intents).map(entry=>{
      const last=before.get(entry.id);
      return{...entry,motionTime:last&&entry.routeControlled?last.motionTime+(entry.motionTime-last.motionTime)*(entry.collision.fraction??1):time};
    }),entry=actors.find(actor=>actor.id==='hero');
    return{...plan,time,actors,hero:entry?{...entry.body,id:'hero',actor:heroActor,body:entry.body,active:time<58}:plan.hero};
  }
  function frame(value){
    const time=Number.isFinite(value)?Math.max(0,Math.min(64,value)):0,index=Math.floor(time/collisionStep+1e-8);
    if(!resolvedFrames.length)resolvedFrames.push(resolvedAt(0));
    while(resolvedFrames.length<=index){const i=resolvedFrames.length;resolvedFrames.push(resolvedAt(i*collisionStep,resolvedFrames[i-1]));}
    return Math.abs(time-index*collisionStep)<1e-7?resolvedFrames[index]:resolvedAt(time,resolvedFrames[index]);
  }
  function drawBase(ctx,time){CityMap.drawBase(ctx,time,Palette);}
  return{drawBase,frame,timing:{duration,takeAway,firstMove,cruiseStart,detainees:detainees.map(item=>({id:item.kid.id,leave:item.start,join:item.joinTime,teamEntry:item.team?.enterStart??item.freezeAt,frozenAt:item.freezeAt}))},homes:homes.map(home=>({id:home.id,x:home.x,y:home.y,width:home.w,height:home.h})),handoff:{time:58,x:gate[0],y:gate[1],actor:heroActor}};
});
