/* Two story edits share the family, input model and final chase. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./story-timing.js'),require('./camera.js'),require('./story-notes.js'),require('./factory.js'),require('./factory-routine.js'),require('./office-world.js'));
  else root.FlatlandStoryVersions=factory(root.FlatlandTiming,root.FlatlandCamera,root.FlatlandStoryNotes,root.FlatlandFactory,root.FlatlandRoutineFactory,root.FlatlandOfficeWorld);
})(typeof globalThis!=='undefined'?globalThis:this,function(Timing,Camera,StoryNotes,Factory,RoutineFactory,Office){
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
  const opening=[[0,0],[6.8,3],[15,7],[24,11],[42,18],[58,23.2],[64,26.2]];
  const rhythmTiming=edit([...opening,[70,30.5],[72,31.5],[77,36.5],[87,41],[90,42],[98,46],[104,49],[110,54],[119,62],[122,65],[132,75],[138,79]]);
  const routineTiming=edit([...opening,[67.4,29.2],[71.7,31.9],[76.7,34.6],[78.5,37.6],[81.6,39.6],[83.2,42.6],[94,47],[98,51.57142857142857],[104,60.31818181818182],[110,64.81818181818181],[119,73],[122,76],[132,86],[138,90]]);
  const point=(value,fallback)=>Array.isArray(value)?{x:value[0],y:value[1]}:value||fallback;
  function fixed(points,zoom=.6){
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    return{space:'flat',x:(left+right)/2,y:(top+bottom)/2,zoom:Math.min(zoom,1080/(right-left+440),620/(bottom-top+320)),tilt:0,yaw:0};
  }
  function move(time,start,end,from,to,zoom,endZoom=zoom){const u=ease((time-start)/(end-start));return{...fixed([from],zoom),x:from.x+(to.x-from.x)*u,y:from.y+(to.y-from.y)*u,zoom:zoom+(endZoom-zoom)*u};}
  function shot(id,label,start,end,extra={}){return{id,label,start,end,...extra};}
  const firstShots=Camera.shots.filter(s=>s.start<64);
  const endingShots=[shot('chase','追光 · 图形长出体积',119,132,{space:'journey',follow:'hero'}),shot('dimension','白场 · 看见双手',132,138,{space:'pov'})];
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
      if(time<64)return Camera.pose(time);
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
    function track(value,actualHero){
      const time=clamp(Number(value)||0,0,138),v=pose(time),hero=actualHero?.body||actualHero;
      if(!hero||!Number.isFinite(hero.x)||!Number.isFinite(hero.y)||time>=119)return v;
      // The house, office pullback and inner view keep their established framing.
      if(time<17.3||id==='routine'&&time>=98||id==='rhythm'&&time>=104)return v;
      if(time<64)return{...v,x:hero.x,y:hero.y-160};
      const factory=id==='routine'?RoutineFactory:Factory,a=factory.anchors;
      const wideEnd=id==='routine'?67.4:68.3;
      if(time<wideEnd)return v;
      const firstEnd=id==='routine'?71.7:72;
      if(time<firstEnd){
        const from=point(a.approach||Factory.frame(70).hero),to=point(a.mold,a.heroStages.m1);
        const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;
        const progress=length2?((hero.x-from.x)*dx+(hero.y-from.y)*dy)/length2:1;
        // The overview dolly advances with actual belt travel, including a retreat.
        const u=ease(progress/(id==='routine'?.49:1)),overview=a.overview;
        const zoom=id==='routine'?(a.mold?.zoom||.95):.65;
        return{...v,x:overview.x+(hero.x-overview.x)*u,y:overview.y+(hero.y-overview.y)*u,zoom:overview.zoom+(zoom-overview.zoom)*u};
      }
      if(id==='routine'&&time>=96){
        const entryEnd=RoutineFactory.frame(98).hero,work=Office.anchors.work;
        return{...v,x:hero.x+work.x-entryEnd.x,y:hero.y+work.y-entryEnd.y};
      }
      return{...v,x:hero.x,y:hero.y};
    }
    return{duration:138,shots,shotAt,pose,track};
  }
  function rhythmNotes(time){
    if(time<64)return StoryNotes.at(time);
    if(time<70)return{summary:'19排身份专线持续运转，四组夹具沿主角所在的加长传送带排列。',action:'居民沿带前进，四组夹具依次开合。',camera:'工厂全景，显示传送带与夹具的排列。'};
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
        action:time<72?'主角沿传送带接近第一组夹具。':actions.join('；')+'。孩子沿传送带向下一组转运。',camera:'俯视中景围绕主角实际位置移动，停步与逆行时同样跟随，多个夹具可以同时回升。'};
    }
    if(time<87)return{summary:'主角离开四组夹具，进入旋转工位。破损内窗仍露出颜色。',action:time<80?'主角沿传送带移向旋转工位。':'旋转盘和主角一同转动，内窗颜色逐渐混暗。',camera:'转运中镜头跟随主角真实位置，停步或逆行时同步停止或回退；旋转工位保持稳定中景。'};
    if(time<90)return{summary:'主角从旋转工位送往判定工位。',action:'同一五边形沿传送带前进，破损内窗仍然透色。',camera:'保持俯视中景，位置随主角实际移动，逆行时同步后退。'};
    if(time<98)return{summary:'判定工位检查主角，两条金属链交叉锁住身体。',action:time<94.5?'主角停在判定工位，破损内窗仍露出流动色域。':'链节组成的两条锁链交叉缠住主角，形成X。三角兵从安全通道靠近。',camera:'以主角真实位置为中心保持稳定俯视中景。'};
    if(time<104)return{summary:'三角兵从判定工位押走主角，经出口将它扔到墙外。',action:time<102.8?'队伍沿机器之间的安全通道走向出口。':'主角通过墙门，被扔到墙外的落点。',camera:time<102.8?'出口全景围绕实际主角跟随，迟疑停步或倒退均同步反映在镜头位置。':'切到墙外落点，主角落入画面。'};
    return StoryNotes.at(time);
  }
  function routineNotes(time){
    if(time<64)return StoryNotes.at(time);
    if(time<67.4)return{summary:'12排并行轨道上，居民沿专线排队，依次经过套模、压实和喷涂工位。',action:'传送带、工位和已经成形的居民同时运动。',camera:'完整保持3秒工厂全景，显示12排并行轨道与三道工序的排列。'};
    if(time<76.7)return{summary:'主角经过加长的输送段进入五边套模工位。五段标准边框逐段靠近，按五边形的准确角度拼合成完整外框。',action:time<71.7?'主角沿加长传送带接近张开的五边套模工位；点击会收紧并向左后、右后摆动，保持朝向逆行，体力消耗满格变红后失力。':'五段边框依次沿各自法向靠近并扣紧，接触处短促震颤，逐步组成完整的标准外框。',camera:'相机按主角实际输送位置从全景推近，停步时不再前推，后退时同步后退；套模时保持俯视中景。'};
    if(time<81.6)return{summary:'主角经过加长的输送段进入压实工位。五边成型压块缓慢张开蓄力，随后猛然夹紧外框，接触后短促左右震颤并顶住压实。',action:time<78.5?'五边形主角沿加长传送带移向成型压块；点击收紧并交替向左后、右后摆动，逆行受向前输送的阻尼，体力消耗圆环满格变红后卸力，被继续带走。':time<79.15?'五块成型压块缓慢张开蓄力。':time<79.25?'压块突然加速，沿各边法向撞紧外框。':time<79.65?'夹面锁住外框，支架短促左右震颤并保持压力。':'成型压块沿各边法向缓慢退开，保留离站净空。',camera:'镜头跟随主角真实位置移向压实工位，主角倒退时同步退回；机构在压紧接触后短促左右震动。'};
    if(time<94)return{summary:'主角进入喷涂工位，五边形逐边被涂黑。',action:time<83.2?'主角在加长输送段上向喷涂工位移动；点击可保持朝向收紧并逆向挣扎，体力消耗累积满后突然变红、失力，再被传送带带走。':'每转过一条边，停稳并向这条边喷黑；覆盖逐次累积，最后只留下内心的小黄点。',camera:'沿主角实际位置跟至喷涂工位，停步和逆行同步跟随，喷涂时五边轮廓完整可见。'};
    if(time<110)return{summary:'主角进入办公室。镜头拉远，等距排列的办公单元持续铺满视野；居民重复操作按钮与传递文件，办公外景逐渐变暗。',action:time<96?'主角离开喷涂工位，走向工厂出口。':time<98?'镜头经过门口遮挡，主角从办公室入口走进工作路线。':time<104?'主角与周围居民沿各自的闭合路线反复工作；点击使整个工作循环一起加快。':'所有工位继续循环，画面逐渐变暗；连续点击会加快工作与变暗。',camera:time<96?'跟随主角实际位置从喷涂工位移到工厂出口。':time<98?'经过门口遮挡切入办公室，跟随主角实际位置移向工位。':time<104?'从主角工位持续拉远，固定世界坐标的办公格网从画外进入，始终铺满视野。':'保持密集办公全景，直至外景完全变暗。'};
    if(time<119)return StoryNotes.at(time);
    if(time<132)return{summary:'身体内的同一颗光种子飞出，在近处引导，主角随后向右上追光。外层逐渐剥离，内在颜色重新露出。',action:time<119.6?'光种子暂留主角身体内。':time<122?'同一颗光种子从体内飞出，再近身绕行；主角转向观察。':'主角沿同一曲线持续向右上行进，外层逐渐剥离；两侧图形沿速度函数拉伸，从小图形逐渐变成大型弯曲曲面。',camera:'近处邀请后跟随主角，视角逐渐下降，光保持在右上方；冲刺两侧持续保留参照物。'};
    return StoryNotes.at(time);
  }
  function notesFor(select){return{at:value=>select(clamp(Number(value)||0,0,138))};}
  const rhythm={id:'rhythm',label:'A · 四组夹具',duration:rhythmTiming.duration,factory:Factory,timing:rhythmTiming,camera:cameraFor('rhythm',rhythmShots),notes:notesFor(rhythmNotes),beats:[6.8,98,104,110,119,132,138].map(rhythmTiming.playbackAt),chaseStart:119,chaseEnd:132};
  const routine={id:'routine',label:'B · 例行塑形',duration:routineTiming.duration,factory:RoutineFactory,timing:routineTiming,camera:cameraFor('routine',routineShots),notes:notesFor(routineNotes),beats:[6.8,119,132,138].map(routineTiming.playbackAt),chaseStart:119,chaseEnd:132};
  return{get:id=>id==='rhythm'?rhythm:routine};
});
