const assert=require('node:assert/strict');
const StoryPlayer=require('./docs/story-player.js');
const timing={duration:20,playbackAt:raw=>raw/10};
const make=options=>new StoryPlayer({timing,beats:[5,10,20],...options});
const step=(player,seconds,ceiling)=>{for(let i=0;i<seconds*100;i++)player.tick(.01,ceiling);};

const discovery=make();
discovery.seek(2);discovery.tap();
step(discovery,20,3);
assert.equal(discovery.time,3,'Story time holds while the inner scene awaits discovery');
assert.equal(discovery.target,5);assert(discovery.playing,'The held episode stays active');
step(discovery,1,2);
assert.equal(discovery.time,3,'A lower ceiling cannot rewind an already advanced scene');
step(discovery,.5);
assert(Math.abs(discovery.time-3.5)<1e-9,'Removing the ceiling resumes the same episode');
step(discovery,5,5);
assert.equal(discovery.time,5);assert(discovery.playing,'A ceiling at the episode endpoint holds completion too');
assert.equal(discovery.target,5);
discovery.tick(.01);
assert.equal(discovery.time,5);assert(!discovery.playing,'Releasing an endpoint ceiling completes the episode');

const auto=make({mode:'auto',playing:true});
step(auto,30,7);
assert.equal(auto.time,7);assert(auto.playing);
step(auto,1);
assert(Math.abs(auto.time-8)<1e-9,'Autoplay resumes after its ceiling is released');
step(auto,30,20);assert.equal(auto.time,20);assert(auto.playing);
auto.tick(.01);assert(!auto.playing);

const paused=make();paused.seek(4);paused.tap();step(paused,2,4.5);
paused.playing=false;step(paused,2);assert.equal(paused.time,4.5,'Explicit pause survives ceiling release');
paused.seek(8);assert.equal(paused.target,8);assert(!paused.playing);
paused.setMode('auto');step(paused,2,8.5);assert.equal(paused.time,8.5);assert(paused.playing);
paused.setMode('interactive');assert(!paused.playing);assert.equal(paused.target,8.5);
paused.tap();step(paused,3);assert.equal(paused.time,10);assert(!paused.playing);

const chase=make();chase.seek(timing.playbackAt(119));chase.press();
step(chase,1,12);const rate=chase.chaseRate;
assert(rate>1.79);assert.equal(chase.time,12);assert(chase.playing&&chase.pressed);
chase.tick(.01,12);assert(chase.chaseRate>=rate,'A ceiling does not reset the chase rate');
chase.tick(.01);assert(chase.time>12,'The accelerated chase continues from the held position');
chase.release();assert(chase.playing);

console.log('Inner scene playback ceilings hold and resume episodes, autoplay and chase input without rewinding or overriding pause.');
