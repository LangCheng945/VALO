import {sovaBusy} from './sova-rules.mjs';
import {cloveInvulnerable} from './clove-rules.mjs';
import{finite,validPose}from'./protocol.mjs';
import{ISO,isoState,focusActive,pointSegmentDistance,projectilePosition,wallIntersection,duelSpawn,sameRealm}from'./iso-rules.mjs';
import{recordCloveDeath}from'./clove-events.mjs';
const pose=p=>({x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch||0});
export function isoEffects(room){return room.isoEffects||=( {walls:[],flights:[],orbs:[],duel:null});}
const persist=room=>room.ctx.storage.put('isoEffects',isoEffects(room));
export function liveIsoEffects(room,uid,now){const s=isoEffects(room);return{walls:s.walls.filter(w=>w.createdAt+ISO.wallMs>now),flights:s.flights.filter(f=>f.createdAt+ISO.undercutMs>now),orbs:s.orbs.filter(o=>o.ownerUid===uid&&o.expiresAt>now),duel:s.duel};}
export function isoShotBlock(room,p,a,b,now){const s=isoEffects(room);if(p.realm)return s.duel?.id===p.realm&&now<s.duel.startsAt?{...a,t:0}:null;return s.walls.map(w=>wallIntersection(w,a,b,now)).filter(Boolean).sort((a,b)=>a.t-b.t)[0]||null;}
export async function isoEvent(room,ws,p,m,now){
 if(!m.type.startsWith('iso_'))return false;const fail=reason=>{room.send(ws,{type:'ability_error',reason});return true;};
 if(p.hp<=0||!p.active||p.realm||p.agent!=='iso'||room.rounds.enabled&&room.meta.round.phase!=='playing')return fail('目前無法施放 Iso 技能');
 const s=isoState(p),effects=isoEffects(room),direction=()=>['dx','dy','dz'].every(k=>finite(m[k],-1.1,1.1))&&Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)<.1;
 if(m.type==='iso_wall'){
  if(s.cUsed||!direction()||Math.hypot(m.dx,m.dz)<.8)return fail('擋彈牆尚未就緒');s.cUsed=true;const length=Math.hypot(m.dx,m.dz),dx=m.dx/length,dz=m.dz/length,w={type:'iso_wall',id:crypto.randomUUID(),ownerUid:p.uid,x:p.x+dx*1.4,y:p.y-2.2,z:p.z+dz*1.4,dx,dz,createdAt:now};effects.walls.push(w);room.broadcast({type:'event',event:w});
 }else if(m.type==='iso_undercut'){
  if((s.qUsed||0)>=2||!direction())return fail('易傷能量尚未就緒');s.qUsed=(s.qUsed||0)+1;const f={type:'iso_undercut',id:crypto.randomUUID(),ownerUid:p.uid,x:p.x,y:p.y-1,z:p.z,dx:m.dx,dy:m.dy,dz:m.dz,createdAt:now,lastAt:now,hitUids:[]};effects.flights.push(f);room.broadcast({type:'event',event:f});
 }else if(m.type==='iso_focus'){
  if(s.eUsed)return fail('雙重防護已使用');s.eUsed=true;s.armAt=now+ISO.focusArmMs;s.focusUntil=s.armAt+ISO.focusMs;s.shield=true;
 }else if(m.type==='iso_orb_hit'){
  const orb=effects.orbs.find(o=>o.id===m.id&&o.ownerUid===p.uid&&o.expiresAt>now);if(!orb||!focusActive(p,now)||p.shotUsed||now-p.lastShot>400||!p.shotEnd||Math.hypot(p.shotEnd.x-orb.x,p.shotEnd.y-orb.y,p.shotEnd.z-orb.z)>ISO.orbRadius+.35||p.weapon==='melee')return true;
  p.shotUsed=true;s.shield=true;s.focusUntil=now+ISO.focusMs;effects.orbs=effects.orbs.filter(o=>o.id!==orb.id);room.send(ws,{type:'event',event:{type:'iso_orb_remove',id:orb.id}});
 }else if(m.type==='iso_duel'){
  if(!p.isoClient)return fail('請重新整理網站後使用獨立決鬥');if(p.ultUsed||!direction())return fail('決鬥大招尚未就緒');if(effects.duel)return fail('已有進行中的獨立決鬥');
  p.ultUsed=true;room.save(ws,p);
  const candidates=room.sockets().filter(v=>v!==ws).map(socket=>({socket,player:room.data(socket)})).filter(({player:v})=>{if(sovaBusy(v||{})||v?.omen?.channel||cloveInvulnerable(v||{},now)||!v?.joined||!v.isoClient||v.hp<=0||!v.active||v.team===p.team||v.realm||v.clove?.escapeUntil>now)return false;const dx=v.x-p.x,dy=v.y-p.y,dz=v.z-p.z,along=dx*m.dx+dy*m.dy+dz*m.dz;return along>0&&along<ISO.ultRange&&Math.hypot(dx-along*m.dx,dy-along*m.dy,dz-along*m.dz)<ISO.ultWidth;}).sort((a,b)=>Math.hypot(a.player.x-p.x,a.player.z-p.z)-Math.hypot(b.player.x-p.x,b.player.z-p.z));
  if(!candidates.length){room.send(ws,{type:'ability_error',reason:'大招未捕捉到敵人'});room.snapshot();return true;}
  const target=candidates[0],duel={id:crypto.randomUUID(),aUid:p.uid,bUid:target.player.uid,startsAt:now+ISO.duelWarmupMs,endsAt:now+ISO.duelWarmupMs+ISO.duelMs};effects.duel=duel;
  for(const [index,socket,player]of [[0,ws,p],[1,target.socket,target.player]]){await room.spike.drop(player,now);player.isoReturn={...pose(player),hp:player.hp,shield:player.shield,armorType:player.armorType,shieldReserve:player.shieldReserve||0,tempHealth:player.tempHealth||0};Object.assign(player,duelSpawn(index),{realm:duel.id,hp:100,shield:50,armorType:'heavy',shieldReserve:0,tempHealth:0,healRemaining:0,decayAmount:0,decayUntil:0,vulnerableUntil:0,nearsightUntil:0,deafenedUntil:0,leerUntil:0,sovaRevealUntil:0,detainedUntil:0,spikeEquipped:false,lastShot:0,shotUsed:true});if(player.weapon==='bladestorm')player.weapon=player.primaryWeapon||'vandal';room.save(socket,player);}
  await persist(room);for(const socket of [ws,target.socket])room.send(socket,{type:'iso_relocate',player:room.players().find(v=>v.uid===room.data(socket).uid)});room.broadcast({type:'event',event:{type:'iso_duel_start',...duel}});
 }else return true;
 room.save(ws,p);await persist(room);room.snapshot();await room.ctx.storage.setAlarm(now+100);return true;
}
export async function awardIsoOrbs(room,killer,victim,now){
 if(victim.realm)return;const effects=isoEffects(room);
 for(const ws of room.sockets()){const owner=room.data(ws);if(!owner?.joined||owner.hp<=0||owner.realm||owner.team!==killer.team||!focusActive(owner,now)||owner.uid!==killer.uid&&now-(victim.damageContributors?.[owner.uid]||0)>8000)continue;
  const orb={type:'iso_orb',id:crypto.randomUUID(),ownerUid:owner.uid,x:victim.x,y:victim.y+.6,z:victim.z,expiresAt:now+ISO.orbMs};effects.orbs.push(orb);room.send(ws,{type:'event',event:orb});}
 await persist(room);
}
// Restore origins before death bookkeeping, so corpses and Sage/Clove revival stay on the map.
export async function endIsoDuel(room,now,{winnerUid=null,timeout=false,disconnectedUid=null,cached=[]}={}){
 const effects=isoEffects(room),duel=effects.duel;if(!duel)return;effects.duel=null;
 const notices=[];const sockets=[...new Set([...room.sockets(),...cached.map(v=>v.ws)])];const actors=sockets.map(ws=>({ws,p:cached.find(v=>v.ws===ws)?.p||room.data(ws)})).filter(v=>v.p?.realm===duel.id);
 for(const {ws,p}of actors){const back=p.isoReturn;if(!back)continue;const died=timeout||p.uid===disconnectedUid||winnerUid&&p.uid!==winnerUid||p.hp<=0;Object.assign(p,back,{hp:died?0:back.hp,shield:died?0:back.shield,tempHealth:died?0:back.tempHealth,realm:null,isoReturn:null,lastShot:0,shotUsed:true});
  if((timeout||p.uid===disconnectedUid)&&died){p.deaths++;p.healRemaining=0;p.respawnAt=room.rounds.enabled?0:now+5000;recordCloveDeath(p,now);notices.push({ws,message:{type:'damage',hp:0,shield:0,tempHealth:0,attacker:timeout?'決鬥時間結束':'離開決鬥',cause:'iso'}});}
  room.save(ws,p);
 }
 await persist(room);for(const{ws,p}of actors)room.send(ws,{type:'iso_relocate',player:room.players().find(v=>v.uid===p.uid)});for(const n of notices)room.send(n.ws,n.message);room.broadcast({type:'event',event:{type:'iso_duel_end',id:duel.id,winnerUid,timeout}});
}
export async function tickIso(room,now){
 const effects=isoEffects(room);let pending=false,changed=false;
 for(const field of ['walls','orbs']){const old=effects[field].length;effects[field]=effects[field].filter(e=>field==='walls'?e.createdAt+ISO.wallMs>now:e.expiresAt>now);changed ||=old!==effects[field].length;pending ||=effects[field].length>0;}
 for(const f of effects.flights){const before=projectilePosition(f,f.lastAt),after=projectilePosition(f,now);if(!room.rounds.enabled||room.meta.round.phase==='playing')for(const ws of room.sockets()){const p=room.data(ws);if(!p?.joined||p.hp<=0||p.realm||p.omen?.channel?.kind==='ultimate'||p.uid===f.ownerUid||f.hitUids.includes(p.uid))continue;if(pointSegmentDistance({...p,y:p.y-1},before,after)<=ISO.undercutRadius){p.vulnerableUntil=now+ISO.vulnerableMs;f.hitUids.push(p.uid);room.save(ws,p);}}f.lastAt=now;changed=true;pending=true;}
 const old=effects.flights.length;effects.flights=effects.flights.filter(f=>f.createdAt+ISO.undercutMs>now);changed ||=old!==effects.flights.length;
 for(const ws of room.sockets()){const p=room.data(ws);if(!p?.joined)continue;if(p.iso?.focusUntil){if(p.hp<=0||now>=p.iso.focusUntil){p.iso.focusUntil=0;p.iso.shield=false;room.save(ws,p);}else pending=true;}if(p.vulnerableUntil>now)pending=true;}
 if(effects.duel){pending=true;if(room.rounds.enabled&&room.meta.round.phase!=='playing')await endIsoDuel(room,now);else if(now>=effects.duel.endsAt){await endIsoDuel(room,now,{timeout:true});await room.rounds.elimination();}}
 if(changed)await persist(room);return pending;
}
