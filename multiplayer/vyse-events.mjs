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
export async function tickVyse(r,n){let pending=false;for(const w of r.sockets()){const p=r.data(w);if(!p?.joined)continue;const f=p.vyseFlower;if(!f)continue;if(!playing(r)||p.agent!=='vyse'||f.expiresAt&&f.expiresAt<=n){emit(r,{type:'vyse_remove',id:f.id});p.vyseFlower=null;r.save(w,p);}else pending ||= !!f.firesAt;}return pending;}
