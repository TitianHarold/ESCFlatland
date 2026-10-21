/* Sustained effort spends stamina; the conveyor keeps moving after the child tires. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandActionInput=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  class Actions{
    constructor(){this.seek(0);}
    seek(time){this.offset=0;this.velocity=0;this.held=false;this.tap=0;this.fatigue=0;this.exhausted=0;this.pulse=0;this.effort=0;this.stride=0;this.windup=0;this.weakAge=1;this.collapse=0;this.heat=0;this.workRate=1;this.workTime=Math.max(98,time);this.workClicks=0;this.extraDark=0;this.darkness=0;this.wasWork=false;return this;}
    exhaust(){this.exhausted=2.2;this.fatigue=1;this.tap=0;this.windup=0;this.effort=0;this.collapse=1;this.velocity=-Math.min(180,this.offset*4);}
    holdResistance(held){
      held=!!held;if(held===this.held)return !this.exhausted;
      this.held=held;if(!held)return !this.exhausted;
      this.pulse=1;if(this.exhausted){this.weakAge=0;return false;}
      this.windup=.12;return true;
    }
    resist(){
      this.pulse=1;if(this.exhausted){this.weakAge=0;return false;}
      // A tap is only a brief attempt; repeated calls do not add force or stamina cost.
      this.tap=.14;if(!this.held)this.windup=.06;return true;
    }
    work(){this.workClicks++;this.heat=clamp(this.heat+.34,0,2);this.workRate=1+this.heat*3;this.extraDark=this.darkness=clamp(this.workClicks/8);this.pulse=1;return this.snapshot().work;}
    update(delta,{phase='',time=0,rawRate=1,beltSpeed=200,advance=true}={}){
      const dt=clamp(Number(delta)||0,0,.1);if(!advance)return this;
      this.pulse*=Math.exp(-dt*8);this.collapse*=Math.exp(-dt*5);this.weakAge+=dt;
      if(phase!=='factory'){this.held=false;this.tap=0;this.windup=0;}
      const attempting=phase==='factory'&&(this.held||this.tap>0),loading=attempting&&!this.exhausted;
      this.tap=Math.max(0,this.tap-dt);this.windup=Math.max(0,this.windup-dt);
      if(loading){this.fatigue=clamp(this.fatigue+dt/3.2);if(this.fatigue>=1-1e-9)this.exhaust();}
      else if(!attempting){this.fatigue=clamp(this.fatigue-dt*(this.exhausted?.28:.18));this.exhausted=Math.max(0,this.exhausted-dt);}
      // Holding while exhausted cannot restart the run or refill stamina. Rest is required.
      const active=loading&&!this.exhausted&&this.windup===0;
      const target=active?(this.held?clamp(beltSpeed+38,90,340):60)*(1-.06*this.fatigue):-Math.min(180,this.offset*4);
      this.velocity+=(target-this.velocity)*(1-Math.exp(-dt*(active?7:10)));
      this.offset=clamp(this.offset+this.velocity*dt,0,650);if(this.offset===0&&this.velocity<0)this.velocity=0;
      this.effort+=((active?(this.held?1:.25):0)-this.effort)*(1-Math.exp(-dt*10));
      this.stride+=dt*(3+6*this.effort);
      if(phase==='work'){if(!this.wasWork)this.workTime=Math.max(98,time);this.workTime+=dt*rawRate*this.workRate;}
      else{this.heat=0;this.workRate=1;}
      this.wasWork=phase==='work';return this;
    }
    snapshot(){
      const weak=this.exhausted&&this.weakAge<.22?(this.weakAge<.035?Math.sin(this.weakAge/.035*Math.PI/2):Math.cos((this.weakAge-.035)/.185*Math.PI/2)):0;
      return{factory:{offset:this.offset+weak*12,velocity:this.velocity,fatigue:this.fatigue,stamina:1-this.fatigue,exhausted:this.exhausted>0,cooldown:this.exhausted,recovery:1-clamp(this.exhausted/2.2),preload:this.exhausted?weak*.22:clamp(this.windup/.12),weak,held:this.held,collapse:this.collapse,pulse:this.pulse,effort:this.effort,stride:this.stride},work:{time:this.workTime,rate:this.workRate,darkness:this.darkness,extraDarkness:this.extraDark,clicks:this.workClicks,progress:clamp(this.workClicks/8)}};
    }
  }
  return{Actions};
});
