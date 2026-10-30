import {test} from 'node:test';import assert from 'node:assert/strict';import {karambitPose,KARAMBIT_DRAW_SECONDS} from '../karambit-rules.mjs';
test('draw visibly extends a folded blade and settles at every frame rate',()=>{
 assert.equal(karambitPose({draw:0}).extension,0);assert.equal(karambitPose({draw:0}).hinge,-2.25);let previous=0;
 for(let i=0;i<=100;i++){const p=karambitPose({draw:i/100});assert(p.extension>=previous);previous=p.extension;}
 for(const fps of [30,60,144]){let time=0;while(time<KARAMBIT_DRAW_SECONDS)time+=1/fps;const p=karambitPose({draw:time/KARAMBIT_DRAW_SECONDS});assert.equal(p.extension,1);assert.equal(p.hinge,0);}
});
test('inspection turns twice about the ring and returns to its original orientation',()=>{
 const start=karambitPose({inspect:0}),middle=karambitPose({inspect:.5}),end=karambitPose({inspect:1});assert(middle.spin>Math.PI);assert.equal(end.spin,Math.PI*4);assert.deepEqual(end.position,start.position);assert(Math.abs(Math.cos(end.rotation[2])-Math.cos(start.rotation[2]))<1e-10);
});
