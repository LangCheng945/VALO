import {batchAbilityImmune,interceptBatchLethal} from './agent-batch-rules.mjs';
import{SOVA,sovaState,sovaBusy,sovaFlight,reconPulse,reveal}from'./sova-rules.mjs';
import{finite,WEAPONS,applyDamage}from'./protocol.mjs';
import{isoDamage,pointSegmentDistance}from'./iso-rules.mjs';
import{cloveInvulnerable}from'./clove-rules.mjs';
import{recordCloveDeath,awardCloveContributors}from'./clove-events.mjs';
import{awardIsoOrbs}from'./iso-events.mjs';
import{awardReynaSouls}from'./reyna-events.mjs';
import{markArmorDamage}from'./armor.mjs';
export const sovaEffects=room=>(room.sovaEffects||={flights:[],recons:[],beams:[]});
const persist=room=>room.ctx.storage.put('sovaEffects',sovaEffects(room));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const point=p=>p&&['x','y','z'].every(k=>finite(p[k]));
const direction=m=>['dx','dy','dz'].every(k=>finite(m[k],-1,1))&&Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)<.05;
const playing=room=>!room.rounds.enabled||room.meta.round.phase==='playing';
export function liveSovaEffects(room,now){const e=sovaEffects(room);return{flights:e.flights.filter(v=>v.createdAt+SOVA.flightMs>now),recons:e.recons.filter(v=>v.expiresAt>now),beams:e.beams.filter(v=>v.firesAt+500>now)};}
export async function cancelSova(room,ws,p,now){if(!p.sova?.control)return;p.sova.control=null;sovaEffects(room).beams=sovaEffects(room).beams.filter(e=>e.ownerUid!==p.uid);room.save(ws,p);await persist(room);room.broadcast({type:'event',event:{type:'sova_control_end',ownerUid:p.uid}});}
export async function abilityDamage(room,ws,p,raw,e,now){
 if((!e.weaponDamage&&batchAbilityImmune(p,now))||p.hp<=0||!p.active||p.realm||p.omen?.channel?.kind==='ultimate'||cloveInvulnerable(p,now))return;
 const damage=isoDamage(p,raw*(p.team===e.team?.33:1),now,e.id);if(!damage){room.save(ws,p);return;}
 Object.assign(p,applyDamage(p,damage));markArmorDamage(p,now);p.lastDamage=now;p.damageContributors||={};if(p.team!==e.team)p.damageContributors[e.ownerUid]=now;
 if(e.kind==='beam'&&p.team!==e.team)reveal(p,e.team,now,2000);
 const intercepted=interceptBatchLethal(p,now,e);if(intercepted?.position)room.send(ws,{type:'event',event:{type:'batch_relocate',position:intercepted.position}});if(intercepted)await room.ctx.storage.setAlarm(now+100);
 if(p.hp<=0){const socket=room.sockets().find(s=>room.data(s)?.uid===e.ownerUid),killer=socket&&room.data(socket);if(killer&&killer.uid!==p.uid&&killer.team!==p.team){await awardReynaSouls(room,killer,p,now);await awardIsoOrbs(room,killer,p,now);awardCloveContributors(room,killer,p,now);killer.kills++;room.save(socket,killer);}recordCloveDeath(p,now);p.deaths++;p.shieldReserve=0;p.healRemaining=0;p.active=false;p.respawnAt=room.rounds.enabled?0:now+5000;room.broadcast({type:'event',event:{type:'kill',killerUid:e.ownerUid,killerName:e.ownerName,victimUid:p.uid,victimName:p.name,weaponName:e.weaponName||(e.kind==='beam'?"HUNTER'S FURY":'SHOCK BOLT'),isHead:false}});}
 room.save(ws,p);room.send(ws,{type:'damage',hp:p.hp,shield:p.shield,tempHealth:p.tempHealth||0,attacker:e.ownerName,cause:e.cause||'sova'});if(p.hp<=0)await room.spike.drop(p,now);
}
export async function damageSovaObject(room,selection,damage,now){
 const effects=sovaEffects(room),recon=selection.kind==='sova-recon'&&effects.recons.find(e=>e.id===selection.id&&e.expiresAt>now&&e.hp>0);
 const socket=selection.kind==='sova-drone'&&room.sockets().find(s=>room.data(s)?.uid===selection.id),target=socket&&room.data(socket),drone=target?.sova?.control;
 if(recon){recon.hp=Math.max(0,recon.hp-damage);if(!recon.hp){effects.recons=effects.recons.filter(e=>e.id!==recon.id);room.broadcast({type:'event',event:{type:'sova_recon_end',id:recon.id}});}}
 else if(drone?.kind==='drone'&&drone.endsAt>now&&drone.hp>0){drone.hp=Math.max(0,drone.hp-damage);room.save(socket,target);if(!drone.hp)await cancelSova(room,socket,target,now);}else return false;
 await persist(room);return true;
}
export async function sovaEvent(room,ws,p,m,now){
 if(!m.type.startsWith('sova_'))return false;
 const fail=reason=>{room.send(ws,{type:'ability_error',reason});return true;},effects=sovaEffects(room);
 if(!playing(room))return fail('回合結束後無法施放技能');
 if(m.type==='sova_object_hit'){
  const recon=effects.recons.find(e=>e.id===m.id&&e.expiresAt>now),socket=room.sockets().find(s=>room.data(s)?.uid===m.ownerUid),target=socket&&room.data(socket),drone=target?.sova?.control?.kind==='drone'?target.sova.control:null,object=recon||drone;
  if(!object||p.hp<=0||!p.active||p.realm||sovaBusy(p)||cloveInvulnerable(p,now)||p.shotUsed||now-p.lastShot>400||!p.shotEnd||dist(p.shotEnd,object)>(recon?.8:1.2)||p.weapon==='melee'&&dist(p,object)>4.5)return true;
  p.shotUsed=true;room.save(ws,p);await damageSovaObject(room,{kind:recon?'sova-recon':'sova-drone',id:recon?recon.id:target.uid},WEAPONS[p.shotWeapon||p.weapon]?.body||0,now);room.snapshot();return true;
 }
 if(m.type==='sova_recon_seen'){
  const recon=effects.recons.find(e=>e.id===m.id&&e.expiresAt>now);if(recon&&reconPulse(recon,now)&&p.hp>0&&p.active&&!p.realm&&p.team!==recon.team&&!cloveInvulnerable(p,now)&&dist(p,recon)<SOVA.reconRadius){reveal(p,recon.team,now);room.save(ws,p);room.queueSnapshot?.();}return true;
 }
 const report=['sova_contact'].includes(m.type);
 if(!report&&(p.agent!=='sova'||p.hp<=0||!p.active||p.realm))return fail('目前無法施放 Sova 技能');
 const s=sovaState(p);
 if(m.type==='sova_cancel'){await cancelSova(room,ws,p,now);room.snapshot();return true;}
 if(m.type==='sova_drone_move'){
  const c=s.control;if(c?.kind!=='drone'||!point(m)||dist(c,m)>SOVA.droneSpeed*Math.min(.5,Math.max(.025,(now-c.lastMoveAt)/1000))+1.2||dist(c.origin,m)>SOVA.droneRange||Math.abs(m.y-c.origin.y)>12)return fail('無人機位置無效');Object.assign(c,{x:m.x,y:m.y,z:m.z,lastMoveAt:now});room.save(ws,p);room.queueSnapshot();return true;
 }
 if(m.type==='sova_dart'){
  const c=s.control;if(c?.kind!=='drone'||now<(c.dartReadyAt||0)||!direction(m))return fail('標記彈冷卻中');c.dartReadyAt=now+SOVA.dartCooldownMs;const end={x:c.x+m.dx*SOVA.dartRange,y:c.y+m.dy*SOVA.dartRange,z:c.z+m.dz*SOVA.dartRange};
  const target=room.sockets().find(s=>room.data(s)?.uid===m.targetUid),v=target&&room.data(target);if(v?.hp>0&&v.active&&!v.realm&&v.team!==p.team&&!cloveInvulnerable(v,now)&&pointSegmentDistance({...v,y:v.y-1},c,end)<1.2){reveal(v,p.team,now,SOVA.tagMs);room.save(target,v);}room.broadcast({type:'event',event:{type:'sova_dart',x:c.x,y:c.y,z:c.z,ex:end.x,ey:end.y,ez:end.z,ownerUid:p.uid}});
 }else if(m.type==='sova_arrow'){
  if(sovaBusy(p)||!direction(m)||!finite(m.charge,0,1)||!Number.isInteger(m.bounces)||m.bounces<0||m.bounces>2||!['shock','recon'].includes(m.kind))return fail('箭矢資料無效');
  if(m.kind==='shock'){if((s.qUsed||0)>=2)return fail('電擊箭已用盡');s.qUsed=(s.qUsed||0)+1;}else{if((s.reconReadyAt||0)>now)return fail('偵察箭正在補充');s.reconReadyAt=now+SOVA.reconRechargeMs;}
  const speed=SOVA.arrowMinSpeed+(SOVA.arrowMaxSpeed-SOVA.arrowMinSpeed)*m.charge,f={type:'sova_flight',kind:m.kind,id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-.15,z:p.z,vx:m.dx*speed,vy:m.dy*speed,vz:m.dz*speed,bounces:m.bounces,createdAt:now,segmentAt:now};effects.flights.push(f);room.broadcast({type:'event',event:f});
 }else if(m.type==='sova_contact'){
  const f=effects.flights.find(e=>e.id===m.id&&e.ownerUid===p.uid),contactAt=f&&finite(m.at,now-600,now+100)&&m.at>=f.segmentAt?Math.min(now,m.at):now;if(!f||!point(m)||f.createdAt+SOVA.flightMs<now||dist(sovaFlight(f,contactAt),m)>3||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return fail('箭矢接觸資料無效');
  if(f.bounces>0){const vy=f.vy-SOVA.gravity*(contactAt-f.segmentAt)/1000,dot=f.vx*m.nx+vy*m.ny+f.vz*m.nz;if(dot>=0)return true;Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:(f.vx-2*dot*m.nx)*.85,vy:(vy-2*dot*m.ny)*.85,vz:(f.vz-2*dot*m.nz)*.85,bounces:f.bounces-1,segmentAt:contactAt});room.broadcast({type:'event',event:f});}
  else{effects.flights=effects.flights.filter(e=>e.id!==f.id);room.broadcast({type:'event',event:{type:'sova_flight_end',id:f.id}});
   if(f.kind==='recon'){const e={...f,type:'sova_recon',x:m.x,y:m.y,z:m.z,hp:SOVA.reconHp,createdAt:now,expiresAt:now+SOVA.reconArmMs+SOVA.pulseMs*SOVA.pulses};effects.recons.push(e);room.broadcast({type:'event',event:e});}
   else{const e={...f,type:'sova_shock',x:m.x,y:m.y,z:m.z};room.broadcast({type:'event',event:e});for(const socket of room.sockets()){const v=room.data(socket);if(!v?.joined)continue;const distance=dist({...v,y:v.y-1},m);if(distance<SOVA.shockRadius)await abilityDamage(room,socket,v,SOVA.shockDamage*(1-distance/SOVA.shockRadius),e,now);}await room.rounds.elimination();p=room.data(ws);}
  }
 }else if(m.type==='sova_drone'){
  if(sovaBusy(p)||s.cUsed)return fail('無人機已使用');s.cUsed=true;s.control={kind:'drone',origin:{x:p.x,y:p.y,z:p.z},x:p.x,y:p.y,z:p.z,hp:SOVA.droneHp,lastMoveAt:now,endsAt:now+SOVA.droneMs};p.shotUsed=true;await room.spike.cancel(p.uid,now);p.spikeEquipped=false;
 }else if(m.type==='sova_ultimate'){
  if(sovaBusy(p)||p.ultUsed)return fail('獵人之怒已使用');p.ultUsed=true;s.control={kind:'ultimate',origin:{x:p.x,y:p.y,z:p.z},remaining:3,endsAt:now+SOVA.ultMs,beamReadyAt:now};p.shotUsed=true;await room.spike.cancel(p.uid,now);p.spikeEquipped=false;
 }else if(m.type==='sova_beam'){
  const c=s.control;if(c?.kind!=='ultimate'||c.remaining<=0||now<c.beamReadyAt||!direction(m))return fail('等待光束蓄力完成');c.remaining--;c.beamReadyAt=now+SOVA.beamIntervalMs;const e={type:'sova_beam_warn',kind:'beam',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-.5,z:p.z,dx:m.dx,dy:m.dy,dz:m.dz,createdAt:now,firesAt:now+SOVA.beamWindupMs};effects.beams.push(e);room.broadcast({type:'event',event:e});
 }else return true;
 room.save(ws,p);await persist(room);room.snapshot();await room.ctx.storage.setAlarm(now+100);return true;
}
export async function tickSova(room,now){const e=sovaEffects(room);let pending=false;
 for(const ws of room.sockets()){const p=room.data(ws);if(!p?.joined)continue;const c=p.sova?.control;if(c){if(p.hp<=0||p.realm||!playing(room)||now>=c.endsAt)await cancelSova(room,ws,p,now);else pending=true;}pending ||=p.sovaRevealUntil>now||p.sova?.reconReadyAt>now;}
 if(!playing(room)){e.flights=[];e.recons=[];e.beams=[];await persist(room);return pending;}
 for(const beam of [...e.beams]){if(now<beam.firesAt){pending=true;continue;}e.beams=e.beams.filter(v=>v.id!==beam.id);const owner=room.sockets().find(s=>room.data(s)?.uid===beam.ownerUid),p=owner&&room.data(owner);if(!p?.sova?.control||p.hp<=0)continue;
  const end={x:beam.x+beam.dx*SOVA.beamRange,y:beam.y+beam.dy*SOVA.beamRange,z:beam.z+beam.dz*SOVA.beamRange};room.broadcast({type:'event',event:{...beam,type:'sova_beam_fire'}});
  for(const socket of room.sockets()){const v=room.data(socket);if(v?.joined&&v.uid!==beam.ownerUid&&pointSegmentDistance({...v,y:v.y-1},beam,end)<SOVA.beamRadius)await abilityDamage(room,socket,v,SOVA.beamDamage,beam,now);}
  const current=room.data(owner);if(current?.sova?.control?.remaining===0)await cancelSova(room,owner,current,now);await room.rounds.elimination();
 }
 e.flights=e.flights.filter(f=>f.createdAt+SOVA.flightMs>now);e.recons=e.recons.filter(r=>r.expiresAt>now);pending ||=e.flights.length>0||e.recons.length>0||e.beams.length>0;await persist(room);return pending;
}
