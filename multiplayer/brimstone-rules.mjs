// Trainer tuning; mechanics and slot names follow the pinned research, not a verified latest patch.
export const BRIM=Object.freeze({smokeRange:55,smokeRadius:4.5,smokeMs:19000,stimMs:12000,stimRadius:6,stimLingerMs:4000,fireRate:1.15,reloadRate:1.1,moveRate:1.15,projectileSpeed:25,gravity:10,flightMs:6000,fireMs:8000,fireRadius:4.5,fireDps:60,ultRange:90,ultRadius:7.2,ultWarnMs:2000,ultMs:3000,ultDps:150});
export const brimState=p=>(p.brimstone||={cUsed:false,qUsed:false,eUsed:0});
export const stimActive=(p,now)=>p.hp>0&&!p.realm&&(p.stimUntil||0)>now;
export function resetBrim(p){p.brimstone={cUsed:false,qUsed:false,eUsed:0};p.stimUntil=0;}
export function brimPublic(p){const b=brimState(p);return{cUsed:!!b.cUsed,qUsed:!!b.qUsed,eUsed:b.eUsed||0};}
export function flightPoint(f,now){const t=Math.max(0,now-f.segmentAt)/1000;return{x:f.x+f.vx*t,y:f.y+f.vy*t-BRIM.gravity*t*t/2,z:f.z+f.vz*t};}
export function inBrimArea(p,e){return Math.hypot(p.x-e.x,p.z-e.z)<=e.radius&&(e.kind==='strike'||Math.abs(p.y-2.2-e.y)<3);}
