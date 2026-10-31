import{finite,validPose}from'./protocol.mjs';
import{CLOVE,cloveState,smokeCharges,smokeAnchor,canCloveRevive,cloveDeath,awardTakedown,applyDecay,tickCloveStatuses,meddlePosition}from'./clove-rules.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const validPoint=p=>validPose({...p,yaw:0});
export const liveCloveEffects=(room,now)=>({smokes:(room.cloveEffects?.smokes||[]).filter(s=>s.expiresAt>now),flights:(room.cloveEffects?.flights||[]).filter(f=>f.createdAt+CLOVE.meddleFuseMs>now)});
const persist=room=>room.ctx.storage.put('cloveEffects',room.cloveEffects);
export async function detonateMeddle(room,f,position,now){
 room.cloveEffects.flights=room.cloveEffects.flights.filter(t=>t.id!==f.id);
 for(const socket of room.sockets()){if(room.rounds.enabled&&room.meta.round.phase!=='playing')continue;const target=room.data(socket);if(!target?.joined||target.hp<=0||!target.inRound&&room.rounds.enabled)continue;if(distance({...target,y:target.y-1},position)<=CLOVE.meddleRadius){applyDecay(target,now);room.save(socket,target);room.send(socket,{type:'damage',hp:target.hp,shield:target.shield,tempHealth:target.tempHealth||0,attacker:'減損',cause:'decay'});}}
 room.broadcast({type:'event',event:{type:'clove_meddle_burst',id:f.id,...position,createdAt:now}});await persist(room);room.snapshot();
}
export async function cloveEvent(room,ws,p,m,now){
 if(!m.type.startsWith('clove_'))return false;
 const fail=reason=>room.send(ws,{type:'ability_error',reason});
 if(p.agent!=='clove'||room.rounds.enabled&&room.meta.round.phase!=='playing'){fail('目前無法施放 Clove 技能');return true;}
 const c=cloveState(p);if(c.escapeUntil>now){fail('脫離狀態結束後才能施放');return true;}room.cloveEffects ||= {smokes:[],flights:[]};
 if(m.type==='clove_smokes'){
  const points=m.points,anchor=smokeAnchor(p),range=p.hp>0?CLOVE.smokeRange:CLOVE.deadSmokeRange;
  if(p.hp>0&&!p.active||!Array.isArray(points)||!points.length||points.length>smokeCharges(p,now)||points.length>2||points.some(t=>!validPoint(t)||Math.hypot(t.x-anchor.x,t.z-anchor.z)>range||Math.abs(t.y-anchor.y)>16)){fail('煙霧位置超出範圍或尚未補充');return true;}
  for(const point of points){const effect={type:'clove_smoke',id:crypto.randomUUID(),ownerUid:p.uid,...{x:point.x,y:point.y,z:point.z},createdAt:now,expiresAt:now+CLOVE.smokeMs};c.smokeReady.push(now+CLOVE.smokeRechargeMs);room.cloveEffects.smokes.push(effect);room.broadcast({type:'event',event:effect});}
 }else if(m.type==='clove_pickup'){
  if(p.hp<=0||!p.active||c.cUsed||!c.takedown||now-c.takedown.at>CLOVE.pickupWindowMs){fail('近期擊殺或傷害助攻後才能汲取生命');return true;}
  c.cUsed=true;c.pickupUntil=now+CLOVE.pickupMs;p.tempHealth=Math.max(0,150-p.hp);
 }else if(m.type==='clove_meddle'){
  if(p.hp<=0||!p.active||c.qUsed||!validPoint(m)||distance(p,m)>3||!['dx','dy','dz'].every(k=>finite(m[k],-1.1,1.1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.1){fail('減損靈球尚未就緒');return true;}
  c.qUsed=true;const f={type:'clove_meddle_launch',id:crypto.randomUUID(),ownerUid:p.uid,x:m.x,y:m.y,z:m.z,dx:m.dx,dy:m.dy,dz:m.dz,createdAt:now};room.cloveEffects.flights.push(f);room.broadcast({type:'event',event:f});
 }else if(m.type==='clove_meddle_land'){
  const f=room.cloveEffects.flights.find(f=>f.id===m.id&&f.ownerUid===p.uid);
  if(!f||!validPoint(m)||now-f.createdAt<40||now-f.createdAt>CLOVE.meddleFuseMs+250||distance(m,meddlePosition(f,now))>6)return true;
  await detonateMeddle(room,f,m,now);return true;
 }else if(m.type==='clove_revive'){
  if(!canCloveRevive(p,now)){fail('請在倒地後的復活時限內按 X');return true;}
  p.ultUsed=true;c.reviveWindow=0;c.riseAt=now+CLOVE.riseMs;room.broadcast({type:'event',event:{type:'clove_rise',ownerUid:p.uid,...c.deathPosition,riseAt:c.riseAt}});
 }else return true;
 room.save(ws,p);await persist(room);room.snapshot();await room.ctx.storage.setAlarm(now+100);return true;
}
export function recordCloveDeath(p,now){if(p.agent==='clove')cloveDeath(p,now);p.tempHealth=0;p.decayAmount=0;p.decayUntil=0;}
export function awardCloveContributors(room,killer,victim,now){
 awardTakedown(killer,victim,now);
 for(const socket of room.sockets()){const contributor=room.data(socket);if(contributor?.uid===killer.uid||contributor?.team!==killer.team)continue;if(now-(victim.damageContributors?.[contributor.uid]||0)<=CLOVE.assistWindowMs){awardTakedown(contributor,victim,now);room.save(socket,contributor);}}
 victim.damageContributors={};
}
export async function tickClove(room,now){
 let pending=false,elimination=false;room.cloveEffects ||= {smokes:[],flights:[]};
 const old=room.cloveEffects.smokes.length;room.cloveEffects.smokes=room.cloveEffects.smokes.filter(s=>s.expiresAt>now);
 if(old!==room.cloveEffects.smokes.length)await persist(room);pending ||=room.cloveEffects.smokes.length>0;
 for(const f of [...room.cloveEffects.flights]){pending=true;if(now>=f.createdAt+CLOVE.meddleFuseMs)await detonateMeddle(room,f,meddlePosition(f,now),now);}
 for(const ws of room.sockets()){
  const p=room.data(ws);if(!p?.joined||p.mapPending)continue;pending=tickCloveStatuses(p,now)||pending;const c=p.clove;
  if(p.agent==='clove'&&c){
   if(room.rounds.enabled&&room.meta.round.phase!=='playing'){c.reviveWindow=0;c.riseAt=0;c.escapeUntil=0;c.surviveUntil=0;}
   if(c.riseAt){if(room.rounds.enabled&&room.meta.round.phase!=='playing'){c.riseAt=0;c.reviveWindow=0;}else if(now>=c.riseAt){Object.assign(p,{hp:100,shield:0,shieldReserve:0,tempHealth:0,active:false,healRemaining:0,respawnAt:0});c.riseAt=0;c.escapeUntil=now+CLOVE.escapeMs;c.surviveUntil=c.escapeUntil+CLOVE.surviveMs;room.save(ws,p);room.send(ws,{type:'spawn',player:room.players().find(t=>t.uid===p.uid)});room.broadcast({type:'event',event:{type:'clove_revived',ownerUid:p.uid}});}pending=true;}
   if(c.reviveWindow){if(now>=c.reviveWindow){c.reviveWindow=0;elimination=true;}else pending=true;}
   if(c.surviveUntil&&p.hp>0){if(now>=c.surviveUntil){p.hp=0;p.shield=0;p.active=false;p.deaths++;p.respawnAt=room.rounds.enabled?0:now+5000;cloveDeath(p,now,{allowRevive:false});room.save(ws,p);await room.spike.drop(p,now);room.send(ws,{type:'damage',hp:0,shield:0,tempHealth:0,attacker:'復活後未完成擊殺或助攻',cause:'clove'});room.broadcast({type:'event',event:{type:'clove_expired',ownerUid:p.uid}});elimination=true;}else pending=true;}
   if((c.smokeReady||[]).some(t=>t>now))pending=true;
  }
  room.save(ws,p);
 }
 if(elimination)await room.rounds.elimination();return pending;
}
