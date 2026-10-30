import {test} from 'node:test';import assert from 'node:assert/strict';
import {RenderBudget,SoundGroundCache} from '../runtime-performance.mjs';
test('automatic pixel cap and fixed quality modes resize with the window',()=>{
 const r=new RenderBudget();for(const [w,h,d] of [[1920,1080,1],[3840,2160,2],[1280,720,2]])assert(w*h*r.ratio(w,h,d)**2<=1800001);
 r.setMode('performance');assert(3840*2160*r.ratio(3840,2160,2)**2<=921601);
 r.setMode('quality');assert.equal(r.ratio(1920,1080,2),1.5);r.setMode('invalid');assert.equal(r.mode,'auto');
});
test('sustained low FPS reduces work, short hitches and pause do not, recovery is slower',()=>{
 const r=new RenderBudget();for(let i=0;i<50;i++)r.sample(1/30);assert.equal(r.scale,1);
 r.sample(10);for(let i=0;i<100;i++)r.sample(1/60);assert.equal(r.scale,1);
 r.resetSamples();for(let i=0;i<124;i++)r.sample(1/30);assert(r.scale<1);const reduced=r.scale;
 for(let i=0;i<240;i++)r.sample(1/60);assert.equal(r.scale,reduced);
 for(let i=0;i<600;i++)r.sample(1/60);assert(r.scale>reduced);
 for(let i=0;i<4000;i++)r.sample(1/30);assert.equal(r.scale,.6);
 const verySlow=new RenderBudget();for(let i=0;i<200;i++)verySlow.sample(1/8);assert(verySlow.scale<1);
 r.sample(1/30,false);assert.equal(r.elapsed,0);assert.equal(r.slowWindows,0);
 r.setMode('quality');for(let i=0;i<1000;i++)r.sample(1/30);assert.equal(r.scale,1);
});
test('footstep height cache reduces probes but refreshes on movement and height changes',()=>{
 const c=new SoundGroundCache(),a={},p={x:0,y:0,z:0};let calls=0;const q=()=>++calls;
 for(let i=0;i<120;i++)c.get(a,p,1/60,q);assert(calls<=16);assert(calls>1);
 const before=calls;p.y=2;c.get(a,p,0,q);assert.equal(calls,before+1);
 p.x=4;c.get(a,p,0,q);assert.equal(calls,before+2);c.get({},p,0,q);assert.equal(calls,before+3);
});
