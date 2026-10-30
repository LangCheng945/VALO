import {test} from 'node:test';import assert from 'node:assert/strict';
import {spectatorCandidates,pickSpectatorTarget} from '../spectator-rules.mjs';
test('spectating only selects alive, active teammates and excludes self/enemies',()=>{
 const list=[{uid:'self',team:'attack',hp:0},{uid:'ally',team:'attack',hp:100},{uid:'enemy',team:'defend',hp:100},{uid:'dead',team:'attack',hp:0},{uid:'menu',team:'attack',hp:100,active:false}];
 assert.deepEqual(spectatorCandidates(list,{uid:'self',team:'attack'}).map(p=>p.uid),['ally']);
});
test('cycling wraps in both directions and handles death and disconnect',()=>{
 const list=[{uid:'a'},{uid:'b'},{uid:'c'}];assert.equal(pickSpectatorTarget(list,null),'a');assert.equal(pickSpectatorTarget(list,'a',-1),'c');assert.equal(pickSpectatorTarget(list,'c',1),'a');assert.equal(pickSpectatorTarget(list,'b'),'b');assert.equal(pickSpectatorTarget([{uid:'c'}],'b'),'c');assert.equal(pickSpectatorTarget([],null),null);
});
