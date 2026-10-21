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
  const discard=Base.anchors.discard,workCenter=Office.cellAt(0,0);
  const heroActor=C.create('child'),lanes=Array.from({length:12},(_,i)=>-390+i*260),stations=[0,-1500,-3100],beltStart=900,beltEnd=-3850,leftWall=-3880;
  const ordinary=lanes.map((_,i)=>[C.create({sides:i+3,radius:42,regular:false}),C.create({sides:i+3,radius:42,regular:false})]);
  let ambientTime=null,peelState=null,nodeResistance=null;
  const ambientAt=time=>ambientTime===null?time:ambientTime;
  function setAmbientTime(time){const next=Number.isFinite(time)?time:null;if(next!==ambientTime){ambientTime=next;productionTime=NaN;}Base.setAmbientTime(next);}
  function setPeelState(value){peelState=Array.isArray(value)?heroActor.vertices.map((_,i)=>clamp(Number(value[i])||0)):null;productionTime=NaN;}
  function setNodeResistance(value){nodeResistance=value||null;productionTime=NaN;}
  function nodeProgress(t,actualHero){
    const completedNodes=Number(t>=76.7)+Number(t>=81.6)+Number(t>=94),body=actualHero||productionPose(t,heroActor,130);
    let node=null;
    if(t>=67.4&&t<94){
      let points=heroActor.outline(body).map(([x,y])=>{const p=local({x,y});return[p.x,p.y];});
      if(t>=76.7){const center=local(body),rotation=body.angle-angle,c=Math.cos(rotation),s=Math.sin(rotation);points=vertices(heroActor).map(([x,y])=>[center.x+x*(body.sx||1)*c-y*(body.sy||1)*s,center.y+x*(body.sx||1)*s+y*(body.sy||1)*c]);}
      for(const[name,index,start,end]of[['mold',0,67.4,76.7],['compact',1,76.7,81.6],['paint',2,81.6,94]]){
        if(t<start||t>=end)continue;
        const x=stations[index],pad=[[x-154,6],[x+154,6],[x+154,254],[x-154,254]];
        if(C.intersects(points,pad)||nodeResistance?.node===name){node=name;break;}
      }
    }
    return{node,processStart:node==='mold'?71.7:node==='compact'?78.5:node==='paint'?83.2:null,completedNodes,redFraction:0,capacity:1};
  }
  const escapeStart=.075,escapeEnd=.24,escapeHit=.285,escapeReturn=.35;
  function compactImpact(age,power=1){
    if(!Number.isFinite(age)||age<0||age>=.4)return{impact:0,recoil:0,cameraX:0,cameraY:0};
    const impact=power*(1-between(age,.035,.22)),recoil=power*(3.5*Math.sin(age*110)*Math.exp(-age/.065)+1.8*Math.sin(age*70)*Math.sin(Math.PI*age/.4)*(1-between(age,.2,.4)));
    return{impact,recoil,cameraX:recoil*1.6+power*2.4*Math.exp(-age/.035)*(1-between(age,.3,.4)),cameraY:power*1.4*Math.sin(age*130)*Math.exp(-age/.09)*(1-between(age,.3,.4))};
  }
  // Each station owns its input as soon as the child's outline enters its platform.
  class NodeResistance{
    constructor(){this.reset();}
    reset(){this.node=null;this.time=0;this.actualHero=null;this.age=Infinity;this.motionTime=0;this.level=0;this.held=false;this.edge=-1;this.closed=[];this.offset=[0,0];this.from=[0,0];this.holdAge=0;this.effortProgress=0;this.exhausted=false;this.expansion=0;this.compacted=0;this.naturalImpactAge=Infinity;this.grip=0;this.releaseGrip=0;this.engageAge=0;this.gripFrom=0;this.twistFrom=0;this.impactFrom=0;this.levelFrom=0;this.anticipationFrom=0;this.moldGap=0;this.moldWasLocked=false;this.escapeLimit=46;this.pendingMold=false;this.releaseAge=Infinity;this.releaseFrom=0;this.paintCatchAngle=0;this.paintCatchIndex=-1;this.paintCatchPhase=0;return this;}
    enter(time,actualHero,initialProgress=0){
      const progress=nodeProgress(time,actualHero),next=progress.node;
      if(next!==this.node){this.node=next;this.age=Infinity;this.motionTime=0;this.level=0;this.offset=[0,0];this.from=[0,0];this.holdAge=0;this.effortProgress=Math.min(progress.capacity,Math.max(0,initialProgress));this.exhausted=false;this.expansion=0;this.compacted=0;this.naturalImpactAge=Infinity;this.grip=0;this.engageAge=0;this.twistFrom=0;this.impactFrom=0;this.levelFrom=0;this.anticipationFrom=0;this.releaseAge=Infinity;this.releaseFrom=0;this.paintCatchAngle=0;this.paintCatchIndex=-1;this.paintCatchPhase=0;this.pendingMold=false;if(next==='mold'){this.edge=-1;this.closed=[];}}
      if(next==='compact'&&!Number.isFinite(this.naturalImpactAge)&&time>=79.25)this.naturalImpactAge=time-79.25;
      this.time=time;this.actualHero=actualHero||null;
    }
    moldFitted(time=this.time){return heroActor.vertices.every((_,i)=>this.closed.includes(i)||time>=71.7+i+.64);}
    press(time,point,actualHero,initialProgress=0){
      this.enter(time,actualHero,initialProgress);if(!this.node)return false;
      if(this.node==='mold'&&this.moldFitted(time)){this.pendingMold=false;return false;}
      if(this.node==='compact'&&Number.isFinite(this.releaseAge))return true;
      if(this.node==='mold'&&this.age<.65){this.pendingMold=true;this.held=true;return true;}
      const previous=this.snapshot(time,actualHero);this.twistFrom=previous.twist;this.impactFrom=previous.impact;this.levelFrom=this.level;this.anticipationFrom=previous.anticipation;
      if(this.node==='mold'){
        this.edge=(this.edge+1)%heroActor.vertices.length;const face=moldAt(time).faces[this.edge],normal=face.normal;
        this.moldGap=face.gap;this.moldWasLocked=face.locked;
        const support=face.point[0]*normal[0]+face.point[1]*normal[1],bodySupport=Math.max(...heroActor.outline({x:0,y:0,angle:0}).map(([x,y])=>x*normal[0]+y*normal[1]));
        this.escapeLimit=Math.max(0,Math.min(46,support+face.gap-6-bodySupport));
      }
      this.held=true;this.age=0;this.holdAge=0;this.engageAge=0;this.from=[...this.offset];
      if(this.node==='paint'&&!this.exhausted){const paint=paintAt(time,5);this.paintCatchAngle=paint.angle;this.paintCatchIndex=paint.index;this.paintCatchPhase=paint.phase;this.releaseAge=Infinity;this.releaseFrom=0;}
      return true;
    }
    snap(){if(this.node==='compact'&&this.expansion>0){this.releaseFrom=this.expansion;this.releaseGrip=this.grip;this.releaseAge=0;}if(this.node==='paint'){const paint=paintAt(this.time,5);this.releaseFrom=paint.angle-paint.machineAngle;this.releaseAge=0;}this.held=false;}
    release(){if(this.held&&!this.exhausted&&(this.node==='paint'||this.holdAge>.2))this.snap();this.held=false;this.holdAge=0;}
    update(delta,{time=this.time,held=this.held,advance=true,actualHero,initialProgress=0}={}){
      if(!advance)return this.snapshot(time,actualHero);
      const dt=Math.max(0,Math.min(.1,Number(delta)||0)),previousNode=this.node,previousHeld=this.held;this.enter(time,actualHero,initialProgress);
      if(this.node==='compact'&&Number.isFinite(this.releaseAge))held=false;
      if(held&&!this.exhausted&&(this.node!==previousNode||!previousHeld))this.press(time,null,actualHero,initialProgress);
      if(this.held&&!held)this.release();this.held=!!held;
      if(!this.node)return this.snapshot(time,actualHero);
      this.age+=dt;this.motionTime+=dt;
      if(this.held&&!this.exhausted){
        this.holdAge+=dt;
        if(this.holdAge>.2){this.effortProgress=Math.min(nodeProgress(time,actualHero).capacity,this.effortProgress+dt/2.2);if(this.effortProgress>=nodeProgress(time,actualHero).capacity){this.exhausted=true;this.snap();}}
      }
      const target=!this.exhausted&&(this.held||this.age<.55)?1:0;this.level+=(target-this.level)*(1-Math.exp(-dt*10));
      if(this.node==='mold'&&Number.isFinite(this.age)){
        const points=vertices(heroActor),a=points[this.edge],b=points[(this.edge+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),normal=[(b[1]-a[1])/length,-(b[0]-a[0])/length],age=this.age,weak=this.exhausted?.065:1;
        let distance;
        if(age<escapeStart)distance=-3*Math.sin(age/escapeStart*Math.PI);
        else if(age<escapeEnd)distance=42*Math.pow((age-escapeStart)/(escapeEnd-escapeStart),3);
        else if(age<escapeHit)distance=42+4*(age-escapeEnd)/(escapeHit-escapeEnd);
        else if(age<escapeReturn){const u=(age-escapeHit)/(escapeReturn-escapeHit);distance=46-52*(1-(1-u)*(1-u));}
        else distance=age<.65?-6*Math.cos((age-escapeReturn)*32)*Math.exp(-(age-escapeReturn)*18):0;
        this.offset=this.from.map((v,i)=>v*(1-ease(age/.12))+normal[i]*distance*weak*this.escapeLimit/46);
        this.level=lerp(this.levelFrom,1,between(age,0,escapeStart))*(1-between(age,escapeReturn,.65));
        if(age>=escapeHit&&!this.closed.includes(this.edge))this.closed.push(this.edge);
      }
      if(this.node==='compact'){
        if(time>=79.25)this.naturalImpactAge=Math.max(Number.isFinite(this.naturalImpactAge)?this.naturalImpactAge+dt:0,time-79.25);
        if(this.held&&!this.exhausted&&this.holdAge>.2){if(this.engageAge===0)this.gripFrom=this.grip;this.engageAge+=dt;this.grip=lerp(this.gripFrom,1,ease(this.engageAge/.25));this.releaseAge=Infinity;this.releaseFrom=0;const target=.95*ease((this.holdAge-.2)/1.6);this.expansion+=(target-this.expansion)*(1-Math.exp(-dt*12));}
        if(Number.isFinite(this.releaseAge)){this.releaseAge+=dt;const age=this.releaseAge;this.expansion=this.releaseFrom*(1-Math.pow(clamp(age/.11),3));this.grip=age<.11?lerp(this.releaseGrip,1,Math.pow(age/.11,3)):1;}
      }
      if(this.node==='compact')this.compacted=Math.max(this.compacted,between(time,79.25,79.65),this.held?between(this.holdAge,.45,.75):0,Number.isFinite(this.releaseAge)?between(this.releaseAge,.11,.4):0);
      if(this.node==='paint'&&Number.isFinite(this.releaseAge))this.releaseAge+=dt;
      if(this.node==='paint'&&this.held&&!this.exhausted){const paint=paintAt(time,5);if(paint.index!==this.paintCatchIndex){this.paintCatchAngle=paint.angle;this.paintCatchIndex=paint.index;this.paintCatchPhase=paint.phase;}}
      if(!this.held&&!this.exhausted)this.effortProgress=Math.max(0,this.effortProgress-dt*2.5);
      if(this.node==='mold'&&this.moldFitted(time))this.pendingMold=false;
      if(this.node==='mold'&&this.pendingMold&&this.age>=.65){this.pendingMold=false;this.press(time,null,actualHero,initialProgress);}
      return this.snapshot(time,actualHero);
    }
    snapshot(time=this.time,actualHero=this.actualHero){
      const progress=nodeProgress(time,actualHero),active=progress.node===this.node&&!!this.node,age=active?this.age:Infinity,compact=active&&this.node==='compact';
      const hit=Math.max(active?this.impactFrom*(1-ease(age/.075)):0,compact?compactImpact(this.releaseAge-.11,1.65+.55*clamp(this.releaseFrom/.95)).impact:active&&this.node==='mold'&&age>=escapeHit&&age<escapeHit+.20?Math.pow(1-(age-escapeHit)/.20,2):0);
      const twist=compact&&age<.52?this.twistFrom*(1-ease(age/.12))+Math.sin(age/.52*Math.PI*3)*(1-age/.52)*.13*(this.exhausted?.2:1):0;
      const paint=active&&this.node==='paint'?paintAt(time,5):null,processPaused=active&&(this.node==='mold'?age<.65:compact?age<.52||this.held&&!this.exhausted||this.releaseAge<1.2:this.held&&!this.exhausted||this.releaseAge<.36);
      const finishAt=active&&this.node==='mold'&&this.moldFitted(time)&&age>=.65&&heroActor.vertices.every((_,i)=>this.closed.includes(i)||time>=71.7+i+.86)?76.7:compact&&Number.isFinite(this.releaseAge)&&this.releaseAge>=1.2?81.6:null;
      return{...progress,enabled:true,processPaused,finishAt,compacted:compact?this.compacted:0,naturalImpactAge:active?this.naturalImpactAge:time-79.25,held:active&&this.held,age,motionTime:this.motionTime,level:active?this.level:0,edge:this.edge,closed:active&&this.node==='mold'?[...this.closed]:[],moldGap:this.moldGap,moldWasLocked:this.moldWasLocked,offset:active&&this.node==='mold'?[...this.offset]:[0,0],closing:active&&this.node==='mold'&&Number.isFinite(age)?Math.pow(clamp((age-escapeEnd)/(escapeHit-escapeEnd)),3):0,anticipation:active&&this.node==='mold'&&age<escapeStart?clamp(this.anticipationFrom*(1-ease(age/escapeStart))+Math.sin(age/escapeStart*Math.PI)):0,impact:hit,twist,expansion:compact?this.expansion:0,grip:compact?this.grip:0,releaseAge:active?this.releaseAge:Infinity,releaseFrom:active?this.releaseFrom:0,recoil:compact?compactImpact(this.releaseAge-.11,1.65+.55*clamp(this.releaseFrom/.95)).recoil:0,effortProgress:active?Math.min(progress.capacity,this.effortProgress):0,exhausted:active&&this.exhausted,holdAge:active?this.holdAge:0,paintCatchAngle:this.paintCatchAngle,paintCatchIndex:this.paintCatchIndex,paintCatchPhase:this.paintCatchPhase,paintStage:paint?.stage||null,paintOpposition:paint?.opposition||0};
    }
  }
  // Each open transfer has its own real travel distance and playback allocation.
  // The tool clocks stay fixed; input only adds bounded motion on these clear spans.
  const transfers=[[67.4,71.7,beltStart,stations[0],0],[76.7,78.5,stations[0],stations[1],170],[81.6,83.2,stations[1],stations[2],170]];
  const transferProgram=Object.freeze(transfers.map(([start,end,from,to,clearance])=>Object.freeze({start,end,from,to,clearance})));
  function transferAt(t){return transfers.find(([a,b])=>t>=a&&t<b);}
  function pose(actor,x,y,rotation=0){const p=world(x,y),b={x:p.x,y:p.y,angle:0,sx:1,sy:1,bend:0,strain:0,bounce:0,edgeBends:actor.vertices.map(()=>0),edgeStretch:actor.vertices.map(()=>1)};b.angle=angle-Math.PI+rotation-actor.headAxis(b).angle;return b;}
  const standardShapes=new WeakMap();
  function vertices(actor,radius=71){if(radius===71&&standardShapes.has(actor))return standardShapes.get(actor);const a=Math.atan2(...[actor.vertices[0][1],actor.vertices[0][0]]),points=actor.vertices.map((_,i)=>[Math.cos(a+i*Math.PI*2/actor.vertices.length)*radius,Math.sin(a+i*Math.PI*2/actor.vertices.length)*radius]);if(radius===71)standardShapes.set(actor,points);return points;}
  function paintAt(t,n,start=83.2,end=94,actor=n===5?heroActor:ordinary[n-3]?.[0]){
    actor=actor||C.create({sides:n,radius:42});const delta=Math.PI*2/n,a0=Math.atan2(actor.vertices[0][1],actor.vertices[0][0]),base=-Math.PI-actor.headAxis({sx:1,sy:1,bend:0,strain:0}).angle,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    let first=0;for(let i=1;i<n;i++)if(Math.abs(wrap(-Math.PI/2-base-a0-(i+.5)*delta))<Math.abs(wrap(-Math.PI/2-base-a0-(first+.5)*delta)))first=i;
    const align=wrap(-Math.PI/2-base-a0-(first+.5)*delta),span=(end-start)/n,q=clamp((t-start)/(end-start)),index=Math.min(n-1,Math.floor(q*n)),phase=q>=1?1:(t-start-index*span)/span,step=between(phase,0,.42),order=Array.from({length:n},(_,i)=>(first-i+n)%n),side=Array(n).fill(0);
    order.forEach((which,i)=>{side[which]=t>=end?1:i<index?1:i===index?between(phase,.52,.78):0;});
    const previous=index?align+(index-1)*delta:0,target=align+index*delta,rotation=t<start?0:lerp(previous,target,step);
    const input=actor===heroActor&&start===83.2&&nodeResistance?.node==='paint'?nodeResistance:null;
    let opposed=rotation;
    if(input?.releaseAge<.36){const u=clamp(input.releaseAge/.36),tap=Math.abs(input.releaseFrom)<.03;opposed+=input.releaseFrom*(1-ease(u))-(tap?.075*Math.sin(Math.PI*u):0);}
    else if(input?.held&&!input.exhausted&&input.paintCatchIndex===index)opposed=input.paintCatchAngle-.38*between(input.holdAge,.16,.66);
    const opposition=Math.min(1,Math.abs(opposed-rotation)/.4),stage=input?.processPaused?(input.held&&!input.exhausted?'resist-turn':'force-align'):t<start?'waiting':phase<.28?'resist-turn':phase<.52?'force-align':phase<.80?'spray':'indexed-hold',aligned=Math.abs(opposed-target)<1e-8;
    return{side,angle:opposed,machineAngle:rotation,index,sideIndex:order[index],sideOrder:order,phase,opposition,stage,spraying:t>=start&&t<end&&phase>=.52&&phase<.80&&aligned&&!input?.processPaused,complete:t>=end};
  }
  function poly(ctx,points,fill){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}}
  function line(ctx,points,color,width){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function rounded(ctx,x,y,w,h,r,fill){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=fill;ctx.fill();}
  function setup(ctx){ctx.save();ctx.translate(origin.x,origin.y);ctx.rotate(angle);}
  function shellPolygon(actor){return vertices(actor);}
  function moldAt(t,start=71.7,end=76.7,actor=heroActor){
    const points=shellPolygon(actor),span=(end-start)/points.length;
    const faces=points.map((a,i)=>{const b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),normal=[(b[1]-a[1])/length,-(b[0]-a[0])/length],age=(t-start)/span-i,approach=between(age,0,.64),locked=age>=.64,lock=between(age,.64,.82),gap=36*(1-approach),kick=locked&&age<.86?Math.sin((age-.64)/.22*Math.PI*4)*(1-(age-.64)/.22)*1.8:0;
      return{index:i,normal,age,approach,locked,lock,gap,from:[a[0]+normal[0]*(gap+kick),a[1]+normal[1]*(gap+kick)],to:[b[0]+normal[0]*(gap+kick),b[1]+normal[1]*(gap+kick)],point:[(a[0]+b[0])/2,(a[1]+b[1])/2],impact:locked&&age<.82?1-(age-.64)/.18:0};});
    const input=actor===heroActor&&start===71.7&&nodeResistance?.node==='mold'&&nodeProgress(t).node==='mold'?nodeResistance:null;
    if(input?.enabled)for(const face of faces){
      const current=face.index===input.edge&&Number.isFinite(input.age),forced=input.closed.includes(face.index),closing=current?input.closing:0;
      if(!forced&&!current)continue;
      const gap=current&&input.age<escapeHit?input.moldGap*(1-closing):0,a=points[face.index],b=points[(face.index+1)%points.length],locked=current?input.moldWasLocked||input.age>=escapeHit:forced||face.locked;
      Object.assign(face,{gap,from:[a[0]+face.normal[0]*gap,a[1]+face.normal[1]*gap],to:[b[0]+face.normal[0]*gap,b[1]+face.normal[1]*gap],locked,lock:locked?1:closing,impact:current?Math.max(face.impact,input.impact):face.impact,interactive:true});
    }
    return{faces,vertices:points,fitted:faces.reduce((sum,face)=>sum+face.lock,0)/points.length,complete:t>=end};
  }
  function shellState(t,actor){const n=actor.vertices.length,paint=paintAt(t,n,83.2,94,actor),mold=moldAt(t,71.7,76.7,actor),controlled=actor===heroActor&&peelState!==null&&t>=119,release=controlled?[...peelState]:Array.from({length:n},(_,i)=>between(t,123.5+i*.58,124.15+i*.58));return{fitted:mold.fitted,mold,compacted:between(t,79.25,79.65),paint:paint.side.map((v,i)=>v*(1-release[i])),release,peelControlled:controlled,vertices:shellPolygon(actor),radius:71};}
  function compactAt(t,start=78.5,end=81.6,actor=heroActor,body=pose(heroActor,stations[1],130)){
    const input=actor===heroActor&&nodeResistance?.node==='compact'&&nodeProgress(t,body).node==='compact'?nodeResistance:null,loaded=!!input&&(input.expansion>0||Number.isFinite(input.releaseAge)),growth=loaded?Math.max(1,((body.sx??1)+(body.sy??1))/2):1;
    const relative=body.angle-angle-(input?.twist||0),c=Math.cos(relative),s=Math.sin(relative),points=shellPolygon(actor),n=points.length,frameHalfWidth=6,apothem=71*Math.cos(Math.PI/n),shift=apothem*(growth-1),outerScale=1+frameHalfWidth/apothem,rotate=([x,y])=>[x*c-y*s,x*s+y*c];
    // The five strips and die heads translate along their normals; corner joints open.
    const bars=points.map((a,i)=>{const b=points[(i+1)%n],length=Math.hypot(b[0]-a[0],b[1]-a[1]),normal=[(b[1]-a[1])/length,-(b[0]-a[0])/length],move=p=>[p[0]+normal[0]*shift,p[1]+normal[1]*shift];return{from:move(a),to:move(b),normal};});
    const fixed=points.map(rotate),baseShell=fixed.map(([x,y])=>[x*outerScale,y*outerScale]),centerline=points.map(([x,y])=>rotate([x*growth,y*growth])),shell=growth===1?baseShell:centerline.map(([x,y])=>[x*(1+frameHalfWidth/(apothem*growth)),y*(1+frameHalfWidth/(apothem*growth))]);
    const contactTime=start+.75,slamStart=contactTime-.1,holdEnd=start+1.15,returning=Number.isFinite(input?.releaseAge),phase=returning?(input.releaseAge<.11?'slam':input.releaseAge<.55?'hold':input.releaseAge<1.2?'release':'open'):t<start?'idle':t<slamStart?'windup':t<contactTime?'slam':t<holdEnd?'hold':t<end?'release':'open';
    const strike=clamp((t-slamStart)/.1),nominalClearance=t<start?16:t<slamStart?16+8*between(t,start,slamStart):t<contactTime?24*(1-strike*strike*strike):t<holdEnd?0:24*between(t,holdEnd,end),clearance=returning?(input.releaseAge<.11?nominalClearance*(1-input.grip):24*between(input.releaseAge,.55,1.2)):nominalClearance*(1-(input?.grip||0)),thickness=20;
    const reacting=returning&&input.releaseAge>=.11,age=reacting?input.releaseAge-.11:input?.naturalImpactAge??t-contactTime,power=reacting?1.65+.55*clamp(input.releaseFrom/.95):1,response=compactImpact(age,power),{impact,recoil,cameraX,cameraY}=response,shiftX=reacting?recoil*.65:0,shiftY=reacting&&age<.4?power*.7*Math.sin(age*95)*Math.exp(-age/.12)*(1-between(age,.3,.4)):0;
    const faces=points.map((_,i)=>{const normal=rotate(bars[i].normal),move=(p,d)=>[p[0]+normal[0]*d,p[1]+normal[1]*d],a=move(baseShell[i],shift),b=move(baseShell[(i+1)%n],shift),from=move(a,clearance),to=move(b,clearance),support=a[0]*normal[0]+a[1]*normal[1];
      return{index:i,normal,shellFrom:a,shellTo:b,from,to,point:[(from[0]+to[0])/2,(from[1]+to[1])/2],support,faceSupport:support+clearance,gap:clearance,thickness,polygon:[from,to,move(to,thickness),move(from,thickness)],pad:[from,to,move(to,3),move(from,3)]};});
    const contact=(t>=start+.75&&t<start+1.15||loaded)&&faces.every(face=>face.gap<1e-8),upperSupport=Math.min(...shell.map(p=>p[1])),lowerSupport=Math.max(...shell.map(p=>p[1])),upperFace=Math.min(...faces.flatMap(face=>[face.from[1],face.to[1]])),lowerFace=Math.max(...faces.flatMap(face=>[face.from[1],face.to[1]]));
    return{faces,bars,shell,centerline,clearance,thickness,gap:(lowerFace-upperFace)/2,upperFace,lowerFace,upperSupport,lowerSupport,contact,force:contact?1:0,phase,impact,recoil,shiftX,shiftY,cameraX,cameraY,contactTime,slamStart,holdEnd};
  }
  function bezier(points,u){const v=1-u,[a,b,c,d]=points;return{x:v*v*v*a[0]+3*v*v*u*b[0]+3*v*u*u*c[0]+u*u*u*d[0],y:v*v*v*a[1]+3*v*v*u*b[1]+3*v*u*u*c[1]+u*u*u*d[1],heading:Math.atan2(3*v*v*(b[1]-a[1])+6*v*u*(c[1]-b[1])+3*u*u*(d[1]-c[1]),3*v*v*(b[0]-a[0])+6*v*u*(c[0]-b[0])+3*u*u*(d[0]-c[0]))};}
  const workEntry=Office.entryCurves.entry;
  function routePoint(t){
    if(t<96){const u=between(t,94,96),initial=-Math.PI+paintAt(94,5).angle,turn=Math.atan2(Math.sin(Math.PI-initial),Math.cos(Math.PI-initial));return{x:lerp(stations[2],beltEnd,u),y:130,heading:initial+turn*between(t,94,94.4)};}
    if(t<98)return bezier(workEntry,between(t,96,98));
    return Office.heroPoint(t);
  }
  function routineEntry(id,actor,body,color,t,extra={}){return{id,actor,body,color,cavity:true,damage:0,blacken:0,windowOpen:1,compression:0,residual:0,core:0,label:undefined,result:undefined,restraint:undefined,routine:{time:t,...shellState(t,actor)},...extra};}
  function productionPose(t,actor,y){
    if(t>=64&&t<67.4)return pose(actor,lerp(1100,beltStart,clamp((t-64)/3.4)),y);
    const transfer=transferAt(t);
    if(transfer){const[start,end,from,to]=transfer;return pose(actor,lerp(from,to,clamp((t-start)/(end-start))),y);}
    if(t<71.7)return pose(actor,beltStart,y);
    if(t<78.5)return pose(actor,stations[0],y);
    if(t<83.2)return pose(actor,stations[1],y);
    if(t<94)return pose(actor,stations[2],y,paintAt(t,actor.vertices.length,83.2,94,actor).angle);
    return pose(actor,lerp(stations[2],beltEnd,between(t,94,96)),y,paintAt(94,actor.vertices.length,83.2,94,actor).angle);
  }
  function heroAt(t){
    if(t<64){const source=Base.frame(t).actors.find(e=>e.id==='hero');return source?routineEntry('hero',heroActor,{...source.body},P.blue,t):null;}
    let b;if(t<94)b=productionPose(t,heroActor,130);else if(t<110){const p=routePoint(t);b=pose(heroActor,p.x,p.y);b.angle=p.heading+angle-heroActor.headAxis({...b,angle:0}).angle;}else if(t<119)b={...Base.frame(119).hero};
    else{const source=Base.frame(t).actors.find(e=>e.id==='hero');if(!source)return null;b={...source.body,edgeBends:source.body.edgeBends?.map(()=>0)};}
    const entry=routineEntry('hero',heroActor,b,P.blue,t,{routine:{time:t,...shellState(t,heroActor),seed:true,compacting:compactAt(t,78.5,81.6,heroActor,b),work:t>=96&&t<110,job:t>=98&&t<110?routePoint(t).job||0:0}});
    const input=nodeResistance?.enabled&&nodeResistance.node===nodeProgress(t,b).node?nodeResistance:null;
    if(input?.node){const level=input.level||0,phase=Number.isFinite(input.age)?input.age:input.motionTime||0,sway=Math.sin(phase*10)*level;
      if(input.node==='mold'){const [dx,dy]=input.offset,c=Math.cos(b.angle),s=Math.sin(b.angle);b={...b,x:b.x+dx*c-dy*s,y:b.y+dx*s+dy*c,sx:1-.10*(input.anticipation||0)-.09*input.impact,sy:1-.10*(input.anticipation||0)-.045*input.impact,bend:.15*level+.24*input.impact,strain:.17*level,axialStretch:-.09*level};}
      else if(input.node==='compact'){
        const growth=1+.25*(input.expansion||0)-.05*(input.impact||0),twist=input.twist||0;
        b={...b,sx:growth,sy:growth,angle:b.angle+twist,bend:.11*level+.16*clamp(input.impact||0),strain:.15*level+.12*(input.impact||0),edgeBends:heroActor.vertices.map((_,i)=>.05*level*(1+Math.sin(phase*10+i*Math.PI)))};
      }
      else if(input.node==='paint'){const p=paintAt(t,5),strain=p.opposition;b={...b,bend:.13*strain,strain:.16*strain,axialStretch:-.08*strain,edgeBends:heroActor.vertices.map((_,i)=>.03*strain*(1+Math.sin(phase*9+i)))};}
      entry.body=b;entry.routine.compacted=Math.max(entry.routine.compacted,input.compacted||0);entry.routine.resistance={...input,sway};entry.resistance={node:input.node,strength:level};entry.routine.compacting=compactAt(t,78.5,81.6,heroActor,b);
      if(input.node==='compact'){const press=entry.routine.compacting;b={...b,x:b.x+press.shiftX*cs-press.shiftY*sn,y:b.y+press.shiftX*sn+press.shiftY*cs};entry.body=b;}
    }return entry;
  }

  let workerTime=NaN,workerCache=[];
  function worker(t,row,slot){
    if(t!==workerTime){workerTime=t;workerCache=[];}const key=row*2+slot;if(workerCache[key])return workerCache[key];
    const age=((t-64+row*.7+slot*18)%36+36)%36,actor=ordinary[row][slot],mapped=67.4+age/36*(96-67.4);
    return workerCache[key]=routineEntry('routine-worker-'+row+'-'+slot,actor,productionPose(mapped,actor,lanes[row]),P.factory.workers[row%4],mapped,{row,slot,age});
  }
  function lightAt(t){
    if(t<110)return undefined;if(t>=119)return Base.frame(t).light;
    const guide=Base.frame(119).light,reveal=.04+.14*between(t,110,113.2)+.82*between(t,113.2,116);
    return{...guide,reveal,inside:t<116,glow:.1+.45*reveal,entityId:'hero-seed',phase:t<113.2?'enclosed':t<116?'slit':'emerge'};
  }
  let productionTime=NaN,productionFrame;
  function fullFrame(t,bounds){
    if(t<58||t>=132)return{actors:[],hero:null};const e=heroAt(t),actors=t>=96&&t<110?Office.actors(t,bounds):[];
    if(t<96)for(let r=0;r<lanes.length;r++)if(r!==2)for(let slot=0;slot<2;slot++)actors.push(worker(ambientAt(t),r,slot));if(e)actors.push(e);
    const base=t>=119?Base.frame(t):null;
    return{actors,hero:e?.body||null,light:e?lightAt(t):undefined,burst:base?.burst||0,chase:base?.chase,routine:true,office:t>=96&&t<110,inner:t>=110&&t<119,outsideDarkness:between(t,104,110)};
  }
  function frame(t,bounds){
    let result;if(t>=58&&t<96){if(t!==productionTime){productionTime=t;productionFrame=fullFrame(t);}result=productionFrame;}else result=fullFrame(t,bounds);
    if(bounds){const l=bounds.minX??bounds.left,r=bounds.maxX??bounds.right,top=bounds.minY??bounds.top,bottom=bounds.maxY??bounds.bottom;return{...result,actors:result.actors.filter(a=>a.id==='hero'||a.body.x>l-90&&a.body.x<r+90&&a.body.y>top-90&&a.body.y<bottom+90)};}return result;
  }
  function belt(ctx,y,t,left=beltEnd,right=beltStart){rounded(ctx,left,y-78,right-left,156,10,P.conveyor);const start=beltEnd-(t*48%72);for(let x=start+Math.ceil((left-start)/72)*72;x<right;x+=72)line(ctx,[[x,y-65],[x,y+65]],P.factory.roller,1.6);}
  function machine(ctx,x,y,kind){rounded(ctx,x-154,y-124,308,248,18,P.metal);rounded(ctx,x-142,y-114,284,228,13,P.blue);rounded(ctx,x-120,y-91,240,182,10,P.paper);
    if(kind===2){ctx.beginPath();ctx.arc(x,y,100,0,Math.PI*2);ctx.strokeStyle=P.ink;ctx.lineWidth=7;ctx.stroke();rounded(ctx,x-13,y-124,26,31,5,P.industrial);}
  }
  function drawFactory(ctx,t,bounds){
    const layout=Base.backgroundLayout(bounds,lanes,leftWall,1100),{view,lines,columns,period}=layout;setup(ctx);
    if(view)rounded(ctx,layout.left,view.top-4,layout.right-layout.left,view.bottom-view.top+8,0,P.factory.floor);else rounded(ctx,leftWall,-650,1100-leftWall,lanes.at(-1)+930,28,P.factory.floor);
    for(const {y} of lines){belt(ctx,y,ambientAt(t),layout.left,layout.right);for(const column of columns)for(let j=0;j<3;j++){const x=stations[j]+column*period;if(layout.visible(x,y))machine(ctx,x,y,j);}}
    if(t>=94){line(ctx,[[leftWall,-650],[leftWall,43]],P.outside.wall,22);line(ctx,[[leftWall,217],[leftWall,lanes.at(-1)+280]],P.outside.wall,22);}
    ctx.restore();return layout;
  }
  function drawBase(ctx,t,bounds){if(t<58||t>=110)return;if(t<64)Base.drawEntry(ctx,t);if(t>=96)Office.draw(ctx,t,bounds);else drawFactory(ctx,t,bounds);}
  function drawEntry(ctx,t,bounds){if(t<64)Base.drawEntry(ctx,t,bounds);else drawBase(ctx,t,bounds);}
  const previewDies=new WeakMap();
  function previewDie(actor){
    if(previewDies.has(actor))return previewDies.get(actor);const rotation=-Math.PI-actor.headAxis({sx:1,sy:1,bend:0,strain:0}).angle,c=Math.cos(rotation),s=Math.sin(rotation),points=vertices(actor).map(([x,y])=>[x*c-y*s,x*s+y*c]);
    const faces=points.map((a,i)=>{const b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);return{a,b,nx:(b[1]-a[1])/length,ny:-(b[0]-a[0])/length};});previewDies.set(actor,faces);return faces;
  }
  function drawRepeat(ctx,t,row,y,offset,layout){
    const actor=row===2?heroActor:ordinary[row][0],faces=previewDie(actor),gap=12+9*Math.sin(t*1.6+row)*Math.sin(t*1.6+row);
    for(let station=0;station<2;station++){const x=stations[station]+offset;if(!layout.visible(x,y))continue;
      ctx.save();ctx.translate(x,y);for(const face of faces){const a=[face.a[0]+face.nx*gap,face.a[1]+face.ny*gap],b=[face.b[0]+face.nx*gap,face.b[1]+face.ny*gap];line(ctx,[a,b],station?P.industrial:P.metal,station?16:12);line(ctx,[a,b],station?P.coral:P.industrial,2.5);}ctx.restore();
    }
    const x=stations[2]+offset;if(layout.visible(x,y)){ctx.save();ctx.translate(x,y);ctx.rotate(t*.9+row);line(ctx,[[0,-96],[0,-77]],P.industrial,7);ctx.restore();}
  }
  function drawOverlay(ctx,t,bounds){
    if(t>=96||t<64)return;const layout=Base.backgroundLayout(bounds,lanes,leftWall,1100),{lines,columns,period}=layout;
    const child=productionTime===t?productionFrame.actors.find(e=>e.id==='hero'):null;setup(ctx);
    for(const {row:r,y,virtual} of lines)for(const column of columns){const offset=column*period;
      if(virtual||column!==0){drawRepeat(ctx,ambientAt(t),r,y,offset,layout);continue;}
      let occupants;const residents=()=>occupants||(occupants=[worker(ambientAt(t),r,0),worker(ambientAt(t),r,1)]);
      if(layout.visible(stations[0],y)){
        const molding=r===2?(nodeProgress(t).node==='mold'||t>=71.7&&t<77?child||heroAt(t):null):residents().find(e=>Math.abs(local(e.body).x-stations[0])<1),moldActor=molding?.actor||(r===2?heroActor:ordinary[r][0]),moldBody=molding?.body||pose(moldActor,stations[0],y),mold=moldAt(molding?.routine.time??71.7,71.7,76.7,moldActor);
        ctx.save();ctx.translate(stations[0],y);ctx.rotate(moldBody.angle-angle);for(const face of mold.faces)if(!face.locked){line(ctx,[face.from,face.to],P.metal,12);line(ctx,[face.from,face.to],P.industrial,2.5);}ctx.restore();
      }
      if(layout.visible(stations[1],y)){
        const entry=r===2&&(nodeProgress(t).node==='compact'||t>=78.5&&t<82)?child||heroAt(t):r===2?null:residents().find(e=>Math.abs(local(e.body).x-stations[1])<1),actor=entry?.actor||(r===2?heroActor:ordinary[r][0]),press=compactAt(entry?.routine.time??0,78.5,81.6,actor,entry?.body||pose(actor,stations[1],y));
        ctx.save();ctx.translate(stations[1]+press.shiftX,y+press.shiftY);for(const face of press.faces){
          poly(ctx,face.polygon,P.industrial);poly(ctx,face.pad,P.coral);const [nx,ny]=face.normal,tx=-ny,ty=nx,bracket=14;
          line(ctx,[.22,.78].map(q=>[lerp(face.from[0],face.to[0],q)+nx*bracket+press.recoil,lerp(face.from[1],face.to[1],q)+ny*bracket]),P.metal,2.5);
          if(press.impact&&press.contact){ctx.save();ctx.globalAlpha=clamp(press.impact);for(const side of [-1,1])line(ctx,[[face.point[0]+nx*3+tx*side*4,face.point[1]+ny*3+ty*side*4],[face.point[0]+nx*13+tx*side*9,face.point[1]+ny*13+ty*side*9]],P.gold,2.4);poly(ctx,[[face.point[0]+nx*7,face.point[1]+ny*7],[face.point[0]+nx*12+tx*2,face.point[1]+ny*12+ty*2],[face.point[0]+nx*14-tx*2,face.point[1]+ny*14-ty*2]],P.metal);ctx.restore();}
        }ctx.restore();
      }
      if(layout.visible(stations[2],y)){
        const painting=r===2?child||heroAt(t):residents().find(e=>e.routine.time>=83.2&&e.routine.time<94&&Math.abs(local(e.body).x-stations[2])<1),paint=painting?paintAt(painting.routine.time,painting.actor.vertices.length,83.2,94,painting.actor):{spraying:false};
        if(paint.spraying){ctx.save();ctx.globalAlpha=.32;poly(ctx,[[stations[2]-25,y-113],[stations[2]+25,y-113],[stations[2]+49,y-30],[stations[2]-49,y-30]],P.ink);ctx.restore();}
      }
    }ctx.restore();
  }
  function drawActorOverlay(ctx,entry,paintLight){const s=entry.routine;if(!s)return;const n=entry.actor.vertices.length,points=s.vertices;
    // Paint is a cumulative spatial mask. The unpainted parts still reveal the live inner window.
    ctx.save();poly(ctx,points);ctx.clip();if(s.paint.every(v=>v>=.999999))poly(ctx,points,P.black);else for(let i=0;i<n;i++){const coverage=s.paint[i];if(!coverage)continue;const a=points[i],b=points[(i+1)%n];ctx.save();ctx.globalAlpha=coverage;poly(ctx,[[0,0],a,b],P.black);ctx.restore();}ctx.restore();
    const resistance=s.resistance,rigid=resistance&&(resistance.node==='compact'||resistance.node==='mold');
    if(rigid){ctx.save();if(entry.body.sx!==1||entry.body.sy!==1)ctx.scale(1/(entry.body.sx??1),1/(entry.body.sy??1));if(resistance.node==='compact')ctx.rotate(-(resistance.twist||0));else ctx.translate(-resistance.offset[0],-resistance.offset[1]);}
    // The same rigid, miter-ended strips assemble, travel, spread and lock again.
    if(s.fitted){for(let i=0;i<n;i++){const face=s.mold.faces[i];if(!face.locked)continue;const visible=1-s.release[i];if(visible<=0)continue;const a=points[i],b=points[(i+1)%n],bar=resistance?.node==='compact'?s.compacting.bars[i]:null,from=bar?.from||(s.time<76.7?face.from:a),shift=[from[0]-a[0],from[1]-a[1]],apothem=s.radius*Math.cos(Math.PI/n);
      const strip=(color,width)=>{const q=width/2/apothem,move=(p,k)=>[p[0]*(1+k*q)+shift[0],p[1]*(1+k*q)+shift[1]];poly(ctx,[move(a,1),move(b,1),move(b,-1),move(a,-1)],color);};
      ctx.save();ctx.globalAlpha=visible;if(s.compacted>=1)strip(P.black,12);else{strip(P.metal,12);strip(P.industrial,2.5);if(s.compacted>0){ctx.globalAlpha=visible*s.compacted;strip(P.black,12);ctx.globalAlpha=visible;}}
      if(face.impact>0){const [nx,ny]=face.normal,tx=-ny,ty=nx;ctx.globalAlpha=visible*face.impact;for(const side of[-1,1])line(ctx,[[face.point[0]+nx*5+tx*side*4,face.point[1]+ny*5+ty*side*4],[face.point[0]+nx*18+tx*side*12,face.point[1]+ny*18+ty*side*12]],P.gold,2.8);}
      ctx.restore();}}
    if(rigid)ctx.restore();
    // Each strip leaves independently and stays behind, rather than reforming into a badge.
    if(s.peelControlled||s.time>=123.5&&s.time<130.4){const heading=entry.body.angle+entry.actor.headAxis(entry.body).angle,relative=heading-entry.body.angle;for(let i=0;i<n;i++){const progress=s.release[i],age=s.peelControlled?progress*.6:s.time-(123.5+i*.58);if(age<=0||age>3.2||s.peelControlled&&progress>=1)continue;const a=points[i],b=points[(i+1)%n],drift=s.peelControlled?360*progress+120*progress*progress:210*age+55*age*age,spread=(i-(n-1)/2)*28*age;ctx.save();ctx.globalAlpha=s.peelControlled?1-progress:1-clamp(age/3.2);ctx.translate(-Math.cos(relative)*drift-Math.sin(relative)*spread,-Math.sin(relative)*drift+Math.cos(relative)*spread);ctx.rotate((i%2?1:-1)*age*.55);line(ctx,[a,b],P.black,12);line(ctx,[a,b],P.black,2.5);ctx.restore();}}
    if(s.seed){const awakening=s.time>=108?between(s.time,108,119):0,painted=s.paint.reduce((a,b)=>a+b,0)/n;ctx.save();if(paintLight)paintLight(ctx,-7,7,painted>.2?3.7+awakening*2:6);else{ctx.beginPath();ctx.arc(-7,7,painted>.2?3.7+awakening*2:6,0,Math.PI*2);ctx.fillStyle=P.gold;ctx.fill();}if(awakening&&!paintLight){ctx.globalAlpha=.25*awakening;ctx.beginPath();ctx.arc(-7,7,11,0,Math.PI*2);ctx.fill();}ctx.restore();}
  }
  const anchor=(x,y,zoom)=>Object.freeze({...world(x,y),zoom});
  const anchors=Object.freeze({...Base.anchors,overview:anchor(-1490,650,.22),approach:anchor(beltStart,130,.95),mold:anchor(stations[0],130,.95),compact:anchor(stations[1],130,.95),paint:anchor(stations[2],130,.95),work:Office.anchors.work,officeEntry:Office.anchors.entry,officeArrival:Object.freeze({...world(routePoint(98).x,routePoint(98).y)}),awaken:Object.freeze({...discard,zoom:1.2}),discard,heroStages:Object.freeze({m1:world(stations[0],130),m2:world(stations[1],130),m3:world(stations[2],130)}),stationX:Object.freeze([...stations]),lanes:Object.freeze([...lanes]),floorBounds:Object.freeze({left:leftWall,right:1100,top:-650,bottom:lanes.at(-1)+280}),exit:world(leftWall,130),workCenter:world(workCenter.x,workCenter.y)});
  function sceneTransition(t){return{cover:t<95.65||t>=96.35?0:t<96?between(t,95.65,96):1-between(t,96,96.35),phase:t<96?'factory':'office'};}
  function resistanceWindow(t){if(t>=58&&t<64)return Base.resistanceWindow(t);const segment=transferAt(t);if(!segment)return{active:false,maxOffset:0};const[a,b,from,to,clearance]=segment,u=clamp((t-a)/(b-a)),x=lerp(from,to,u),travel=from-x,maxOffset=Math.max(0,Math.min(620,travel-clearance))*(1-between(t,b-.42,b));return{active:maxOffset>0,maxOffset,tangent:{x:-cs,y:-sn},from,to,clearance};}
  function resistTravel(from,to,distance){
    if(from<64)return Base.resistTravel(from,to,distance);if(!(distance>0)||to<=from)return to;
    const segment=from<67.4?[64,67.4,1100,beltStart,0]:transferAt(from);if(!segment)return to;
    const[start,end,entry,exit,clearance]=segment,length=entry-exit,before=(from-start)/(end-start)*length;
    if(before<clearance)return to;
    const desired=Math.max(clearance,(Math.min(to,end)-start)/(end-start)*length-distance);
    return start+desired/length*(end-start);
  }
  function withResistance(data,offset,t,effort={}){
    if(effort.transportResolved){
      if(t<64)return Base.withResistance(data,0,t,effort);
      if(!data.hero||!(t>=64&&t<67.4||transferAt(t)))return{...data,appliedOffset:0};
      const preload=clamp(effort.preload||0),strength=clamp(effort.effort||0),weak=clamp(effort.weak||0),gait=Math.sin((effort.stride||0)*Math.PI*2),sway=gait*9*strength;
      const actors=data.actors.map(e=>e.id==='hero'?{...e,body:{...e.body,x:e.body.x-sn*sway+cs*weak*7,y:e.body.y+cs*sway+sn*weak*7,bend:.1*preload+.045*gait*strength+.035*weak,strain:.12*strength,axialStretch:-.09*preload-.05*strength},resistance:{strength,preload,stride:effort.stride||0,exhausted:!!effort.exhausted}}:e);
      return{...data,actors,hero:actors.find(e=>e.id==='hero')?.body||data.hero,appliedOffset:0};
    }
    if(t>=58&&t<64)return Base.withResistance(data,offset,t,effort);
    const window=resistanceWindow(t),appliedOffset=Math.max(0,Math.min(window.maxOffset,Number(offset)||0)),preload=clamp(effort.preload||0);
    if(!data.hero||(!appliedOffset&&(!preload||!window.active)))return{...data,appliedOffset};
    const dx=-window.tangent.x*appliedOffset,dy=-window.tangent.y*appliedOffset,clearance=clamp(appliedOffset/28),strength=clamp(effort.effort||0)*Math.max(clearance,preload),gait=Math.sin((effort.stride||0)*Math.PI*2);
    // Backward effort changes travel and outline, never the body's authored heading.
    const actors=data.actors.map(e=>e.id==='hero'?{...e,body:{...e.body,x:e.body.x+dx-window.tangent.y*gait*9*strength,y:e.body.y+dy+window.tangent.x*gait*9*strength,bend:.1*preload+.045*gait*strength,strain:.12*strength,axialStretch:-.09*preload+.07*strength*(1-preload)},resistance:{strength,preload,stride:effort.stride||0,exhausted:!!effort.exhausted}}:e),hero=actors.find(e=>e.id==='hero')?.body||data.hero;
    return{...data,actors,hero,appliedOffset};
  }
  return{frame,drawBase,drawEntry,entryEscortBody:Base.entryEscortBody,drawOverlay,drawActorOverlay,anchors,paintAt,compactAt,moldAt,sceneTransition,resistanceWindow,withResistance,transferProgram,resistTravel,setAmbientTime,setPeelState,setNodeResistance,NodeResistance,nodeProgress,setWorkTime:Office.setWorkTime};
});
