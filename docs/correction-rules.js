/* Rigid shells constrain the press; only the inner window accumulates material damage. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandCorrectionRules=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(1,n));
  // The hero resists the same twelve-turn treatment; the spin dose is never capped.
  const materials=Object.freeze({ordinary:Object.freeze({pressureResistance:1.12,mixResistance:.8}),hero:Object.freeze({pressureResistance:3.7,mixResistance:12.5})});
  function pressProgram(actor,body,config={}){
    const normal=config.normal||[0,1],center=config.center||[body.x,body.y],outline=actor.outline(body);
    const projection=outline.map(([x,y])=>(x-center[0])*normal[0]+(y-center[1])*normal[1]);
    const supportMin=Math.min(...projection),supportMax=Math.max(...projection),supportMid=(supportMin+supportMax)/2,half=(supportMax-supportMin)/2;
    const contactPoints=Object.freeze([outline[projection.indexOf(supportMin)],outline[projection.indexOf(supportMax)]].map(point=>Object.freeze([...point])));
    const openGap=config.openGap??92,targetGap=config.targetGap??22,standbyGap=config.standbyGap??Math.max(64,half+8);
    const windupDuration=config.windupDuration??1,strikeDuration=config.strikeDuration??.2,impactDuration=config.impactDuration??.07,holdDuration=config.holdDuration??.6,releaseDuration=config.releaseDuration??.43,pauseDuration=config.pauseDuration??.1,cycleCount=config.cycles??2;
    if(!(openGap>=standbyGap&&standbyGap>half&&targetGap<half))throw new Error('The press must open outside the shell and plan to load past both support faces.');
    if(!Number.isInteger(cycleCount)||cycleCount<1||[pauseDuration,windupDuration,holdDuration].some(value=>value<0)||[strikeDuration,impactDuration,releaseDuration].some(value=>!(value>0)))throw new Error('Each press round needs positive travel phases and nonnegative waits.');
    const start=config.startTime??((config.contactTime??6.2)-windupDuration-strikeDuration),cycleDuration=windupDuration+strikeDuration+impactDuration+holdDuration+releaseDuration;
    const at=value=>Math.round(value*1e9)/1e9;
    const cycles=Object.freeze(Array.from({length:cycleCount},(_,i)=>{
      const begin=at(start+i*(cycleDuration+pauseDuration)),strikeStart=at(begin+windupDuration),contactTime=at(strikeStart+strikeDuration),closeEnd=at(contactTime+impactDuration),holdEnd=at(closeEnd+holdDuration);
      return Object.freeze({index:i+1,start:begin,strikeStart,contactTime,closeEnd,holdEnd,end:at(holdEnd+releaseDuration)});
    }));
    // One unbroken timeline drives both heads and the cumulative material integral.
    const gapFrames=Object.freeze(cycles.flatMap(c=>[[c.start,standbyGap],[c.strikeStart,openGap],[c.contactTime,half],[c.closeEnd,targetGap],[c.holdEnd,targetGap],[c.end,standbyGap]]).map(frame=>Object.freeze(frame)));
    const first=cycles[0],end=cycles.at(-1).end,contactTimes=Object.freeze(cycles.map(c=>c.contactTime));
    const doseTimeScale=config.doseTimeScale??1;if(!(doseTimeScale>0))throw new Error('Pressure time scale must be positive.');
    const clearTime=first.holdEnd+releaseDuration*clamp((half+8-targetGap)/(standbyGap-targetGap));
    return Object.freeze({supportMin,supportMax,supportMid,half,contactPoints,openGap,standbyGap,targetGap,windupDuration,strikeDuration,impactDuration,closeDuration:strikeDuration+impactDuration,holdDuration,releaseDuration,pauseDuration,cycleCount,cycles,contactTimes,contactTime:first.contactTime,start,strikeStart:first.strikeStart,closeEnd:first.closeEnd,holdEnd:first.holdEnd,end,clearTime,doseTimeScale,gapFrames,material:config.material||materials.ordinary});
  }
  function pressSequence(actor,bodies,config={}){
    const interval=config.interval??1.25,start=config.startTime??0;
    const programs=Object.freeze(bodies.map((body,index)=>pressProgram(actor,body,{...config,startTime:start+index*interval,cycles:1})));
    const cycles=Object.freeze(programs.map((program,index)=>Object.freeze({...program.cycles[0],index:index+1,station:index,clearTime:program.clearTime})));
    return Object.freeze({programs,cycles,cycleCount:programs.length,contactTimes:Object.freeze(programs.map(program=>program.contactTime)),contactTime:programs[0].contactTime,start,end:programs.at(-1).end,interval,material:programs[0].material});
  }
  function headDose(support,time,p){
    let dose=0;
    // Integrate the positive constrained overdrive of the exact displayed gap curve.
    // A triangle is clipped at first/last contact, so windup cannot damage the window.
    for(let i=1;i<p.gapFrames.length;i++){
      const [a,ga]=p.gapFrames[i-1],[b,gb]=p.gapFrames[i],dt=Math.max(0,Math.min(time,b)-a);if(!dt)continue;
      const y0=support-ga,y1=support-(ga+(gb-ga)*dt/(b-a));
      if(y0>=0&&y1>=0)dose+=(y0+y1)*dt/2;
      else if(y0>0)dose+=y0*dt*y0/(y0-y1)/2;
      else if(y1>0)dose+=y1*dt*y1/(y1-y0)/2;
    }
    return dose;
  }
  function pressState(program,time){
    if(program.programs){
      const states=program.programs.map(item=>pressState(item,time)),index=Math.max(0,Math.min(states.length-1,Math.floor((time-program.start)/program.interval))),load=states.reduce((sum,state)=>sum+state.load,0);
      return{...states[index],cycle:index+1,cycleCount:states.length,completedCycles:program.programs.filter(item=>time>=item.end).length,load,damage:clamp(load/program.material.pressureResistance),station:index};
    }
    const p=program;let plannedGap=p.standbyGap;
    for(let i=1;i<p.gapFrames.length;i++){const[a,ga]=p.gapFrames[i-1],[b,gb]=p.gapFrames[i];if(time>=a&&time<b){plannedGap=ga+(gb-ga)*(time-a)/(b-a);break;}}
    const upperFace=Math.min(p.supportMid-plannedGap,p.supportMin),lowerFace=Math.max(p.supportMid+plannedGap,p.supportMax);
    const upperGap=p.supportMin-upperFace,lowerGap=lowerFace-p.supportMax,headGap=Math.max(0,upperGap,lowerGap);
    const denominator=p.half-p.targetGap,force=clamp(Math.max(0,p.half-plannedGap)/denominator);
    const load=Math.max(0,headDose(p.half,time,p)/denominator*p.doseTimeScale),contact=headGap<1e-7;
    const active=p.cycles.find(c=>time>=c.start&&time<c.end),completedCycles=p.cycles.filter(c=>time>=c.end).length,cycle=active?.index||completedCycles;
    const phase=!active?(time<p.start?'idle':'open'):time<active.strikeStart?'windup':time<active.contactTime?'strike':time<active.closeEnd?'impact':time<active.holdEnd?'hold':'release';
    const impact=active&&contact&&time>=active.contactTime?Math.max(0,1-(time-active.contactTime)/.22):0;
    return {phase,cycle,cycleCount:p.cycleCount,completedCycles,impact,plannedGap,upperFace,lowerFace,supportMin:p.supportMin,supportMax:p.supportMax,supportMid:p.supportMid,half:p.half,contactPoints:p.contactPoints,upperGap,lowerGap,headGap,contact,force:contact?force:0,load,damage:clamp(load/p.material.pressureResistance),held:phase==='hold'};
  }
  function spinState(time,config={}){
    const start=config.start??0,end=config.end??7,totalTurns=config.turns??12,duration=end-start;
    const acceleration=Math.min(config.acceleration??.28,duration/3),deceleration=Math.min(config.deceleration??.25,duration/3),elapsed=Math.max(0,Math.min(duration,time-start));
    if(!(duration>0&&acceleration>0&&deceleration>0&&Number.isInteger(totalTurns)&&totalTurns>0))throw new Error('A spin needs positive duration, ramps and a whole number of turns.');
    const peak=totalTurns/(duration-(acceleration+deceleration)/2);let travel=0,turnSpeed=0;
    if(elapsed<acceleration){turnSpeed=peak*elapsed/acceleration;travel=peak*elapsed*elapsed/(2*acceleration);}
    else if(elapsed<=duration-deceleration){turnSpeed=peak;travel=peak*(elapsed-acceleration/2);}
    else{const remaining=duration-elapsed;turnSpeed=peak*remaining/deceleration;travel=totalTurns-peak*remaining*remaining/(2*deceleration);}
    const turns=time>=end?totalTurns:travel,phase=time<start?'waiting':time<start+acceleration?'accelerating':time<end-deceleration?'spinning':time<end?'braking':'complete';
    return{phase,turns,angle:turns*Math.PI*2,angularSpeed:turnSpeed*Math.PI*2,turnSpeed,mixDose:turns};
  }
  function mixState(damage,turns,material=materials.ordinary){
    const mixDose=Math.max(0,turns),blacken=clamp(damage*mixDose/material.mixResistance);
    return {mixDose,blacken,windowOpen:1-blacken};
  }
  function judge(state,stamped){const result=state.windowOpen<.015?'pass':'reject';return{result,label:stamped?result:undefined};}
  return {materials,pressProgram,pressSequence,pressState,spinState,mixState,judge};
});
