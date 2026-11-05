import {FIREARMS} from './firearms.mjs';
// Trainer distances are world units. Behaviour follows Riot's Vyse ability descriptions.
export const VYSE=Object.freeze({vines:2,vineSpeed:22,gravity:18,flightMs:6500,armMs:1000,vineRadius:4.6,vineMs:9000,vineDps:12,vineSlow:.5,wallRange:16,wallWidth:7,wallHeight:4,wallDepth:.3,wallDelayMs:650,wallMs:8000,ultRadius:18,ultHeight:7,ultDelayMs:3000,jamMs:8000});
export const vyseState=p=>p.vyse||={cUsed:0,qUsed:0,devices:[],flights:[],ultimate:null};
export function resetVyse(p,{preserveDebuffs=false}={}){const jam=p.vyseJammedUntil||0,slow=p.vyseSlowedUntil||0;p.vyse=null;p.vyseFlower=null;p.vyseReadyAt=0;p.vyseJammedUntil=0;p.vyseSlowedUntil=0;p.vyseSeen=null;if(preserveDebuffs){p.vyseJammedUntil=jam;p.vyseSlowedUntil=slow;}}
export const primaryJammed=(p,n,weapon=p.weapon)=>!p.realm&&(p.vyseJammedUntil||0)>n&&FIREARMS[weapon]?.slot==='primary';
export function vysePublic(p){if(!p.vyse)return null;const s=p.vyse;return{cUsed:s.cUsed,qUsed:s.qUsed,flights:s.flights,devices:s.devices.map(({previous,damageAt,...e})=>e),ultimate:s.ultimate};}
export const vyseFlight=(f,n)=>{const t=Math.max(0,n-f.createdAt)/1000;return{x:f.x+f.vx*t,y:f.y+f.vy*t-VYSE.gravity*t*t/2,z:f.z+f.vz*t};};
export const insideVines=(p,e)=>!p.realm&&Math.hypot(p.x-e.x,p.z-e.z)<=VYSE.vineRadius&&Math.abs(p.y-2.2-e.y)<2;
export const insideGarden=(p,e)=>!p.realm&&Math.hypot(p.x-e.x,p.z-e.z)<=VYSE.ultRadius&&Math.abs(p.y-2.2-e.y)<=VYSE.ultHeight;
export function wallLocal(w,p){const x=p.x-w.x,z=p.z-w.z;return{x:Math.cos(w.yaw)*x-Math.sin(w.yaw)*z,z:Math.sin(w.yaw)*x+Math.cos(w.yaw)*z};}
export const wallActive=(w,n)=>w.kind==='shear'&&w.firesAt&&n>=w.firesAt&&n<w.expiresAt;
export function insideShear(p,w,padding=0){const l=wallLocal(w,p);return !p.realm&&Math.abs(l.x)<=VYSE.wallWidth/2+padding&&Math.abs(l.z)<=VYSE.wallDepth/2+padding&&p.y+.25>w.y&&p.y-2.2<w.y+VYSE.wallHeight;}
export function shearIntersection(a,b,w,padding=0){const l=wallLocal(w,a),r=wallLocal(w,b),dx=r.x-l.x,dz=r.z-l.z;let lo=0,hi=1;for(const [origin,delta,half]of [[l.x,dx,VYSE.wallWidth/2+padding],[l.z,dz,VYSE.wallDepth/2+padding]]){if(Math.abs(delta)<1e-8){if(Math.abs(origin)>half)return null;}else{let t0=(-half-origin)/delta,t1=(half-origin)/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return null;}}const y=a.y+(b.y-a.y)*lo;if(y<w.y-padding||y>w.y+VYSE.wallHeight+padding)return null;return{t:lo,x:a.x+(b.x-a.x)*lo,y,z:a.z+(b.z-a.z)*lo};}
export function crossedShear(a,b,w){const l=wallLocal(w,a),r=wallLocal(w,b);return Math.abs(r.x)<=VYSE.wallWidth/2&&Math.abs(b.y-2.2-w.y)<1.3&&(Math.abs(r.z)<.5||l.z*r.z<0&&Math.abs(l.z-r.z)<6);}
export function allVyseDevices(room){return room.sockets().flatMap(w=>room.data(w)?.vyse?.devices||[]);}
export function vyseShotBlock(room,p,a,b,n){if(p.realm)return null;return allVyseDevices(room).filter(w=>wallActive(w,n)).map(w=>shearIntersection(a,b,w)).filter(Boolean).sort((a,b)=>a.t-b.t)[0]||null;}
export function constrainVyse(room,p,previous,n){if(p.realm)return;for(const w of allVyseDevices(room)){if(!wallActive(w,n))continue;const a={...previous,y:previous.y-1},b={...p,y:p.y-1};if(insideShear(previous,w,.4))continue;if(insideShear(p,w,.4)||shearIntersection(a,b,w,.4)){p.x=previous.x;p.z=previous.z;return;}}}
