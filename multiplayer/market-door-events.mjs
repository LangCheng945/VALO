import{newMarketDoor,doorOpenness,nearDoorButton,inDoorway,doorRay,MARKET_DOOR}from'./market-door-rules.mjs';
import{firearmDamage}from'./firearms.mjs';
export function marketDoorState(room){if(room.meta?.map!=='sunset')return null;return room.meta.marketDoor||=newMarketDoor();}
export async function publishMarketDoor(room){await room.ctx.storage.put('meta',room.meta);room.broadcast({type:'event',event:{type:'market_door',state:marketDoorState(room)}});}
export async function resetMarketDoor(room,now=Date.now()){if(room.meta.map!=='sunset'){delete room.meta.marketDoor;return;}room.meta.marketDoor=newMarketDoor(now);await publishMarketDoor(room);}
export async function marketDoorEvent(room,ws,p,m,now){if(!['door_toggle','door_strike'].includes(m.type))return false;const d=marketDoorState(room),busy=room.rounds.enabled&&room.meta.round.phase!=='playing';if(!d||p.hp<=0||!p.active||p.realm||p.spikeEquipped||busy||d.hp<=0)return true;
 if(m.type==='door_toggle'){if(!nearDoorButton(p)||now-d.changedAt<MARKET_DOOR.duration)return true;if(d.open&&room.players().some(a=>a.hp>0&&inDoorway(a))){room.send(ws,{type:'ability_error',reason:'門口有人，無法關閉'});return true;}Object.assign(d,{from:doorOpenness(d,now),open:!d.open,changedAt:now,revision:d.revision+1});}
 else {if(p.weapon!=='melee'||now-(p.lastDoorStrike||0)<420||!inDoorway(p,4.2))return true;p.lastDoorStrike=now;room.save(ws,p);d.hp=Math.max(0,d.hp-75);d.revision++;}
 await publishMarketDoor(room);return true;}
export async function marketDoorShot(room,ws,p,m,now){const d=marketDoorState(room);if(!d||d.hp<=0)return false;const start={x:m.sx,y:m.sy,z:m.sz},end={x:m.ex,y:m.ey,z:m.ez},t=doorRay(d,start,end,now);if(t===null)return false;const distance=Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z)*t,damage=firearmDamage(p.weapon,'body',distance);if(!Number.isFinite(damage)||damage<=0)return false;d.hp=Math.max(0,d.hp-damage);d.revision++;p.shotUsed=true;room.save(ws,p);await publishMarketDoor(room);return true;}
