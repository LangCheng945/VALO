// Browser trainer tuning; mechanics and source notes: docs/raze-astra-abilities.md.
export const RAZE=Object.freeze({grenadeSpeed:19,satchelSpeed:12,rocketSpeed:55,gravity:10,flightMs:8000,grenadeMs:1500,clusterMs:650,clusterDamage:55,grenadeRadius:5,clusterRadius:3,satchelMs:5000,satchelDamage:50,satchelRadius:5,rocketMs:10000,rocketDamage:150,rocketRadius:8,botMs:10000,botHp:100,botSpeed:4,botChase:7,botRange:14,botRadius:5,botDamage:100});
export const razeState=p=>(p.raze||={cUsed:false,qUsed:0,eUsed:false,killProgress:0,lastKills:p.kills||0});
export const razeEquipped=(p,n)=>p.agent==='raze'&&p.hp>0&&!p.realm&&!!p.raze?.equipped&&(p.raze.rocketUntil||0)>n&&!!p.raze.rocketReady;
export function stopRaze(p){if(p.raze)p.raze.equipped=false;}
export function razeDeath(p){stopRaze(p);if(p.raze){p.raze.rocketReady=false;p.raze.rocketUntil=0;}}
export function resetRaze(p){p.raze=null;p.razeImpulse=null;}
export function tickRazeState(p,n,disabled=false){const s=razeState(p);if(disabled||p.hp<=0||p.realm||n>=s.rocketUntil||p.agent!=='raze')s.equipped=false;if(p.hp<=0){s.rocketReady=false;s.rocketUntil=0;}const kills=Math.max(0,(p.kills||0)-(s.lastKills||0));s.lastKills=p.kills||0;if(kills){s.killProgress=(s.killProgress||0)+kills;if(s.killProgress>=2){s.eUsed=false;s.killProgress%=2;}}return s;}
export function razePublic(p){const s=razeState(p);return{...s};}
export function razeFlight(f,n){const t=Math.max(0,n-(f.segmentAt||f.createdAt))/1000;return{x:f.x+f.vx*t,y:f.y+f.vy*t-(f.kind==='rocket'?0:RAZE.gravity*t*t/2),z:f.z+f.vz*t};}
export function explosionDamage(e,p){const d=Math.hypot(p.x-e.x,p.y-1-e.y,p.z-e.z);if(d>=e.radius)return 0;return e.damage*Math.min(1,(e.radius-d)/Math.max(.1,e.radius-1.5));}
export function satchelImpulse(e,p){const x=p.x-e.x,z=p.z-e.z,d=Math.hypot(x,p.y-1-e.y,z);if(d>=RAZE.satchelRadius)return null;const strength=1-d/RAZE.satchelRadius,flat=Math.hypot(x,z)||1;return{x:x/flat*13*strength,y:8+5*strength,z:z/flat*13*strength};}
