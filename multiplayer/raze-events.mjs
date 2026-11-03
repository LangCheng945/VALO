import{RAZE as R,razeState,tickRazeState,razeEquipped,razeFlight,explosionDamage,satchelImpulse}from'./raze-rules.mjs';
import{finite,WEAPONS}from'./protocol.mjs';import{cloveInvulnerable}from'./clove-rules.mjs';import{detained}from'./killjoy-rules.mjs';import{abilityDamage}from'./sova-events.mjs';
export const razeEffects=r=>(r.razeEffects||={flights:[],devices:[]});
const persist=r=>r.ctx.storage.put('razeEffects',razeEffects(r)),emit=(r,e)=>r.broadcast({type:'event',event:e}),playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing';
const point=p=>p&&['x','y','z'].every(k=>finite(p[k])),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),dir=m=>['dx','dy','dz'].every(k=>finite(m[k],-1,1))&&Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)<.05;
export const liveRazeEffects=(r,n)=>{const e=razeEffects(r);return{flights:e.flights.filter(e=>e.expiresAt>n),devices:e.devices.filter(e=>e.expiresAt>n)};};
export async function damageRazeDevice(r,id,damage,n){const fx=razeEffects(r),e=fx.devices.find(e=>e.id===id&&e.hp>0&&e.expiresAt>n);if(!e)return false;e.hp=Math.max(0,e.hp-damage);if(!e.hp){fx.devices=fx.devices.filter(v=>v.id!==id);emit(r,{type:'raze_remove',id});}else emit(r,e);await persist(r);return true;}
async function blast(r,e,n){emit(r,{...e,type:'raze_blast',createdAt:n});for(const w of r.sockets()){const p=r.data(w);if(!p?.joined||p.hp<=0||!p.active||p.realm||cloveInvulnerable(p,n)||p.omen?.channel?.kind==='ultimate')continue;if(e.kind==='satchel'){const impulse=satchelImpulse(e,p);if(impulse){if(p.astra)p.astra.planning=false;r.save(w,p);r.send(w,{type:'event',event:{type:'raze_impulse',id:e.id,targetUid:p.uid,...impulse}});}if(p.uid===e.ownerUid)continue;}const damage=explosionDamage(e,p);if(damage>0)await abilityDamage(r,w,p,damage,{...e,cause:'raze',weaponName:e.kind==='rocket'?'SHOWSTOPPER':e.kind==='satchel'?'BLAST PACK':e.kind==='bot'?'BOOM BOT':'PAINT SHELLS'},n);}await r.rounds.elimination();}
export async function razeEvent(r,w,p,m,n){if(!m.type.startsWith('raze_'))return false;const fx=razeEffects(r),fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};
 if(m.type==='raze_stop'){if(p.raze)p.raze.equipped=false;r.save(w,p);r.snapshot();return true;}
 if(!playing(r))return fail('回合結束後無法施放技能');
 if(m.type==='raze_object_hit'){const e=fx.devices.find(e=>e.id===m.id&&e.expiresAt>n);if(!e||p.hp<=0||!p.active||p.realm||cloveInvulnerable(p,n)||detained(p,n)||razeEquipped(p,n))return true;
  if(p.weapon==='melee'){if(dist(p,e)>4.5||n-p.lastShot<420)return true;p.lastShot=n;}else{if(p.shotUsed||n-p.lastShot>400||!p.shotEnd||dist(p.shotEnd,{...e,y:e.y+.3})>1.2)return true;p.shotUsed=true;}
  r.save(w,p);await damageRazeDevice(r,e.id,WEAPONS[p.weapon==='melee'?'melee':p.shotWeapon||p.weapon]?.body||0,n);r.snapshot();return true;}
 if(m.type==='raze_contact'){
  const f=fx.flights.find(e=>e.id===m.id&&e.ownerUid===p.uid),at=f&&finite(m.at,n-600,n+100)?Math.min(n,m.at):n;if(!f||!point(m)||at<(f.segmentAt||f.createdAt)||dist(razeFlight(f,at),m)>3||f.expiresAt<n||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return true;
  const vy=f.vy-(f.kind==='rocket'?0:R.gravity*(at-(f.segmentAt||f.createdAt))/1000),dot=f.vx*m.nx+vy*m.ny+f.vz*m.nz;if(dot>=0)return true;
  if(f.kind==='rocket'){fx.flights=fx.flights.filter(e=>e.id!==f.id);emit(r,{type:'raze_flight_end',id:f.id});await blast(r,{...f,x:m.x,y:m.y,z:m.z,radius:R.rocketRadius,damage:R.rocketDamage},n);}
  else if(f.kind==='satchel'){fx.flights=fx.flights.filter(e=>e.id!==f.id);emit(r,{type:'raze_flight_end',id:f.id});const e={...f,type:'raze_device',x:m.x,y:m.y,z:m.z,hp:20,expiresAt:n+R.satchelMs};fx.devices.push(e);emit(r,e);}
  else{Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:(f.vx-2*dot*m.nx)*.55,vy:(vy-2*dot*m.ny)*.55,vz:(f.vz-2*dot*m.nz)*.55,segmentAt:at});emit(r,f);}
  await persist(r);r.snapshot();return true;
 }
 if(m.type==='raze_bot_move'){
  const e=fx.devices.find(e=>e.id===m.id&&e.ownerUid===p.uid&&e.kind==='bot'&&e.hp>0&&e.expiresAt>n);if(!e||!point(m)||!finite(m.yaw,-1000,1000)||dist(e,m)>R.botChase*Math.min(.5,Math.max(.025,(n-e.lastMoveAt)/1000))+.7||Math.abs(m.y-e.y)>1)return true;Object.assign(e,{x:m.x,y:m.y,z:m.z,yaw:m.yaw,lastMoveAt:n});const target=r.sockets().find(w=>r.data(w)?.uid===m.targetUid),v=target&&r.data(target);if(v?.hp>0&&v.active&&!v.realm&&v.team!==e.team&&!cloveInvulnerable(v,n)&&Math.hypot(v.x-e.x,v.y-1-e.y,v.z-e.z)<2){fx.devices=fx.devices.filter(v=>v.id!==e.id);emit(r,{type:'raze_remove',id:e.id});await blast(r,{...e,radius:R.botRadius,damage:R.botDamage},n);}else emit(r,e);await persist(r);return true;
 }
 if(p.agent!=='raze'||p.hp<=0||!p.active||p.realm||detained(p,n)||cloveInvulnerable(p,n))return fail('目前無法施放 Raze 技能');const s=tickRazeState(p,n);
 if(m.type==='raze_ult'){if(s.rocketReady&&s.rocketUntil>n)s.equipped=!s.equipped;else{if(p.ultUsed)return fail('火箭已使用');p.ultUsed=true;s.rocketReady=true;s.rocketUntil=n+R.rocketMs;s.equipped=true;}p.shotUsed=true;p.spikeEquipped=false;await r.spike.cancel(p.uid,n);}
 else if(m.type==='raze_detonate'){const e=fx.devices.find(e=>e.ownerUid===p.uid&&e.kind==='satchel');const f=fx.flights.find(e=>e.ownerUid===p.uid&&e.kind==='satchel');const target=e||f;if(!target)return true;fx.devices=fx.devices.filter(v=>v.id!==target.id);fx.flights=fx.flights.filter(v=>v.id!==target.id);emit(r,{type:'raze_remove',id:target.id});emit(r,{type:'raze_flight_end',id:target.id});await blast(r,{...target,...(f&&!e?razeFlight(f,n):{}),radius:R.satchelRadius,damage:R.satchelDamage},n);p=r.data(w);}
 else if(m.type==='raze_throw'){
  if(!dir(m)||!['grenade','satchel','rocket'].includes(m.kind))return fail('投射資料無效');const kind=m.kind;if(kind==='grenade'){if(s.eUsed)return fail('手榴彈尚未補充');s.eUsed=true;}if(kind==='satchel'){if(s.qUsed>=2)return fail('炸藥包已用盡');s.qUsed++;}if(kind==='rocket'){if(!razeEquipped(p,n))return fail('先裝備火箭');s.rocketReady=false;}s.equipped=false;
  const speed=kind==='rocket'?R.rocketSpeed:kind==='satchel'?R.satchelSpeed:R.grenadeSpeed,ms=kind==='grenade'?R.grenadeMs:kind==='rocket'?3000:R.flightMs,f={type:'raze_flight',id:crypto.randomUUID(),kind,ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-.3,z:p.z,vx:m.dx*speed,vy:m.dy*speed,vz:m.dz*speed,createdAt:n,expiresAt:n+ms};fx.flights.push(f);emit(r,f);
 }else if(m.type==='raze_bot'){
  if(s.cUsed||!point(m)||dist({...p,y:p.y-2.2},m)>4||!finite(m.yaw,-1000,1000))return fail('爆破機器人落點無效');s.cUsed=true;s.equipped=false;const e={type:'raze_device',kind:'bot',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:m.x,y:m.y,z:m.z,yaw:m.yaw,hp:R.botHp,createdAt:n,lastMoveAt:n,expiresAt:n+R.botMs};fx.devices.push(e);emit(r,e);
 }else return true;
 r.save(w,p);await persist(r);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;
}
export async function tickRaze(r,n){const fx=razeEffects(r),active=playing(r);let pending=false;for(const w of r.sockets()){const p=r.data(w);if(!p?.joined)continue;if(p.agent==='raze'){const s=tickRazeState(p,n,!active||!p.active||detained(p,n));r.save(w,p);pending ||=s.rocketReady&&s.rocketUntil>n;}}
 if(!active){fx.flights=[];fx.devices=[];await persist(r);return pending;}
 for(const f of [...fx.flights])if(n>=f.expiresAt){fx.flights=fx.flights.filter(e=>e.id!==f.id);emit(r,{type:'raze_flight_end',id:f.id});if(f.kind==='grenade'||f.kind==='cluster'){const at=razeFlight(f,f.expiresAt);await blast(r,{...f,...at,radius:f.kind==='grenade'?R.grenadeRadius:R.clusterRadius,damage:R.clusterDamage},n);if(f.kind==='grenade')for(let i=0;i<4;i++){const a=i*Math.PI/2,e={...f,...at,type:'raze_flight',id:crypto.randomUUID(),kind:'cluster',vx:Math.cos(a)*4,vy:5,vz:Math.sin(a)*4,createdAt:n,segmentAt:n,expiresAt:n+R.clusterMs};fx.flights.push(e);emit(r,e);}}}
 for(const e of [...fx.devices])if(n>=e.expiresAt){fx.devices=fx.devices.filter(v=>v.id!==e.id);emit(r,{type:'raze_remove',id:e.id});if(e.kind==='satchel')await blast(r,{...e,radius:R.satchelRadius,damage:R.satchelDamage},n);}
 await persist(r);return pending||fx.flights.length>0||fx.devices.length>0;
}
