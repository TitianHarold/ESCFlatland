/* Rigid shells constrain the press; only the inner window accumulates material damage. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FlatlandCorrectionRules=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=n=>Math.max(0,Math.min(1,n));
  const materials=Object.freeze({ordinary:Object.freeze({pressureResistance:1.12,mixResistance:.8}),hero:Object.freeze({pressureResistance:3.7,mixResistance:2.3})});
  function pressProgram(actor,body,config={}){
    const normal=config.normal||[0,1],center=config.center||[body.x,body.y],outline=actor.outline(body);
    const projection=outline.map(([x,y])=>(x-center[0])*normal[0]+(y-center[1])*normal[1]);
    const supportMin=Math.min(...projection),supportMax=Math.max(...projection),supportMid=(supportMin+supportMax)/2,half=(supportMax-supportMin)/2;
    const openGap=config.openGap??92,targetGap=config.targetGap??22,closeDuration=config.closeDuration??2,holdDuration=config.holdDuration??.8,releaseDuration=config.releaseDuration??1.2;
    if(!(openGap>half&&targetGap<half))throw new Error('The press must start outside the shell and plan to close past both support faces.');
    const contactTime=config.contactTime??7,start=contactTime-closeDuration*(openGap-half)/(openGap-targetGap),closeEnd=start+closeDuration,holdEnd=closeEnd+holdDuration;
    return Object.freeze({supportMin,supportMax,supportMid,half,openGap,targetGap,closeDuration,holdDuration,releaseDuration,contactTime,start,closeEnd,holdEnd,end:holdEnd+releaseDuration,material:config.material||materials.ordinary});
  }
  function headDose(support,time,p){
    const downRate=(p.openGap-p.targetGap)/p.closeDuration,upRate=(p.openGap-p.targetGap)/p.releaseDuration;
    const down=Math.max(0,Math.min(p.closeDuration,time-p.start)-(p.openGap-support)/downRate);
    const hold=Math.max(0,Math.min(p.holdDuration,time-p.closeEnd));
    const release=Math.max(0,Math.min(time-p.holdEnd,(support-p.targetGap)/upRate));
    return .5*downRate*down*down+Math.max(0,support-p.targetGap)*hold+Math.max(0,support-p.targetGap)*release-.5*upRate*release*release;
  }
  function pressState(program,time){
    const p=program;let plannedGap=p.openGap;
    if(time>=p.start&&time<p.closeEnd)plannedGap=p.openGap-(p.openGap-p.targetGap)*(time-p.start)/p.closeDuration;
    else if(time>=p.closeEnd&&time<p.holdEnd)plannedGap=p.targetGap;
    else if(time>=p.holdEnd&&time<p.end)plannedGap=p.targetGap+(p.openGap-p.targetGap)*(time-p.holdEnd)/p.releaseDuration;
    const upperFace=Math.min(p.supportMid-plannedGap,p.supportMin),lowerFace=Math.max(p.supportMid+plannedGap,p.supportMax);
    const upperGap=p.supportMin-upperFace,lowerGap=lowerFace-p.supportMax,headGap=Math.max(0,upperGap,lowerGap);
    const denominator=p.half-p.targetGap,force=clamp(Math.max(0,p.half-plannedGap)/denominator);
    const load=Math.max(0,headDose(p.half,time,p)/denominator),contact=headGap<1e-7;
    return {plannedGap,upperFace,lowerFace,supportMin:p.supportMin,supportMax:p.supportMax,supportMid:p.supportMid,half:p.half,upperGap,lowerGap,headGap,contact,force:contact?force:0,load,damage:clamp(load/p.material.pressureResistance),held:time>=p.closeEnd&&time<p.holdEnd};
  }
  function mixState(damage,turns,material=materials.ordinary){
    const mixDose=Math.max(0,turns),blacken=clamp(damage*mixDose/material.mixResistance);
    return {mixDose,blacken,windowOpen:1-blacken};
  }
  function judge(state,stamped){const result=state.windowOpen<.015?'pass':'reject';return{result,label:stamped?result:undefined};}
  return {materials,pressProgram,pressState,mixState,judge};
});
