import{test}from'node:test';import assert from'node:assert/strict';
import{BREACH as B,breachState,breachDeath,resetBreach,flashDuration,inBreachLane}from'../breach-rules.mjs';
import{breachEvent,tickBreach,liveBreachEffects}from'../breach-events.mjs';
const now=300000;
function fixture(){const sockets=[{},{},{}],values=new Map(sockets.map((w,i)=>[w,{joined:true,uid:'p'+i,name:'p'+i,agent:i===0?'breach':'jett',team:i===1?'defend':'attack',hp:100,shield:0,active:true,inRound:true,x:0,y:2.2,z:i===0?0:-5,yaw:0,pitch:0,weapon:'vandal',kills:0,deaths:0}])),events=[],messages=[];const room={meta:{round:{phase:'playing'}},ctx:{storage:{put:async()=>{},setAlarm:async()=>{}}},rounds:{enabled:true,elimination:async()=>{}},spike:{cancel:async()=>{},drop:async()=>{}},sockets:()=>sockets,data:w=>structuredClone(values.get(w)),save:(w,p)=>values.set(w,structuredClone(p)),send:(w,m)=>messages.push({uid:values.get(w).uid,...m}),broadcast:m=>events.push(m.event),snapshot:()=>{},players:()=>[...values.values()]};return{room,sockets,events,messages,cast:(m,n=now,i=0)=>breachEvent(room,sockets[i],room.data(sockets[i]),m,n),patch:(i,v)=>room.save(sockets[i],{...room.data(sockets[i]),...v}),get:i=>room.data(sockets[i])};}
const dir={dx:0,dy:0,dz:-1};
test('Fault Line charges from the server clock, ignores claimed charge/damage, stuns allies and excludes other floors',async()=>{
 const f=fixture();await f.cast({type:'breach_fault',...dir,charge:1});assert.equal(f.room.breachEffects.waves.length,0);
 await f.cast({type:'breach_charge'});await f.cast({type:'breach_fault',...dir,charge:1,damage:999},now+500);const e=f.room.breachEffects.waves[0];assert.equal(e.length,20);assert.equal(f.get(0).breach.eReadyAt,now+500+B.rechargeMs);
 await tickBreach(f.room,e.firesAt-1);assert(!f.get(1).breachConcussUntil);await tickBreach(f.room,e.firesAt);assert(f.get(1).breachConcussUntil>e.firesAt);assert(f.get(2).breachConcussUntil>e.firesAt);assert(!f.get(0).breachConcussUntil);assert.equal(f.get(1).hp,100);
 assert(!inBreachLane({x:0,y:10,z:-5},e));await f.cast({type:'breach_charge'},now+600);assert.equal(f.get(0).breach.chargeAt,0);await f.cast({type:'breach_charge'},now+500+B.rechargeMs);assert(f.get(0).breach.chargeAt);
});
test('Aftershock requires a bounded aimed surface, produces exactly two delayed fixed-damage pulses and credits kills',async()=>{
 const f=fixture();await f.cast({type:'breach_aftershock',...dir,x:40,y:2.2,z:-3});assert.equal(f.room.breachEffects.waves.length,0);
 await f.cast({type:'breach_aftershock',...dir,x:0,y:2.2,z:-3});const e=f.room.breachEffects.waves[0];await f.cast({type:'breach_aftershock',...dir,x:0,y:2.2,z:-3});assert.equal(f.room.breachEffects.waves.length,1);
 await tickBreach(f.room,e.firesAt-1);assert.equal(f.get(1).hp,100);await tickBreach(f.room,e.firesAt);assert.equal(f.get(1).hp,20);assert(f.get(2).hp>70);await tickBreach(f.room,e.firesAt+B.afterInterval);assert.equal(f.get(1).hp,0);assert.equal(f.get(0).kills,1);await tickBreach(f.room,e.firesAt+B.afterInterval+100);assert.equal(f.get(0).kills,1);
});
test('Flashpoint has two charges, uses gaze/range and a single timely exposure report, never claimed duration',async()=>{
 const f=fixture();for(let i=0;i<3;i++)await f.cast({type:'breach_flash',...dir,x:0,y:2.2,z:-3},now+i);assert.equal(f.room.breachEffects.waves.length,2);const e=f.room.breachEffects.waves[0];
 await f.cast({type:'breach_flash_seen',id:e.id},e.firesAt-1,1);assert(!f.get(1).breachFlashUntil);f.patch(1,{yaw:Math.PI});await f.cast({type:'breach_flash_seen',id:e.id,duration:999999},e.firesAt,1);assert.equal(f.get(1).breachFlashUntil,e.firesAt+B.flashMs);
 await f.cast({type:'breach_flash_seen',id:e.id},e.firesAt+100,1);assert.equal(f.get(1).breachFlashUntil,e.firesAt+B.flashMs);f.patch(2,{yaw:0});await f.cast({type:'breach_flash_seen',id:e.id},e.firesAt,2);assert.equal(f.get(2).breachFlashUntil,e.firesAt+B.backFlashMs);
 assert.equal(flashDuration({x:0,y:2.2,z:100},e),0);assert.equal(f.get(1).hp,100);
});
test('Rolling Thunder advances in bands, stuns and lifts each actor once including allies, ignores isolated targets',async()=>{
 const f=fixture();f.patch(1,{z:-22});f.patch(2,{z:-8});await f.cast({type:'breach_ultimate',...dir});const e=f.room.breachEffects.waves[0];await tickBreach(f.room,e.firesAt);assert(!f.get(1).breachConcussUntil);await tickBreach(f.room,e.firesAt+B.ultStep*2);assert(f.get(2).breachConcussUntil>e.firesAt);assert(!f.get(1).breachConcussUntil);await tickBreach(f.room,e.firesAt+B.ultStep*6);assert(f.get(1).breachConcussUntil>e.firesAt);assert.equal(f.messages.filter(m=>m.event?.type==='breach_lift'&&m.uid==='p2').length,1);await f.cast({type:'breach_ultimate',...dir},now+2000);assert.equal(f.room.breachEffects.waves.length,1);assert.equal(f.get(1).hp,100);
 const g=fixture();g.patch(1,{realm:'duel'});await g.cast({type:'breach_ultimate',...dir});await tickBreach(g.room,now+3000);assert(!g.get(1).breachConcussUntil);
});
test('cancel, death, detention and round reset clear charging without refunding used charges',async()=>{
 const f=fixture();await f.cast({type:'breach_charge'});await f.cast({type:'breach_cancel'});assert.equal(f.get(0).breach.chargeAt,0);await f.cast({type:'breach_charge'});f.patch(0,{hp:0});await tickBreach(f.room,now+100);assert.equal(f.get(0).breach.chargeAt,0);
 const p=f.get(0);p.breach.cUsed=1;p.breachConcussUntil=now+1000;breachDeath(p);assert.equal(p.breach.cUsed,1);assert.equal(p.breachConcussUntil,0);resetBreach(p);assert.equal(breachState(p).cUsed,0);
 f.room.meta.round.phase='ending';await f.cast({type:'breach_ultimate',...dir});await tickBreach(f.room,now+200);assert.equal(liveBreachEffects(f.room,now+200).waves.length,0);
});

test('detained casters cannot charge and invulnerable or vertically separated targets ignore shock waves',async()=>{const f=fixture();f.patch(0,{detainedUntil:now+1000});await f.cast({type:'breach_charge'});assert(!f.get(0).breach?.chargeAt);f.patch(0,{detainedUntil:0});await f.cast({type:'breach_charge'});f.patch(0,{detainedUntil:now+1000});await tickBreach(f.room,now+100);assert.equal(f.get(0).breach.chargeAt,0);f.patch(0,{detainedUntil:0});f.patch(1,{agent:'clove',clove:{escapeUntil:now+5000}});f.patch(2,{y:10});await f.cast({type:'breach_ultimate',...dir});await tickBreach(f.room,now+3000);assert(!f.get(1).breachConcussUntil);assert(!f.get(2).breachConcussUntil);});
