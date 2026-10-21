/* Four deliberate discoveries turn one guiding light into a new way to create. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandEndingProgress=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  const stages=Object.freeze([
    ['stopped',.8,1],['raise',1.2],['open',.9,2],['flex',1],['half',.8,3],
    ['drop',1.8],['bloom',1.1],['reveal',.9],['tools',1,4],['white',.9],['world',2],['message',3.6]
  ].map(Object.freeze));
  const duration=stages.reduce((sum,stage)=>sum+stage[1],0),text='Let’s explore a new dimension';
  const starts=stages.map((_,i)=>stages.slice(0,i).reduce((sum,stage)=>sum+stage[1],0));
  class Session{
    constructor(){this.reset();}
    reset(){this.index=0;this.age=0;this.clock=0;this.clicks=0;return this;}
    click(){
      if(this.index>=stages.length||this.clicks>=4)return false;
      this.clicks++;this.releaseWaitingStage();return true;
    }
    releaseWaitingStage(){
      const stage=stages[this.index];
      if(stage?.[2]&&this.clicks>=stage[2]){this.index++;this.age=0;}
    }
    update(delta,{automatic=false,advance=true}={}){
      if(!advance||this.index>=stages.length)return this.snapshot();
      let remaining=Math.max(0,Number(delta)||0);this.clock+=remaining;this.releaseWaitingStage();
      while(remaining>1e-10&&this.index<stages.length){
        const stage=stages[this.index];
        if(stage[2]&&!automatic)break;
        const step=Math.min(remaining,stage[1]-this.age);this.age+=step;remaining-=step;
        if(this.age>=stage[1]-1e-10){if(stage[2])this.clicks=Math.max(this.clicks,stage[2]);this.index++;this.age=0;this.releaseWaitingStage();}
      }
      return this.snapshot();
    }
    seek(raw){
      this.reset();this.update(clamp((Number(raw)-132)/6)*duration,{automatic:true});return this;
    }
    snapshot(){
      const index=this.index,stage=stages[index],phase=stage?.[0]||'done',age=this.age;
      const stageProgress=stage?clamp(age/stage[1]):1,progress=index>=stages.length?1:(starts[index]+age)/duration;
      const raise=index>1?1:index===1?smooth(age/1.2):0;
      const flex=index>3?1:index===3?smooth(age):0;
      const lightDrop=index>5?1:index===5?smooth(age/1.8):0;
      const lightBloom=index===6?smooth(age/1.1):index===7?1-smooth(age/.9):0;
      const lightOpacity=index>6?0:index===6?1-smooth(age/1.1):1;
      const toolsReveal=index>7?1:index===7?smooth(age/.9):0;
      const handsOpacity=index>9?0:index===9?1-smooth(age/.9):1;
      const expansion=index>10?1:index===10?smooth(age/2):0;
      const textOpacity=index>11?1:index===11?smooth(age/.9):0;
      return{phase,clicks:this.clicks,age,clock:this.clock,stageProgress,progress,raw:132+6*progress,
        raise,flex,grasp:toolsReveal,lightDrop,lightBloom,lightOpacity,toolsReveal,handsOpacity,seedCenter:lightDrop,
        expansion,textOpacity,text,
        awaiting:!!stage?.[2]&&this.clicks<stage[2],complete:index>=stages.length};
    }
  }
  function snapshotAt(raw){return new Session().seek(raw).snapshot();}
  return Object.freeze({Session,duration,text,snapshotAt});
});
