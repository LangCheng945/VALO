import{CYPHER as C,cypherState,cameraControl,cypherBusy,cypherFlight,wireContact}from'./cypher-rules.mjs';
import{finite,WEAPONS}from'./protocol.mjs';
import{detained}from'./killjoy-rules.mjs';
import{cloveInvulnerable}from'./clove-rules.mjs';
import{reveal}from'./sova-rules.mjs';
import{abilityDamage}from'./sova-events.mjs';
export const cypherEffects=r=>(r.cypherEffects||={devices:[],flights:[],hats:[]});
const persist=r=>r.ctx.storage.put('cypherEffects',cypherEffects(r));
const point=p=>p&&['x','y','z'].every(k=>finite(p[k]));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const socket=(r,uid)=>r.sockets().find(w=>r.data(w)?.uid===uid);
const playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing';
const vulnerable=(p,e,n)=>p?.joined&&p.hp>0&&p.active&&!p.realm&&p.team!==e.team&&!cloveInvulnerable(p,n)&&p.omen?.channel?.kind!=='ultimate';
const emit=(r,e)=>r.broadcast({type:'event',event:e});
const publish=(r,e)=>emit(r,{...e,type:'cypher_device'});
export const liveCypherEffects=(r,n)=>{const e=cypherEffects(r);return{devices:e.devices.filter(d=>!d.expiresAt||d.expiresAt>n),flights:e.flights.filter(f=>f.createdAt+C.flightMs>n),hats:e.hats.filter(h=>h.expiresAt>n)};};
export async function cancelCypher(r,w,p){const s=cypherState(p);s.control=null;s.removeUntil=0;r.save(w,p);}
async function remove(r,e,n,recall=false){const fx=cypherEffects(r);fx.devices=fx.devices.filter(v=>v.id!==e.id);emit(r,{type:'cypher_remove',id:e.id});for(const w of r.sockets()){const p=r.data(w);if(!p)continue;if(p.cypherAnchor?.id===e.id){p.cypherAnchor=null;p.cypherSnaredUntil=0;}if(p.uid===e.ownerUid){const s=cypherState(p);if(e.kind==='camera'){s.control=null;s.eUsed=false;s.eReadyAt=n+(recall?C.recallMs:C.rebuildMs);}if(e.kind==='wire'&&recall)s.cUsed=Math.max(0,(s.cUsed||0)-1);}r.save(w,p);}}
export async function cypherEvent(r,w,p,m,n){
 if(!m.type.startsWith('cypher_'))return false;const fx=cypherEffects(r),s=cypherState(p),fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};
 if(m.type==='cypher_cancel'||m.type==='cypher_untag_cancel'){await cancelCypher(r,w,p);r.snapshot();return true;}
 if(!playing(r))return fail('回合結束後無法使用技能');
 if(m.type==='cypher_object_hit'){
  const e=fx.devices.find(e=>e.id===m.id&&['wire','camera'].includes(e.kind));if(!e||p.hp<=0||!p.active||p.realm||detained(p,n)||cypherBusy(p,n)||cloveInvulnerable(p,n)||p.shotUsed||n-p.lastShot>400||!p.shotEnd)return true;
  const hits=e.kind==='wire'?[e.a,e.b]:[e];if(!hits.some(at=>dist(p.shotEnd,at)<.85)||p.weapon==='melee'&&!hits.some(at=>dist(p,at)<4.5))return true;p.shotUsed=true;r.save(w,p);e.hp-=WEAPONS[p.shotWeapon||p.weapon]?.body||0;if(e.hp<=0)await remove(r,e,n);else publish(r,e);
 }else if(m.type==='cypher_untag'){
  if(p.hp<=0||!p.active||p.realm||!p.cypherTag||detained(p,n)||s.control)return true;if(!(s.removeUntil>n))s.removeUntil=n+C.untagMs;r.save(w,p);
 }else if(m.type==='cypher_contact'){
  const f=fx.flights.find(f=>f.id===m.id&&f.ownerUid===p.uid),at=f&&finite(m.at,n-600,n+100)&&m.at>=f.segmentAt?Math.min(n,m.at):n;
  if(!f||!point(m)||dist(cypherFlight(f,at),m)>3||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return true;
  if(m.ny>.45||f.bounces>=3){fx.flights=fx.flights.filter(v=>v.id!==f.id);emit(r,{type:'cypher_flight_end',id:f.id});const e={type:'cypher_device',kind:'cage',id:f.id,ownerUid:f.ownerUid,team:f.team,x:m.x,y:m.y,z:m.z,createdAt:n};fx.devices.push(e);publish(r,e);}
  else{const vy=f.vy-C.gravity*(at-f.segmentAt)/1000,d=f.vx*m.nx+vy*m.ny+f.vz*m.nz;if(d>=0)return true;Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:(f.vx-2*d*m.nx)*.65,vy:(vy-2*d*m.ny)*.65,vz:(f.vz-2*d*m.nz)*.65,segmentAt:at,bounces:f.bounces+1});emit(r,f);}
 }else{
  if(p.agent!=='cypher'||p.hp<=0||!p.active||p.realm||detained(p,n)||cloveInvulnerable(p,n))return fail('目前無法使用 Cypher 技能');
  if(m.type==='cypher_recall'){
   const e=fx.devices.find(e=>e.id===m.id&&e.ownerUid===p.uid&&['wire','camera'].includes(e.kind));if(!e||e.kind==='wire'&&Math.min(dist(p,e.a),dist(p,e.b))>8)return fail('裝置距離太遠');await remove(r,e,n,true);
  }else if(m.type==='cypher_view'){
   const e=fx.devices.find(e=>e.ownerUid===p.uid&&e.kind==='camera'&&e.id===m.id);if(!e||cypherBusy(p,n))return true;s.control={id:e.id,x:e.x+e.nx*.25,y:e.y+e.ny*.25,z:e.z+e.nz*.25,yaw:Math.atan2(-e.nx,-e.nz),pitch:Math.asin(e.ny)};p.spikeEquipped=false;await r.spike.cancel(p.uid,n);r.save(w,p);
  }else if(m.type==='cypher_dart'){
   const cam=cameraControl(p);if(!cam||s.dartReadyAt>n||!['dx','dy','dz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.05)return true;s.dartReadyAt=n+C.dartCooldownMs;r.save(w,p);const t=socket(r,m.targetUid),v=t&&r.data(t);if(vulnerable(v,{team:p.team},n)){const delta={x:v.x-cam.x,y:v.y-1-cam.y,z:v.z-cam.z},along=delta.x*m.dx+delta.y*m.dy+delta.z*m.dz,radial=dist({x:0,y:0,z:0},{x:delta.x-along*m.dx,y:delta.y-along*m.dy,z:delta.z-along*m.dz});if(along>0&&along<C.dartRange&&radial<1.4){v.cypherTag={ownerUid:p.uid,team:p.team,nextPulseAt:n};r.save(t,v);}}emit(r,{type:'cypher_dart',ownerUid:p.uid,x:cam.x,y:cam.y,z:cam.z,ex:cam.x+m.dx*C.dartRange,ey:cam.y+m.dy*C.dartRange,ez:cam.z+m.dz*C.dartRange});
  }else if(cypherBusy(p,n))return fail('請先退出攝影機或移除追蹤鏢');
  else if(m.type==='cypher_wire'){
   if((s.cUsed||0)>=2||!point(m.a)||!point(m.b)||dist(m.a,m.b)<.5||dist(m.a,m.b)>C.wireSpan||Math.abs(m.a.y-m.b.y)>.3||dist(p,m.a)>C.wireRange+1)return fail('絆線需要連接附近兩面牆');s.cUsed=(s.cUsed||0)+1;const e={type:'cypher_device',kind:'wire',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,a:m.a,b:m.b,x:m.a.x,y:m.a.y,z:m.a.z,hp:C.wireHp,armedAt:n+C.wireArmMs};fx.devices.push(e);publish(r,e);r.save(w,p);
  }else if(m.type==='cypher_camera'){
   if(s.eUsed||s.eReadyAt>n||fx.devices.some(e=>e.ownerUid===p.uid&&e.kind==='camera')||!point(m)||dist(p,m)>C.cameraRange||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05||Math.abs(m.ny)>.45)return fail('請瞄準範圍內的牆面');s.eUsed=true;const e={type:'cypher_device',kind:'camera',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,x:m.x,y:m.y,z:m.z,nx:m.nx,ny:m.ny,nz:m.nz,hp:C.cameraHp};fx.devices.push(e);publish(r,e);r.save(w,p);
  }else if(m.type==='cypher_throw'){
   if((s.qUsed||0)>=2||!['dx','dy','dz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.05)return fail('煙籠已用盡');s.qUsed=(s.qUsed||0)+1;const speed=m.soft?C.softSpeed:C.throwSpeed,f={type:'cypher_flight',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,x:p.x,y:p.y-.3,z:p.z,vx:m.dx*speed,vy:m.dy*speed,vz:m.dz*speed,createdAt:n,segmentAt:n,bounces:0};fx.flights.push(f);emit(r,f);r.save(w,p);
  }else if(m.type==='cypher_activate'){
   const e=fx.devices.find(e=>e.id===m.id&&e.ownerUid===p.uid&&e.kind==='cage'&&!e.activeUntil);if(!e)return true;e.activeUntil=n+C.cageMs;e.expiresAt=e.activeUntil;publish(r,e);
  }else if(m.type==='cypher_neural'){
   const t=socket(r,m.targetUid),v=t&&r.data(t);if(p.ultUsed||!v?.joined||v.hp>0||v.team===p.team||v.realm||!v.lastDeathAt||n-v.lastDeathAt>C.corpseAgeMs||dist(p,v)>C.corpseRange)return fail('請瞄準附近剛倒下的敵人');p.ultUsed=true;r.save(w,p);const e={type:'cypher_hat',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,x:p.x,y:p.y-.3,z:p.z,tx:v.x,ty:v.y-2.05,tz:v.z,createdAt:n,nextPulseAt:n+C.hatFlightMs,pulses:2,expiresAt:n+C.hatFlightMs+C.neuralIntervalMs+1000};fx.hats.push(e);emit(r,e);
  }else return true;
 }
 await persist(r);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;
}
export async function tickCypher(r,n){const fx=cypherEffects(r);
 if(!playing(r)){fx.devices=[];fx.flights=[];fx.hats=[];await persist(r);return false;}
 for(const e of [...fx.devices]){
  if(e.activeUntil&&e.activeUntil<=n){await remove(r,e,n);continue;}
  if(e.kind!=='wire')continue;const ow=socket(r,e.ownerUid),owner=ow&&r.data(ow),online=owner?.hp>0&&owner.active&&owner.agent==='cypher'&&!owner.realm;
  if(!online&&e.targetUid){const w=socket(r,e.targetUid),p=w&&r.data(w);if(p){p.cypherSnaredUntil=0;p.cypherAnchor=null;r.save(w,p);}e.targetUid=null;publish(r,e);}if(!online||n<e.armedAt)continue;
  if(e.targetUid){const w=socket(r,e.targetUid),p=w&&r.data(w);if(!vulnerable(p,e,n)||!p.cypherAnchor||dist(p,{...p,x:p.cypherAnchor.x,z:p.cypherAnchor.z})>C.tetherRadius+1){if(p){p.cypherSnaredUntil=0;p.cypherAnchor=null;r.save(w,p);}e.targetUid=null;e.armedAt=n+C.wireResetMs;publish(r,e);}else if(n>=e.releaseAt){p.cypherConcussUntil=n+C.concussMs;p.cypherSnaredUntil=0;p.cypherAnchor=null;reveal(p,e.team,n);r.save(w,p);await abilityDamage(r,w,p,5,{...e,id:e.id+':'+n,cause:'cypher',weaponName:'TRAPWIRE'},n);e.targetUid=null;e.armedAt=n+C.wireResetMs;publish(r,e);}continue;}
  for(const w of r.sockets()){const p=r.data(w);if(!vulnerable(p,e,n))continue;const at=wireContact(p,e);if(!at.hit)continue;e.targetUid=p.uid;e.releaseAt=n+C.snareMs;p.cypherSnaredUntil=e.releaseAt;p.cypherAnchor={id:e.id,x:at.x,z:at.z};reveal(p,e.team,n,C.snareMs);r.save(w,p);publish(r,e);break;}
 }
 for(const w of r.sockets()){const p=r.data(w);if(!p?.joined)continue;const s=cypherState(p);if(s.control&&(p.hp<=0||p.realm||p.agent!=='cypher'||detained(p,n)))s.control=null;if(s.removeUntil){if(!p.cypherTag||p.hp<=0||p.realm||detained(p,n))s.removeUntil=0;else if(n>=s.removeUntil){p.cypherTag=null;s.removeUntil=0;}}
  const tag=p.cypherTag;if(tag){const ow=socket(r,tag.ownerUid),owner=ow&&r.data(ow);if(p.hp<=0||p.realm||!owner||owner.hp<=0||owner.agent!=='cypher')p.cypherTag=null;else if(n>=tag.nextPulseAt){if(!cloveInvulnerable(p,n))reveal(p,tag.team,n,C.tagRevealMs);tag.nextPulseAt=n+C.tagPulseMs;}}r.save(w,p);
 }
 for(const h of fx.hats)if(h.pulses>0&&n>=h.nextPulseAt){for(const w of r.sockets()){const p=r.data(w);if(vulnerable(p,h,n)){reveal(p,h.team,n,1000);r.save(w,p);}}h.pulses--;h.nextPulseAt=n+C.neuralIntervalMs;emit(r,{type:'cypher_pulse',id:h.id,team:h.team});}
 fx.hats=fx.hats.filter(h=>h.expiresAt>n);fx.flights=fx.flights.filter(f=>f.createdAt+C.flightMs>n);await persist(r);await r.rounds.elimination();return fx.devices.length>0||fx.hats.length>0||fx.flights.length>0||r.sockets().some(w=>{const p=r.data(w);return p?.cypherTag||p?.cypher?.removeUntil>n;});
}
