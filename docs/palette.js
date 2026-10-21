(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(root);
  else root.FlatlandPalette=factory(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  // All presets expose the same semantic getters; the viewing page opens in F2.
  const original={
    paper:'#f5f1e6',white:'#ffffff',black:'#000000',blue:'#0754ee',ink:'#121d2f',navy:'#102b5a',deep:'#112743',
    night:'#241936',teal:'#519fb3',lavender:'#ae96cf',coral:'#ee9884',gold:'#edbf70',
    industrial:'#121723',conveyor:'#ede8dc',metal:'#d2d1c6',line:'#d6d7d0',quiet:'#68757f',warning:'#dc6a58',
    cyan:'#49a8bd',lilac:'#ad91c7',cream:'#f3dfb6',leafVein:'#b0cbb6',mathTangent:'#795c93'
  };
  original.outside={background:original.white,wall:original.industrial};
  original.factory={
    floor:'#e4dfd3',outline:original.outside.wall,conveyorEdge:'#b4b5aa',roller:'#c6c6ba',
    disk:'#6e746f',diskMark:'#626a66',aisle:'#c3c2b7',fatigue:'#526287',
    workers:['#649aab','#a691bd',original.blue,'#ca8c78']
  };
  // Preserve the selected depth scene's warmer paper and material pigments.
  original.dimension={
    paper:'#f5edda',blue:original.blue,ink:'#211a35',teal:'#559eae',
    lilac:'#ad94c7',coral:'#dd917f',gold:'#edc57b'
  };
  // Face-color triples are [top, front, side].
  original.street={
    road:'#14366c',curb:['#dbcba7','#31517c','#23477c'],
    pavingVertical:'#d9cfb9',pavingHorizontal:'#d7c9ab',
    building:['#286ac2','#124d9b','#103574'],window:'#182e5b',windowTrim:'#d7ab75',sunPatch:'#e3ba80',groundShadow:'#14376a',
    benchSeat:['#29527c','#183d66','#14325a'],benchBack:['#315f89','#1d4871','#153554'],benchLeg:['#21405e','#193751','#112d48'],
    trunk:['#a78053','#8e6b46','#725139'],foliage:['#315d73','#426f79','#285474','#173e68','#577d76','#214a70'],foliageBottom:'#234a64',
    sheetShadow:'#16345d',crack:'#111524',crackEdge:'#c5b9bd',lightCore:'#f8e8b9'
  };
  const storageKey='flatland.palette.v1';
  const editableKeys=[
    {key:'paper',label:'纸面／背景'},{key:'blue',label:'主体／建筑主色'},
    {key:'ink',label:'轮廓／机器深色'},{key:'night',label:'内腔暗色'},
    {key:'teal',label:'内层色一'},{key:'lavender',label:'内层色二'},
    {key:'coral',label:'内层暖色'},{key:'gold',label:'光点／强调色'}
  ];
  // F2/F3/F4 are sampled from the selected O05 source images, not changes to drawing style.
  const presets=[
    {id:'original',label:'原配色',colors:Object.fromEntries(editableKeys.map(({key})=>[key,original[key]]))},
    {id:'F2',label:'F2 · 奶油白／芥末黄／灰绿／珊瑚',colors:{paper:'#f3e9d5',blue:'#e1b560',ink:'#2b2d25',night:'#414336',teal:'#969c83',lavender:'#c4c5ac',coral:'#dc987b',gold:'#e7bb61'}},
    {id:'F3',label:'F3 · 奶油白／青绿／鲑红／炭黑',colors:{paper:'#eee1cc',blue:'#5e8d89',ink:'#343837',night:'#323b39',teal:'#9bb6ac',lavender:'#bec2b0',coral:'#d58f74',gold:'#dbb06d'}},
    {id:'F4',label:'F4 · 纸灰／橄榄／砖红／深褐',colors:{paper:'#baae9e',blue:'#686547',ink:'#3d3229',night:'#44352d',teal:'#85856a',lavender:'#b09d91',coral:'#be6b56',gold:'#bba476'}}
  ];
  const copy=value=>JSON.parse(JSON.stringify(value));
  function normalize(value){
    const preset=presets.find(item=>item.id===value?.preset)?value.preset:'original',colors={};
    for(const {key} of editableKeys)if(/^#[0-9a-f]{6}$/i.test(value?.colors?.[key]||''))colors[key]=value.colors[key].toLowerCase();
    return{version:1,preset,colors};
  }
  function load(){
    const requested=typeof URLSearchParams!=='undefined'?new URLSearchParams(root.location?.search||'').get('palette'):null;
    if(presets.some(item=>item.id===requested))return normalize({preset:requested});
    if(root.document?.body?.classList?.contains('viewer'))return normalize({preset:'F2'});
    try{return normalize(JSON.parse(root.localStorage.getItem(storageKey)));}catch{return normalize(null);}
  }
  function mix(a,b,q){return'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-q)+parseInt(b.slice(i,i+2),16)*q).toString(16).padStart(2,'0')).join('');}
  function resolve(value){
    if(value.preset==='original'&&!Object.keys(value.colors).length)return copy(original);
    const c={...presets.find(item=>item.id===value.preset).colors,...value.colors};
    const {paper,blue,ink,night,teal,lavender,coral,gold}=c;
    const p={...original,...c,white:paper,black:ink,navy:mix(blue,ink,.64),deep:mix(blue,ink,.8),
      industrial:ink,conveyor:mix(paper,ink,.035),metal:mix(paper,ink,.16),line:mix(paper,ink,.2),
      quiet:mix(paper,ink,.6),warning:coral,cyan:teal,lilac:lavender,cream:mix(paper,gold,.18),
      leafVein:mix(paper,teal,.45),mathTangent:mix(lavender,ink,.4)};
    p.outside={background:paper,wall:ink};
    p.factory={floor:mix(paper,ink,.065),outline:ink,conveyorEdge:mix(paper,ink,.28),roller:mix(paper,ink,.18),
      disk:mix(paper,ink,.55),diskMark:mix(paper,ink,.64),aisle:mix(paper,ink,.15),fatigue:mix(blue,ink,.35),workers:[teal,lavender,blue,coral]};
    p.dimension={paper,blue,ink:night,teal,lilac:lavender,coral,gold};
    const triple=color=>[color,mix(color,ink,.18),mix(color,ink,.36)];
    p.street={road:mix(blue,ink,.7),curb:[mix(paper,gold,.1),mix(blue,paper,.28),mix(blue,ink,.28)],
      pavingVertical:mix(paper,ink,.08),pavingHorizontal:mix(paper,gold,.15),building:triple(blue),
      window:mix(blue,ink,.75),windowTrim:mix(paper,gold,.5),sunPatch:mix(paper,gold,.62),groundShadow:mix(blue,ink,.65),
      benchSeat:triple(mix(blue,teal,.3)),benchBack:triple(mix(blue,teal,.45)),benchLeg:triple(mix(blue,ink,.4)),
      trunk:triple(mix(gold,ink,.45)),foliage:[teal,mix(teal,paper,.18),mix(teal,blue,.3),mix(teal,ink,.3),mix(teal,gold,.25),mix(teal,blue,.5)],
      foliageBottom:mix(teal,ink,.4),sheetShadow:mix(blue,ink,.65),crack:ink,crackEdge:mix(paper,lavender,.4),lightCore:mix(paper,gold,.32)};
    return p;
  }
  let config=load(),active=resolve(config),revision=0;
  function expose(template,path=[]){
    const result=Array.isArray(template)?[]:{};
    for(const [key,value] of Object.entries(template)){
      const next=[...path,key];
      if(value&&typeof value==='object')result[key]=expose(value,next);
      else Object.defineProperty(result,key,{enumerable:true,get:()=>next.reduce((object,name)=>object[name],active)});
    }
    return result;
  }
  const palette=expose(original);
  Object.defineProperties(palette,{
    storageKey:{value:storageKey},presets:{get:()=>copy(presets)},editableKeys:{get:()=>copy(editableKeys)},
    revision:{get:()=>revision},getConfig:{value:()=>copy(config)},
    setConfig:{value:value=>{
      const next=normalize(value);
      try{root.localStorage.setItem(storageKey,JSON.stringify(next));}catch{return false;}
      config=next;active=resolve(config);revision++;return true;
    }}
  });
  // Loading a new page reconstructs captured pigments and baked Canvas materials together.
  // Other open viewer tabs keep playing; they read this key the next time they are opened.
  return palette;
});
