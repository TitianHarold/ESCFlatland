/* Input changes story time; the same chase rate also drives visible speed cues. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./story-timing.js'));
  else root.FlatlandStoryPlayer=factory(root.FlatlandTiming);
})(typeof globalThis!=='undefined'?globalThis:this,function(Timing){
  'use strict';
  // These are complete action episodes, not camera cuts. Capture, escort, entry and
  // the three factory stations run continuously through their intermediate shots.
  const defaultBeats=[6.8,98,104,110,119,132,138];
  class StoryPlayer{
    constructor({timing=Timing,beats,duration=timing.duration,mode='interactive',playing=false}={}){
      this.timing=timing;this.beats=beats||defaultBeats.map(timing.playbackAt);
      this.duration=duration;this.time=0;this.target=0;this.mode=mode;
      this.playing=playing;this.pressed=false;this.pressAge=0;this.pressChase=false;this.chaseRate=1;
    }
    seek(value){this.time=Math.max(0,Math.min(this.duration,Number(value)||0));this.target=this.time;this.playing=false;this.pressed=false;this.pressChase=false;this.chaseRate=1;}
    setMode(mode){this.chaseRate=1;this.mode=mode==='auto'?'auto':'interactive';this.pressed=false;this.pressChase=false;this.target=this.time;this.playing=this.mode==='auto'&&this.time<this.duration;}
    tap(){
      if(this.mode==='auto'){if(this.time>=this.duration)this.seek(0);this.playing=!this.playing;return;}
      if(this.playing&&this.time<this.target)return;
      if(this.time>=this.duration)this.seek(0);
      this.target=this.beats.find(time=>time>Math.max(this.time,this.target)+.05)||this.duration;
      this.playing=true;
    }
    press(){
      if(this.mode!=='interactive')return;
      this.pressed=true;this.pressAge=0;this.pressChase=this.time>=this.timing.playbackAt(119)&&this.time<this.timing.playbackAt(132);
      if(this.pressChase)this.tap();
    }
    release(cancelled=false){
      if(this.mode==='auto'){if(!cancelled)this.tap();return;}
      const wasPressed=this.pressed,wasChase=this.pressChase;this.pressed=false;this.pressChase=false;
      if(!wasPressed)return;
      if(!cancelled&&!wasChase)this.tap();
    }
    get accelerating(){return this.mode==='interactive'&&this.pressed&&this.pressChase&&this.pressAge>=.18&&this.time<this.timing.playbackAt(132);}
    get playbackRate(){return this.mode==='interactive'&&this.time>=this.timing.playbackAt(119)&&this.time<this.timing.playbackAt(132)?this.chaseRate:1;}
    tick(delta){
      const dt=Math.max(0,Math.min(.1,Number(delta)||0));
      if(this.pressed)this.pressAge+=dt;
      if(!this.playing)return this.time;
      const end=this.mode==='auto'?this.duration:this.target;
      const inChase=this.mode==='interactive'&&this.time>=this.timing.playbackAt(119)&&this.time<this.timing.playbackAt(132);
      const target=inChase&&this.accelerating?1.8:1,old=inChase?this.chaseRate:1,tau=target>old?.10:.18,decay=Math.exp(-dt/tau);
      this.chaseRate=target+(old-target)*decay;
      // Integrate the smooth rate instead of snapping between two time multipliers.
      const travel=target*dt+(old-target)*tau*(1-decay);
      this.time=Math.min(end,this.time+travel);
      if(this.time>=end){this.playing=false;if(end===this.duration)this.pressed=false;}
      return this.time;
    }
  }
  return StoryPlayer;
});
