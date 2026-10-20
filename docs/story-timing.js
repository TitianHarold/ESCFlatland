/* Editing pace is separate from the authored poses, collisions and camera track. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandTiming=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // [authored scene time, playback seconds]. The emotional hesitation keeps its time.
  const cuts=[[0,0],[6.8,4],[15,9.4],[16.0667,10],[24,14.5],[42,23],[58,32],
    [64,35.5],[68.3,38],[70.8,40],[77,44.5],[87,49],[90,50.5],[94.5,53.5],
    [98,55],[104,59.5],[110,65.5],[112,66.7],[116,70.8],[119,73],[122,76],[132,86],[138,90]];
  function map(value,from,to){
    const time=Math.max(0,Math.min(cuts.at(-1)[from],Number(value)||0));
    for(let i=1;i<cuts.length;i++)if(time<=cuts[i][from]){
      const a=cuts[i-1],b=cuts[i],q=(time-a[from])/(b[from]-a[from]);
      return a[to]+(b[to]-a[to])*q;
    }
    return cuts.at(-1)[to];
  }
  return Object.freeze({duration:90,sceneAt:time=>map(time,1,0),playbackAt:time=>map(time,0,1)});
});
