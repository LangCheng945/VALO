import {test} from 'node:test';import assert from 'node:assert/strict';import {GameRoom} from '../worker.mjs';import {SPIKE} from '../spike.mjs';import {MAP_SITES,MAP_SCALE,spikeSite} from '../map-sites.mjs';
async function setup(){
 const values=new Map(),sockets=[],ctx={getWebSockets:()=>sockets,blockConcurrencyWhile:fn=>fn(),storage:{get:async k=>values.get(k),put:async(k,v)=>values.set(k,structuredClone(v)),delete:async k=>{for(const key of Array.isArray(k)?k:[k])values.delete(key);},setAlarm:async()=>{},list:async()=>new Map()}};
 const room=new GameRoom(ctx,{});await room.ready;await room.fetch(new Request('https://internal/create',{method:'POST',body:JSON.stringify({mode:'rounds',map:'ascent'})}));
 function add(uid,team){let data={uid,team,name:uid,joined:true,active:true,hp:100,shield:50,kills:0,deaths:0,inRound:true,mapPending:false,agent:'jett',weapon:'vandal',x:-88,y:8.2,z:-80,yaw:0},messages=[];const ws={readyState:1,deserializeAttachment:()=>structuredClone(data),serializeAttachment:p=>{data=structuredClone(p)},send:s=>messages.push(JSON.parse(s))};sockets.push(ws);return {ws,messages};}
 const a=add('a','attack'),b=add('b','defend');await room.spike.ensureCarrier();room.meta.round.phase='playing';room.meta.round.endsAt=Date.now()+300000;const h={room,a,b,add,values,ctx,now:Date.now()};
 h.send=async(peer,m)=>room.spike.handle(peer.ws,room.data(peer.ws),{...m,id:room.spike.state().id},h.now);
 h.hold=async(peer,action,ms)=>{await h.send(peer,{type:'spike_action',action});for(let time=0;time<ms;){const step=Math.min(200,ms-time);time+=step;h.now+=step;await h.send(peer,{type:'spike_action',action});await room.spike.tick(h.now);}};
 return h;
}
test('all map site coordinates are shared and unknown maps reject planting',()=>{for(const [map,sites]of Object.entries(MAP_SITES))for(const s of sites)assert.equal(spikeSite(map,{x:(s.minX+s.maxX)/2*MAP_SCALE,z:(s.minZ+s.maxZ)/2*MAP_SCALE}),s.name);assert.equal(spikeSite('ascent',{x:0,z:0}),null);assert.equal(spikeSite('invalid',{x:0,z:0}),null);});
test('carrier/side/site are checked; hold requires fresh input and movement cancels planting',async()=>{
 const h=await setup(),{room,a,b}=h;assert.equal(room.spike.state().carrierUid,'a');await h.send(b,{type:'spike_action',action:'plant'});assert(b.messages.some(m=>m.type==='spike_error'));
 const p=room.data(a.ws);p.x=0;p.z=0;room.save(a.ws,p);await h.send(a,{type:'spike_action',action:'plant'});assert.equal(room.spike.state().action,null);
 p.x=-88;p.z=-80;room.save(a.ws,p);await h.send(a,{type:'spike_action',action:'plant'});h.now+=4000;await room.spike.tick(h.now);assert.equal(room.spike.state().phase,'carried');assert.equal(room.spike.state().action,null);
 await h.hold(a,'plant',1000);p.x+=1;room.save(a.ws,p);await room.spike.onState(p,h.now);assert.equal(room.spike.state().action,null);await room.spike.tick(h.now+5000);assert.equal(room.spike.state().phase,'carried');
});
test('dropping, automatic teammate pickup, enemy rejection and death/disconnect drop preserve one Spike',async()=>{
 const h=await setup(),{room,a,b}=h,c=h.add('c','attack');await h.send(a,{type:'spike_drop'});assert.equal(room.spike.state().phase,'dropped');await h.send(b,{type:'spike_pickup'});assert.equal(room.spike.state().phase,'dropped');
 await room.spike.onState(room.data(c.ws),h.now);assert.equal(room.spike.state().carrierUid,'c');const dead=room.data(c.ws);dead.hp=0;room.save(c.ws,dead);await room.spike.drop(dead,h.now);assert.equal(room.spike.state().phase,'dropped');h.now+=1500;await h.send(a,{type:'spike_pickup'});assert.equal(room.spike.state().carrierUid,'a');await room.spike.drop(room.data(a.ws),h.now);assert.equal(room.spike.state().carrierUid,null);
});
test('planting takes four server seconds, half defuse persists and a teammate finishes remaining 3.5 seconds',async()=>{
 const h=await setup(),{room,a,b}=h;await h.hold(a,'plant',3800);assert.equal(room.spike.state().phase,'carried');await h.hold(a,'plant',200);assert.equal(room.spike.state().phase,'planted');assert.equal(room.spike.state().explodesAt-room.spike.state().plantedAt,SPIKE.fuseMs);assert.equal(room.meta.round.endsAt,0);
 await h.hold(b,'defuse',3600);await h.send(b,{type:'spike_cancel'});assert.equal(room.spike.state().checkpoint,.5);const d=h.add('d','defend');await h.hold(d,'defuse',3400);assert.equal(room.spike.state().phase,'planted');await h.hold(d,'defuse',100);assert.equal(room.spike.state().phase,'defused');assert.equal(room.meta.round.scoreDefend,1);assert.equal(room.meta.round.phase,'ending');await room.spike.tick(h.now+60000);assert.equal(room.meta.round.scoreDefend,1);assert.equal(room.data(a.ws).hp,100);
});
test('planted Spike survives attacker elimination and reconnect, then kills both teams and spares escaped players once',async()=>{
 const h=await setup(),{room,a,b}=h,c=h.add('c','attack'),far=h.add('far','defend');const safe=room.data(far.ws);safe.x+=62;room.save(far.ws,safe);await h.hold(a,'plant',4000);
 const r2=new GameRoom(h.ctx,{});await r2.ready;assert.equal(r2.spike.state().phase,'planted');assert.equal(r2.spike.state().explodesAt,room.spike.state().explodesAt);
 for(const peer of [a,c]){const p=room.data(peer.ws);p.hp=0;room.save(peer.ws,p);}await room.rounds.elimination();assert.equal(room.meta.round.phase,'playing');for(const peer of [a,c]){const p=room.data(peer.ws);p.hp=100;room.save(peer.ws,p);}
 h.now=room.spike.state().explodesAt;await room.spike.tick(h.now);assert.equal(room.spike.state().phase,'detonated');for(const peer of [a,b,c]){const p=room.data(peer.ws);assert.equal(p.hp,0);assert.equal(p.shield,0);assert.equal(p.deaths,1);assert.equal(p.kills,0);}
 assert.equal(room.data(far.ws).hp,100);assert.equal(room.meta.round.scoreAttack,1);await room.spike.tick(h.now+1000);assert.equal(room.data(b.ws).deaths,1);assert.equal(room.meta.round.scoreAttack,1);assert(b.messages.some(m=>m.type==='damage'&&m.cause==='spike'));
});
test('a late defuse loses to the fuse deadline and an earlier completion wins even with a late alarm',async()=>{
 for(const late of [true,false]){const h=await setup();await h.hold(h.a,'plant',4000);h.now=h.room.spike.state().explodesAt-(late?6900:7100);await h.send(h.b,{type:'spike_action',action:'defuse'});for(let i=0;i<35;i++){h.now+=200;await h.send(h.b,{type:'spike_action',action:'defuse'});}await h.room.spike.tick(h.now+100);assert.equal(h.room.spike.state().phase,late?'detonated':'defused');}
});

test('equipped Spike and active plant channel cannot also deliver firearm damage',async()=>{
 const h=await setup(),{room,a,b}=h;
 const state=held=>({type:'state',x:-88,y:8.2,z:-80,yaw:0,active:true,agent:'jett',weapon:'vandal',shield:50,holdingSpike:held});
 const shot={type:'shot',sx:-88,sy:8.2,sz:-80,ex:-88,ey:7.2,ez:-80};
 await room.webSocketMessage(a.ws,JSON.stringify(state(true)));await room.webSocketMessage(a.ws,JSON.stringify(shot));await room.webSocketMessage(a.ws,JSON.stringify({type:'hit',targetUid:'b',isHead:true}));assert.equal(room.data(b.ws).hp,100);assert(!b.messages.some(m=>m.event?.type==='shot'));
 await room.webSocketMessage(a.ws,JSON.stringify(state(false)));await h.send(a,{type:'spike_action',action:'plant'});await room.webSocketMessage(a.ws,JSON.stringify(shot));await room.webSocketMessage(a.ws,JSON.stringify({type:'hit',targetUid:'b',isHead:true}));assert.equal(room.data(b.ws).hp,100);
});
