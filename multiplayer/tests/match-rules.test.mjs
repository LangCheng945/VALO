import {test} from 'node:test';import assert from 'node:assert/strict';
import {matchWinner,isOvertime,choosePublicMap} from '../match-rules.mjs';
import {GameRoom} from '../worker.mjs';import {MAP_IDS} from '../protocol.mjs';
test('regulation and win-by-two overtime: 13:0, 13:11, 13:12, 14:12, 15:13 and long ties',()=>{
 for(const [a,d,w]of [[12,0,null],[12,11,null],[12,12,null],[13,0,'attack'],[13,11,'attack'],[13,12,null],[12,13,null],[13,13,null],[14,12,'attack'],[13,15,'defend'],[24,24,null],[25,24,null],[26,24,'attack']])assert.equal(matchWinner(a,d),w,`${a}:${d}`);
 assert.equal(isOvertime(12,12),true);assert.equal(isOvertime(13,11),false);
 for(const score of [-1,NaN,Infinity,12.5,'13'])assert.equal(matchWinner(score,0),null);
});
test('all public maps can be selected, and next matches exclude the previous map',()=>{
 for(let i=0;i<MAP_IDS.length;i++)assert.equal(choosePublicMap(MAP_IDS,null,()=>i/MAP_IDS.length),MAP_IDS[i]);
 for(const old of MAP_IDS)for(const rng of [0,.3,.6,.999999])assert.notEqual(choosePublicMap(MAP_IDS,old,()=>rng),old);
});
async function harness(publicRoom=false){
 const values=new Map(),sockets=[],ctx={getWebSockets:()=>sockets,blockConcurrencyWhile:fn=>fn(),storage:{get:async k=>values.get(k),put:async(k,v)=>values.set(k,structuredClone(v)),delete:async k=>{for(const key of Array.isArray(k)?k:[k])values.delete(key);},setAlarm:async()=>{},list:async()=>new Map()}};
 const room=new GameRoom(ctx,{});await room.ready;await room.fetch(new Request('https://internal/create',{method:'POST',body:JSON.stringify({mode:'rounds',public:publicRoom})}));
 function add(uid,team){const messages=[];let data={uid,team,joined:true,mapChange:true,mapEpoch:0,roundNumber:1,hp:100,shield:50,agent:'phoenix',weapon:'vandal',active:true,inRound:true,ultUsed:false,cUsed:0,qUsed:0,kills:0,deaths:0,lastSeen:Date.now(),windowAt:Date.now(),messages:0,x:0,y:4.8,z:0,resumeToken:uid.padEnd(64,'a')};const ws={readyState:1,deserializeAttachment:()=>structuredClone(data),serializeAttachment:v=>{data=structuredClone(v);},send:s=>messages.push(JSON.parse(s)),close(){this.readyState=3;}};sockets.push(ws);return {ws,messages};}
 const a=add('a','attack'),b=add('b','defend');room.meta.hostUid='a';return {room,a,b,values};
}
test('whole match finishes once, blocks combat and resurrection, never spawns another round, and host can restart',async()=>{
 const {room,a,b}=await harness();Object.assign(room.meta.round,{phase:'playing',scoreAttack:12,scoreDefend:11});
 await room.rounds.finish('attack','test');assert.equal(room.meta.round.phase,'finished');assert.equal(room.meta.round.matchWinner,'attack');assert.equal(room.meta.round.nextAt,0);
 await room.rounds.finish('attack','duplicate');assert.equal(room.meta.round.scoreAttack,13);
 await room.rounds.alarm(Date.now()+1000000);assert.equal(room.meta.round.phase,'finished');assert(!a.messages.some(m=>m.type==='spawn'));
 const before=room.data(a.ws);await room.webSocketMessage(a.ws,JSON.stringify({type:'state',x:100,y:4.8,z:0,yaw:0,active:true}));assert.equal(room.data(a.ws).x,before.x);assert.equal(room.data(a.ws).active,false);
 await room.webSocketMessage(a.ws,JSON.stringify({type:'shot',sx:0,sy:4.8,sz:0,ex:0,ey:3.8,ez:0}));await room.webSocketMessage(a.ws,JSON.stringify({type:'hit',targetUid:'b',isHead:true}));assert.equal(room.data(b.ws).hp,100);
 await room.rounds.revive(a.ws,room.data(a.ws),'b');assert(a.messages.some(m=>m.type==='ability_error'));
 await room.webSocketMessage(b.ws,JSON.stringify({type:'match_restart'}));assert.equal(room.meta.round.phase,'finished');
 await room.webSocketMessage(a.ws,JSON.stringify({type:'match_restart'}));assert.equal(room.meta.round.phase,'waiting');assert.equal(room.meta.round.scoreAttack,0);assert(a.messages.some(m=>m.type==='map_changed'));assert.equal(room.data(a.ws).uid,'a');
});
test('12:12 overtime continues through 13:12 and finishes at 14:12',async()=>{
 const {room}=await harness();Object.assign(room.meta.round,{phase:'playing',scoreAttack:12,scoreDefend:12});
 await room.rounds.finish('attack','test');assert.equal(room.meta.round.phase,'ending');assert.equal(room.rounds.state().overtime,true);
 await room.rounds.alarm(Date.now()+4000);assert.equal(room.meta.round.phase,'waiting');room.meta.round.phase='playing';await room.rounds.finish('attack','test');assert.equal(room.meta.round.phase,'finished');assert.equal(room.meta.round.scoreAttack,14);assert.equal(room.meta.round.scoreDefend,12);
});
test('public room chooses one shared map and rolls another only after the final-result countdown',async()=>{
 const {room,a,b,values}=await harness(true);const first=room.meta.map;assert(MAP_IDS.includes(first));assert.equal(room.meta.mode,'rounds');Object.assign(room.meta.round,{phase:'playing',scoreAttack:12,scoreDefend:0});
 await room.rounds.finish('attack','test');const at=room.meta.round.nextAt;assert(at>Date.now());await room.rounds.alarm(at-1);assert.equal(room.meta.map,first);assert(!a.messages.some(m=>m.type==='map_changed'));
 await room.rounds.alarm(at);assert.notEqual(room.meta.map,first);assert.equal(room.meta.round.phase,'waiting');assert.equal(room.meta.round.scoreAttack,0);assert.equal(room.meta.round.scoreDefend,0);
 const am=a.messages.find(m=>m.type==='map_changed'),bm=b.messages.find(m=>m.type==='map_changed');assert.equal(am.map,bm.map);assert.equal(am.map,room.meta.map);assert(values.has('resume:'+am.resumeToken));assert(values.has('resume:'+bm.resumeToken));
});
