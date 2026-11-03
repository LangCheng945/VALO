import{damageCypherDevice}from'./cypher-events.mjs';
import{damageKilljoyDevice}from'./killjoy-events.mjs';
// A beam pulse has one target. Device selection never supplies damage or HP.
export function beamDevice(room,selection,origin,direction,range,now){
 if(!selection||typeof selection.id!=='string'||!['cypher','killjoy'].includes(selection.kind))return null;
 const devices=selection.kind==='cypher'?room.cypherEffects?.devices:room.killjoyEffects?.devices,e=devices?.find(e=>e.id===selection.id);
 if(!e||e.hp<=0||e.expiresAt&&e.expiresAt<=now)return null;
 let points,radius;
 if(selection.kind==='cypher'){if(e.kind==='wire'){points=[e.a,e.b];radius=.25;}else if(e.kind==='camera'){points=[e];radius=.36;}else return null;}
 else{if(e.activeUntil>now)return null;const shapes={nano:[.1,.28],alarm:[.25,.4],turret:[.6,.48],lockdown:[.45,.6]},shape=shapes[e.kind];if(!shape)return null;points=[{x:e.x,y:e.y+shape[0],z:e.z}];radius=shape[1];}
 let best=null;for(const at of points){const dx=at.x-origin.x,dy=at.y-origin.y,dz=at.z-origin.z,along=dx*direction.dx+dy*direction.dy+dz*direction.dz;if(along<0||along>range)continue;const radial=Math.hypot(dx-along*direction.dx,dy-along*direction.dy,dz-along*direction.dz);if(radial<=radius&&(!best||along<best.along))best={along,point:at};}
 return best?{id:e.id,kind:selection.kind,point:best.point}:null;
}
export async function damageBeamDevice(room,target,damage,now){return target.kind==='cypher'?damageCypherDevice(room,target.id,damage,now):damageKilljoyDevice(room,target.id,damage,now);}
