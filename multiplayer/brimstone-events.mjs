import {awardReynaSouls} from './reyna-events.mjs';
import{BRIM,brimState,flightPoint,inBrimArea}from'./brimstone-rules.mjs';
import{finite,applyDamage}from'./protocol.mjs';
import{isoDamage}from'./iso-rules.mjs';
import{cloveInvulnerable}from'./clove-rules.mjs';
import{awardIsoOrbs}from'./iso-events.mjs';
import{recordCloveDeath,awardCloveContributors}from'./clove-events.mjs';
import{markArmorDamage}from'./armor.mjs';
export const brimEffects=room=>(room.brimEffects||={areas:[],flights:[]});
export const liveBrimEffects=(room,now)=>{const e=brimEffects(room);return{areas:e.areas.filter(a=>a.expiresAt>now),flights:e.flights.filter(f=>f.createdAt+BRIM.flightMs>now)};};
const persist=room=>room.ctx.storage.put('brimEffects',brimEffects(room));
const point=m=>['x','y','z'].every(k=>finite(m[k]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const playing=room=>!room.rounds.enabled||room.meta.round.phase==='playing';
export async function brimEvent(room,ws,p,m,now){
 if(!m.type.startsWith('brim_'))return false;
 const fail=reason=>{room.send(ws,{type:'ability_error',reason});return true;};
 if(!playing(room)||!['brim_land','brim_bounce'].includes(m.type)&&(p.agent!=='brimstone'||p.hp<=0||!p.active||p.realm))return fail('目前無法施放煉獄技能');
 const state=brimState(p),effects=brimEffects(room);
 const area=(kind,pos,duration,radius,delay=0)=>{const e={type:'brim_area',kind,id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:pos.x,y:pos.y,z:pos.z,radius,createdAt:now,startsAt:now+delay,expiresAt:now+delay+duration,lastTick:now};effects.areas.push(e);room.broadcast({type:'event',event:e});return e;};
 if(m.type==='brim_smokes'){
  if(!Array.isArray(m.points)||!m.points.length||m.points.length>3-(state.eUsed||0)||m.points.some(v=>!point(v)||Math.hypot(p.x-v.x,p.z-v.z)>BRIM.smokeRange||Math.abs(p.y-v.y)>25))return fail('煙幕位置無效或次數不足');
  state.eUsed=(state.eUsed||0)+m.points.length;for(const pos of m.points)area('smoke',pos,BRIM.smokeMs,BRIM.smokeRadius);
 }else if(m.type==='brim_stim'){
  if(state.cUsed)return fail('振奮信標已使用');state.cUsed=true;area('stim',{x:p.x,y:p.y-2.2,z:p.z},BRIM.stimMs,BRIM.stimRadius);
 }else if(m.type==='brim_incendiary'){
  if(state.qUsed||!['dx','dy','dz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.05)return fail('燃燒彈尚未就緒');
  state.qUsed=true;const f={type:'brim_flight',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,ownerName:p.name,x:p.x,y:p.y-.3,z:p.z,vx:m.dx*BRIM.projectileSpeed,vy:m.dy*BRIM.projectileSpeed,vz:m.dz*BRIM.projectileSpeed,createdAt:now,segmentAt:now,bounces:0};effects.flights.push(f);room.broadcast({type:'event',event:f});
 }else if(m.type==='brim_land'||m.type==='brim_bounce'){
  const f=effects.flights.find(v=>v.id===m.id&&v.ownerUid===p.uid);if(!f||!point(m)||now>f.createdAt+BRIM.flightMs||distance(flightPoint(f,now),m)>3)return fail('燃燒彈落點無效');
  if(m.type==='brim_land'){
   // Static-map contact is reported by the owner; server bounds it to the ballistic path.
   effects.flights=effects.flights.filter(v=>v.id!==f.id);area('fire',m,BRIM.fireMs,BRIM.fireRadius);room.broadcast({type:'event',event:{type:'brim_flight_end',id:f.id}});
  }else{
   if(f.bounces>=3||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return fail('彈跳資料無效');
   const vy=f.vy-BRIM.gravity*(now-f.segmentAt)/1000,dot=f.vx*m.nx+vy*m.ny+f.vz*m.nz;if(dot>=0)return fail('彈跳方向無效');
   Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:(f.vx-2*dot*m.nx)*.7,vy:(vy-2*dot*m.ny)*.7,vz:(f.vz-2*dot*m.nz)*.7,segmentAt:now,bounces:f.bounces+1});room.broadcast({type:'event',event:f});
  }
 }else if(m.type==='brim_ultimate'){
  if(p.ultUsed||!point(m)||Math.hypot(p.x-m.x,p.z-m.z)>BRIM.ultRange||Math.abs(p.y-m.y)>25)return fail('轟炸位置無效或大招已使用');p.ultUsed=true;area('strike',m,BRIM.ultMs,BRIM.ultRadius,BRIM.ultWarnMs);
 }else return true;
 room.save(ws,p);await persist(room);room.snapshot();await room.ctx.storage.setAlarm(now+100);return true;
}
export async function tickBrim(room,now){
 const effects=brimEffects(room);let died=false;
 if(!playing(room)){effects.areas=[];effects.flights=[];for(const ws of room.sockets()){const p=room.data(ws);if(p?.stimUntil){p.stimUntil=0;room.save(ws,p);}}await persist(room);return false;}
 effects.flights=effects.flights.filter(f=>f.createdAt+BRIM.flightMs>now);
 for(const e of effects.areas){
  const dt=Math.min(.5,Math.max(0,(Math.min(now,e.expiresAt)-Math.max(e.lastTick,e.startsAt))/1000));e.lastTick=now;
  if(e.expiresAt<=now&&dt===0||e.startsAt>now||e.kind==='smoke')continue;
  for(const ws of room.sockets()){
   const p=room.data(ws);if(!p?.joined||p.mapPending||!p.active||p.hp<=0||p.realm||p.omen?.channel?.kind==='ultimate'||cloveInvulnerable(p,now)||!inBrimArea(p,e))continue;
   if(e.kind==='stim'){if(p.team===e.team&&e.expiresAt>now){p.stimUntil=now+BRIM.stimLingerMs;room.save(ws,p);}continue;}
   if(!dt)continue;const raw=(e.kind==='strike'?BRIM.ultDps:BRIM.fireDps)*dt*(p.team===e.team?.33:1),damage=isoDamage(p,raw,now,e.id+':'+now);if(damage<=0){room.save(ws,p);continue;}
   Object.assign(p,applyDamage(p,damage));p.lastDamage=now;p.healRemaining=0;if(p.team!==e.team){p.damageContributors||={};p.damageContributors[e.ownerUid]=now;}markArmorDamage(p,now);
   if(p.hp<=0){recordCloveDeath(p,now);p.shieldReserve=0;p.deaths++;p.active=false;p.respawnAt=room.rounds.enabled?0:now+5000;died=true;
    const owner=room.sockets().find(s=>room.data(s)?.uid===e.ownerUid),killer=owner&&room.data(owner);if(killer&&killer.uid!==p.uid&&killer.team!==p.team){killer.kills++;await awardReynaSouls(room,killer,p,now);await awardIsoOrbs(room,killer,p,now);awardCloveContributors(room,killer,p,now);room.save(owner,killer);}room.broadcast({type:'event',event:{type:'kill',killerUid:e.ownerUid,killerName:e.ownerName||'Brimstone',victimUid:p.uid,victimName:p.name,weaponName:e.kind==='strike'?'ORBITAL STRIKE':'INCENDIARY',isHead:false}});
   }
   room.save(ws,p);room.send(ws,{type:'damage',hp:p.hp,shield:p.shield,tempHealth:p.tempHealth||0,attacker:e.ownerName||'Brimstone',cause:e.kind});if(p.hp<=0)await room.spike.drop(p,now);
  }
 }
 effects.areas=effects.areas.filter(e=>e.expiresAt>now);await persist(room);if(died)await room.rounds.elimination();
 return effects.areas.length>0||effects.flights.length>0||room.sockets().some(ws=>room.data(ws)?.stimUntil>now);
}
