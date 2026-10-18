(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandCamera=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const duration=158, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const frame=(time,x,y,zoom,tilt=0,yaw=0)=>({time,x,y,zoom,tilt,yaw});
  // Preset views are independent of actor positions; cut marks a fixed-view switch.
  const factoryPoint=(x,y)=>({x:-4000+x*Math.cos(.4)-y*Math.sin(.4),y:-2800+x*Math.sin(.4)+y*Math.cos(.4)});
  const medium=factoryPoint(-120,130),exitView=factoryPoint(-1200,260),discard=factoryPoint(-2200,390);
  const factoryMedium=time=>frame(time,medium.x,medium.y,.6);
  const shots=[
    {id:'family',label:'001 · 家庭',start:0,end:15,frames:[frame(0,800,500,1.4),frame(15,800,500,1.4)]},
    {id:'district',label:'002 · 包围后带走 · 拉远',start:15,end:24,frames:[frame(15,800,500,1.4),frame(24,100,-50,.9)]},
    {id:'inspection',label:'003 · 押送离家 · 持续拉远',start:24,end:42,frames:[frame(24,100,-50,.9),frame(42,-800,-550,.34)]},
    {id:'escort',label:'004 · 广角押送 · 他家并入',start:42,end:58,frames:[frame(42,-800,-550,.34),frame(44,-950,-650,.3),frame(48,-1350,-850,.3),frame(53.2,-2000,-1300,.3),frame(58,-2750,-1850,.3)]},
    {id:'gate',label:'005 · 穿过入口',start:58,end:64,frames:[frame(58,-2750,-1850,.3),frame(60,-3000,-2100,1.05),frame(61,-3080,-2180,1.2),frame(64,-4255,-2300,.22)]},
    {id:'factory',label:'006 · 全厂概览',start:64,end:70,frames:[frame(64,-4255,-2300,.22)]},
    {id:'press',label:'007 · 第一关 · 内窗挤压',start:70,end:77,frames:[factoryMedium(70)]},
    {id:'turn',label:'008 · 第二关 · 旋转混黑',start:77,end:87,frames:[factoryMedium(77)]},
    {id:'mix',label:'009 · 送入判定',start:87,end:90,frames:[factoryMedium(87)]},
    {id:'failure',label:'010 · 第三关 · 检查失败',start:90,end:98,frames:[factoryMedium(90)]},
    {id:'discard',label:'011 · 左墙出口 · 扔出',start:98,end:104,frames:[frame(98,exitView.x,exitView.y,.55),{...frame(102.8,discard.x,discard.y,.7),cut:true}]},
    {id:'exhausted',label:'012 · 墙外弱动',start:104,end:112,frames:[frame(104,discard.x,discard.y,1),frame(106.8,discard.x,discard.y,1.35),frame(109,discard.x,discard.y,2.8),frame(112,discard.x,discard.y,2.8)]},
    {id:'inner',label:'013 · 光从内心出现',start:112,end:119,frames:[frame(112,discard.x,discard.y,2.8),frame(116.8,discard.x,discard.y,2.8),frame(119,discard.x+100,discard.y-50,1.25)]},
    {id:'chase',label:'014 · 跟随主角向右上追光',start:119,end:132,follow:'hero',frames:[frame(119,discard.x,discard.y,1.2)]},
    {id:'dimension',label:'015 · 新的维度',start:132,end:138,space:'depth',frames:[frame(132,0,0,1.25,0),frame(138,65,-35,1.15,1.16,.32)]},
    {id:'curl',label:'016 · 两次卷曲',start:138,end:146,space:'depth',frames:[frame(138,65,-35,1.15,1.16,.32),frame(146,75,-20,1.8,1.16,.28)]},
    {id:'meet',label:'017 · 相遇',start:146,end:154,space:'depth',frames:[frame(146,75,-20,1.8,1.16,.28),frame(154,100,-25,1.85,1.16,.28)]},
    {id:'ending',label:'018 · 一起向前',start:154,end:158,space:'depth',frames:[frame(154,100,-25,1.85,1.16,.28),frame(158,100,-100,.6,1.2,.32)]}
  ];
  function shotAt(time){return shots.find(shot=>time<shot.end)||shots[shots.length-1];}
  function pose(time){
    time=clamp(Number(time)||0,0,duration);const shot=shotAt(time);let a=shot.frames[0],b=a;
    for(const next of shot.frames){if(next.time<=time)a=next;else{b=next;break;}b=a;}
    let q=b.time===a.time||b.cut?0:clamp((time-a.time)/(b.time-a.time),0,1);q=q*q*(3-2*q);
    const view={space:shot.space||'flat',shotId:shot.id};
    if(shot.follow)view.follow=shot.follow;
    for(const key of ['x','y','zoom','tilt','yaw'])view[key]=a[key]+(b[key]-a[key])*q;
    return view;
  }
  return {duration,shots,shotAt,pose};
});
