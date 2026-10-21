/* Click effort changes the actor or the work cycle; the camera keeps its own clock. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandActionInput=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  class Actions{
    constructor(){this.seek(0);}
    seek(time){this.offset=0;this.velocity=0;this.push=0;this.fatigue=0;this.exhausted=0;this.pulse=0;this.effort=0;this.facing=0;this.stride=0;this.heat=0;this.workRate=1;this.workTime=Math.max(98,time);this.workClicks=0;this.extraDark=0;this.darkness=0;this.wasWork=false;return this;}
    resist(){
      this.pulse=1;
      if(this.exhausted>0)return false;
      this.fatigue=clamp(this.fatigue+.14);
      if(this.fatigue>=.98){this.exhausted=1.3;this.push=0;return false;}
      this.push=clamp(this.push+1.4,0,2.5);this.velocity=Math.min(3000,this.velocity+2200*(1-.55*this.fatigue));return true;
    }
    work(){this.workClicks++;this.heat=clamp(this.heat+.34,0,2);this.workRate=1+this.heat*3;this.extraDark=this.darkness=clamp(this.workClicks/8);this.pulse=1;return this.snapshot().work;}
    update(delta,{phase='',time=0,rawRate=1,advance=true}={}){
      const dt=clamp(Number(delta)||0,0,.1);if(!advance)return this;
      this.pulse*=Math.exp(-dt*8);this.push*=Math.exp(-dt*3.4);
      this.exhausted=Math.max(0,this.exhausted-dt);
      this.fatigue=Math.max(0,this.fatigue-dt*(this.exhausted?.09:.035));
      if(phase!=='factory')this.push=0;
      // A click must briefly outrun the belt, rather than merely reduce its speed.
      // The factory still clamps this intent against the next real contact boundary.
      const spring=this.exhausted>0?46:12,damping=this.exhausted>0?12:6;
      this.velocity+=((this.exhausted?0:this.push*2200)-spring*this.offset-damping*this.velocity)*dt;
      this.offset=clamp(this.offset+this.velocity*dt,0,340);
      if(this.offset===340&&this.velocity>0)this.velocity=0;
      if(this.offset===0&&this.velocity<0)this.velocity=0;
      const resisting=phase==='factory'&&!this.exhausted&&this.push>.08;
      this.effort+=((resisting?clamp(this.push):0)-this.effort)*(1-Math.exp(-dt*10));
      this.facing+=((resisting?1:0)-this.facing)*(1-Math.exp(-dt*(resisting?17:9)));
      this.stride+=dt*(5+10*this.effort);
      if(phase==='work'){
        if(!this.wasWork)this.workTime=Math.max(98,time);
        this.workTime+=dt*rawRate*this.workRate;
      }else{this.heat=0;this.workRate=1;}
      this.wasWork=phase==='work';return this;
    }
    snapshot(){return{factory:{offset:this.offset,velocity:this.velocity,fatigue:this.fatigue,exhausted:this.exhausted>0,pulse:this.pulse,effort:this.effort,facing:this.facing,stride:this.stride},work:{time:this.workTime,rate:this.workRate,darkness:this.darkness,extraDarkness:this.extraDark,clicks:this.workClicks,progress:clamp(this.workClicks/8)}};}
  }
  return{Actions};
});
