/* Character intent is independent of the camera/story clock. All modified poses use the same silhouette solver. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./district.js'),require('./character-geometry.js'),require('./motion.js'),require('./city-map.js'),require('./collision-world.js'));
  else root.FlatlandEncounterInteraction=factory(root.FlatlandDistrict,root.FlatlandCharacters,root.FlatlandMotion,root.FlatlandCityMap,root.FlatlandCollisionWorld);
})(typeof globalThis!=='undefined'?globalThis:this,function(District,C,Motion,CityMap,CollisionWorld){
  'use strict';
  const familyEnd=13.7,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=u=>{u=clamp(u);return u*u*(3-2*u);};
  const shortest=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function blend(a,b,u){const body={...b};for(const key of ['x','y','sx','sy','strain','fear','bend','bounce','speed'])body[key]=(a[key]||0)+((b[key]||0)-(a[key]||0))*u;body.angle=(a.angle||0)+shortest(a.angle||0,b.angle||0)*u;return body;}
  class EncounterController{
    constructor(options={}){this.world=new CollisionWorld(CityMap.houseBoundaries);this.seek(options.sceneTime||0);}
    seek(raw=0){
      this.sceneTime=Math.max(0,Number(raw)||0);this.ambient=0;this.action=null;this.wait=0;this.previous=null;this.automatic=false;
      this.epoch=(this.epoch||0)+1;this.appliedEpoch=-1;
      this.stage=this.sceneTime>=familyEnd?'done':this.sceneTime>=6.8?'mother':'father';
      this.shiver=0;this.resistance=0;this.lag=0;this.fatigue=0;this.poke=0;this.lastPoke=-Infinity;
      return this.snapshot();
    }
    activate(target){
      if(this.stage!=='done'){
        if(this.action||target!==this.stage)return false;
        const phaseStart=this.stage==='father'?1.2:6.8,end=this.stage==='father'?6.8:familyEnd,start=Math.min(end,Math.max(phaseStart,this.sceneTime));
        // A workbench scrub resumes the remaining action; only the short body join returns from idle to its route.
        const duration=(target==='father'?1.75:2.45)*(end-start)/(end-phaseStart);
        this.action={target,elapsed:0,start,end,duration:Math.max(.001,duration),from:this.previous?.hero?.body};this.wait=0;this.epoch++;return true;
      }
      if(target==='authority'&&this.sceneTime>=familyEnd&&this.sceneTime<District.timing.firstMove){this.shiver=.58;this.epoch++;return true;}
      if(target==='escort'&&this.sceneTime>=District.timing.firstMove&&this.sceneTime<54&&this.fatigue<4.2){
        this.resistance=Math.min(.9,this.resistance+.26);this.fatigue+=.27;this.epoch++;return true;
      }
      return false;
    }
    tick(delta,options={}){
      const dt=clamp(Number(delta)||0,0,.1);this.ambient+=dt;this.wait+=dt;this.epoch++;
      this.automatic=!!options.automatic;
      this.shiver=Math.max(0,this.shiver-dt);this.poke=Math.max(0,this.poke-dt);
      if(this.automatic&&Number.isFinite(options.sceneTime)){
        this.sceneTime=Math.max(0,options.sceneTime);this.stage=this.sceneTime>=familyEnd?'done':this.sceneTime>=6.8?'mother':'father';this.action=null;return this.snapshot();
      }
      if(this.stage!=='done'){
        if(!this.action&&options.automatic&&this.wait>.4)this.activate(this.stage);
        if(this.action){
          const action=this.action;action.elapsed+=dt;
          const before=this.sceneTime,contact=Motion.contactTimes[action.target]*Motion.duration;
          this.sceneTime=action.start+(action.end-action.start)*clamp((action.elapsed-.24)/action.duration);
          if(!action.touched&&before<contact&&this.sceneTime>=contact){this.sceneTime=contact;action.touched=true;}
          if(action.elapsed>=action.duration+.24-1e-8){this.sceneTime=action.end;this.stage=action.target==='father'?'mother':'done';this.action=null;this.wait=0;}
        }
      }else{
        if(Number.isFinite(options.sceneTime))this.sceneTime=Math.max(familyEnd,options.sceneTime);
        const resisting=this.resistance>0&&this.sceneTime<54&&this.fatigue<4.2;
        this.resistance=Math.max(0,this.resistance-dt);
        const before=this.lag;
        this.lag=resisting?Math.min(1.15,this.lag+dt*3.8):Math.max(0,this.lag-dt*.95);
        if(resisting)this.fatigue+=dt*.4;
        if(before>this.lag&&before>.12&&this.poke===0)this.poke=.22;
        if(this.sceneTime>=54){this.lag=Math.min(this.lag,Math.max(0,58-this.sceneTime)*.18);this.resistance=0;}
      }
      return this.snapshot();
    }
    snapshot(){return{sceneTime:this.sceneTime,familyWaiting:this.stage!=='done'&&!this.action,familyDone:this.stage==='done',familyTarget:this.stage==='done'?null:this.stage,effects:{shiver:this.shiver,resistance:this.resistance,lag:this.lag,fatigue:this.fatigue,poke:this.poke}};}
    applyFrame(input){
      if(!input?.actors)return input;
      if(this.sceneTime>=58)return input;
      if(this.previous&&this.appliedEpoch===this.epoch&&this.appliedTime===input.time)return this.previous;
      const frame={...input,actors:input.actors.map(entry=>({...entry,body:{...entry.body}}))},hero=frame.actors.find(entry=>entry.id==='hero');
      if(!hero)return frame;
      if(this.stage!=='done'&&!this.automatic){
        if(this.action&&this.action.elapsed<.24&&this.action.from){
          const destination=District.frame(this.action.start).hero.body;
          hero.body=blend(this.action.from,destination,ease(this.action.elapsed/.24));
        }else if(!this.action){
          const t=this.ambient,base=District.frame(this.sceneTime).hero.body;
          hero.body={...base,x:base.x+14*Math.sin(t*.62),y:base.y+19*Math.sin(t*.47),angle:base.angle+.2*Math.sin(t*.75),speed:12,strain:.08};
          hero.emotion='curiosity';hero.emotionElapsed=t%1.6;hero.emotionDuration=1.6;hero.emotionStrength=.6;
        }
      }else if(this.sceneTime<58){
        if(this.shiver>0){const age=.58-this.shiver;hero.body.x+=5*Math.sin(age*78)*Math.sin(Math.PI*age/.58);hero.body.edgeBends=C.actors.child.vertices.map((_,i)=>.25+.12*Math.sin(age*54+i));hero.body.fear=.35;}
        if(this.sceneTime>=District.timing.firstMove&&this.lag>0){
          const delayed=District.frame(Math.max(District.timing.firstMove,this.sceneTime-this.lag)).hero.body;
          hero.body={...delayed,bend:Math.max(delayed.bend||0,this.resistance>0?.28:0),fear:this.resistance>0?.4:delayed.fear};
          if(this.resistance>0){hero.body.angle+=.14*Math.sin(this.ambient*29);hero.body.strain=.28;}
          const inspector=frame.actors.find(entry=>entry.id==='inspector');
          if(inspector){const head=inspector.actor.headAxis(inspector.body);inspector.body.angle+=shortest(inspector.body.angle,Math.atan2(hero.body.y-inspector.body.y,hero.body.x-inspector.body.x)-head.angle)*clamp(this.lag/.2);}
          const guard=frame.actors.find(entry=>entry.id==='guard-2');
          if(guard&&this.resistance<=0&&this.lag>.12){
            const direction=Math.atan2(hero.body.y-guard.body.y,hero.body.x-guard.body.x),axis=guard.actor.headAxis(guard.body);
            guard.body.angle=direction-axis.angle;
            // Advance the guard tip only as far as actual contact, without crossing the child silhouette.
            const start={...guard.body},distance=Math.hypot(hero.body.x-start.x,hero.body.y-start.y),shape=hero.actor.outline(hero.body);let low=0,high=distance;
            for(let i=0;i<20;i++){const mid=(low+high)/2,body={...start,x:start.x+Math.cos(direction)*mid,y:start.y+Math.sin(direction)*mid};if(C.penetrates(guard.actor.outline(body),shape))high=mid;else low=mid;}
            const amount=Math.min(low,28);guard.body.x+=Math.cos(direction)*amount;guard.body.y+=Math.sin(direction)*amount;
          }
        }
      }
      // Preserve previous reservations across real-time idle and reaction frames; no drawing-only collision approximation.
      const previous=this.previous?.actors||frame.actors;
      frame.actors=this.world.resolve(previous,frame.actors);
      const resolved=frame.actors.find(entry=>entry.id==='hero');
      if(this.lag>.1&&this.resistance<=0){
        const silhouette=resolved.actor.outline(resolved.body),contact=frame.actors.some(entry=>/^guard-/.test(entry.id)&&C.distance(silhouette,entry.actor.outline(entry.body))<.25);
        if(contact)this.lastPoke=this.ambient;
      }
      if(this.ambient-this.lastPoke<.55)Object.assign(resolved,{emotion:'exclamation',emotionElapsed:this.ambient-this.lastPoke,emotionDuration:.55,emotionStrength:1.1});
      frame.hero={...input.hero,...resolved.body,body:resolved.body};
      this.previous=frame;this.appliedEpoch=this.epoch;this.appliedTime=input.time;return frame;
    }
  }
  return{EncounterController,familyEnd};
});
