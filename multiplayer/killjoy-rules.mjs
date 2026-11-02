// Trainer tuning, not verified latest official patch values.
export const KJ=Object.freeze({placeRange:8,leash:40,hiddenRange:4,armMs:800,flightMs:6000,throwSpeed:17,softSpeed:9,gravity:12,nanoHp:20,nanoRadius:4.5,nanoMs:4500,nanoDps:45,alarmHp:50,alarmDetect:7,alarmSpeed:9,alarmChaseMs:3500,alarmBlast:4,vulnerableMs:4000,turretHp:100,turretRange:45,turretLockMs:450,turretShotMs:250,turretGapMs:900,recallMs:20000,turretRebuildMs:45000,lockdownHp:200,lockdownMs:13000,lockdownRadius:32,detainMs:8000,detainSpeed:.3});
export const killjoyState=p=>(p.killjoy||={});
export const detained=(p,now)=>p.hp>0&&(p.detainedUntil||0)>now;
export function resetKilljoy(p){p.killjoy={};p.detainedUntil=0;}
export const killjoyDeath=p=>{p.detainedUntil=0;};
export function killjoyPublic(p){const s=p.killjoy||{};return{cUsed:s.cUsed||0,qUsed:!!s.qUsed,qReadyAt:s.qReadyAt||0,eUsed:!!s.eUsed,eReadyAt:s.eReadyAt||0};}
export const killjoyFlight=(f,now)=>{const t=Math.max(0,now-f.segmentAt)/1000;return{x:f.x+f.vx*t,y:f.y+f.vy*t-KJ.gravity*t*t/2,z:f.z+f.vz*t};};
export const deviceOnline=(p,e)=>p?.agent==='killjoy'&&p.team===e.team&&p.hp>0&&!p.realm&&Math.hypot(p.x-e.x,p.y-2.2-e.y,p.z-e.z)<=KJ.leash;
export function turretFacing(e,p){const dx=p.x-e.x,dz=p.z-e.z,dist=Math.hypot(dx,dz);return dist<.1||(-Math.sin(e.yaw)*dx-Math.cos(e.yaw)*dz)/dist>=0;}
