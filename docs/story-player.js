/* Input changes story time; it never changes a camera or a character pose. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandStoryPlayer=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const beats=[1.2,4.3653,6.8,13.7,16.0667,17.2333,17.7,24,37.5,47.1,51.7,58,61.5,70,77,87,97,104,109,116.8,119,127.1,132,138,142.3,146,154,158];
  class StoryPlayer{
    constructor({duration=158,mode='interactive',playing=false}={}){
      this.duration=duration;this.time=0;this.target=0;this.mode=mode;
      this.playing=playing;this.pressed=false;this.pressAge=0;
    }
    seek(value){this.time=Math.max(0,Math.min(this.duration,Number(value)||0));this.target=this.time;this.playing=false;this.pressed=false;}
    setMode(mode){this.mode=mode==='auto'?'auto':'interactive';this.pressed=false;this.target=this.time;this.playing=this.mode==='auto'&&this.time<this.duration;}
    tap(){
      if(this.mode==='auto'){if(this.time>=this.duration)this.seek(0);this.playing=!this.playing;return;}
      if(this.time>=this.duration)this.seek(0);
      this.target=beats.find(time=>time>Math.max(this.time,this.target)+.05)||this.duration;
      this.playing=true;
    }
    press(){if(this.mode==='interactive'){this.pressed=true;this.pressAge=0;}}
    release(cancelled=false){
      if(this.mode==='auto'){if(!cancelled)this.tap();return;}
      const wasPressed=this.pressed,held=this.pressAge>=.18;this.pressed=false;
      if(!wasPressed)return;
      if(held||cancelled){this.target=this.time;this.playing=false;}else this.tap();
    }
    tick(delta){
      const dt=Math.max(0,Math.min(.1,Number(delta)||0));
      if(this.pressed)this.pressAge+=dt;
      const holding=this.mode==='interactive'&&this.pressed&&this.pressAge>=.18;
      if(holding)this.playing=true;
      if(!this.playing)return this.time;
      const end=this.mode==='auto'||holding?this.duration:this.target;
      this.time=Math.min(end,this.time+dt);
      if(this.time>=end){this.playing=false;if(end===this.duration)this.pressed=false;}
      return this.time;
    }
  }
  return StoryPlayer;
});
