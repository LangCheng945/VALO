import{damageReconDevice}from'./recon-events.mjs';
import{damageRazeDevice}from'./raze-events.mjs';
import{damageCypherDevice}from'./cypher-events.mjs';
import{damageKilljoyDevice}from'./killjoy-events.mjs';
import{damageSovaObject}from'./sova-events.mjs';
import{damageReynaEye}from'./reyna-events.mjs';
import{damageBarrierSegment,liveBarriers}from'./barriers.mjs';
import{BARRIER,segmentPosition,advanceBarrier}from'./barrier-rules.mjs';
import{REYNA}from'./reyna-rules.mjs';
// A beam pulse has one target. Device selection never supplies damage or HP.
export function beamDevice(room,selection,origin,direction,range,now){
 if(!selection||typeof selection.id!=='string')return null;
 if(selection.kind==='recon'){
  const e=room.reconEffects?.devices.find(e=>e.id===selection.id&&e.hp>0&&e.expiresAt>now);if(!e)return null;const point={x:e.x,y:e.y+(e.kind==='haunt'?0:.35),z:e.z},dx=point.x-origin.x,dy=point.y-origin.y,dz=point.z-origin.z,along=dx*direction.dx+dy*direction.dy+dz*direction.dz;if(along<0||along>range||Math.hypot(dx-along*direction.dx,dy-along*direction.dy,dz-along*direction.dz)>(e.kind==='haunt'?.35:.65))return null;return{id:e.id,kind:'recon',point};
 }
 if(selection.kind==='raze'){
  const e=room.razeEffects?.devices.find(e=>e.id===selection.id&&e.hp>0&&e.expiresAt>now);if(!e)return null;const point={x:e.x,y:e.y+(e.kind==='bot'?.3:.08),z:e.z},dx=point.x-origin.x,dy=point.y-origin.y,dz=point.z-origin.z,along=dx*direction.dx+dy*direction.dy+dz*direction.dz;if(along<0||along>range||Math.hypot(dx-along*direction.dx,dy-along*direction.dy,dz-along*direction.dz)>(e.kind==='bot'?.55:.3))return null;return{id:e.id,kind:'raze',point};
 }
 if(selection.kind==='barrier'){
  const w=liveBarriers(room,now).find(e=>e.id===selection.id),i=selection.segment;if(!w||!Number.isInteger(i)||i<0||i>=4)return null;advanceBarrier(w,now);if(!w.hp[i])return null;
  const c=segmentPosition(w,i),cos=Math.cos(w.yaw),sin=Math.sin(w.yaw),dx=origin.x-c.x,dz=origin.z-c.z;
  const o=[cos*dx-sin*dz,origin.y-w.y,sin*dx+cos*dz],d=[cos*direction.dx-sin*direction.dz,direction.dy,sin*direction.dx+cos*direction.dz],lo=[-BARRIER.width/2,0,-BARRIER.depth/2],hi=[BARRIER.width/2,BARRIER.height,BARRIER.depth/2];let near=0,far=range;
  for(let axis=0;axis<3;axis++){if(Math.abs(d[axis])<1e-8){if(o[axis]<lo[axis]||o[axis]>hi[axis])return null;}else{const a=(lo[axis]-o[axis])/d[axis],b=(hi[axis]-o[axis])/d[axis];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;}}
  return{id:w.id,kind:'barrier',segment:i,point:{x:origin.x+direction.dx*near,y:origin.y+direction.dy*near,z:origin.z+direction.dz*near}};
 }
 if(['sova-recon','sova-drone','reyna'].includes(selection.kind)){
  let e,radius;
  if(selection.kind==='sova-recon'){e=room.sovaEffects?.recons.find(e=>e.id===selection.id);radius=.18;}
  else if(selection.kind==='reyna'){e=room.reynaEffects?.eyes.find(e=>e.id===selection.id);radius=REYNA.eyeRadius;}
  else{const socket=room.sockets().find(s=>room.data(s)?.uid===selection.id),p=socket&&room.data(socket);e=p?.sova?.control;if(e?.kind!=='drone'||p.hp<=0||!p.active||p.realm)return null;radius=.44;}
  if(!e||e.hp<=0||(e.expiresAt||e.endsAt||0)<=now)return null;
  const dx=e.x-origin.x,dy=e.y-origin.y,dz=e.z-origin.z,along=dx*direction.dx+dy*direction.dy+dz*direction.dz;
  if(along<0||along>range||Math.hypot(dx-along*direction.dx,dy-along*direction.dy,dz-along*direction.dz)>radius)return null;
  return{id:selection.id,kind:selection.kind,point:{x:e.x,y:e.y,z:e.z}};
 }
 if(!['cypher','killjoy'].includes(selection.kind))return null;
 const devices=selection.kind==='cypher'?room.cypherEffects?.devices:room.killjoyEffects?.devices,e=devices?.find(e=>e.id===selection.id);
 if(!e||e.hp<=0||e.expiresAt&&e.expiresAt<=now)return null;
 let points,radius;
 if(selection.kind==='cypher'){if(e.kind==='wire'){points=[e.a,e.b];radius=.25;}else if(e.kind==='camera'){points=[e];radius=.36;}else return null;}
 else{if(e.activeUntil>now)return null;const shapes={nano:[.1,.28],alarm:[.25,.4],turret:[.6,.48],lockdown:[.45,.6]},shape=shapes[e.kind];if(!shape)return null;points=[{x:e.x,y:e.y+shape[0],z:e.z}];radius=shape[1];}
 let best=null;for(const at of points){const dx=at.x-origin.x,dy=at.y-origin.y,dz=at.z-origin.z,along=dx*direction.dx+dy*direction.dy+dz*direction.dz;if(along<0||along>range)continue;const radial=Math.hypot(dx-along*direction.dx,dy-along*direction.dy,dz-along*direction.dz);if(radial<=radius&&(!best||along<best.along))best={along,point:at};}
 return best?{id:e.id,kind:selection.kind,point:best.point}:null;
}
export async function damageBeamDevice(room,target,damage,now){
 if(target.kind==='recon')return damageReconDevice(room,target.id,damage,now);
 if(target.kind==='raze')return damageRazeDevice(room,target.id,damage,now);
 if(target.kind==='barrier')return damageBarrierSegment(room,target.id,target.segment,damage,now);
 if(target.kind==='reyna')return damageReynaEye(room,target.id,damage,now);
 if(target.kind==='sova-recon'||target.kind==='sova-drone')return damageSovaObject(room,target,damage,now);
 return target.kind==='cypher'?damageCypherDevice(room,target.id,damage,now):damageKilljoyDevice(room,target.id,damage,now);
}
