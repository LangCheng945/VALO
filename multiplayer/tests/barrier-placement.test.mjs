import {test} from 'node:test';
import assert from 'node:assert/strict';
import {barrierEvent} from '../barriers.mjs';
function fixture(){
 const p={uid:'sage',agent:'phoenix',hp:100,active:true,cUsed:0,x:0,y:2.2,z:0},messages=[],events=[];
 const room={rounds:{enabled:false},meta:{},barriers:[],players:()=>[p],save:()=>{},send:(_,m)=>messages.push(m),broadcast:m=>events.push(m),ctx:{storage:{put:async()=>{},setAlarm:async()=>{}}}};
 return{p,room,messages,events,place:m=>barrierEvent(room,{},p,{type:'wall',x:0,y:0,z:0,yaw:0,...m},1000)};
}
test('grounded Sage can raise a supported wall beneath herself; blocked sections stay absent',async()=>{
 const h=fixture();await h.place({segments:[true,false,true,false]});assert.equal(h.p.cUsed,1);assert.deepEqual(h.room.barriers[0].hp,[400,0,400,0]);assert.equal(h.messages.length,0);
});
test('empty or malformed support masks never consume a wall charge',async()=>{
 for(const segments of [[false,false,false,false],[true],['yes',true,true,true],null]){const h=fixture();await h.place({segments});assert.equal(h.p.cUsed,0);assert.equal(h.room.barriers.length,0);assert.equal(h.messages[0].type,'ability_error');}
});
test('raised and lower floors use actual three-dimensional casting distance, not a four-unit height cap',async()=>{
 const h=fixture();await h.place({x:0,y:6,z:2});assert.equal(h.room.barriers.length,1);
 const far=fixture();await far.place({x:8,y:8,z:0});assert.equal(far.p.cUsed,0);assert.equal(far.messages[0].type,'ability_error');
});
test('a wall cannot embed a standing player from a different floor into its middle',async()=>{
 const h=fixture();h.p.y=4.2;await h.place({});assert.equal(h.p.cUsed,0);assert.equal(h.messages[0].type,'ability_error');
});
