/* Click effort changes the actor or the work cycle; the camera keeps its own clock. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandActionInput=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=q=>{q=clamp(q);return q*q*(3-2*q);};
  class Actions{
    constructor(){this.seek(0);}
    seek(time){this.offset=0;this.velocity=0;this.push=0;this.fatigue=0;this.exhausted=0;this.pulse=0;this.heat=0;this.workRate=1;this.workTime=Math.max(98,time);this.extraDark=0;this.darkness=0;this.wasWork=false;return this;}
    resist(){
      this.pulse=1;
      if(this.exhausted>0)return false;
      this.fatigue=clamp(this.fatigue+.14);
      if(this.fatigue>=.98){this.exhausted=1.3;this.push=0;return false;}
      this.push=clamp(this.push+.65,0,2);this.velocity=Math.min(900,this.velocity+450*(1-.55*this.fatigue));return true;
    }
    work(){this.heat=clamp(this.heat+.34,0,2);this.pulse=1;}
    update(delta,{phase='',time=0,rawRate=1,advance=true}={}){
      const dt=clamp(Number(delta)||0,0,.1);if(!advance)return this;
      this.pulse*=Math.exp(-dt*8);this.push*=Math.exp(-dt*5);
      this.exhausted=Math.max(0,this.exhausted-dt);
      this.fatigue=Math.max(0,this.fatigue-dt*(this.exhausted?.09:.035));
      if(phase!=='factory')this.push=0;
      const spring=this.exhausted>0?82:42;
      this.velocity+=((this.exhausted?0:this.push*2300)-spring*this.offset-12*this.velocity)*dt;
      this.offset=clamp(this.offset+this.velocity*dt,0,160);
      if(this.offset===0&&this.velocity<0)this.velocity=0;
      this.heat*=Math.exp(-dt*.28);
      this.workRate+=(1+this.heat*3-this.workRate)*(1-Math.exp(-dt*5));
      if(phase==='work'){
        if(!this.wasWork)this.workTime=Math.max(98,time);
        this.workTime+=dt*rawRate*this.workRate;
        this.extraDark=clamp(this.extraDark+dt*Math.max(0,this.workRate-1)*.075);
        const base=ease((time-104)/6),target=clamp(base+this.extraDark*(.25+.75*base));
        this.darkness=Math.min(1,this.darkness+(target-this.darkness)*(1-Math.exp(-dt*7)));
      }
      this.wasWork=phase==='work';return this;
    }
    snapshot(){return{factory:{offset:this.offset,velocity:this.velocity,fatigue:this.fatigue,exhausted:this.exhausted>0,pulse:this.pulse},work:{time:this.workTime,rate:this.workRate,darkness:this.darkness,extraDarkness:this.extraDark}};}
  }
  return{Actions};
});
