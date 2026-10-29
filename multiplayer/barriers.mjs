import{BARRIER,segmentPosition,insideSegment,advanceBarrier}from'./barrier-rules.mjs';
import{validPose,WEAPONS}from'./protocol.mjs';
export function liveBarriers(room,now=Date.now()){return(room.barriers||[]).filter(w=>w.createdAt+BARRIER.lifetimeMs>now&&w.hp.some(hp=>hp>0));}
async function persist(room){await room.ctx.storage.put('barriers',room.barriers);}
export async function barrierEvent(room,ws,p,m,now){
 if(m.type!=='wall'&&m.type!=='wall_hit')return false;
 const fail=reason=>{room.send(ws,{type:'ability_error',key:'c',reason});return true;};
 if(p.hp<=0||!p.active||(room.rounds.enabled&&room.meta.round.phase==='ending'))return fail('目前無法使用冰牆');
 if(m.type==='wall'){
  if(p.agent!=='phoenix'||p.cUsed>=1)return fail('屏障靈球已用完');
  if(!validPose(m)||Math.hypot(m.x-p.x,m.z-p.z)>BARRIER.range+.2||Math.abs(m.y-(p.y-2.2))>4)return fail('冰牆位置超出範圍');
  const w={id:crypto.randomUUID(),ownerUid:p.uid,x:m.x,y:m.y,z:m.z,yaw:m.yaw,createdAt:now,fortified:false,hp:Array(4).fill(BARRIER.initialHP)};
  // Reject a footprint containing a player. Map support is checked by the preview client.
  if(room.players().some(v=>v.hp>0&&v.active&&w.hp.some((_,i)=>insideSegment(w,i,{x:v.x,y:v.y-1,z:v.z},.45))))return fail('冰牆不能與玩家重疊');
  p.cUsed++;room.save(ws,p);room.barriers=liveBarriers(room,now);room.barriers.push(w);await persist(room);
  room.broadcast({type:'event',event:{type:'wall',...w,senderUid:p.uid}});await room.ctx.storage.setAlarm(now+250);return true;
 }
 const w=liveBarriers(room,now).find(w=>w.id===m.id),i=m.segment;if(!w||!Number.isInteger(i)||i<0||i>=4||!w.hp[i])return true;
 advanceBarrier(w,now);const weapon=WEAPONS[p.weapon];if(!weapon)return true;
 if(p.weapon==='melee'){
  const c=segmentPosition(w,i);if(Math.hypot(c.x-p.x,c.y+1.8-p.y,c.z-p.z)>4.5||now-p.lastShot<420)return true;p.lastShot=now;
 }else{
  if(p.shotUsed||now-p.lastShot>400||!p.shotEnd||!insideSegment(w,i,p.shotEnd,.35))return true;p.shotUsed=true;
 }
 w.hp[i]=Math.max(0,w.hp[i]-weapon.body);room.save(ws,p);await persist(room);room.broadcast({type:'event',event:{type:'wall_state',...w}});return true;
}
export async function updateBarriers(room,now){let changed=false;for(const w of room.barriers||[]){const before=w.fortified;advanceBarrier(w,now);if(before!==w.fortified){room.broadcast({type:'event',event:{type:'wall_state',...w}});changed=true;}}
 const live=liveBarriers(room,now);if(live.length!==(room.barriers||[]).length){const ids=new Set(live.map(w=>w.id));for(const w of room.barriers||[])if(!ids.has(w.id))room.broadcast({type:'event',event:{type:'wall_remove',id:w.id}});room.barriers=live;changed=true;}if(changed)await persist(room);return live.length>0;}
