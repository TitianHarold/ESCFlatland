/* Character intent is independent of the camera/story clock. All modified poses use the same silhouette solver. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./district.js'),require('./character-geometry.js'),require('./motion.js'),require('./city-map.js'),require('./collision-world.js'),require('./family-navigation.js'));
  else root.FlatlandEncounterInteraction=factory(root.FlatlandDistrict,root.FlatlandCharacters,root.FlatlandMotion,root.FlatlandCityMap,root.FlatlandCollisionWorld,root.FlatlandFamilyNavigation);
})(typeof globalThis!=='undefined'?globalThis:this,function(District,C,Motion,CityMap,CollisionWorld,Navigation){
  'use strict';
  const contactEnd=District.timing.contactEnd,familyEnd=District.timing.familyEnd,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=u=>{u=clamp(u);return u*u*(3-2*u);};
  const shortest=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function blend(a,b,u){const body={...b};for(const key of ['x','y','sx','sy','strain','fear','bend','bounce','speed'])body[key]=(a[key]||0)+((b[key]||0)-(a[key]||0))*u;body.angle=(a.angle||0)+shortest(a.angle||0,b.angle||0)*u;return body;}
  class EncounterController{
    constructor(options={}){this.world=new CollisionWorld(CityMap.houseBoundaries);this.seek(options.sceneTime||0);}
    seek(raw=0){
      this.sceneTime=Math.max(0,Number(raw)||0);this.navigation=null;this.familyBridge=null;this.ambient=0;this.action=null;this.wait=0;this.previous=null;this.automatic=false;
      this.epoch=(this.epoch||0)+1;this.appliedEpoch=-1;
      this.stage=this.sceneTime>=familyEnd?'done':this.sceneTime>=contactEnd?'return':this.sceneTime>=6.8?'mother':'father';
      this.mark=this.markAt(this.sceneTime);this.markAtAmbient=0;
      this.reactions={};this.resistanceFacing=null;this.clickPoker=0;this.shiver=0;this.resistance=0;this.lag=0;this.fatigue=0;this.poke=0;this.lastPoke=-Infinity;
      return this.snapshot();
    }
    ensureFamily(){
      if(this.navigation)return this.navigation;
      const frame=this.previous?.time===this.sceneTime?this.previous:District.frame(this.sceneTime),visited=this.sceneTime>=contactEnd?['father','mother']:this.sceneTime>=6.8?['father']:[];
      this.navigation=new Navigation.FamilyNavigation(frame,{visited,center:District.timing.homeCenter,handoffAngle:District.frame(familyEnd).hero.body.angle});return this.navigation;
    }
    hitTest(point,tolerance=20){return this.stage==='done'?null:this.ensureFamily().hitTest(point,tolerance);}
    activatePoint(point){
      if(this.stage==='done')return false;
      const accepted=this.ensureFamily().activatePoint(point);if(accepted){this.action=this.navigation.intent;this.stage='explore';this.mark=this.navigation.mark;this.markAtAmbient=this.ambient;this.epoch++;}return accepted;
    }
    activate(target){
      if(this.stage!=='done'){
        if(target!=='father'&&target!=='mother')return false;
        const parent=this.ensureFamily().parents.find(p=>p.id===target);return this.activatePoint({x:parent.body.x,y:parent.body.y});
      }
      if(target==='authority'&&this.sceneTime>=familyEnd&&this.sceneTime<District.timing.firstMove){this.shiver=.58;this.mark='exclamation';this.markAtAmbient=this.ambient;this.epoch++;return true;}
      if(target==='escort'&&this.sceneTime>=District.timing.firstMove&&this.sceneTime<54&&this.fatigue<4.2){
        if(this.lag<.03||this.resistanceFacing===null){this.resistanceFacing=this.previous?.hero?.body?.angle??District.frame(this.sceneTime).hero.body.angle;this.clickPoker=this.clickPoker%3+1;}
        this.resistance=Math.min(.9,this.resistance+.26);this.fatigue+=.27;this.mark='exclamation';this.markAtAmbient=this.ambient;this.epoch++;return true;
      }
      return false;
    }
    tick(delta,options={}){
      const dt=clamp(Number(delta)||0,0,.1);this.ambient+=dt;this.wait+=dt;this.epoch++;
      this.automatic=!!options.automatic;
      this.shiver=Math.max(0,this.shiver-dt);this.poke=Math.max(0,this.poke-dt);
      if(this.automatic&&Number.isFinite(options.sceneTime)){
        this.sceneTime=Math.max(0,options.sceneTime);this.stage=this.sceneTime>=familyEnd?'done':this.sceneTime>=contactEnd?'return':this.sceneTime>=6.8?'mother':'father';this.mark=this.markAt(this.sceneTime);this.markAtAmbient=this.ambient-.3;this.action=null;this.reactions={};this.navigation=null;this.familyBridge=null;return this.snapshot();
      }
      if(this.stage!=='done'){
        if(options.advance===false)return this.snapshot();
        const nav=this.ensureFamily();nav.tick(dt);const state=nav.snapshot();
        this.action=nav.intent;this.mark=state.mark;this.markAtAmbient=this.ambient-(state.clock-state.markAt);
        if(state.state==='return'||state.state==='breath'){
          this.stage='return';this.sceneTime=Math.max(this.sceneTime,contactEnd+(familyEnd-contactEnd)*(state.state==='breath'?.8+.2*clamp(state.breathAge/.9):.8*state.returnProgress));
        }else this.sceneTime=Math.max(this.sceneTime,Math.min(contactEnd-.01,state.visited.length*6.8));
        if(state.done){this.stage='done';this.sceneTime=familyEnd;this.familyBridge=state.parents.map(p=>({id:p.id,body:p.body}));}

      }else{
        if(Number.isFinite(options.sceneTime))this.sceneTime=Math.max(familyEnd,options.sceneTime);
        const resisting=this.resistance>0&&this.sceneTime<54&&this.fatigue<4.2;
        this.resistance=Math.max(0,this.resistance-dt);
        this.lag=resisting?Math.min(1.15,this.lag+dt*3.8):Math.max(0,this.lag-dt*.95);
        if(resisting)this.fatigue+=dt*.4;
        if(resisting&&this.resistance===0&&this.lag>.12)this.poke=.22;
        if(this.sceneTime>=54){this.lag=Math.min(this.lag,Math.max(0,58-this.sceneTime)*.18);this.resistance=0;}
      }
      return this.snapshot();
    }
    markAt(time){
      if(time<1.2)return null;
      const father=Motion.contactTimes.father*Motion.duration,mother=Motion.contactTimes.mother*Motion.duration;
      return time<father||time>6.8&&time<mother?'curiosity':'exclamation';
    }
    snapshot(){const family=this.navigation?.snapshot();return{sceneTime:this.sceneTime,familyWaiting:this.stage!=='done'&&(family?family.waiting:this.stage!=='return'&&!this.action),familyDone:this.stage==='done',familyTarget:family?.target||(this.stage==='return'?'return':null),familyVisited:family?.visited||[],familyMoving:family?.moving||false,familyBody:family?.body||null,familyStage:family?.state||null,familyLastContact:family?.lastContact||null,effects:{shiver:this.shiver,resistance:this.resistance,lag:this.lag,fatigue:this.fatigue,poke:this.poke}};}

    applyFrame(input){
      if(!input?.actors)return input;
      if(this.sceneTime>=58)return input;
      if(this.previous&&this.appliedEpoch===this.epoch&&this.appliedTime===input.time)return this.previous;
      const frame={...input,actors:input.actors.map(entry=>({...entry,body:{...entry.body}}))},hero=frame.actors.find(entry=>entry.id==='hero');
      if(!hero)return frame;
      if(this.stage!=='done'&&!this.automatic){
        const family=this.ensureFamily().snapshot();hero.body=family.body;
        for(const source of family.parents){const parent=frame.actors.find(entry=>entry.id===source.id);if(!parent)continue;parent.body=source.body;delete parent.emotion;if(source.reactionAge!==undefined&&source.reactionAge<1.25)Object.assign(parent,{emotion:'exclamation',emotionElapsed:source.reactionAge,emotionDuration:1.25,emotionStrength:.9});}
      }else if(this.sceneTime<58){
        if(this.shiver>0){const age=.58-this.shiver;hero.body.x+=5*Math.sin(age*78)*Math.sin(Math.PI*age/.58);hero.body.edgeBends=C.actors.child.vertices.map((_,i)=>.25+.12*Math.sin(age*54+i));hero.body.fear=.35;}
        if(this.sceneTime>=District.timing.firstMove&&this.lag>0){
          const delayedTime=Math.max(District.timing.firstMove,this.sceneTime-this.lag),delayedFrame=District.frame(delayedTime),delayed=delayedFrame.hero.body;
          const facing=hero.body.angle,locked=this.resistanceFacing??facing;
          hero.body={...delayed,angle:facing+shortest(facing,locked)*clamp(this.lag/.35),bend:Math.max(delayed.bend||0,this.resistance>0?.28:0),fear:this.resistance>0?.4:delayed.fear};
          if(this.resistance>0){hero.body.strain=.28;hero.body.axialStretch=-.07*clamp(this.resistance/.9);}
          const inspector=frame.actors.find(entry=>entry.id==='inspector');
          if(inspector){const head=inspector.actor.headAxis(inspector.body);inspector.body.angle+=shortest(inspector.body.angle,Math.atan2(hero.body.y-inspector.body.y,hero.body.x-inspector.body.x)-head.angle)*clamp(this.lag/.2);}
          const age=.22-this.poke,poker=District.escortProximity(delayedTime,this.clickPoker)>.98?this.clickPoker:2;
          const poke=this.resistance<=0&&this.lag>.12&&this.poke>0?ease(age/.06)*(1-ease((age-.12)/.1)):0;
          for(const guard of frame.actors.filter(entry=>/^guard-/.test(entry.id))){
            const source=delayedFrame.actors.find(entry=>entry.id===guard.id)?.body||guard.body;
            const index=Number(guard.id.slice(-1));guard.body=District.guardCoercion(guard.actor,source,hero.body,index===poker?poke:0,District.escortProximity(delayedTime,index));
          }
        }
      }
      if(this.familyBridge&&!this.automatic&&this.sceneTime<20){const u=ease((this.sceneTime-familyEnd)/(20-familyEnd));for(const source of this.familyBridge){const parent=frame.actors.find(a=>a.id===source.id);if(parent)parent.body=blend(source.body,parent.body,u);}}
      if(this.sceneTime<District.timing.firstMove){
        delete hero.emotion;delete hero.emotionElapsed;delete hero.emotionDuration;delete hero.emotionStrength;
        if(this.mark){hero.emotion=this.mark;hero.emotionElapsed=Math.max(.16,this.ambient-this.markAtAmbient);hero.emotionDuration=1e6;hero.emotionStrength=1;}
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
  return{EncounterController,contactEnd,familyEnd};
});
