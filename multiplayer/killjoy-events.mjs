import{KJ,killjoyState,detained,deviceOnline,turretFacing,killjoyFlight}from'./killjoy-rules.mjs';
import{finite,WEAPONS}from'./protocol.mjs';
import{cloveInvulnerable}from'./clove-rules.mjs';
import{abilityDamage,cancelSova}from'./sova-events.mjs';
import{cancelOmenChannel}from'./omen-events.mjs';
export const killjoyEffects=room=>(room.killjoyEffects||={devices:[],flights:[]});
const persist=room=>room.ctx.storage.put('killjoyEffects',killjoyEffects(room));
const point=p=>p&&['x','y','z'].every(k=>finite(p[k]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const body=p=>({...p,y:p.y-1});
const playing=room=>!room.rounds.enabled||room.meta.round.phase==='playing';
const targetValid=(p,e,now)=>p?.joined&&p.hp>0&&p.active&&!p.realm&&p.team!==e.team&&!cloveInvulnerable(p,now)&&p.omen?.channel?.kind!=='ultimate';
const ownerSocket=(room,e)=>room.sockets().find(s=>room.data(s)?.uid===e.ownerUid);
function publish(room,e){room.broadcast({type:'event',event:{...e,type:'killjoy_device'}});}
export function liveKilljoyEffects(room,now){const e=killjoyEffects(room);return{devices:e.devices.filter(d=>!d.expiresAt||d.expiresAt>now),flights:e.flights.filter(f=>f.createdAt+KJ.flightMs>now)};}
async function remove(room,e,now,reason='destroyed'){
 const effects=killjoyEffects(room);effects.devices=effects.devices.filter(v=>v.id!==e.id);room.broadcast({type:'event',event:{type:'killjoy_remove',id:e.id,reason}});
 const ws=ownerSocket(room,e),p=ws&&room.data(ws);if(!p)return;const s=killjoyState(p);
 if(e.kind==='turret'){s.eUsed=false;s.eReadyAt=now+(reason==='recall'?KJ.recallMs:KJ.turretRebuildMs);}
 if(e.kind==='alarm'&&reason==='recall'){s.qUsed=false;s.qReadyAt=now+KJ.recallMs;}room.save(ws,p);
}
export async function killjoyEvent(room,ws,p,m,now){
 if(!m.type.startsWith('killjoy_'))return false;
 const effects=killjoyEffects(room),fail=reason=>{room.send(ws,{type:'ability_error',reason});return true;};
 if(!playing(room))return fail('回合結束後無法使用裝置');
 if(m.type==='killjoy_object_hit'){
  const e=effects.devices.find(v=>v.id===m.id);if(!e||e.activeUntil>now||p.hp<=0||!p.active||p.realm||detained(p,now)||cloveInvulnerable(p,now)||p.shotUsed||now-p.lastShot>400||!p.shotEnd||distance(p.shotEnd,{...e,y:e.y+(e.kind==='nano'?.1:.5)})>1.2||p.weapon==='melee'&&distance(p,e)>4.5)return true;
  p.shotUsed=true;room.save(ws,p);e.hp-=WEAPONS[p.shotWeapon||p.weapon]?.body||0;if(e.hp<=0)await remove(room,e,now);else publish(room,e);await persist(room);room.snapshot();return true;
 }
 const passive=['killjoy_seen','killjoy_move','killjoy_contact'].includes(m.type);
 if(!passive&&(p.agent!=='killjoy'||p.hp<=0||!p.active||p.realm||detained(p,now)))return fail('目前無法施放 Killjoy 技能');
 const s=killjoyState(p);
 if(m.type==='killjoy_seen'){
  const e=effects.devices.find(v=>v.id===m.id&&v.ownerUid===p.uid&&['turret','alarm'].includes(v.kind)),socket=room.sockets().find(v=>room.data(v)?.uid===m.targetUid),v=socket&&room.data(socket);
  if(!e||!p.active||!deviceOnline(p,e)||now<e.armedAt||!targetValid(v,e,now)||distance(body(v),e)>(e.kind==='turret'?KJ.turretRange:e.targetUid?20:KJ.alarmDetect)||e.kind==='turret'&&!turretFacing(e,v))return true;
  if(e.targetUid!==v.uid){e.targetUid=v.uid;e.nextShot=now+KJ.turretLockMs;e.burst=3;if(e.kind==='alarm'){e.chaseUntil=now+KJ.alarmChaseMs;e.lastMoveAt=now;}}
  e.visibleUntil=now+550;publish(room,e);
 }else if(m.type==='killjoy_move'){
  const e=effects.devices.find(v=>v.id===m.id&&v.ownerUid===p.uid&&v.kind==='alarm');if(!e?.targetUid||!p.active||!deviceOnline(p,e)||!point(m)||distance(e,m)>KJ.alarmSpeed*Math.min(.5,Math.max(.025,(now-e.lastMoveAt)/1000))+.8||Math.abs(e.y-m.y)>1.5)return true;
  Object.assign(e,{x:m.x,y:m.y,z:m.z,lastMoveAt:now});publish(room,e);
 }else if(m.type==='killjoy_contact'){
  const f=effects.flights.find(v=>v.id===m.id&&v.ownerUid===p.uid),contactAt=f&&finite(m.at,now-600,now+100)&&m.at>=f.segmentAt?Math.min(now,m.at):now;
  if(!f||!point(m)||f.createdAt+KJ.flightMs<now||distance(killjoyFlight(f,contactAt),m)>3||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return fail('奈米蟲群落點無效');
  if(m.ny>.45||f.bounces>=3){effects.flights=effects.flights.filter(v=>v.id!==f.id);room.broadcast({type:'event',event:{type:'killjoy_flight_end',id:f.id}});const e={type:'killjoy_device',kind:'nano',id:f.id,ownerUid:f.ownerUid,ownerName:f.ownerName,team:f.team,x:m.x,y:m.y,z:m.z,hp:KJ.nanoHp,createdAt:now,armedAt:now+KJ.armMs};effects.devices.push(e);publish(room,e);}
  else{const vy=f.vy-KJ.gravity*(contactAt-f.segmentAt)/1000,dot=f.vx*m.nx+vy*m.ny+f.vz*m.nz;if(dot>=0)return true;Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:(f.vx-2*dot*m.nx)*.65,vy:(vy-2*dot*m.ny)*.65,vz:(f.vz-2*dot*m.nz)*.65,segmentAt:contactAt,bounces:f.bounces+1});room.broadcast({type:'event',event:f});}
 }else if(m.type==='killjoy_throw'){
  if((s.cUsed||0)>=2||!['dx','dy','dz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.05)return fail('奈米蟲群已用盡');s.cUsed=(s.cUsed||0)+1;const speed=m.soft?KJ.softSpeed:KJ.throwSpeed,f={type:'killjoy_flight',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-.3,z:p.z,vx:m.dx*speed,vy:m.dy*speed,vz:m.dz*speed,createdAt:now,segmentAt:now,bounces:0};effects.flights.push(f);room.save(ws,p);room.broadcast({type:'event',event:f});
 }else if(m.type==='killjoy_place'){
  if(!['alarm','turret','lockdown'].includes(m.kind)||!point(m)||distance({...p,y:p.y-2.2},m)>KJ.placeRange||!finite(m.yaw,-1000,1000)||effects.devices.some(e=>e.ownerUid===p.uid&&e.kind===m.kind))return fail('部署位置無效或已有同類裝置');
  if(m.kind==='alarm'){if(s.qUsed||(s.qReadyAt||0)>now)return fail('警報機器人尚未就緒');s.qUsed=true;}
  if(m.kind==='turret'){if(s.eUsed||(s.eReadyAt||0)>now)return fail('砲塔尚未就緒');s.eUsed=true;}
  if(m.kind==='lockdown'){if(p.ultUsed)return fail('全面封鎖已使用');p.ultUsed=true;}
  const e={type:'killjoy_device',kind:m.kind,id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:m.x,y:m.y,z:m.z,yaw:m.yaw,hp:m.kind==='turret'?KJ.turretHp:m.kind==='alarm'?KJ.alarmHp:KJ.lockdownHp,createdAt:now,armedAt:now+KJ.armMs,online:true};if(m.kind==='lockdown')e.endsAt=now+KJ.lockdownMs;effects.devices.push(e);room.save(ws,p);publish(room,e);
 }else if(m.type==='killjoy_recall'){
  const e=effects.devices.find(v=>v.ownerUid===p.uid&&v.id===m.id&&['alarm','turret'].includes(v.kind)&&!v.chaseUntil);if(!e)return fail('無法召回這個裝置');await remove(room,e,now,'recall');
 }else if(m.type==='killjoy_activate'){
  const e=effects.devices.find(v=>v.id===m.id&&v.ownerUid===p.uid&&v.team===p.team&&v.kind==='nano'&&!v.activeUntil&&now>=v.armedAt);if(!e)return fail('奈米蟲群尚未就緒');e.activeUntil=now+KJ.nanoMs;e.expiresAt=e.activeUntil;e.lastTick=now;publish(room,e);
 }else return true;
 await persist(room);room.snapshot();await room.ctx.storage.setAlarm(now+100);return true;
}
export async function tickKilljoy(room,now){const effects=killjoyEffects(room);let pending=false;
 if(!playing(room)){effects.devices=[];effects.flights=[];for(const ws of room.sockets()){const p=room.data(ws);if(p?.detainedUntil){p.detainedUntil=0;room.save(ws,p);}}await persist(room);return false;}
 for(const e of [...effects.devices]){
  if(e.kind==='nano'&&e.activeUntil){const dt=Math.min(.5,Math.max(0,(Math.min(now,e.activeUntil)-e.lastTick)/1000));e.lastTick=now;for(const ws of room.sockets()){const p=room.data(ws);if(!p?.joined||Math.hypot(p.x-e.x,p.z-e.z)>KJ.nanoRadius||Math.abs(p.y-2.2-e.y)>3)continue;if(dt>0)await abilityDamage(room,ws,p,KJ.nanoDps*dt,{...e,id:e.id+':'+now,weaponName:'NANOSWARM',cause:'killjoy'},now);}if(now>=e.activeUntil)await remove(room,e,now,'expired');}
  if(e.kind==='alarm'||e.kind==='turret'){
   const ownerWs=ownerSocket(room,e),owner=ownerWs&&room.data(ownerWs),online=!!owner?.active&&deviceOnline(owner,e);if(e.online!==online){e.online=online;publish(room,e);}if(!online)continue;
   const target=room.sockets().find(v=>room.data(v)?.uid===e.targetUid),p=target&&room.data(target);const visible=targetValid(p,e,now)&&e.visibleUntil>now;
   if(e.kind==='alarm'&&e.chaseUntil){if(visible&&distance(body(p),e)<1.8){for(const ws of room.sockets()){const v=room.data(ws);if(targetValid(v,e,now)&&distance(body(v),e)<KJ.alarmBlast){v.vulnerableUntil=now+KJ.vulnerableMs;room.save(ws,v);}}room.broadcast({type:'event',event:{type:'killjoy_alarm',id:e.id,x:e.x,y:e.y,z:e.z}});await remove(room,e,now,'triggered');}else if(now>=e.chaseUntil)await remove(room,e,now,'expired');}
   if(e.kind==='turret'&&visible&&distance(body(p),e)<KJ.turretRange&&turretFacing(e,p)&&now>=e.nextShot){const range=distance(body(p),e),damage=range<20?8:range<35?6:4;await abilityDamage(room,target,p,damage,{...e,id:e.id+':'+now,weaponName:'TURRET',cause:'killjoy'},now);room.broadcast({type:'event',event:{type:'killjoy_shot',id:e.id,x:e.x,y:e.y+.7,z:e.z,ex:p.x,ey:p.y-1,ez:p.z}});e.burst--;e.nextShot=now+(e.burst>0?KJ.turretShotMs:KJ.turretGapMs);if(e.burst<=0)e.burst=3;}
  }
  if(e.kind==='lockdown'&&now>=e.endsAt){for(const ws of room.sockets()){const p=room.data(ws);if(!targetValid(p,e,now)||Math.hypot(p.x-e.x,p.z-e.z)>KJ.lockdownRadius)continue;if(p.sova?.control)await cancelSova(room,ws,p,now);if(p.omen?.channel)await cancelOmenChannel(room,ws,p,now);p.detainedUntil=Math.max(p.detainedUntil||0,now+KJ.detainMs);await room.spike.cancel(p.uid,now);p.spikeEquipped=false;p.shotUsed=true;room.save(ws,p);}room.broadcast({type:'event',event:{type:'killjoy_lockdown',id:e.id,x:e.x,y:e.y,z:e.z,radius:KJ.lockdownRadius}});await remove(room,e,now,'fired');}
 }
 effects.flights=effects.flights.filter(f=>f.createdAt+KJ.flightMs>now);pending=effects.devices.length>0||effects.flights.length>0||room.sockets().some(ws=>room.data(ws)?.detainedUntil>now);await persist(room);await room.rounds.elimination();return pending;
}
