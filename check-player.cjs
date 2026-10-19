const assert = require('node:assert/strict');
const StoryPlayer = require('./docs/story-player.js');
const Timing=require('./docs/story-timing.js');
const step = (player, seconds) => {for(let i=0;i<Math.round(seconds*100);i++)player.tick(.01);};

const ordinary = new StoryPlayer();
ordinary.press();step(ordinary,1);ordinary.release();
assert(ordinary.playing, 'A slow click starts the whole episode');
const endpoint = ordinary.target;
ordinary.tap();assert.equal(ordinary.target,endpoint,'Extra clicks cannot skip a playing episode');
step(ordinary,1);ordinary.press();step(ordinary,.3);ordinary.release();
assert(ordinary.playing,'Releasing the mouse cannot interrupt an ordinary episode');
step(ordinary,10);
assert.equal(ordinary.time,Timing.playbackAt(6.8),'First episode includes contact and the completed parental reflex');
assert(!ordinary.playing);
ordinary.tap();assert.equal(ordinary.target,Timing.playbackAt(16.0667),'Next episode includes the mother and the immediate intrusion');

const chase = new StoryPlayer();chase.seek(Timing.playbackAt(119));chase.press();step(chase,1);
assert(chase.time>Timing.playbackAt(119)+1.5,'Holding accelerates the chase');
chase.release();const releasedAt=chase.time;step(chase,.5);
assert(chase.playing,'Chase continues after release');
assert(Math.abs(chase.time-releasedAt-.5)<1e-8,'Release restores normal speed');
chase.press();step(chase,20);
assert.equal(chase.time,Timing.playbackAt(132),'Holding cannot spill into the next scene');
chase.release();assert.equal(chase.target,Timing.playbackAt(132));

const auto = new StoryPlayer({mode:'auto',playing:true});step(auto,160);
assert.equal(auto.time,90);assert(!auto.playing);
console.log('Click episodes, release behavior, chase acceleration and autoplay passed.');

for(let t=0;t<=90;t+=.25)assert(Math.abs(Timing.playbackAt(Timing.sceneAt(t))-t)<1e-8,'Edit clock round trips');
