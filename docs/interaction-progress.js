/* Interactive story progress is separate from the continuously running scene. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandInteractionProgress=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=q=>q*q*(3-2*q);
  const stepTime=delta=>clamp(Number(delta)||0,0,.1);

  class WorkProgress{
    constructor({raw=98,start=98,wide=104,end=110,clicks=8}={}){
      this.start=start;this.wide=wide;this.end=end;this.steps=Math.max(1,clicks);this.seek(raw);
    }
    seek(raw){
      const time=Number(raw)||this.start;
      this.zoom=clamp((time-this.start)/(this.wide-this.start));this.target=this.zoom;
      this.darkness=clamp((time-this.wide)/(this.end-this.wide));this.fading=time>this.wide;
      this.clicks=0;this.energy=0;this.fadeRate=1/8;return this;
    }
    click(){
      this.clicks++;
      if(this.zoom<1){this.target=clamp(this.target+1/this.steps);}
      else if(!this.fading){this.fading=true;}
      else this.energy=Math.min(3,this.energy+.85);
      return this.snapshot();
    }
    update(delta,{advance=true}={}){
      if(!advance)return this.snapshot();
      const dt=stepTime(delta);
      this.zoom+=(this.target-this.zoom)*(1-Math.exp(-dt*9));
      if(this.target-this.zoom<.0001)this.zoom=this.target;
      this.energy*=Math.exp(-dt/1.15);
      this.fadeRate+=((1+3*this.energy)/8-this.fadeRate)*(1-Math.exp(-dt*5));
      if(this.fading)this.darkness=clamp(this.darkness+dt*this.fadeRate);
      return this.snapshot();
    }
    snapshot(){
      const raw=this.zoom<1?this.start+(this.wide-this.start)*this.zoom:this.wide+(this.end-this.wide)*this.darkness;
      return{raw,progress:(raw-this.start)/(this.end-this.start),zoom:this.zoom,darkness:this.darkness,
        phase:this.darkness===1?'done':this.fading?'fade':this.zoom===1?'wide':'pullback',
        target:this.target,clicks:this.clicks,fadeRate:this.fadeRate,
        advancing:this.zoom<this.target||this.fading&&this.darkness<1,complete:this.darkness===1};
    }
  }

  class ChaseProgress{
    constructor({raw=119,start=119,end=132,holdSeconds=4.5,releaseSeconds=.6,baseRate=.32}={}){
      this.start=start;this.end=end;this.holdSeconds=holdSeconds;
      this.releaseSeconds=releaseSeconds;this.baseRate=baseRate;this.seek(raw);
    }
    seek(raw){
      this.raw=clamp(Number(raw)||this.start,this.start,this.end);
      this.complete=this.raw>=this.end;this.charge=this.complete?1:0;
      this.rate=this.baseRate;this.travel=0;this.held=false;return this;
    }
    update(delta,{held=false,advance=true}={}){
      if(!advance||this.complete)return this.snapshot();
      const dt=stepTime(delta),oldRate=this.rate;
      this.held=!!held;
      this.charge=held?clamp(this.charge+dt/this.holdSeconds):clamp(this.charge-dt/this.releaseSeconds);
      const targetRate=held?1.8+2.4*smooth(this.charge):this.baseRate;
      const tau=targetRate>oldRate?.14:.32,decay=Math.exp(-dt/tau);
      this.rate=targetRate+(oldRate-targetRate)*decay;
      // Integrate the same continuous speed that drives strain and passing references.
      // Travel continues at a low pace after release, even at the final story gate.
      const distance=targetRate*dt+(oldRate-targetRate)*tau*(1-decay);
      this.travel+=distance;
      this.raw=Math.max(this.raw,Math.min(this.end-.3,this.raw+distance));
      if(held&&this.charge>=1-1e-9){this.charge=1;this.raw=this.end;this.complete=true;}
      return this.snapshot();
    }
    snapshot(){
      return{raw:this.raw,charge:this.charge,rate:this.rate,travel:this.travel,
        held:this.held,complete:this.complete};
    }
  }

  return{WorkProgress,ChaseProgress};
});
