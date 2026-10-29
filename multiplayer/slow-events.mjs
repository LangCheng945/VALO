import{finite,validPose}from'./protocol.mjs';
import{SLOW}from'./slow-rules.mjs';
const point=m=>validPose({...m,yaw:0}),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const velocity=m=>['vx','vy','vz'].every(k=>finite(m[k],-110,110))&&Math.hypot(m.vx,m.vy,m.vz)<115;
export function liveSlowFields(room,now=Date.now()){return(room.slowFields||[]).filter(f=>f.expiresAt>now);}
export function liveSlowFlights(room,now=Date.now()){return(room.slowFlights||[]).filter(f=>now-f.createdAt<SLOW.flightMs);}
async function persist(room){await room.ctx.storage.put('slow',{fields:room.slowFields||[],flights:room.slowFlights||[]});}
export async function slowEvent(room,ws,p,m,now){
 if(!['slow','slow_launch','slow_step','slow_land'].includes(m.type))return false;
 const fail=reason=>{room.send(ws,{type:'ability_error',key:'q',reason});return true;};
 if(m.type==='slow')return fail('請更新網頁，使用 Q 裝備後投擲緩速靈球');
 if(m.type==='slow_launch'){
  if(p.agent!=='phoenix'||p.hp<=0||!p.active||p.qUsed>=2||(room.rounds.enabled&&room.meta.round.phase==='ending'))return fail('目前無法投擲緩速靈球');
  if(!point(m)||distance(p,m)>1.2||!velocity(m)||Math.abs(Math.hypot(m.vx,m.vy,m.vz)-SLOW.speed)>.1)return fail('緩速球投擲資料無效');
  p.qUsed++;room.save(ws,p);const f={type:'slow_launch',id:crypto.randomUUID(),senderUid:p.uid,createdAt:now,lastAt:now,origin:{x:m.x,y:m.y,z:m.z},x:m.x,y:m.y,z:m.z,vx:m.vx,vy:m.vy,vz:m.vz,remaining:Math.max(0,2-p.qUsed)};
  room.slowFlights=liveSlowFlights(room,now);room.slowFlights.push(f);await persist(room);room.broadcast({type:'event',event:f});await room.ctx.storage.setAlarm(now+250);return true;
 }
 const f=liveSlowFlights(room,now).find(f=>f.id===m.id&&f.senderUid===p.uid);if(!f)return true;
 // Already-thrown projectiles may complete after the caster dies or opens the shop.
 if(room.rounds.enabled&&room.meta.round.phase==='ending')return true;
 const age=(now-f.createdAt)/1000,dt=(now-f.lastAt)/1000,maxSpeed=SLOW.speed+SLOW.gravity*age;
 if(!point(m)||distance(f.origin,m)>SLOW.maxRange||distance(f,m)>maxSpeed*dt+2)return true;
 if(m.type==='slow_step'){
  if(now-f.lastAt<80||!velocity(m)||Math.hypot(m.vx,m.vy,m.vz)>maxSpeed+1)return true;
  Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:m.vx,vy:m.vy,vz:m.vz,lastAt:now});await persist(room);room.broadcast({type:'event',event:{...f,type:'slow_step'}});return true;
 }
 if(!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.1||m.ny<.55)return true;
 room.slowFlights=(room.slowFlights||[]).filter(x=>x.id!==f.id);const field={type:'slow',id:f.id,senderUid:p.uid,x:m.x,y:m.y,z:m.z,createdAt:now,expiresAt:now+SLOW.durationMs};
 room.slowFields=liveSlowFields(room,now);room.slowFields.push(field);await persist(room);room.broadcast({type:'event',event:field});await room.ctx.storage.setAlarm(now+250);return true;
}
export async function updateSlowObjects(room,now){const flights=liveSlowFlights(room,now),fields=liveSlowFields(room,now),changed=flights.length!==(room.slowFlights||[]).length||fields.length!==(room.slowFields||[]).length;
 if(changed){const ids=new Set(flights.map(f=>f.id));for(const f of room.slowFlights||[])if(!ids.has(f.id))room.broadcast({type:'event',event:{type:'slow_remove',id:f.id}});room.slowFlights=flights;room.slowFields=fields;await persist(room);}return flights.length>0||fields.length>0;}
