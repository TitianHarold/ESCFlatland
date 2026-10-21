(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./motion.js'),()=>require('./district.js').timing);
  else root.FlatlandCamera=factory(root.FlatlandMotion,()=>root.FlatlandDistrict?.timing);
})(typeof globalThis!=='undefined'?globalThis:this,function(Motion,encounterTiming){
  'use strict';
  const duration=138, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const frame=(time,x,y,zoom,tilt=0,yaw=0)=>({time,x,y,zoom,tilt,yaw});
  // Editorial framing and zoom; story-versions.track anchors travelling views to the live hero.
  const factoryPoint=(x,y)=>({x:-4000+x*Math.cos(.4)-y*Math.sin(.4),y:-2800+x*Math.sin(.4)+y*Math.cos(.4)});
  const medium=factoryPoint(-120,130),exitView=factoryPoint(-1200,260),discard=factoryPoint(-2200,390);
  const factoryMedium=time=>frame(time,medium.x,medium.y,.6);
  const chaseScreenHeading=-Math.PI/5,bridgeYaw=1.0664437894592371;
  let departureStart,departureFrames;
  function departurePlan(){
    const start=encounterTiming?.()?.firstMove??25.9;
    if(start!==departureStart){departureStart=start;departureFrames=[frame(15,800,500,1.4),frame(start,800,500,1.4),frame(start+(42-start)/2,100,-50,.9),frame(42,-800,-550,.34)];}
    return departureFrames;
  }
  const shots=[
    {id:'family',label:'001 · 家庭',start:0,end:17.3,frames:[frame(0,800,500,1.4),frame(17.3,800,500,1.4)]},
    {id:'district',label:'002 · 包围后带走 · 拉远',start:17.3,end:27.6,frames:[frame(17.3,800,500,1.4),frame(27.6,100,-50,.9)]},
    {id:'inspection',label:'003 · 押送离家 · 持续拉远',start:27.6,end:42,frames:[frame(27.6,100,-50,.9),frame(42,-800,-550,.34)]},
    {id:'escort',label:'004 · 主队前行',start:42,end:58,frames:[frame(42,-800,-550,.34),frame(44,-950,-650,.3),frame(48,-1350,-850,.3),frame(53.2,-2000,-1300,.3),frame(58,-2750,-1850,.3)]},
    {id:'gate',label:'005 · 穿过入口',start:58,end:64,frames:[frame(58,-2750,-1850,.3),frame(60,-3000,-2100,1.05),frame(61,-3080,-2180,1.2),frame(64,-4255,-2300,.22)]},
    {id:'factory',label:'006 · 全厂概览',start:64,end:70,frames:[frame(64,-4255,-2300,.22)]},
    {id:'press',label:'007 · 第一关 · 内窗挤压',start:70,end:77,frames:[factoryMedium(70)]},
    {id:'turn',label:'008 · 第二关 · 旋转混黑',start:77,end:87,frames:[factoryMedium(77)]},
    {id:'mix',label:'009 · 送入判定',start:87,end:90,frames:[factoryMedium(87)]},
    {id:'failure',label:'010 · 第三关 · 检查失败',start:90,end:98,frames:[factoryMedium(90)]},
    {id:'discard',label:'011 · 左墙出口 · 扔出',start:98,end:104,frames:[frame(98,exitView.x,exitView.y,.55),{...frame(102.8,discard.x,discard.y,.7),cut:true}]},
    {id:'exhausted',label:'012 · 墙外弱动',start:104,end:112,frames:[frame(104,discard.x,discard.y,1),frame(105.7,discard.x,discard.y,1.25),frame(108.3,discard.x,discard.y,1.4),frame(110,discard.x,discard.y,1.5),frame(112,discard.x,discard.y,2.8)]},
    {id:'inner',label:'013 · 光从内心出现',start:112,end:119,frames:[frame(112,discard.x,discard.y,2.8),frame(118,discard.x,discard.y,2.8),frame(119,discard.x,discard.y,1.2)]},
    {id:'chase',label:'014 · 追光 · 图形长出体积',start:119,end:132,space:'journey',follow:'hero',frames:[frame(119,discard.x,discard.y,1.2,0,1.0664437894592371),frame(132,0,0,1.2,.955,-.011631098618334113)]},
    {id:'dimension',label:'015 · 白场 · 看见双手',start:132,end:138,space:'pov',frames:[frame(132,0,0,1),frame(138,0,0,1)]}
  ];
  function shotAt(time){return shots.find(shot=>time<shot.end)||shots[shots.length-1];}
  function pose(time){
    time=clamp(Number(time)||0,0,duration);const shot=shotAt(time);let a=shot.frames[0],b=a;
    for(const next of shot.frames){if(next.time<=time)a=next;else{b=next;break;}b=a;}
    let q=b.time===a.time||b.cut?0:clamp((time-a.time)/(b.time-a.time),0,1);q=q*q*(3-2*q);
    const view={space:shot.space||'flat',shotId:shot.id};
    if(shot.follow)view.follow=shot.follow;
    for(const key of ['x','y','zoom','tilt','yaw'])view[key]=a[key]+(b[key]-a[key])*q;
    // This editorial framing also remains available for deterministic shot previews.
    if(time>=15&&time<42){
      const departureFrames=departurePlan();let from=departureFrames[0],to=from;
      for(const next of departureFrames){if(next.time<=time)from=next;else{to=next;break;}to=from;}
      let u=to.time===from.time?0:clamp((time-from.time)/(to.time-from.time),0,1);u=u*u*(3-2*u);
      for(const key of ['x','y','zoom'])view[key]=from[key]+(to[key]-from[key])*u;
    }
    // One continuous dolly crosses the overview/press edit without restarting its easing at 70s.
    if(time>=68.3&&time<=70.8){
      let u=clamp((time-68.3)/2.5,0,1);u=u*u*(3-2*u);
      view.x=-4255+(medium.x+4255)*u;view.y=-2300+(medium.y+2300)*u;view.zoom=.22+.38*u;
    }
    if(shot.space==='journey'){
      if(time<122){delete view.follow;view.x=discard.x;view.y=discard.y;}
      const ease=(a,b)=>{const u=clamp((time-a)/(b-a),0,1);return u*u*(3-2*u);};
      const u=Motion.chaseProgress(time).q,s=1-u,heading=Math.atan2(-3300*(s*s*.30+2*s*u*.35+u*u*.35),5378.207340306721*(s*s*.25+2*s*u*.35+u*u*.40));
      const turn=ease(122,130),coast=ease(132,138),streetTurn=ease(134.5,138);
      view.tilt=1.25*ease(122,138);
      // Compensate for the vertical foreshortening so the travel reads diagonally on screen.
      const groundHeading=Math.atan2(Math.sin(chaseScreenHeading)/Math.cos(view.tilt),Math.cos(chaseScreenHeading));
      const aligned=groundHeading-heading+bridgeYaw;
      view.yaw=(bridgeYaw+(aligned-bridgeYaw)*turn)*(1-streetTurn)+.32*streetTurn;
      view.zoom=1.2-.05*coast;view.growth=ease(125,134);view.screenHeading=chaseScreenHeading;
    }
    if(shot.space==='journey'||shot.space==='depth')view.screenY=.5;
    return view;
  }
  class Follow {
    reset(view){this.current=view?{...view}:null;return this.current;}
    update(goal,hero,viewport,dt){
      if(!this.current||this.current.space!==goal.space||goal.space!=='flat')return this.reset(goal);
      const previous=this.current,desired={...goal},body=hero?.body||hero;
      const scale=Math.max(.001,Math.min(viewport.w/1280,viewport.h/760)*goal.zoom);
      const deadX=viewport.w*.075/scale,deadY=viewport.h*.065/scale;
      const outside=(distance,limit)=>Math.sign(distance)*Math.max(0,Math.abs(distance)-limit);
      if(goal.followBody&&body){
        if(goal.followReference){
          desired.x+=outside(body.x-goal.x,deadX);
          desired.y+=outside(body.y-(goal.y+(goal.focalOffsetY||0)),deadY);
        }else{
          desired.x=previous.x+outside(goal.x-previous.x,deadX);
          desired.y=previous.y+outside(goal.y-previous.y,deadY);
        }
      }
      const blend=1-Math.exp(-Math.max(0,dt)/(goal.resisting?.32:.18)),next={...goal};
      for(const key of ['x','y','zoom'])next[key]=previous[key]+(desired[key]-previous[key])*blend;
      if(goal.followBody&&body){
        // Only the outer soft boundary can demand an immediate correction.
        const softX=viewport.w*.23/scale,softY=viewport.h*.20/scale,offset=goal.focalOffsetY||0;
        next.x=clamp(next.x,body.x-softX,body.x+softX);
        next.y=clamp(next.y,body.y-offset-softY,body.y-offset+softY);
      }
      this.current=next;return next;
    }
  }
  return {duration,shots,shotAt,pose,Follow};
});
