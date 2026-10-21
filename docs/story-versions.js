/* Two story edits share the family, input model and final chase. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./story-timing.js'),require('./camera.js'),require('./story-notes.js'),require('./factory.js'),require('./factory-routine.js'),require('./office-world.js'),require('./district.js'));
  else root.FlatlandStoryVersions=factory(root.FlatlandTiming,root.FlatlandCamera,root.FlatlandStoryNotes,root.FlatlandFactory,root.FlatlandRoutineFactory,root.FlatlandOfficeWorld,root.FlatlandDistrict);
})(typeof globalThis!=='undefined'?globalThis:this,function(Timing,Camera,StoryNotes,Factory,RoutineFactory,Office,District){
  'use strict';
  if(!Timing||!Camera||!StoryNotes||!Factory||!RoutineFactory||!Office)throw new Error('Load timing, camera, notes, both factories and office-world before story-versions.js.');
  const clamp=(value,a,b)=>Math.max(a,Math.min(b,value)),ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
  function edit(cuts){
    function map(value,from,to){
      const t=clamp(Number(value)||0,0,cuts.at(-1)[from]);
      for(let i=1;i<cuts.length;i++)if(t<=cuts[i][from]){const a=cuts[i-1],b=cuts[i];return a[to]+(b[to]-a[to])*(t-a[from])/(b[from]-a[from]);}
      return cuts.at(-1)[to];
    }
    return Object.freeze({duration:cuts.at(-1)[1],sceneAt:t=>map(t,1,0),playbackAt:t=>map(t,0,1)});
  }
  const opening=[[0,0],[6.8,3],[15,7],[24,11],[42,20],[58,29.2],[64,32.2]];
  const rhythmTiming=edit([...opening,[70,36.5],[72,40.5],[77,45.5],[80,49.5],[87,52.65],[90,56.65],[98,60.65],[104,63.65],[110,68.65],[119,78.65],[122,81.65],[132,91.65],[138,105.65]]);
  const routineTiming=edit([...opening,[67.4,35.2],[71.7,40.6],[76.7,43.3],[78.5,49.3],[81.6,51.3],[83.2,57.3],[94,61.7],[98,66.27142857142857],[104,75.01818181818182],[110,79.51818181818181],[119,89.7],[122,92.7],[132,102.7],[138,116.7]]);
  const point=(value,fallback)=>Array.isArray(value)?{x:value[0],y:value[1]}:value||fallback;
  function fixed(points,zoom=.6){
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    return{space:'flat',x:(left+right)/2,y:(top+bottom)/2,zoom:Math.min(zoom,1080/(right-left+440),620/(bottom-top+320)),tilt:0,yaw:0};
  }
  function move(time,start,end,from,to,zoom,endZoom=zoom){const u=ease((time-start)/(end-start));return{...fixed([from],zoom),x:from.x+(to.x-from.x)*u,y:from.y+(to.y-from.y)*u,zoom:zoom+(endZoom-zoom)*u};}
  function shot(id,label,start,end,extra={}){return{id,label,start,end,...extra};}
  const firstShots=Camera.shots.filter(s=>s.start<64).map(s=>s.id==='district'?{...s,end:District.timing.firstMove}:s.id==='inspection'?{...s,start:District.timing.firstMove}:s);
  const endingShots=[shot('chase','追光 · 图形长出体积',119,132,{space:'journey',follow:'hero'}),shot('dimension','白场 · 双手与新维度',132,138,{space:'pov'})];
  const rhythmShots=[...firstShots,
    shot('factory','006 · 全厂概览',64,70),shot('press','007 · 四组夹具',70,77),
    shot('turn','008 · 旋转混黑',77,87),shot('mix','009 · 送入判定',87,90),shot('failure','010 · 检查失败',90,98),
    shot('discard','011 · 出口 · 扔出',98,104),shot('exhausted','012 · 墙外挣扎',104,112),shot('inner','013 · 光从内心出现',112,119),
    ...endingShots.map((s,i)=>({...s,label:(i?'015':'014')+' · '+s.label}))];
  const routineShots=[...firstShots,
    shot('factory','006 · 工厂概览',64,67.4),shot('mold','007 · 套模',67.4,76.7),shot('compact','008 · 压实',76.7,81.6),
    shot('paint','009 · 逐边喷涂',81.6,94),shot('work','010 · 重复办公室',94,110),shot('inner','011 · 光从内心出现',110,119),
    ...endingShots.map((s,i)=>({...s,label:(i?'013':'012')+' · '+s.label}))];
  function cameraFor(id,shots){
    const shotAt=time=>shots.find(s=>time<s.end)||shots.at(-1);
    function pose(value){
      const time=clamp(Number(value)||0,0,138),current=shotAt(time);
      if(time<64)return{...Camera.pose(time),shotId:current.id};
      const a=Factory.anchors,stage=a.heroStages,discard=point(a.discard),overview=point(a.overview,a.factoryCenter);
      if(time>=119){
        const v={...Camera.pose(time),shotId:current.id};
        if(time<122){v.x=discard.x;v.y=discard.y;delete v.follow;}
        else if(time<132){const actual=Factory.frame(time).chase,screenHeading=v.screenHeading??(-Math.PI/5),groundHeading=Math.atan2(Math.sin(screenHeading)/Math.cos(v.tilt),Math.cos(screenHeading));v.yaw=1.0664437894592371+(groundHeading-actual.heading)*ease((time-122)/8);}
        return v;
      }
      let v;
      if(id==='rhythm'){
        if(time<70)v={...fixed([overview],overview.zoom||.22)};
        else if(time<77){const stations=a.pressStations||[stage.m1];v=fixed(stations.map(p=>point(p)),.65);}
        else if(time<98)v=fixed([point(stage.m2),point(stage.m3)],.65);
        else if(time<102.8)v=fixed([point(stage.m3),point(a.exit)],.55);
        else if(time<104)v={...fixed([discard],.7)};
        else v={...Camera.pose(time),x:discard.x,y:discard.y};
      }else{
        const b=RoutineFactory.anchors||{},work=Office.anchors.work,officeOverview=Office.anchors.overview;
        if(time<67.4){const p=point(b.overview,overview);v=fixed([p],p.zoom||.17);}
        else if(time<76.7)v=move(time,67.4,71.7,point(b.approach,stage.m1),point(b.mold,stage.m1),b.mold?.zoom||.95);
        else if(time<81.6)v=move(time,76.7,78.5,point(b.mold,stage.m1),point(b.compact,stage.m2),b.compact?.zoom||.95);
        else if(time<94)v=move(time,81.6,83.2,point(b.compact,stage.m2),point(b.paint,stage.m3),b.paint?.zoom||.95);
        else if(time<96)v=move(time,94,96,point(b.paint,stage.m3),point(b.exit),b.paint?.zoom||1.5,1.2);
        else if(time<98)v=move(time,96,98,point(b.officeEntry,work),work,b.officeEntry?.zoom||1.2,work.zoom||.75);
        else if(time<104)v=move(time,98,104,work,officeOverview,work.zoom||.75,officeOverview.zoom||.035);
        else if(time<110)v=fixed([officeOverview],officeOverview.zoom||.035);
        else v=fixed([discard],1.5);
      }
      // The overview move crosses the shot boundary without changing the factory clock.
      if(id==='rhythm'&&time>=68.3&&time<70.8){
        const b=RoutineFactory.anchors,start=point(id==='routine'?b.overview:a.overview,a.factoryCenter);
        const from=fixed([start],start.zoom||.22),to=id==='routine'?(time>=70?{...v}:fixed([point(b.approach,stage.m1)],b.mold?.zoom||1.5)):fixed((a.pressStations||[stage.m1]).map(p=>point(p)),.65),u=ease((time-68.3)/2.5);
        for(const key of ['x','y','zoom'])v[key]=from[key]+(to[key]-from[key])*u;
      }
      if(id==='routine'&&time>=67.4&&time<69.5){
        const start=RoutineFactory.anchors.overview,from=fixed([start],start.zoom),to={...v},u=ease((time-67.4)/2.1);
        for(const key of ['x','y','zoom'])v[key]=from[key]+(to[key]-from[key])*u;
      }
      return{...v,shotId:current.id};
    }
    function track(value,actualHero,referenceHero){
      const time=clamp(Number(value)||0,0,138),v=pose(time),hero=actualHero?.body||actualHero;
      if(!hero||!Number.isFinite(hero.x)||!Number.isFinite(hero.y)||time>=119)return v;
      // The house, office pullback and inner view keep their established framing.
      if(time<17.3||id==='routine'&&time>=98||id==='rhythm'&&time>=104)return v;
      if(time<64){
        const subject=referenceHero||hero,close={...v,x:subject.x,y:subject.y-160,followBody:true,focalOffsetY:160,followReference:!!referenceHero};
        if(time<61)return close;
        const overview=(id==='routine'?RoutineFactory:Factory).anchors.overview,u=ease((time-61)/3);
        return{...close,x:close.x+(overview.x-close.x)*u,y:close.y+(overview.y-close.y)*u,zoom:1.2+(overview.zoom-1.2)*u,followBody:false};
      }
      const factory=id==='routine'?RoutineFactory:Factory,a=factory.anchors;
      const wideEnd=id==='routine'?67.4:68.3;
      if(time<wideEnd)return v;
      const closeAt=id==='routine'?69.5:70.8;
      if(time<closeAt){
        const overview=a.overview,from=id==='rhythm'?factory.overviewPoint(wideEnd):a.approach,u=ease((time-wideEnd)/(closeAt-wideEnd));
        const zoom=id==='routine'?(a.mold?.zoom||.95):.65;
        // One uninterrupted editorial dolly; actual backward steps remain a 1:1 camera displacement.
        return{...v,x:hero.x+(overview.x-from.x)*(1-u),y:hero.y+(overview.y-from.y)*(1-u),zoom:overview.zoom+(zoom-overview.zoom)*u};
      }
      if(id==='routine'&&time>=96){
        const entryEnd=RoutineFactory.anchors.officeArrival,work=Office.anchors.work;
        return{...v,x:hero.x+work.x-entryEnd.x,y:hero.y+work.y-entryEnd.y};
      }
      return{...v,x:hero.x,y:hero.y,followBody:true};
    }
    return{duration:138,shots,shotAt,pose,track};
  }
  function rhythmNotes(time){
    if(time<64)return StoryNotes.at(time);
    if(time<70)return{summary:'较近全景展示几条完整流水线，更多轨道铺满四边；实际19排专线持续运行，四组夹具沿主角专线排列。',action:'居民沿带前进，四组夹具依次开合。',camera:'较近工厂全景，完整生产线清晰，更多轨道铺满四边；随后一次连续平滑推近，不卡住再跳变。'};
    if(time<77){
      const groups={closing:[],rising:[],waiting:[],ready:[]},names=['第一','第二','第三','第四'];
      Factory.pressProgram.programs.forEach((program,index)=>{
        const phase=time<program.start?'ready':time<program.closeEnd?'closing':time<program.returnEnd?'rising':'waiting';
        groups[phase].push(names[index]);
      });
      const actions=[];
      if(groups.closing.length)actions.push(groups.closing.join('、')+'组夹具'+(groups.closing.length>1?'同时':'')+'夹紧');
      if(groups.rising.length)actions.push(groups.rising.join('、')+'组夹具'+(groups.rising.length>1?'同时':'')+'回升');
      if(groups.waiting.length)actions.push(groups.waiting.join('、')+'组夹具在上位等待');
      if(groups.ready.length)actions.push(groups.ready.join('、')+'组保持上位，等待错相落下');
      return{summary:'四组错相流水线：各0.5秒夹紧、3秒回升、1.5秒上位等待，相邻组间隔0.5秒落下。孩子在夹具收回时已沿带转运。',
        action:time<72?'主角沿传送带接近第一组夹具。':actions.join('；')+'。孩子沿传送带向下一组转运。',camera:'俯视中景保留可偏离中心的安全区，角色先在画面内抗拒，越界后镜头阻尼跟随；多个夹具可以同时回升。'};
    }
    if(time<87)return{summary:'主角离开四组夹具，进入旋转工位。破损内窗仍露出颜色。',action:time<80?'主角沿传送带移向旋转工位。':'旋转盘和主角一同转动，内窗颜色逐渐混暗。',camera:'转运镜头以安全区和阻尼跟随角色，短暂抗拒不使整个工厂跟着抖动；旋转工位保持稳定中景。'};
    if(time<90)return{summary:'主角从旋转工位送往判定工位。',action:'同一五边形沿传送带前进，破损内窗仍然透色。',camera:'保持俯视中景，允许主角在安全区内逆行，越界后柔和跟进。'};
    if(time<98)return{summary:'判定工位检查主角，两条金属链交叉锁住身体。',action:time<94.5?'主角停在判定工位，破损内窗仍露出流动色域。':'链节组成的两条锁链交叉缠住主角，形成X。三角兵从安全通道靠近。',camera:'稳定俯视中景中保留主角可偏离中心的空间。'};
    if(time<104)return{summary:'三角兵从判定工位押走主角，经出口将它扔到墙外。',action:time<102.8?'队伍沿机器之间的安全通道走向出口。':'主角通过墙门，被扔到墙外的落点。',camera:time<102.8?'出口全景柔和跟随队伍，主角短暂抗拒可偏离构图中心。':'切到墙外落点，主角落入画面。'};
    return StoryNotes.at(time);
  }
  function routineNotes(time){
    if(time<64)return StoryNotes.at(time);
    if(time<67.4)return{summary:'较近全景看清几条完整流水线，更多轨道伸出四边；实际12排居民专线依次经过套模、压实和喷涂。',action:'传送带、工位和已经成形的居民同时运动。',camera:'完整保持3秒较近全景，几条完整线与三道工序清晰，轨道铺满四边；随后直接平滑推进。'};
    if(time<76.7)return{summary:'主角经过加长的输送段进入五边套模工位。五段标准边框逐段靠近，按五边形的准确角度拼合成完整外框。',action:time<71.7?'主角沿加长传送带接近张开的五边套模工位；长按持续收紧并向左后、右后摆动，保持朝向逆行，按用力时长填满消耗圆环，变红后失力，松手休息才能恢复。':'五段边框依次沿各自法向靠近并扣紧，接触处短促震颤，逐步组成完整的标准外框。',camera:'从同一构图连续推近，主角在安全区内逆行；超出范围后镜头柔和跟随，避免整个工厂晃动。'};
    if(time<81.6)return{summary:'主角经过加长的输送段进入压实工位。五边成型压块缓慢张开蓄力，随后猛然夹紧外框，接触后短促左右震颤并顶住压实。',action:time<78.5?'五边形主角沿加长传送带移向成型压块；长按收紧并交替向左后、右后摆动，逆行受放慢的传送带牵制；用力时长填满消耗圆环，变红后卸力，点击仅无力抽搐，松手休息后恢复。':time<79.15?'五块成型压块缓慢张开蓄力。':time<79.25?'压块突然加速，沿各边法向撞紧外框。':time<79.65?'夹面锁住外框，支架短促左右震颤并保持压力。':'成型压块沿各边法向缓慢退开，保留离站净空。',camera:'镜头带安全区柔和跟至压实工位，主角可在画面内倒退；机构在压紧接触后短促左右震动。'};
    if(time<94)return{summary:'主角进入喷涂工位，五边形逐边被涂黑。',action:time<83.2?'主角在加长输送段上向喷涂工位移动；长按可保持朝向收紧并逆向挣扎，按持续用力累积消耗，满格变红后失力，再被传送带带走。':'每转过一条边，停稳并向这条边喷黑；覆盖逐次累积，最后只留下内心的小黄点。',camera:'以安全区和阻尼跟至喷涂工位，主角短暂逆行先在画面内发生；喷涂时五边轮廓完整可见。'};
    if(time<110)return{summary:'主角进入办公室。镜头拉远，等距排列的办公单元持续铺满视野；居民重复操作按钮与传递文件，办公外景逐渐变暗。',action:time<96?'主角离开喷涂工位，走向工厂出口。':time<98?'镜头经过门口遮挡，主角从办公室入口走进工作路线。':time<104?'主角与周围居民沿各自的闭合路线反复工作；点击使整个工作循环一起加快。':'拉到最远即自动连续变黑，所有工位继续循环；密集点击可进一步加速，无须额外点击才启动。',camera:time<96?'跟随主角实际位置从喷涂工位移到工厂出口。':time<98?'经过门口遮挡切入办公室，跟随主角实际位置移向工位。':time<104?'从主角工位持续拉远，固定世界坐标的办公格网从画外进入，始终铺满视野。':'保持密集办公全景，直至外景完全变暗。'};
    if(time<119)return StoryNotes.at(time);
    if(time<132)return{summary:'身体内的同一颗光种子飞出，在近处引导，主角随后向右上追光。每次短点击剥落一片黑漆，内在颜色逐块露出。',action:time<119.6?'光种子暂留主角身体内。':time<122?'同一颗光种子从体内飞出，再近身绕行；主角转向观察。':'主角沿同一曲线持续向右上行进，短点击每次剥落一片黑漆，长按只加速；两侧图形沿速度函数拉伸，从小图形逐渐变成大型弯曲曲面。',camera:'近处邀请后跟随主角，视角逐渐下降，光保持在右上方；冲刺两侧持续保留参照物。'};
    return StoryNotes.at(time);
  }
  function notesFor(select){return{at:value=>select(clamp(Number(value)||0,0,138))};}
  const rhythm={id:'rhythm',label:'A · 四组夹具',duration:rhythmTiming.duration,factory:Factory,timing:rhythmTiming,camera:cameraFor('rhythm',rhythmShots),notes:notesFor(rhythmNotes),beats:[6.8,98,104,110,119,132,138].map(rhythmTiming.playbackAt),chaseStart:119,chaseEnd:132};
  const routine={id:'routine',label:'B · 例行塑形',duration:routineTiming.duration,factory:RoutineFactory,timing:routineTiming,camera:cameraFor('routine',routineShots),notes:notesFor(routineNotes),beats:[6.8,119,132,138].map(routineTiming.playbackAt),chaseStart:119,chaseEnd:132};
  return{get:id=>id==='rhythm'?rhythm:routine};
});
