import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);globalThis.THREE=require('../vendor/three.min.js');
const {Vector3}=globalThis.THREE,{BotNavigation}=await import('../bot-navigation.js');
const map={floorCandidates:()=>[0],getGroundHeight:()=>0,collides:()=>false},nav=new BotNavigation(map);
// A temporary Sage wall is absent from static map samples. Every route edge and
// movement must still respect it, and concurrent searches must all make progress.
const wall=p=>p.x>2.4&&p.x<3.6&&Math.abs(p.z)<3.4;
const bots=[-1,0,1].map(z=>({alive:true,speed:5,group:{position:new Vector3(0,0,z)},goal:new Vector3(7,0,z)}));
for(const b of bots)nav.move(b,b.goal,.025,wall);
for(let i=0;i<3;i++)nav.tick(.025);
assert.equal(nav.jobs.size,3);const counts=[...nav.jobs.values()].map(j=>j.count);assert(counts.every(n=>n>0));assert(Math.max(...counts)-Math.min(...counts)<=1);
for(let i=0;i<1800;i++){
 nav.tick(.025);for(const b of bots){nav.move(b,b.goal,.025,wall);assert(!wall(b.group.position),'bot crossed a live Sage wall');}
}
assert(bots.every(b=>b.group.position.distanceTo(b.goal)<1.7));
console.log('PASS concurrent searches share work and all three bots route around a dynamic wall without entering it');
