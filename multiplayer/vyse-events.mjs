import {VYSE as V,vyseState,vyseFlight,insideVines,insideGarden,crossedShear} from './vyse-rules.mjs';
import {abilityDamage} from './sova-events.mjs';
import {FIREARMS} from './firearms.mjs';
import {cloveInvulnerable} from './clove-rules.mjs';
import {reynaBusy} from './reyna-rules.mjs';
import {finite} from './protocol.mjs';
import {flashDuration} from './breach-rules.mjs';
import {detained} from './killjoy-rules.mjs';
const emit=(r,event)=>r.broadcast({type:'event',event});
const playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing';
export async function vyseEvent(r,w,p,m,n){
 if(!m.type.startsWith('vyse_'))return false;
 if(['vyse_throw','vyse_contact','vyse_bounce','vyse_vines','vyse_shear','vyse_garden','vyse_device_hit'].includes(m.type))return vyseExtraEvent(r,w,p,m,n);
 const fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};
 if(m.type==='vyse_seen'){
  const flower=r.sockets().map(s=>r.data(s)?.vyseFlower).find(f=>f?.id===m.id&&f.firesAt&&n>=f.firesAt&&n<f.firesAt+700);
  if(!flower||!playing(r)||p.hp<=0||!p.active||p.realm||Math.hypot(p.x-flower.x,p.y-flower.y,p.z-flower.z)>45||p.vyseSeen===m.id||cloveInvulnerable(p,n)||reynaBusy(p,n))return true;
  const duration=flashDuration(p,flower);if(duration){p.vyseSeen=m.id;p.breachFlashUntil=Math.max(p.breachFlashUntil||0,flower.firesAt+duration);r.save(w,p);r.snapshot();}return true;
 }
 if(m.type==='vyse_hit'){
  const owner=r.sockets().find(s=>r.data(s)?.vyseFlower?.id===m.id);if(!owner||p.hp<=0||!p.active||!playing(r)||p.realm)return true;const q=r.data(owner),f=q.vyseFlower;if(q.team===p.team||f.firesAt)return true;
  if(p.shotUsed||n-p.lastShot>400||!p.shotEnd||Math.hypot(p.shotEnd.x-f.x,p.shotEnd.y-f.y,p.shotEnd.z-f.z)>1)return true;p.shotUsed=true;r.save(w,p);f.hp-=FIREARMS[p.shotWeapon||p.weapon]?.bodyDmg||34;
  if(f.hp<=0){q.vyseFlower=null;q.vyseReadyAt=n+20000;emit(r,{type:'vyse_remove',id:f.id});}r.save(owner,q);r.snapshot();return true;
 }
 if(!playing(r)||p.agent!=='vyse'||p.hp<=0||!p.active||p.realm||detained(p,n))return fail('目前無法使用閃光花');
 if(m.type==='vyse_place'){
  if(p.vyseFlower||p.vyseReadyAt>n)return fail('閃光花尚未就緒');
  if(!['x','y','z','nx','ny','nz'].every(k=>finite(m[k]))||Math.hypot(m.x-p.x,m.y-p.y,m.z-p.z)>20||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return fail('請瞄準範圍內的表面');
  p.vyseFlower={type:'vyse_flower',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,x:m.x,y:m.y,z:m.z,nx:m.nx,ny:m.ny,nz:m.nz,hp:125,createdAt:n,armedAt:n+1200};emit(r,p.vyseFlower);
 }else if(m.type==='vyse_pop'){
  const f=p.vyseFlower;if(!f||f.firesAt||n<f.armedAt)return fail('閃光花尚未完成部署');f.firesAt=n+500;f.expiresAt=f.firesAt+800;p.vyseReadyAt=f.firesAt+20000;emit(r,{...f,type:'vyse_flower'});await r.ctx.storage.setAlarm(n+100);
 }else if(m.type==='vyse_recall'){
  const f=p.vyseFlower;if(!f||f.firesAt||Math.hypot(p.x-f.x,p.y-f.y,p.z-f.z)>20)return fail('閃光花不在召回範圍');p.vyseFlower=null;p.vyseReadyAt=n+1000;emit(r,{type:'vyse_remove',id:f.id});
 }else return true;
 r.save(w,p);r.snapshot();return true;
}
export async function tickVyse(r,n){let pending=false,dealtDamage=false;for(const w of r.sockets()){let p=r.data(w);if(!p?.joined)continue;const f=p.vyseFlower;if(f){if(!playing(r)||p.agent!=='vyse'||f.expiresAt&&f.expiresAt<=n){emit(r,{type:'vyse_remove',id:f.id});p.vyseFlower=null;r.save(w,p);}else pending ||= !!f.firesAt;}
 if(!p.vyse)continue;const state=p.vyse;
 if(!playing(r)||p.agent!=='vyse'){state.devices=[];state.flights=[];state.ultimate=null;r.save(w,p);continue;}
 state.flights=state.flights.filter(f=>f.expiresAt>n);
 for(const e of state.devices){
  if(e.kind==='shear'&&!e.firesAt&&n>=e.armedAt){for(const other of r.sockets()){const target=r.data(other);if(!target?.joined||target.team===e.team||!vulnerable(target,n))continue;const previous=e.previous?.[target.uid]||target;if(crossedShear(previous,target,e)){e.firesAt=n+V.wallDelayMs;e.expiresAt=e.firesAt+V.wallMs;emit(r,e);break;}(e.previous||={})[target.uid]={x:target.x,y:target.y,z:target.z};}}
  if(e.kind==='vines'&&e.activeAt&&n<e.expiresAt){const dt=Math.min(.25,Math.max(0,n-(e.damageAt||n))/1000);e.damageAt=n;for(const other of r.sockets()){let target=r.data(other);if(!target?.joined||!vulnerable(target,n)||!insideVines(target,e))continue;target.vyseSlowedUntil=n+400;const last=e.previous?.[target.uid],moved=last&&Math.hypot(target.x-last.x,target.z-last.z)>.015;(e.previous||={})[target.uid]={x:target.x,z:target.z};r.save(other,target);if(moved&&dt>0){dealtDamage=true;await abilityDamage(r,other,target,V.vineDps*dt,{...e,cause:'vyse',weaponName:'RAZORVINE',id:e.id+':'+n},n);}}}
 }
 const ult=state.ultimate;if(ult&&!ult.fired&&n>=ult.firesAt){ult.fired=true;for(const other of r.sockets()){const target=r.data(other);if(!target?.joined||target.team===ult.team||!vulnerable(target,n)||!insideGarden(target,ult))continue;target.vyseJammedUntil=Math.max(target.vyseJammedUntil||0,n+V.jamMs);r.save(other,target);}emit(r,{...ult,type:'vyse_jam'});}
 // Damage may have updated the owner's health and kill credit: merge only effect state.
 const current=r.data(w);current.vyse={...state,devices:state.devices.filter(e=>!e.expiresAt||e.expiresAt>n),ultimate:ult?.expiresAt>n?ult:null};r.save(w,current);pending ||=current.vyse.devices.length>0||current.vyse.flights.length>0||!!current.vyse.ultimate;
 }if(dealtDamage)await r.rounds.elimination();return pending;}
const vulnerable=(p,n)=>p.hp>0&&p.active&&!p.realm&&!cloveInvulnerable(p,n)&&!reynaBusy(p,n)&&p.omen?.channel?.kind!=='ultimate';
const point=m=>['x','y','z'].every(k=>finite(m[k]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
async function vyseExtraEvent(r,w,p,m,n){
 const fail=reason=>{r.send(w,{type:'ability_error',reason});return true;},state=vyseState(p);
 if(!playing(r))return fail('回合結束後無法施放');
 if(m.type==='vyse_device_hit'){const owner=r.sockets().find(ws=>r.data(ws)?.vyse?.devices.some(e=>e.id===m.id&&e.kind==='vines'&&!e.activeAt));if(!owner||!vulnerable(p,n)||detained(p,n))return true;const q=r.data(owner),e=q.vyse.devices.find(e=>e.id===m.id);if(p.team===e.team||p.shotUsed||n-p.lastShot>400||!p.shotEnd||distance(p.shotEnd,{...e,y:e.y+.15})>1)return true;p.shotUsed=true;r.save(w,p);e.hp-=FIREARMS[p.shotWeapon||p.weapon]?.bodyDmg||0;if(e.hp<=0){q.vyse.devices=q.vyse.devices.filter(v=>v.id!==e.id);emit(r,{type:'vyse_device_remove',id:e.id});}r.save(owner,q);r.snapshot();return true;}
 if(m.type==='vyse_contact'||m.type==='vyse_bounce'){const flight=state.flights.find(f=>f.id===m.id);const at=finite(m.at,n-600,n+100)?Math.min(n,m.at):n;if(!flight||!point(m)||at<flight.createdAt||n>flight.expiresAt||distance(vyseFlight(flight,at),m)>1.5||!finite(m.ny,-1,1))return true;if(m.type==='vyse_bounce'){if(!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05||m.ny>=.55)return true;const vy=flight.vy-V.gravity*(at-flight.createdAt)/1000,dot=flight.vx*m.nx+vy*m.ny+flight.vz*m.nz;if(dot>=0)return true;Object.assign(flight,{x:m.x,y:m.y,z:m.z,vx:(flight.vx-2*dot*m.nx)*.45,vy:(vy-2*dot*m.ny)*.45,vz:(flight.vz-2*dot*m.nz)*.45,createdAt:at});emit(r,flight);r.save(w,p);return true;}if(m.ny<.55)return true;state.flights=state.flights.filter(f=>f.id!==flight.id);const e={type:'vyse_device',kind:'vines',id:flight.id,ownerUid:p.uid,ownerName:p.name,team:p.team,x:m.x,y:m.y,z:m.z,hp:100,createdAt:n,armedAt:n+V.armMs};state.devices.push(e);emit(r,{type:'vyse_flight_end',id:flight.id});emit(r,e);r.save(w,p);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;}
 if(p.agent!=='vyse'||!vulnerable(p,n)||detained(p,n))return fail('目前無法施放 Vyse 技能');
 if(m.type==='vyse_vines'){const e=state.devices.find(e=>e.id===m.id&&e.kind==='vines');if(!e||e.activeAt||n<e.armedAt)return fail('銳藤尚未就緒');e.activeAt=n;e.damageAt=n;e.expiresAt=n+V.vineMs;emit(r,e);
 }else if(m.type==='vyse_throw'){if(state.cUsed>=V.vines||!['dx','dy','dz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.05)return fail('銳藤已用盡或方向無效');state.cUsed++;const e={type:'vyse_flight',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-.3,z:p.z,vx:m.dx*V.vineSpeed,vy:m.dy*V.vineSpeed,vz:m.dz*V.vineSpeed,createdAt:n,expiresAt:n+V.flightMs};state.flights.push(e);emit(r,e);
 }else if(m.type==='vyse_shear'){if(state.qUsed||!point(m)||distance({...p,y:p.y-2.2},m)>V.wallRange||Math.abs(m.y-(p.y-2.2))>5||!finite(m.yaw,-1000,1000))return fail('金屬牆落點無效或已用盡');state.qUsed=1;const e={type:'vyse_device',kind:'shear',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:m.x,y:m.y,z:m.z,yaw:m.yaw,createdAt:n,armedAt:n+V.armMs};state.devices.push(e);emit(r,e);
 }else if(m.type==='vyse_garden'){if(p.ultUsed)return fail('鋼鐵花園已使用');p.ultUsed=true;state.ultimate={type:'vyse_garden',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-2.2,z:p.z,createdAt:n,firesAt:n+V.ultDelayMs,expiresAt:n+V.ultDelayMs+1000};emit(r,state.ultimate);
 }else return true;
 p.shotUsed=true;p.spikeEquipped=false;await r.spike.cancel(p.uid,n);r.save(w,p);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;
}
