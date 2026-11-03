// Explicit trainer tuning. Slots/mechanics follow the pinned reference in docs/breach-abilities.md.
export const BREACH=Object.freeze({surfaceRange:35,wallDepth:8,afterDelay:1400,afterInterval:600,afterPulses:2,afterDamage:80,afterLength:8,afterWidth:3,flashDelay:450,flashMs:2000,backFlashMs:450,flashRange:35,chargeMs:1000,faultMin:8,faultMax:32,faultWidth:4,faultDelay:650,faultMs:3500,rechargeMs:40000,ultLength:32,ultWidth:12,ultDelay:600,ultStep:200,ultBands:8,ultMs:5000});
export const breachState=p=>(p.breach||={cUsed:0,qUsed:0,eReadyAt:0,chargeAt:0});
export const breachCharging=p=>p.agent==='breach'&&p.hp>0&&!p.realm&&!!p.breach?.chargeAt;
export function breachDeath(p){if(p.breach)p.breach.chargeAt=0;p.breachConcussUntil=0;p.breachFlashUntil=0;}
export function resetBreach(p){p.breach=null;breachDeath(p);}
export function breachPublic(p){const s=breachState(p);return{cUsed:s.cUsed||0,qUsed:s.qUsed||0,eReadyAt:s.eReadyAt||0,chargeAt:s.chargeAt||0};}
export function inBreachLane(p,e,min=0,max=e.length){const x=p.x-e.x,z=p.z-e.z,along=x*e.dx+z*e.dz,side=Math.abs(x*e.dz-z*e.dx);return along>=min&&along<=max&&side<=e.width/2&&Math.abs(p.y-2.2-e.y)<3.2;}
export function flashDuration(p,e){const x=e.x-p.x,y=e.y-p.y,z=e.z-p.z,len=Math.hypot(x,y,z);if(len>BREACH.flashRange)return 0;const yaw=p.yaw||0,pitch=p.pitch||0,dot=len<.001?1:(-Math.sin(yaw)*Math.cos(pitch)*x+Math.sin(pitch)*y-Math.cos(yaw)*Math.cos(pitch)*z)/len;return dot>.25?BREACH.flashMs:BREACH.backFlashMs;}
