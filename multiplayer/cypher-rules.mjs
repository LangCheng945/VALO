// Trainer values; source mechanics/slots are pinned in the agent research, not a latest-patch claim.
export const CYPHER=Object.freeze({wireRange:6,wireSpan:9,wireHp:20,wireArmMs:800,snareMs:1700,tetherRadius:1.8,snareSpeed:.35,concussMs:2000,concussRate:.55,concussSpeed:.65,wireResetMs:1200,hiddenRange:4,cageMs:7250,cageRadius:4.5,cageHeight:4.6,gravity:11,throwSpeed:16,softSpeed:9,flightMs:6000,cameraRange:16,cameraHp:20,recallMs:15000,rebuildMs:45000,dartRange:45,dartCooldownMs:6000,tagPulseMs:2000,tagRevealMs:1000,untagMs:1500,corpseRange:8,corpseAgeMs:30000,hatFlightMs:700,neuralIntervalMs:2000});
export const cypherState=p=>(p.cypher||={});
export const cameraControl=p=>p.cypher?.control||null;
export const cypherBusy=(p,now)=>!!cameraControl(p)||(p.cypher?.removeUntil||0)>now;
export const concussed=(p,now)=>p.hp>0&&!p.realm&&Math.max(p.cypherConcussUntil||0,p.neonConcussUntil||0,p.breachConcussUntil||0)>now;
export function resetCypher(p){p.lastDeathAt=0;p.cypher={};p.cypherTag=null;p.cypherSnaredUntil=0;p.cypherConcussUntil=0;p.cypherAnchor=null;}
export function cypherDeath(p){if(p.cypher){p.cypher.control=null;p.cypher.removeUntil=0;}p.cypherTag=null;p.cypherSnaredUntil=0;p.cypherConcussUntil=0;p.cypherAnchor=null;}
export function cypherPublic(p){const s=p.cypher||{};return{cUsed:s.cUsed||0,qUsed:s.qUsed||0,eUsed:!!s.eUsed,eReadyAt:s.eReadyAt||0,control:s.control||null,removeUntil:s.removeUntil||0};}
export const cypherFlight=(f,now)=>{const t=Math.max(0,now-f.segmentAt)/1000;return{x:f.x+f.vx*t,y:f.y+f.vy*t-CYPHER.gravity*t*t/2,z:f.z+f.vz*t};};
export function wireContact(p,e){const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z,len=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((p.x-e.a.x)*dx+(p.z-e.a.z)*dz)/(len||1))),x=e.a.x+dx*t,z=e.a.z+dz*t;return{hit:Math.hypot(p.x-x,p.z-z)<.55&&p.y-2.2<e.a.y+.15&&p.y+.15>e.a.y,x,z};}
export function constrainTether(p,now){if(!p.cypherAnchor||p.realm||p.cypherSnaredUntil<=now)return;const a=p.cypherAnchor,dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);if(d>CYPHER.tetherRadius){p.x=a.x+dx/d*CYPHER.tetherRadius;p.z=a.z+dz/d*CYPHER.tetherRadius;}}
