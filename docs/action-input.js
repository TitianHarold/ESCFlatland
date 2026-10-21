/* Click effort changes the resolved actor or work cycle; fatigue limits reverse motion. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandActionInput=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  class Actions{
    constructor(){this.seek(0);}
    seek(time){this.offset=0;this.velocity=0;this.push=0;this.fatigue=0;this.exhausted=0;this.pulse=0;this.effort=0;this.stride=0;this.windup=0;this.pending=0;this.collapse=0;this.heat=0;this.workRate=1;this.workTime=Math.max(98,time);this.workClicks=0;this.extraDark=0;this.darkness=0;this.wasWork=false;return this;}
    exhaust(){this.exhausted=2.2;this.fatigue=1;this.push=0;this.pending=0;this.windup=0;this.effort=0;this.collapse=1;this.velocity=-Math.max(100,Math.min(900,this.offset*5));}
    resist(){
      this.pulse=1;
      if(this.exhausted>0)return false;
      this.fatigue=clamp(this.fatigue+.13);
      if(this.fatigue>=.98){this.exhaust();return false;}
      if(this.push<.08&&this.pending===0)this.windup=.1;
      this.push=clamp(this.push+1.25,0,2.5);this.pending=Math.min(3000,this.pending+2800*(1-.58*this.fatigue));return true;
    }
    work(){this.workClicks++;this.heat=clamp(this.heat+.34,0,2);this.workRate=1+this.heat*3;this.extraDark=this.darkness=clamp(this.workClicks/8);this.pulse=1;return this.snapshot().work;}
    update(delta,{phase='',time=0,rawRate=1,advance=true}={}){
      const dt=clamp(Number(delta)||0,0,.1);if(!advance)return this;
      this.pulse*=Math.exp(-dt*8);this.collapse*=Math.exp(-dt*5);this.push*=Math.exp(-dt*3.4);
      this.exhausted=Math.max(0,this.exhausted-dt);
      if(phase!=='factory'){this.push=0;this.pending=0;this.windup=0;}
      const loading=phase==='factory'&&!this.exhausted&&this.push>.08;
      this.fatigue=clamp(this.fatigue+dt*(loading?.09:this.exhausted>0?-.24:-.10));
      if(!this.exhausted&&this.fatigue>=.98)this.exhaust();
      const preload=this.windup>0;
      this.windup=Math.max(0,this.windup-dt);
      if(this.windup===0&&this.pending>0&&!this.exhausted){this.velocity=Math.min(3000,this.velocity+this.pending);this.pending=0;}
      // Backward work first compresses the body, then overcomes belt drag. The
      // restoring force continuously pulls the actor forward when effort wanes.
      const spring=this.exhausted>0?48:15,damping=this.exhausted>0?12:7;
      this.velocity+=((this.exhausted||preload?0:this.push*2400*(1-.55*this.fatigue))-spring*this.offset-damping*this.velocity)*dt;
      this.offset=clamp(this.offset+this.velocity*dt,0,340);
      if(this.offset===340&&this.velocity>0)this.velocity=0;
      if(this.offset===0&&this.velocity<0)this.velocity=0;
      const resisting=phase==='factory'&&!this.exhausted&&(this.push>.08||this.windup>0);
      this.effort+=((resisting?clamp(this.push):0)-this.effort)*(1-Math.exp(-dt*10));
      this.stride+=dt*(3+9*this.effort);
      if(phase==='work'){
        if(!this.wasWork)this.workTime=Math.max(98,time);
        this.workTime+=dt*rawRate*this.workRate;
      }else{this.heat=0;this.workRate=1;}
      this.wasWork=phase==='work';return this;
    }
    snapshot(){return{factory:{offset:this.offset,velocity:this.velocity,fatigue:this.fatigue,stamina:1-this.fatigue,exhausted:this.exhausted>0,cooldown:this.exhausted,recovery:1-clamp(this.exhausted/2.2),preload:clamp(this.windup/.1),collapse:this.collapse,pulse:this.pulse,effort:this.effort,stride:this.stride},work:{time:this.workTime,rate:this.workRate,darkness:this.darkness,extraDarkness:this.extraDark,clicks:this.workClicks,progress:clamp(this.workClicks/8)}};}
  }
  return{Actions};
});
