// Trainer tuning; slot/reference notes: docs/raze-astra-abilities.md.
export const ASTRA=Object.freeze({stars:4,placeRange:180,armMs:500,radius:5,gravityMs:2200,pullSpeed:4,vulnerableMs:4000,gravityCooldown:25000,novaDelay:900,novaMs:3500,novaCooldown:25000,smokeRadius:4.5,smokeMs:14000,smokeRecharge:25000,recallSmokeMs:1250,recallMs:20000,divideMs:21000,divideWidth:1400,divideFloor:-80,divideHeight:230});
export const astraState=p=>(p.astra||={used:0,refunds:[],smokeReady:[],planning:false,cReadyAt:0,qReadyAt:0});
export const astraPlanning=p=>p.agent==='astra'&&p.hp>0&&!p.realm&&!!p.astra?.planning;
export function stopAstra(p){if(p.astra)p.astra.planning=false;}
export function astraDeath(p){stopAstra(p);p.astraPull=null;p.astraConcussUntil=0;}
export function resetAstra(p){p.astra=null;p.astraPull=null;p.astraConcussUntil=0;}
export function tickAstraState(p,n,disabled=false){const s=astraState(p),refunds=s.refunds||[];s.used=Math.max(0,(s.used||0)-refunds.filter(t=>t<=n).length);s.refunds=refunds.filter(t=>t>n);s.smokeReady=(s.smokeReady||[]).filter(t=>t>n);if(disabled||p.hp<=0||p.realm)s.planning=false;return s;}
export const astraPublic=p=>({...astraState(p)});
export function inAstraArea(p,e,r=ASTRA.radius){return Math.hypot(p.x-e.x,p.z-e.z)<=r&&Math.abs(p.y-2.2-e.y)<3;}
export function cosmicIntersection(e,a,b,n){if(e.kind!=='divide'||e.expiresAt<=n)return null;const dx=e.bx-e.ax,dz=e.bz-e.az,len=Math.hypot(dx,dz);if(len<.1)return null;const ux=dx/len,uz=dz/len,cx=(e.ax+e.bx)/2,cz=(e.az+e.bz)/2,da=(a.x-cx)*uz-(a.z-cz)*ux,db=(b.x-cx)*uz-(b.z-cz)*ux;if(da*db>0||Math.abs(da-db)<1e-8)return null;const t=da/(da-db),q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};if(Math.abs((q.x-cx)*ux+(q.z-cz)*uz)>ASTRA.divideWidth/2||q.y<ASTRA.divideFloor||q.y>ASTRA.divideFloor+ASTRA.divideHeight)return null;return{...q,t};}
