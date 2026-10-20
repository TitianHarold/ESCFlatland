/* Two story edits share the family, input model and final chase. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./story-timing.js'),require('./camera.js'),require('./story-notes.js'),require('./factory.js'),require('./factory-routine.js'));
  else root.FlatlandStoryVersions=factory(root.FlatlandTiming,root.FlatlandCamera,root.FlatlandStoryNotes,root.FlatlandFactory,root.FlatlandRoutineFactory);
})(typeof globalThis!=='undefined'?globalThis:this,function(Timing,Camera,StoryNotes,Factory,RoutineFactory){
  'use strict';
  if(!Timing||!Camera||!StoryNotes||!Factory||!RoutineFactory)throw new Error('Load timing, camera, notes and both factories before story-versions.js.');
  const clamp=(value,a,b)=>Math.max(a,Math.min(b,value)),ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
  function edit(cuts){
    function map(value,from,to){
      const t=clamp(Number(value)||0,0,cuts.at(-1)[from]);
      for(let i=1;i<cuts.length;i++)if(t<=cuts[i][from]){const a=cuts[i-1],b=cuts[i];return a[to]+(b[to]-a[to])*(t-a[from])/(b[from]-a[from]);}
      return cuts.at(-1)[to];
    }
    return Object.freeze({duration:cuts.at(-1)[1],sceneAt:t=>map(t,1,0),playbackAt:t=>map(t,0,1)});
  }
  const opening=[[0,0],[6.8,3],[15,7],[24,11],[42,18],[58,25],[64,28]];
  const rhythmTiming=edit([...opening,[70,30.5],[72,31.5],[77,36.5],[87,41],[90,42],[98,46],[104,49],[110,54],[119,62],[122,65],[132,75],[138,79]]);
  const routineTiming=edit([...opening,[70,31],[77,36],[82,40],[94,47],[108,63],[119,73],[122,76],[132,86],[138,90]]);
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
    shot('factory','006 · 工厂概览',64,70),shot('mold','007 · 套模',70,77),shot('compact','008 · 压实',77,82),
    shot('paint','009 · 逐边喷涂',82,94),shot('work','010 · 循环工作',94,108),shot('awaken','011 · 光触发',108,119),
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
        const b=RoutineFactory.anchors||{},work=point(b.work,discard),awaken=point(b.awaken,discard);
        if(time<70){const p=point(b.overview,overview);v=fixed([p],p.zoom||.22);}
        else if(time<77)v=move(time,70,71.7,point(b.approach,stage.m1),point(b.mold,stage.m1),b.mold?.zoom||1.5);
        else if(time<82)v=move(time,77,78.5,point(b.mold,stage.m1),point(b.compact,stage.m2),b.compact?.zoom||1.5);
        else if(time<94)v=move(time,82,83.2,point(b.compact,stage.m2),point(b.paint,stage.m3),b.paint?.zoom||1.5);
        else if(time<98)v=move(time,94,98,point(b.paint,stage.m3),work,b.paint?.zoom||1.5,work.zoom||.75);
        else if(time<108)v=fixed([work],work.zoom||.75);
        else{const u=ease((time-111)/8);v={...fixed([work,awaken],.75),x:work.x+(discard.x-work.x)*u,y:work.y+(discard.y-work.y)*u,zoom:.75+.45*u};}
      }
      // The overview move crosses the shot boundary without changing the factory clock.
      if(time>=68.3&&time<70.8){
        const b=RoutineFactory.anchors,start=point(id==='routine'?b.overview:a.overview,a.factoryCenter);
        const from=fixed([start],start.zoom||.22),to=id==='routine'?(time>=70?{...v}:fixed([point(b.approach,stage.m1)],b.mold?.zoom||1.5)):fixed((a.pressStations||[stage.m1]).map(p=>point(p)),.65),u=ease((time-68.3)/2.5);
        for(const key of ['x','y','zoom'])v[key]=from[key]+(to[key]-from[key])*u;
      }
      return{...v,shotId:current.id};
    }
    return{duration:138,shots,shotAt,pose};
  }
  function rhythmNotes(time){
    if(time<64)return StoryNotes.at(time);
    if(time<70)return{summary:'多条身份专线持续运转，四组夹具沿主角所在的传送带排列。',action:'居民沿带前进，四组夹具依次开合。',camera:'工厂全景，显示传送带与夹具的排列。'};
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
        action:time<72?'主角沿传送带接近第一组夹具。':actions.join('；')+'。孩子沿传送带向下一组转运。',camera:'保持四组夹具与传送带同框的预设中景，多个夹具可以同时回升。'};
    }
    if(time<87)return{summary:'主角离开四组夹具，进入旋转工位。破损内窗仍露出颜色。',action:time<80?'主角沿传送带移向旋转工位。':'旋转盘和主角一同转动，内窗颜色逐渐混暗。',camera:'固定俯视中景，容纳旋转和判定工位。'};
    if(time<90)return{summary:'主角从旋转工位送往判定工位。',action:'同一五边形沿传送带前进，破损内窗仍然透色。',camera:'保持同一固定中景。'};
    if(time<98)return{summary:'判定工位检查主角，两条金属链交叉锁住身体。',action:time<94.5?'主角停在判定工位，破损内窗仍露出流动色域。':'链节组成的两条锁链交叉缠住主角，形成X。三角兵从安全通道靠近。',camera:'保持固定中景，判定工位位于画面一侧。'};
    if(time<104)return{summary:'三角兵从判定工位押走主角，经出口将它扔到墙外。',action:time<102.8?'队伍沿机器之间的安全通道走向出口。':'主角通过墙门，被扔到墙外的落点。',camera:time<102.8?'固定出口全景，同时保留判定工位和墙门。':'切到墙外落点，主角落入画面。'};
    return StoryNotes.at(time);
  }
  function routineNotes(time){
    if(time<64)return StoryNotes.at(time);
    if(time<70)return{summary:'居民沿专线排队，依次经过套模、压实和喷涂工位。',action:'传送带、工位和已经成形的居民同时运动。',camera:'固定工厂全景，显示三道工序的排列。'};
    if(time<77)return{summary:'主角进入与自身边数匹配的多边形模腔。五边形主角对应五边模腔，各边模块沿轮廓合拢。',action:time<71.7?'主角沿传送带接近五边形套模工位。':'五条边对应的模腔模块沿边合拢，外层逐渐贴合主角轮廓。',camera:'沿传送带移近套模工位，随后保持俯视中景。'};
    if(time<82)return{summary:'主角进入压实工位。按对应边数排列的成型压块沿各边法向合拢，实际接触后压实外层。',action:time<78.5?'五边形主角沿传送带移入五边排列的成型压块之间。':time<79.25?'五块成型压块沿各条边的法向靠近外壳。':time<79.65?'各块真实接触对应边界后施力压实。':'成型压块沿各边法向缓慢退开，保留离站净空。',camera:'沿带平移至压实工位，主角持续留在画面中。'};
    if(time<94)return{summary:'主角进入喷涂工位，五边形逐边被涂黑。',action:time<83.2?'主角沿传送带进入喷涂工位。':'每转过一条边，停稳并向这条边喷黑；覆盖逐次累积，最后只留下内心的小黄点。',camera:'沿带移至喷涂工位后固定，五边轮廓完整可见。'};
    if(time<108)return{summary:'主角离开流水线，进入几何建筑围成的工作通道。',action:time<98?'主角离开流水线，沿连接通道进入工作区域。':'主角与两位居民沿闭合路线行进，在固定工位推送几何件后继续工作。',camera:'从喷涂工位连续移向工作区域并拉远，随后固定取景。'};
    if(time<119)return{summary:'工作途中，同一团光数次靠近主角。主角转向光，逐渐离开原有路线。',action:time<111?'光在近处接连出现，主角停在路线右侧，头尖数次转向。':time<116?'主角从工作路线右侧沿开口通道移向光。':'主角继续移到通道外的汇合位置，光留在它的前方。',camera:time<111?'保持工作区域广角，主角和近处的光同框。':'预设取景从工作区域缓慢移向主角与光汇合的位置。'};
    if(time<132)return{summary:'光先在近处绕行，主角随后向右上追光。外层逐渐剥离，内在颜色重新露出。',action:time<122?'光在近处绕行，主角转向观察。':'主角沿同一曲线持续向右上行进，外层逐渐剥离；沿途小图形逐渐变成大型弯曲曲面。',camera:'近处邀请后跟随主角，视角逐渐下降，光保持在右上方。'};
    return StoryNotes.at(time);
  }
  function notesFor(select){return{at:value=>select(clamp(Number(value)||0,0,138))};}
  const rhythm={id:'rhythm',label:'A · 四组夹具',duration:rhythmTiming.duration,factory:Factory,timing:rhythmTiming,camera:cameraFor('rhythm',rhythmShots),notes:notesFor(rhythmNotes),beats:[6.8,98,104,110,119,132,138].map(rhythmTiming.playbackAt),chaseStart:119,chaseEnd:132};
  const routine={id:'routine',label:'B · 例行塑形',duration:routineTiming.duration,factory:RoutineFactory,timing:routineTiming,camera:cameraFor('routine',routineShots),notes:notesFor(routineNotes),beats:[6.8,108,119,132,138].map(routineTiming.playbackAt),chaseStart:119,chaseEnd:132};
  return{get:id=>id==='routine'?routine:rhythm};
});
