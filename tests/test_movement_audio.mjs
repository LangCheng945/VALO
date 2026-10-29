import assert from 'node:assert/strict';import {FootstepTracker} from '../movement-audio.mjs';
const t=new FootstepTracker(),p={x:0,z:0},flags={active:true,grounded:true,quiet:false};
t.update(p,flags);for(let i=0;i<10;i++)assert.equal(t.update(p,flags),null);
p.x=2.3;assert.equal(t.update(p,flags),'step');p.x+=3;assert.equal(t.update(p,{...flags,quiet:true}),null);
p.x+=1;assert.equal(t.update(p,{...flags,grounded:false,verticalSpeed:-7}),null);assert.equal(t.update(p,flags),'land');assert.equal(t.update(p,flags),null);
p.x+=12;assert.equal(t.update(p,flags),null);p.x+=3;assert.equal(t.update(p,{...flags,active:false}),null);assert.equal(t.update(p,flags),null);
console.log('PASS movement audio ignores idle/wall-pushing/quiet movement/air/teleport/pause and plays one landing cue');
