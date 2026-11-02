import{REYNA,reynaState,reynaBusy,reynaDismissed,empressActive,beginDevour,tickDevour,gazeAt}from'./reyna-rules.mjs';
import{finite,WEAPONS}from'./protocol.mjs';
import{cloveInvulnerable}from'./clove-rules.mjs';
export const reynaEffects=room=>(room.reynaEffects||={eyes:[],orbs:[]});
const persist=room=>room.ctx.storage.put('reynaEffects',reynaEffects(room));
export function liveReynaEffects(room,uid,now){const s=reynaEffects(room);return{eyes:s.eyes.filter(e=>e.expiresAt>now),orbs:s.orbs.filter(e=>e.ownerUid===uid&&e.expiresAt>now)};}
export async function awardReynaSouls(room,killer,victim,now){
 if(victim.realm||killer.team===victim.team)return;
 const effects=reynaEffects(room);
 for(const ws of room.sockets()){
  const saved=room.data(ws),p=saved?.uid===killer.uid?killer:saved;
  if(!p?.joined||p.agent!=='reyna'||p.hp<=0||p.realm||p.team!==killer.team||p.uid!==killer.uid&&now-(victim.damageContributors?.[p.uid]||0)>REYNA.assistMs)continue;
  const orb={type:'reyna_orb',id:crypto.randomUUID(),ownerUid:p.uid,x:victim.x,y:victim.y-1,z:victim.z,expiresAt:now+REYNA.orbMs};effects.orbs.push(orb);room.send(ws,{type:'event',event:orb});
  if(empressActive(p,now)){if(p.uid===killer.uid)reynaState(p).empressUntil=now+REYNA.empressMs;beginDevour(p,orb,now,true);}room.save(ws,p);
 }
 await persist(room);
}
export async function reynaEvent(room,ws,p,m,now){
 if(!m.type.startsWith('reyna_'))return false;
 const fail=reason=>{room.send(ws,{type:'ability_error',reason});return true;},effects=reynaEffects(room);
 if(room.rounds.enabled&&room.meta.round.phase!=='playing')return fail('回合結束後無法施放技能');
 if(m.type==='reyna_eye_hit'){
  const eye=effects.eyes.find(e=>e.id===m.id&&e.expiresAt>now);
  if(!eye||p.hp<=0||!p.active||p.realm||cloveInvulnerable(p,now)||reynaBusy(p,now)||p.weapon==='melee'&&Math.hypot(p.x-eye.x,p.y-eye.y,p.z-eye.z)>4.5||p.shotUsed||now-p.lastShot>400||!p.shotEnd||Math.hypot(p.shotEnd.x-eye.x,p.shotEnd.y-eye.y,p.shotEnd.z-eye.z)>REYNA.eyeRadius+.7)return true;
  p.shotUsed=true;eye.hp-=WEAPONS[p.shotWeapon||p.weapon]?.body||0;room.save(ws,p);if(eye.hp<=0){effects.eyes=effects.eyes.filter(e=>e.id!==eye.id);room.broadcast({type:'event',event:{type:'reyna_eye_end',id:eye.id}});}await persist(room);room.snapshot();return true;
 }
 if(m.type==='reyna_exposed'){
  const eye=effects.eyes.find(e=>e.id===m.id&&e.expiresAt>now&&e.createdAt+REYNA.eyeArmMs<=now);
  if(eye&&p.hp>0&&p.active&&!p.realm&&eye.team!==p.team&&!cloveInvulnerable(p,now)&&gazeAt(p,eye)){p.leerUntil=now+350;room.save(ws,p);room.queueSnapshot?.();}return true;
 }
 if(p.agent!=='reyna'||p.hp<=0||!p.active||p.realm)return fail('目前無法施放 Reyna 技能');
 const s=reynaState(p);
 if(m.type==='reyna_cancel'){
  if(reynaDismissed(p,now)){s.dismissUntil=now;s.recoverUntil=now+REYNA.recoveryMs;}
 }else if(m.type==='reyna_tether'){
  if(s.heal&&!s.heal.automatic&&Math.hypot(p.x-s.heal.x,p.y-s.heal.y,p.z-s.heal.z)<=REYNA.soulRange){s.heal.visibleUntil=now+450;room.save(ws,p);}return true;
 }else{
  if(reynaBusy(p,now))return fail('消散結束後才能施放');
  if(m.type==='reyna_leer'){
   if((s.cUsed||0)>=2||!['dx','dy','dz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.05)return fail('致盲眼尚未就緒');
   s.cUsed=(s.cUsed||0)+1;const eye={type:'reyna_eye',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,x:p.x+m.dx*REYNA.eyeRange,y:p.y+m.dy*REYNA.eyeRange,z:p.z+m.dz*REYNA.eyeRange,createdAt:now,expiresAt:now+REYNA.eyeArmMs+REYNA.eyeMs,hp:REYNA.eyeHp};effects.eyes.push(eye);room.broadcast({type:'event',event:eye});
  }else if(m.type==='reyna_devour'||m.type==='reyna_dismiss'){
   const emp=empressActive(p,now);if(m.type==='reyna_devour'&&emp)return fail('女皇期間會自動吞噬');
   const orb=effects.orbs.find(e=>e.id===m.id&&e.ownerUid===p.uid&&e.expiresAt>now&&Math.hypot(p.x-e.x,p.y-e.y,p.z-e.z)<=REYNA.soulRange);
   if(!orb||!emp&&(s.soulUsed||0)>=2)return fail('需要範圍內的靈魂球與剩餘次數');
   effects.orbs=effects.orbs.filter(e=>e.id!==orb.id);room.send(ws,{type:'event',event:{type:'reyna_orb_end',id:orb.id}});
   if(!emp)s.soulUsed=(s.soulUsed||0)+1;
   if(m.type==='reyna_devour')beginDevour(p,orb,now);else{s.dismissUntil=now+REYNA.dismissMs;s.recoverUntil=s.dismissUntil+REYNA.recoveryMs;if(!emp)s.heal=null;p.shotUsed=true;p.spikeEquipped=false;await room.spike.cancel(p.uid,now);}
  }else if(m.type==='reyna_empress'){
   if(p.ultUsed)return fail('女皇已使用');p.ultUsed=true;s.empressUntil=now+REYNA.empressMs;
  }else return true;
 }
 room.save(ws,p);await persist(room);room.snapshot();await room.ctx.storage.setAlarm(now+100);return true;
}
export async function tickReyna(room,now){const effects=reynaEffects(room);const playing=!room.rounds.enabled||room.meta.round.phase==='playing';
 effects.eyes=playing?effects.eyes.filter(e=>e.expiresAt>now):[];effects.orbs=playing?effects.orbs.filter(e=>e.expiresAt>now):[];let pending=effects.eyes.length>0||effects.orbs.length>0;
 for(const ws of room.sockets()){const p=room.data(ws);if(!p?.joined||p.mapPending)continue;const s=p.reyna;
  if(s){if(p.hp<=0||p.realm||!playing){s.heal=null;s.dismissUntil=0;s.recoverUntil=0;if(!playing||p.hp<=0)s.empressUntil=0;}else{pending=tickDevour(p,now)||pending;pending ||=s.recoverUntil>now||s.empressUntil>now||s.overhealUntil>now;}room.save(ws,p);}
  pending ||=p.leerUntil>now;
 }
 await persist(room);return pending;
}
