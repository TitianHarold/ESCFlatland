/* Input changes story time; it never changes a camera or a character pose. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./story-timing.js'));
  else root.FlatlandStoryPlayer=factory(root.FlatlandTiming);
})(typeof globalThis!=='undefined'?globalThis:this,function(Timing){
  'use strict';
  // Stop after a complete reaction or episode, never at first contact or mid-transition.
  const beats=[6.8,16.0667,24,37.5,51.7,58,70,77,87,98,104,110,119,132,138].map(Timing.playbackAt);
  class StoryPlayer{
    constructor({duration=Timing.duration,mode='interactive',playing=false}={}){
      this.duration=duration;this.time=0;this.target=0;this.mode=mode;
      this.playing=playing;this.pressed=false;this.pressAge=0;this.pressChase=false;
    }
    seek(value){this.time=Math.max(0,Math.min(this.duration,Number(value)||0));this.target=this.time;this.playing=false;this.pressed=false;this.pressChase=false;}
    setMode(mode){this.mode=mode==='auto'?'auto':'interactive';this.pressed=false;this.pressChase=false;this.target=this.time;this.playing=this.mode==='auto'&&this.time<this.duration;}
    tap(){
      if(this.mode==='auto'){if(this.time>=this.duration)this.seek(0);this.playing=!this.playing;return;}
      if(this.playing&&this.time<this.target)return;
      if(this.time>=this.duration)this.seek(0);
      this.target=beats.find(time=>time>Math.max(this.time,this.target)+.05)||this.duration;
      this.playing=true;
    }
    press(){
      if(this.mode!=='interactive')return;
      this.pressed=true;this.pressAge=0;this.pressChase=this.time>=Timing.playbackAt(119)&&this.time<Timing.playbackAt(132);
      if(this.pressChase)this.tap();
    }
    release(cancelled=false){
      if(this.mode==='auto'){if(!cancelled)this.tap();return;}
      const wasPressed=this.pressed,wasChase=this.pressChase;this.pressed=false;this.pressChase=false;
      if(!wasPressed)return;
      if(!cancelled&&!wasChase)this.tap();
    }
    get accelerating(){return this.mode==='interactive'&&this.pressed&&this.pressChase&&this.pressAge>=.18&&this.time<Timing.playbackAt(132);}
    tick(delta){
      const dt=Math.max(0,Math.min(.1,Number(delta)||0));
      if(this.pressed)this.pressAge+=dt;
      if(!this.playing)return this.time;
      const end=this.mode==='auto'?this.duration:this.target;
      this.time=Math.min(end,this.time+dt*(this.accelerating?1.8:1));
      if(this.time>=end){this.playing=false;if(end===this.duration)this.pressed=false;}
      return this.time;
    }
  }
  return StoryPlayer;
});
