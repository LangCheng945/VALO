import {test} from 'node:test';import assert from 'node:assert/strict';
import {bladeRefill,bladeFan} from '../blade-storm-rules.mjs';
import {acceptBladeVolley} from '../multiplayer/blade-volley.mjs';
test('knife kills add three, capped at five; fans contain the remaining knives',()=>{
 assert.equal(bladeRefill(0),3);assert.equal(bladeRefill(1),4);assert.equal(bladeRefill(3),5);assert.equal(bladeRefill(5),5);
 for(let i=1;i<=5;i++){const rays=bladeFan(i);assert.equal(rays.length,i);assert.equal(new Set(rays.map(p=>p.join(','))).size,i);}
});
test('server accepts exactly one ordered five-knife burst and rejects replay/rifle abuse',()=>{
 const id='12345678-1234-1234-1234-123456789abc',p={weapon:'bladestorm',lastShot:0},m=i=>({volley:{id,count:5,index:i}});
 for(let i=0;i<5;i++)assert.equal(acceptBladeVolley(p,m(i),1000),true);
 assert.equal(acceptBladeVolley(p,m(4),1000),false);assert.equal(acceptBladeVolley(p,m(0),1400),false);
 assert.equal(acceptBladeVolley({weapon:'vandal',lastShot:0},m(0),1000),false);
 assert.equal(acceptBladeVolley({weapon:'bladestorm',lastShot:0},{volley:{id,count:6,index:0}},1000),false);
 const q={weapon:'bladestorm',lastShot:0};assert(acceptBladeVolley(q,m(0),1000));assert(!acceptBladeVolley(q,m(2),1000));assert(!acceptBladeVolley(q,m(1),1600));
});
