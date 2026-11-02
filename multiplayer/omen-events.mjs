import{cloveInvulnerable}from'./clove-rules.mjs';
import{BARRIER,distanceToSegmentXZ}from'./barrier-rules.mjs';
import{finite,validPose}from'./protocol.mjs';
import{pointSegmentDistance,sameRealm}from'./iso-rules.mjs';
import{OMEN,omenState,omenBusy,omenShadow,omenSmokes,paranoiaPosition}from'./omen-rules.mjs';
const point=p=>p&&validPose({...p,yaw:0});
const blocked=(room,p,now)=>(room.barriers||[]).some(w=>now<w.createdAt+BARRIER.lifetimeMs&&w.hp.some((hp,i)=>hp>0&&distanceToSegmentXZ(w,i,p)<.45&&p.y-2.15<w.y+BARRIER.height&&p.y+.25>w.y));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export const omenEffects=room=>(room.omenEffects||={smokes:[],flights:[]});
const persist=room=>room.ctx.storage.put('omenEffects',omenEffects(room));
export function liveOmenEffects(room,now){const s=omenEffects(room);return{smokes:s.smokes.filter(f=>f.expiresAt>now),flights:s.flights.filter(f=>f.createdAt+OMEN.paranoiaMs>now)};}
export async function cancelOmenChannel(room,ws,p,now){if(!p.omen?.channel)return;const c=p.omen.channel,yaw=p.yaw,pitch=p.pitch;Object.assign(p,c.origin,{yaw,pitch});p.omen.channel=null;room.save(ws,p);room.send(ws,{type:'omen_relocate',player:room.players().find(v=>v.uid===p.uid)});room.broadcast({type:'event',event:{type:'omen_channel_end',ownerUid:p.uid,cancelled:true}});}
export async function omenEvent(room,ws,p,m,now){
 if(!m.type.startsWith('omen_'))return false;
 const fail=reason=>{room.send(ws,{type:'ability_error',reason});return true;};
 if(m.type==='omen_shade_hit'){
  if(p.hp<=0||!p.active||omenBusy(p)||p.weapon==='melee'||p.shotUsed||now-p.lastShot>400||!p.shotEnd)return true;
  const socket=room.sockets().find(s=>room.data(s)?.uid===m.ownerUid),target=socket&&room.data(socket);
  if(!target||!omenShadow(target)||target.omen.channel.endsAt<=now||target.team===p.team||!sameRealm(p,target)||dist(p.shotEnd,{...target.omen.channel.destination,y:target.omen.channel.destination.y-1})>1.8)return true;
  p.shotUsed=true;room.save(ws,p);await cancelOmenChannel(room,socket,target,now);room.snapshot();return true;
 }
 if(p.agent!=='omen'||p.hp<=0||p.realm||room.rounds.enabled&&room.meta.round.phase!=='playing')return fail('目前無法施放 Omen 技能');
 if(m.type==='omen_cancel'){if(p.omen?.channel?.kind==='ultimate'&&p.omen.channel.endsAt>now)await cancelOmenChannel(room,ws,p,now);room.snapshot();return true;}
 if(!p.active||omenBusy(p))return fail('請等待傳送完成');
 const s=omenState(p),effects=omenEffects(room);
 if(m.type==='omen_smoke'){
  if(!point(m)||dist(p,m)>OMEN.smokeRange||omenSmokes(p,now)<1)return fail('煙霧超出範圍或正在補充');
  s.smokeReady.push(now+OMEN.rechargeMs);const smoke={type:'omen_smoke',id:crypto.randomUUID(),ownerUid:p.uid,x:m.x,y:m.y,z:m.z,createdAt:now,expiresAt:now+OMEN.smokeMs};effects.smokes.push(smoke);room.broadcast({type:'event',event:smoke});
 }else if(m.type==='omen_paranoia'){
  if(s.qUsed||!['dx','dy','dz'].every(k=>finite(m[k],-1.1,1.1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.1)return fail('致盲能量尚未就緒');s.qUsed=true;const f={type:'omen_paranoia',id:crypto.randomUUID(),ownerUid:p.uid,x:p.x,y:p.y-1,z:p.z,dx:m.dx,dy:m.dy,dz:m.dz,createdAt:now,lastAt:now,hitUids:[]};effects.flights.push(f);room.broadcast({type:'event',event:f});
 }else if(m.type==='omen_step'||m.type==='omen_ultimate'){
  const ultimate=m.type==='omen_ultimate';if(!point(m)||blocked(room,m,now)||Math.abs(m.y-p.y)>150||!ultimate&&(dist(p,m)>OMEN.stepRange||Math.abs(m.y-p.y)>8)||(ultimate?p.ultUsed:(s.cUsed||0)>=2))return fail('傳送落點無效或技能已使用');
  if(ultimate)p.ultUsed=true;else s.cUsed=(s.cUsed||0)+1;
  await room.spike.cancel(p.uid,now);const origin={x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch||0};s.channel={kind:ultimate?'ultimate':'step',origin,destination:{x:m.x,y:m.y,z:m.z,yaw:p.yaw,pitch:p.pitch||0},endsAt:now+(ultimate?OMEN.ultimateMs:OMEN.stepMs)};p.shotUsed=true;p.spikeEquipped=false;room.broadcast({type:'event',event:{type:'omen_channel',ownerUid:p.uid,...s.channel}});
 }else return true;
 room.save(ws,p);await persist(room);room.snapshot();await room.ctx.storage.setAlarm(now+100);return true;
}
export async function tickOmen(room,now){const s=omenEffects(room);let pending=false,changed=false;
 const old=s.smokes.length;s.smokes=s.smokes.filter(f=>f.expiresAt>now);changed ||=old!==s.smokes.length;pending ||=s.smokes.length>0;
 for(const f of s.flights){const a=paranoiaPosition(f,f.lastAt),b=paranoiaPosition(f,now);if(!room.rounds.enabled||room.meta.round.phase==='playing')for(const ws of room.sockets()){const p=room.data(ws);if(!p?.joined||p.hp<=0||p.realm||omenShadow(p)||cloveInvulnerable(p,now)||p.uid===f.ownerUid||f.hitUids.includes(p.uid))continue;if(pointSegmentDistance({...p,y:p.y-1},a,b)<=OMEN.paranoiaRadius){p.nearsightUntil=now+OMEN.nearsightMs;p.deafenedUntil=p.nearsightUntil;f.hitUids.push(p.uid);room.save(ws,p);}}f.lastAt=now;changed=true;pending=true;}
 s.flights=s.flights.filter(f=>f.createdAt+OMEN.paranoiaMs>now);
 for(const ws of room.sockets()){const p=room.data(ws);if(!p?.joined||p.mapPending)continue;const c=p.omen?.channel;
  if(c){if(p.hp<=0||p.realm||room.rounds.enabled&&room.meta.round.phase!=='playing'){await cancelOmenChannel(room,ws,p,now);}else if(now>=c.endsAt&&blocked(room,c.destination,now)){await cancelOmenChannel(room,ws,p,now);}else if(now>=c.endsAt){const yaw=p.yaw,pitch=p.pitch;Object.assign(p,c.destination,{yaw,pitch});p.omen.channel=null;room.save(ws,p);room.send(ws,{type:'omen_relocate',player:room.players().find(v=>v.uid===p.uid)});room.broadcast({type:'event',event:{type:'omen_channel_end',ownerUid:p.uid}});}else pending=true;}
  if(p.nearsightUntil>now||(p.omen?.smokeReady||[]).some(t=>t>now))pending=true;
 }
 if(changed)await persist(room);return pending;
}
