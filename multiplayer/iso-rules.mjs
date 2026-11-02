// Explicit trainer tuning; not a claim about the latest official patch.
export const ISO=Object.freeze({wallMs:6500,wallSpeed:4.8,wallWidth:6,wallHeight:3.5,undercutMs:1700,undercutSpeed:25,undercutRadius:2.1,vulnerableMs:8000,focusArmMs:800,focusMs:12000,orbMs:4000,orbRadius:.52,ultRange:65,ultWidth:3.2,duelWarmupMs:2000,duelMs:15000,arenaX:350,arenaZ:350,arenaFloor:4,arenaRadius:17,arenaHalfX:17,arenaHalfZ:17});
export const isoState=p=>(p.iso||={});
export function resetIso(p){p.iso={};p.vulnerableUntil=0;p.realm=null;p.isoReturn=null;}
export const sameRealm=(a,b)=>(a.realm||null)===(b.realm||null);
export function focusActive(p,now){return p.agent==='iso'&&(p.iso?.focusUntil||0)>now&&(p.iso?.armAt||0)<=now;}
export function isoDamage(p,damage,now,group=''){
 const s=p.iso;
 if(s&&group&&s.blockGroup===group&&s.blockUntil>now)return 0;
 if(focusActive(p,now)&&s.shield){s.shield=false;s.blockGroup=group;s.blockUntil=now+550;return 0;}
 return damage*((p.vulnerableUntil||0)>now?2:1);
}
export function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=dx*dx+dy*dy+dz*dz,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/len)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t,p.z-a.z-dz*t);}
export function wallPosition(w,now){const t=Math.max(0,Math.min(ISO.wallMs,now-w.createdAt))/1000;return{x:w.x+w.dx*t*ISO.wallSpeed,y:w.y,z:w.z+w.dz*t*ISO.wallSpeed};}
export function projectilePosition(f,now){const t=Math.max(0,Math.min(ISO.undercutMs,now-f.createdAt))/1000;return{x:f.x+f.dx*t*ISO.undercutSpeed,y:f.y+f.dy*t*ISO.undercutSpeed,z:f.z+f.dz*t*ISO.undercutSpeed};}
// Finite vertical moving plane. Walking and ability projectiles do not collide.
export function wallIntersection(w,a,b,now){if(w.createdAt>now||w.createdAt+ISO.wallMs<=now)return null;const p=wallPosition(w,now),da=(a.x-p.x)*w.dx+(a.z-p.z)*w.dz,db=(b.x-p.x)*w.dx+(b.z-p.z)*w.dz;if(da*db>0||Math.abs(da-db)<1e-8)return null;const t=da/(da-db),q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};if(Math.abs((q.x-p.x)*w.dz-(q.z-p.z)*w.dx)>ISO.wallWidth/2||q.y<p.y||q.y>p.y+ISO.wallHeight)return null;return{...q,t};}
export function duelSpawn(side){return{x:ISO.arenaX,y:ISO.arenaFloor+2.2,z:ISO.arenaZ+(side===0?10:-10),yaw:side===0?0:Math.PI};}
export function duelCovers(){return[{x:345.5,y:6.5,z:356,w:4.8,h:5,d:.4},{x:354.5,y:6.5,z:356,w:4.8,h:5,d:.4},{x:350,y:6.5,z:344,w:5.2,h:5,d:.4}];}
export function validDuelPose(p,duel,now){return Math.hypot(p.x-ISO.arenaX,p.z-ISO.arenaZ)<=ISO.arenaRadius-.45&&p.y>=ISO.arenaFloor+1.8&&p.y<=ISO.arenaFloor+8&&(now>=duel.startsAt||Math.hypot(p.x-duelSpawn(duel.aUid===p.uid?0:1).x,p.z-duelSpawn(duel.aUid===p.uid?0:1).z)<.5);}
export function isoPublic(p){const s=p.iso||{};return{cUsed:!!s.cUsed,qUsed:s.qUsed||0,eUsed:!!s.eUsed,armAt:s.armAt||0,focusUntil:s.focusUntil||0,shield:!!s.shield};}
