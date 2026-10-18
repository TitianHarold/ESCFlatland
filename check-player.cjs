const assert = require('node:assert/strict');
const StoryPlayer = require('./docs/story-player.js');
const step = (player, seconds) => {for(let i=0;i<Math.round(seconds*100);i++)player.tick(.01);};

const ordinary = new StoryPlayer();
ordinary.press();step(ordinary,1);ordinary.release();
assert(ordinary.playing, 'A slow click starts the whole episode');
const endpoint = ordinary.target;
ordinary.tap();assert.equal(ordinary.target,endpoint,'Extra clicks cannot skip a playing episode');
step(ordinary,1);ordinary.press();step(ordinary,.3);ordinary.release();
assert(ordinary.playing,'Releasing the mouse cannot interrupt an ordinary episode');
step(ordinary,10);
assert.equal(ordinary.time,6.8,'First episode includes contact and the completed parental reflex');
assert(!ordinary.playing);
ordinary.tap();assert.equal(ordinary.target,16.0667,'Next episode includes the mother and the immediate intrusion');

const chase = new StoryPlayer();chase.seek(119);chase.press();step(chase,1);
assert(chase.time>120.5,'Holding accelerates the chase');
chase.release();const releasedAt=chase.time;step(chase,.5);
assert(chase.playing,'Chase continues after release');
assert(Math.abs(chase.time-releasedAt-.5)<1e-8,'Release restores normal speed');
chase.press();step(chase,20);
assert.equal(chase.time,132,'Holding cannot spill into the next scene');
chase.release();assert.equal(chase.target,132);

const auto = new StoryPlayer({mode:'auto',playing:true});step(auto,160);
assert.equal(auto.time,158);assert(!auto.playing);
console.log('Click episodes, release behavior, chase acceleration and autoplay passed.');
