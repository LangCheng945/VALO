// Trainer tuning, not verified latest official-patch values.
export const OMEN=Object.freeze({stepRange:18,stepMs:650,smokeRange:85,smokeRadius:4.5,smokeMs:15000,rechargeMs:35000,paranoiaSpeed:27,paranoiaMs:1700,paranoiaRadius:2.4,nearsightMs:2500,nearRange:4,ultimateMs:3000});
export const omenState=p=>(p.omen||={});
export const omenBusy=p=>!!p.omen?.channel;
export const omenShadow=p=>p.hp>0&&p.omen?.channel?.kind==='ultimate';
export function resetOmen(p){p.omen={};p.nearsightUntil=0;p.deafenedUntil=0;}
export function omenSmokes(p,now){const s=omenState(p);s.smokeReady=(s.smokeReady||[]).filter(t=>t>now);return Math.max(0,2-s.smokeReady.length);}
export function omenPublic(p,now){const s=omenState(p);return{cUsed:s.cUsed||0,qUsed:!!s.qUsed,smokeReady:(s.smokeReady||[]).filter(t=>t>now),channel:s.channel||null};}
export function paranoiaPosition(f,now){const t=Math.max(0,Math.min(OMEN.paranoiaMs,now-f.createdAt))/1000;return{x:f.x+f.dx*t*OMEN.paranoiaSpeed,y:f.y+f.dy*t*OMEN.paranoiaSpeed,z:f.z+f.dz*t*OMEN.paranoiaSpeed};}
