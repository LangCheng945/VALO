// Explicit trainer tuning; names/slots follow the pinned agent research, not a verified current patch.
export const REYNA=Object.freeze({eyeHp:100,eyeRange:12,eyeRadius:.55,eyeArmMs:250,eyeMs:2500,leerRange:28,orbMs:4000,assistMs:3000,soulRange:25,healAmount:100,healMs:3000,overhealMs:25000,dismissMs:2000,recoveryMs:350,dismissMove:1.2,empressMs:30000,fireRate:1.15,reloadRate:1.25});
export const reynaState=p=>(p.reyna||={});
export const reynaDismissed=(p,now)=>p.agent==='reyna'&&p.hp>0&&(p.reyna?.dismissUntil||0)>now;
export const reynaBusy=(p,now)=>p.agent==='reyna'&&p.hp>0&&(p.reyna?.recoverUntil||0)>now;
export const empressActive=(p,now)=>p.agent==='reyna'&&p.hp>0&&!p.realm&&(p.reyna?.empressUntil||0)>now;
export function resetReyna(p){p.reyna={};p.leerUntil=0;}
export function reynaDeath(p){p.leerUntil=0;if(p.reyna){p.reyna.dismissUntil=0;p.reyna.recoverUntil=0;p.reyna.heal=null;p.reyna.empressUntil=0;p.reyna.overhealUntil=0;}}
export function reynaPublic(p){const s=p.reyna||{};return{cUsed:s.cUsed||0,soulUsed:s.soulUsed||0,dismissUntil:s.dismissUntil||0,recoverUntil:s.recoverUntil||0,empressUntil:s.empressUntil||0,overhealUntil:s.overhealUntil||0,heal:s.heal?{...s.heal}:null};}
export function beginDevour(p,orb,now,automatic=false){const s=reynaState(p);s.heal={x:orb.x,y:orb.y,z:orb.z,remaining:REYNA.healAmount,lastAt:now,endsAt:now+REYNA.healMs,visibleUntil:now+450,automatic};}
export function tickDevour(p,now){const s=p.reyna,h=s?.heal;if(!h)return false;if(p.hp<=0||p.realm||reynaDismissed(p,now)&&!h.automatic){s.heal=null;return false;}const within=Math.hypot(p.x-h.x,p.y-h.y,p.z-h.z)<=REYNA.soulRange;
 const dt=Math.min(.5,Math.max(0,(Math.min(now,h.endsAt)-h.lastAt)/1000));h.lastAt=now;if((h.automatic||within&&h.visibleUntil>now)&&dt>0){const amount=Math.min(h.remaining,REYNA.healAmount/(REYNA.healMs/1000)*dt),base=Math.min(amount,Math.max(0,100-p.hp));p.hp+=base;p.tempHealth=Math.min(Math.max(0,150-p.hp),(p.tempHealth||0)+amount-base);h.remaining-=amount;s.overhealUntil=now+REYNA.overhealMs;}if(h.remaining<=0||now>=h.endsAt)s.heal=null;return !!s.heal;}
export function gazeAt(p,e){const dx=e.x-p.x,dy=e.y-p.y,dz=e.z-p.z,distance=Math.hypot(dx,dy,dz);if(distance<.1)return true;const pitch=p.pitch||0;return distance<=REYNA.leerRange&&(-Math.sin(p.yaw)*Math.cos(pitch)*dx+Math.sin(pitch)*dy-Math.cos(p.yaw)*Math.cos(pitch)*dz)/distance>.3;}
