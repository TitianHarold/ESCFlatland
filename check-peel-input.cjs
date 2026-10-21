'use strict';
const assert=require('node:assert/strict'),B=require('./docs/factory-routine.js');
const hero=t=>B.frame(t).actors.find(entry=>entry.id==='hero');
B.setPeelState([0,0,0,0,0]);
for(const t of[119,124,127,131.5]){const e=hero(t);assert.deepEqual(e.routine.release,[0,0,0,0,0],'time alone cannot peel the interactive shell');assert.deepEqual(e.routine.paint,[1,1,1,1,1]);}
B.setPeelState([0,.5,0,0,0]);let e=hero(127);assert.deepEqual(e.routine.release,[0,.5,0,0,0]);assert.deepEqual(e.routine.paint,[1,.5,1,1,1],'only the clicked side reveals its inner color');
B.setPeelState([0,1,0,0,0]);const controlled=hero(129);assert.deepEqual(controlled.routine.paint,[1,0,1,1,1]);
B.setPeelState([1,1,1,1,1]);assert.deepEqual(hero(129).routine.paint,[0,0,0,0,0]);
B.setPeelState(null);const automatic=hero(129);assert.deepEqual(automatic.body,controlled.body,'input peeling preserves the established chase movement');assert.deepEqual(hero(119).routine.release,[0,0,0,0,0]);assert(hero(125).routine.release.some(v=>v>0),'automatic preview still demonstrates sequential peeling');
console.log('Interactive shell peeling is per click, cumulative and independent of chase time; automatic peeling and hero movement are preserved.');
