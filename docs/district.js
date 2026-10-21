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
  const contactEnd=13.7,familyEnd=17.3,heroActor=C.actors.child;
  const contactPose=Motion.pose(contactEnd/duration),homeCenter={x:800,y:660};
  const recoveryPath=path([[[contactPose.child.x,contactPose.child.y],[contactPose.child.x-20,contactPose.child.y+115],[homeCenter.x+65,homeCenter.y+30],[homeCenter.x,homeCenter.y]]]);
  const recoveredBody={...poseOn(heroActor,recoveryPath,recoveryPath.length),angle:contactPose.child.angle};
  const main={...Motion.pose(1),child:{...recoveredBody,speed:0,strain:0,bend:.10}};
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
  const formation=[[hx,hy-210],[hx-170,hy+140],[hx,hy+230],[hx+170,hy+140]];
  // Leave a full visible beat after the inspector settles. These are scene-clock
  // seconds: the 90/79-second edits compress this stretch to about 0.45 playback seconds per second.
  const recoveryDelay=familyEnd-contactEnd;
  const entryStarts=[familyEnd,17.3+recoveryDelay,18.35+recoveryDelay,19.4+recoveryDelay],entryEnds=[21.25*ratio+recoveryDelay,17.7+recoveryDelay,18.75+recoveryDelay,19.8+recoveryDelay];
  const entryFinish=[21.85*ratio+recoveryDelay,21.2+recoveryDelay,21.75+recoveryDelay,22.3+recoveryDelay],signalStart=16.75+recoveryDelay,signalEnd=entryStarts[1];
  const police=[inspector,...guards].map((actor,i)=>{
    const [x,y]=formation[i],heading=Math.atan2(hy-y,hx-x);
    const approach=path([[[door[0],door[1]-210],[door[0],door[1]-160],[door[0],door[1]+15],[door[0],door[1]+70]]],Math.PI/2);
    const inside=[door[0],door[1]+70],last=[x-Math.cos(heading)*45,y-Math.sin(heading)*45];
    const curves=i===0?[[inside,[hx,door[1]+110],[x,y-70],[x,y]]]:i===1?[
      [inside,[650,350],[x,500],[x,hy]],
      [[x,hy],[x,hy+60],[x,y-20],[x,y]]
    ]:i===2?[
      [inside,[1100,350],[1100,700],[1050,850]],
      [[1050,850],[1000,920],[900,930],[x,y]]
    ]:[
      [inside,[970,350],[x,500],[x,hy]],
      [[x,hy],[x,hy+60],[x,y-20],[x,y]]
    ];
    const fan=path(curves,Math.PI/2),body=poseOn(actor,fan,fan.length);
    return{id:i?'guard-'+i:'inspector',actor,approach,fan,body};
  });
  function entrance(person,index,time){
    if(time<=entryEnds[index])return interpolateWalk(person.actor,person.approach,time,entryStarts[index],entryEnds[index]);
    const body=interpolateWalk(person.actor,person.fan,time,entryEnds[index],entryFinish[index]);
    if(index===0&&time>=entryFinish[0]){
      // Stand still and inspect first; only the later glance toward the doorway releases the guards.
      const age=time-entryFinish[0],inspect=.08*Math.sin(age*2.1)*Math.sin(Math.PI*clamp(age/(signalStart-entryFinish[0])));
      const signal=Math.sin(Math.PI*clamp((time-signalStart)/(signalEnd-signalStart)));
      body.angle+=inspect-.6*signal;
    }
    return body;
  }
  function gatedDistance(actor,route,distance,time,speed=0){
    const from=Math.max(0,route.length-1400);
    if(distance<=from)return distance;
    return Portals.clampTravel(actor,d=>poseOn(actor,route,d,speed),from,distance,CityMap.gate.portal,time);
  }
  function joinAt(actor,body,point,heading,bend=65){return connection(actor,body,point,heading,bend).segments.map(segment=>segment.points);}
  const heroCurves=[[[hx,hy],[hx+(door[0]-hx)/3,hy+(door[1]-hy)/3],[hx+(door[0]-hx)*2/3,hy+(door[1]-hy)*2/3],door],...road];
  const takeAway=entryFinish[3],firstMove=takeAway+.38,cruiseStart=firstMove;
  const heroRoute=path(heroCurves),heroCruise=heroRoute.length/(58-cruiseStart-.25),heroDoorDistance=heroRoute.segments[0].length;
  function escortResistance(time){
    for(const start of [35.4,43.6,50.8]){
      const age=time-start;if(age<0||age>2.8)continue;
      const lag=1.1*ease(age/.9)*(1-ease((age-1.35)/1.3));
      return{lag,start,poke:ease((age-.75)/.6)*(1-ease((age-1.45)/.45)),strain:.32*Math.sin(Math.PI*clamp(age/2.8)),tremble:Math.sin(age*32)*Math.sin(Math.PI*clamp(age/1.35))*(age<1.35?1:0)};
    }
    return{lag:0,poke:0,strain:0,tremble:0};
  }
  function heroDistance(time){
    return Math.min(heroRoute.length,walking(time-firstMove-escortResistance(time).lag,heroCruise));
  }
  function heroSpeed(time){return time>=58?0:(heroDistance(time+.002)-heroDistance(time-.002))/.004;}
  function heroBody(time,opening){
    if(time<contactEnd)return {...(opening||Motion.pose(Math.min(time/duration,1))).child};
    if(time<familyEnd){
      if(time<14.35)return {...contactPose.child,speed:0,strain:0,bend:.18,fear:.28,bounce:0};
      const body=interpolateWalk(heroActor,recoveryPath,time,14.35,16.4),u=ease((time-14.35)/2.05);
      body.angle=contactPose.child.angle;body.bend=.18-.08*u;body.fear=.28*(1-u);body.strain*=.45;body.bounce=0;
      return body;
    }
    if(time<firstMove){
      const age=time-(takeAway-1.05),u=clamp(age/1.05),struggle=age>=0&&time<takeAway?Math.sin(Math.PI*u):0;
      return{...main.child,angle:main.child.angle,axialStretch:-.07*struggle,strain:0,bend:.1+.27*struggle,edgeBends:heroActor.vertices.map((_,i)=>.26*struggle*(1+.2*Math.sin(age*25+i)))};
    }
    const wanted=heroDistance(time),speed=heroSpeed(time),d=gatedDistance(heroActor,heroRoute,wanted,time,speed);
    const body=poseOn(heroActor,heroRoute,d,d<wanted?0:speed),turn=ease((time-firstMove)/.2);
    const delta=Math.atan2(Math.sin(body.angle-main.child.angle),Math.cos(body.angle-main.child.angle));
    const reluctant=escortResistance(time);body.angle=main.child.angle+delta*turn;if(reluctant.lag>0){const facing=poseOn(heroActor,heroRoute,walking(reluctant.start-firstMove,heroCruise)).angle;body.angle+=Math.atan2(Math.sin(facing-body.angle),Math.cos(facing-body.angle))*clamp(reluctant.lag/.35);}
    body.axialStretch=-.07*clamp(reluctant.lag/1.1);body.bend+=reluctant.strain;body.strain=Math.max(body.strain,reluctant.strain);return body;
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
    const wanted=person.roadOffset+(index===0?Math.min(heroRoute.length,walking(time-firstMove,heroCruise)):heroDistance(time))-heroDoorDistance+gap;
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
    const body=poseOn(person.actor,person.exit,d,d<wanted?0:speed),reluctant=escortResistance(time);
    if(index===0&&reluctant.lag>.03){const child=heroBody(time),axis=person.actor.headAxis(body),look=Math.atan2(child.y-body.y,child.x-body.x)-axis.angle;body.angle+=Math.atan2(Math.sin(look-body.angle),Math.cos(look-body.angle))*clamp(reluctant.lag/.3);}
    if(index===2&&reluctant.poke>0){
      const child=heroBody(time),direction=Math.atan2(child.y-body.y,child.x-body.x),axis=person.actor.headAxis(body),look=direction-axis.angle;
      body.angle+=Math.atan2(Math.sin(look-body.angle),Math.cos(look-body.angle))*reluctant.poke;
      const outline=heroActor.outline(child),distance=Math.hypot(child.x-body.x,child.y-body.y);let low=0,high=distance;
      for(let i=0;i<20;i++){const step=(low+high)/2,candidate={...body,x:body.x+Math.cos(direction)*step,y:body.y+Math.sin(direction)*step};if(C.penetrates(person.actor.outline(candidate),outline))high=step;else low=step;}
      body.x+=Math.cos(direction)*low*reluctant.poke;body.y+=Math.sin(direction)*low*reluctant.poke;
    }
    return body;
  }
  const yieldStart=21.5*ratio+recoveryDelay,yieldSources=Motion.pose(yieldStart/duration),yieldPaths={
    father:connection(C.actors.father,yieldSources.father,[435,620],Math.PI,65),
    // Back away along her axis, keeping her head up instead of turning around in place.
    mother:connection(C.actors.mother,{...yieldSources.mother,angle:yieldSources.mother.angle+Math.PI},[1170,730],Math.PI/2,65)
  };
  function mainParent(kind,time,opening){
    if(time<=yieldStart)return {...opening[kind]};
    const actor=C.actors[kind],body=interpolateWalk(actor,yieldPaths[kind],time,yieldStart,kind==='mother'?22.65*ratio+recoveryDelay:23.5*ratio+recoveryDelay),heading=headingOf(actor,body),fade=1-ease((time-yieldStart)/.55);
    body.fear=yieldSources[kind].fear*fade;body.bounce=yieldSources[kind].bounce*fade;body.edgeBends=yieldSources[kind].edgeBends.map(value=>value*fade);body.angle=heading-actor.headAxis(body).angle+(kind==='mother'?Math.PI:0);return body;
  }
  function familyEmotion(time){
    const father=Motion.contactTimes.father*duration,mother=Motion.contactTimes.mother*duration;
    if(time<1.2)return null;
    if(time<father)return 'curiosity';
    if(time<6.8)return 'exclamation';
    if(time<mother)return 'curiosity';
    return time<firstMove?'exclamation':null;
  }
  function plannedFrame(value){
    const time=Number.isFinite(value)?Math.max(0,value):0,actors=[],opening=Motion.pose(Math.min(time/duration,1));
    for(const kind of ['father','mother']){
      const actor=C.actors[kind],body=mainParent(kind,time,opening),entry=record(kind,actor,body);
      emotion(entry,'exclamation',time-Motion.contactTimes[kind]*duration,2.6,.9);actors.push(entry);
    }
    const hero=heroBody(time,opening);
    if(time<58){
      const entry=record('hero',heroActor,hero,blue,true);
      const mark=familyEmotion(time);if(mark)emotion(entry,mark,.3,1e6,1);
      emotion(entry,'exclamation',time-firstMove,.75,1.15);
      actors.push(entry);
    }
    // Other homes remain part of the street; the only arrest is the protagonist's.
    for(const home of households){
      home.adults.forEach((person,i)=>actors.push(record(person.id,person.actor,adultRest(person,i))));
      home.kids.forEach(kid=>actors.push(record(kid.id,kid.actor,householdChild(kid,0),[blue,teal,coral,lavender][home.offset%4],true)));
    }
    police.forEach((person,i)=>{if(time>=entryStarts[i])actors.push(record(person.id,person.actor,policeBody(person,time,i)));});
    return{actors,hero:{...hero,id:'hero',actor:heroActor,body:hero,active:time<58},phase:time<entryStarts[0]?'families':time<takeAway?'arrival':time<58?'escort':'handoff',handoff:time>=58};
  }
  const collisionWorld=new CollisionWorld(CityMap.houseBoundaries),collisionStep=.05,resolvedFrames=[];
  function resolvedAt(time,previous){
    const plan=plannedFrame(time),actors=collisionWorld.resolve(previous?.actors||[],plan.actors),entry=actors.find(actor=>actor.id==='hero');
    let lastPoke=previous?.lastPoke??-Infinity;
    if(entry&&escortResistance(time).poke>.5&&actors.some(other=>/^guard-/.test(other.id)&&C.distance(entry.actor.outline(entry.body),other.actor.outline(other.body))<.25))lastPoke=time;
    if(entry&&time-lastPoke<.7)emotion(entry,'exclamation',time-lastPoke,.7,1.15);
    return{...plan,time,actors,lastPoke,hero:entry?{...entry.body,id:'hero',actor:heroActor,body:entry.body,active:time<58}:plan.hero};
  }
  function frame(value){
    const time=Number.isFinite(value)?Math.max(0,Math.min(64,value)):0,index=Math.floor(time/collisionStep+1e-8);
    if(!resolvedFrames.length)resolvedFrames.push(resolvedAt(0));
    while(resolvedFrames.length<=index){const i=resolvedFrames.length;resolvedFrames.push(resolvedAt(i*collisionStep,resolvedFrames[i-1]));}
    return Math.abs(time-index*collisionStep)<1e-7?resolvedFrames[index]:resolvedAt(time,resolvedFrames[index]);
  }
  function drawBase(ctx,time){CityMap.drawBase(ctx,time,Palette);}
  return{drawBase,frame,escortResistance,timing:{duration,contactEnd,familyEnd,homeCenter,takeAway,firstMove,cruiseStart,inspectorEntry:entryStarts[0],inspectorSettled:entryFinish[0],signalStart,signalEnd,guardsEntry:entryStarts.slice(1),guardsSettled:entryFinish.slice(1),detainees:[]},homes:homes.map(home=>({id:home.id,x:home.x,y:home.y,width:home.w,height:home.h})),handoff:{time:58,x:gate[0],y:gate[1],actor:heroActor}};
});
