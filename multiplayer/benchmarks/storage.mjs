// Deterministic ten-minute room replay; counts storage API calls/keys, not billed SQL rows.
import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';import{GameRoom}from'../worker.mjs';
const baselineRef=process.argv[2]||'2274ba4';
let previous=execFileSync('git',['show',baselineRef+':multiplayer/worker.mjs'],{encoding:'utf8'});
previous=previous.replace(/from\s*(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(new URL(p,new URL('../worker.mjs',import.meta.url)).href));
const {GameRoom:Baseline}=await import('data:text/javascript;base64,'+Buffer.from(previous).toString('base64'));
async function replay(Room,movingDevice){let n=1000000,id=0;const savedNow=Date.now,savedInfo=console.info;Date.now=()=>n;console.info=(...args)=>{if(args[0]!=='valo-storage')savedInfo(...args)};
 const values=new Map(),timers=new Map(),stats={putCalls:0,putKeys:0,alarmWrites:0,resumeScans:0},raw={get:async k=>structuredClone(values.get(k)),put:async(k,v)=>{stats.putCalls++;const entries=typeof k==='string'?[[k,v]]:Object.entries(k);stats.putKeys+=entries.length;for(const[a,b]of entries)values.set(a,structuredClone(b));},delete:async keys=>{let c=0;for(const key of Array.isArray(keys)?keys:[keys])c+=values.delete(key)?1:0;return c;},deleteAll:async()=>values.clear(),list:async()=>{stats.resumeScans++;return new Map()},getAlarm:async()=>raw.alarm||null,setAlarm:async at=>{stats.alarmWrites++;raw.alarm=at;}};
 const sockets=Array.from({length:5},(_,i)=>{let p={uid:'p'+i,name:'Test',joined:true,active:true,inRound:true,agent:i===0&&movingDevice?'gekko':'jett',team:i%2?'defend':'attack',hp:100,shield:50,kills:0,deaths:0,weapon:'vandal',armorType:'heavy',x:i*2,y:2.2,z:0,yaw:0,pitch:0,connectedAt:n,lastSeen:n,windowAt:n,messages:0,lastShot:0};return{readyState:1,deserializeAttachment:()=>structuredClone(p),serializeAttachment:v=>p=structuredClone(v),send:()=>{},close(){this.readyState=3;}}});
 const ctx={storage:raw,getWebSockets:()=>sockets,blockConcurrencyWhile:fn=>fn()},options={now:()=>n,setTimer:(fn,ms)=>{const k=++id;timers.set(k,{fn,at:n+ms});return k;},clearTimer:k=>timers.delete(k)};
 const room=new Room(ctx,{},options);room.snapshot=room.queueSnapshot=()=>{};
 try{await room.ready;await room.fetch(new Request('https://internal/create',{method:'POST',body:JSON.stringify({mode:'rounds',map:'ascent',duration:0})}));Object.assign(room.meta.round,{phase:'playing',endsAt:0});room.meta.hostUid='p0';await room.ctx.storage.put('meta',room.meta);
 if(movingDevice)room.agentBatchEffects={effects:[{id:'moving-pet',ownerUid:'p0',ownerName:'Test',team:'attack',agent:'gekko',role:'dizzy',x:0,y:3,z:-10,vx:.01,vz:0,hp:100,radius:12,createdAt:n,expiresAt:n+700000}]};
 for(const k of Object.keys(stats))stats[k]=0;
 for(let tick=0;tick<2400;tick++){
  n+=250;
  // Four state updates per tick: 16 updates/sec/client, near the production 15 Hz.
  for(let sample=0;sample<4;sample++)for(let i=0;i<sockets.length;i++){const p=room.data(sockets[i]);await room.webSocketMessage(sockets[i],JSON.stringify({type:'state',agent:p.agent,weapon:'vandal',x:i*2+Math.sin((tick*4+sample)/30),y:2.2,z:0,yaw:tick/100,pitch:0,active:true}));}
  if(room.gameLoop){room.gameLoop.cancelTimer();if(raw.alarm<=n){room.gameLoop.durableFired();raw.alarm=null;}await room.runAlarm(true);if((tick+1)%40===0)await room.persistence.flush();}
  else await room.alarm();
 }
 if(room.persistence)await room.persistence.flush();assert.equal(room.players().length,5);assert(room.players().every(p=>p.hp===100));return stats;
 }finally{room.gameLoop?.cancelTimer();Date.now=savedNow;console.info=savedInfo;}
}
const results=[];for(const device of[false,true]){const before=await replay(Baseline,device),after=await replay(GameRoom,device);assert(after.putKeys<before.putKeys*.05);assert(after.alarmWrites<before.alarmWrites*.05);results.push({scenario:device?'5 players + moving skill device':'5 moving players',seconds:600,stateMessages:48000,before,after,putKeyReduction:((1-after.putKeys/before.putKeys)*100).toFixed(2)+'%',alarmWriteReduction:((1-after.alarmWrites/before.alarmWrites)*100).toFixed(2)+'%'});}
console.log(JSON.stringify({baselineRef,results},null,2));
