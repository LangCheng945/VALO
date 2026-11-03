// Fade/Skye trainer tuning. References and approximation notes: docs/fade-skye-abilities.md.
export const RECON=Object.freeze({gravity:10,throwSpeed:18,flightMs:6000,hauntHp:50,hauntMs:4000,hauntArmMs:500,hauntRange:27,hauntRecharge:40000,trailMs:6500,seizeMs:4500,seizeRadius:5,seizeDecay:75,nightLength:35,nightWidth:18,nightBands:8,nightStepMs:160,nightMs:12000,prowlerHp:80,prowlerMs:5500,creatureSpeed:5,chaseSpeed:7,detectRange:15,nearMs:3000,healPool:100,healRange:12,healDps:20,healCost:10,dogHp:100,dogMs:8000,dogRange:35,dogSpeed:7,pounceRange:6,pounceMs:300,pounceRadius:3,concussMs:3500,pounceDamage:30,hawkSpeed:12,hawkMs:2500,hawkFullMs:800,flashMs:2000,seekerHp:100,seekerMs:12000});
export const reconAgent=p=>['fade','skye'].includes(p.agent);
export const reconState=p=>(p.recon||={cUsed:0,qUsed:0,eUsed:0,eReadyAt:0,healPool:100,controlId:null,healing:false});
export const reconBusy=p=>p.agent==='skye'&&p.hp>0&&!p.realm&&!!p.recon?.controlId;
export const reconHealing=p=>p.agent==='skye'&&p.hp>0&&!p.realm&&!!p.recon?.healing;
export function stopRecon(p){if(p.recon){p.recon.controlId=null;p.recon.healing=false;}}
export function reconDeath(p){stopRecon(p);p.fadeTether=null;p.fadeTrailUntil=0;p.skyeConcussUntil=0;p.skyeFlashUntil=0;}
export function resetRecon(p){p.recon=null;reconDeath(p);p.fadeTrailTeam=null;}
export function reconPublic(p){return{...reconState(p)};}
export function reconFlight(f,n){const t=Math.max(0,n-(f.segmentAt||f.createdAt))/1000;return{x:f.x+f.vx*t,y:f.y+f.vy*t-(f.kind==='hawk'?0:RECON.gravity*t*t/2),z:f.z+f.vz*t};}
export function reconDecay(p,n,amount,ms){if(p.hp<=0)return;const lost=Math.min(amount,Math.max(0,p.hp-1));p.hp-=lost;p.decayAmount=(p.decayAmount||0)+lost;p.decayUntil=Math.max(p.decayUntil||0,n+ms);}
export function markTrail(p,team,n,ms=RECON.trailMs){p.fadeTrailUntil=p.fadeTrailTeam===team?Math.max(p.fadeTrailUntil||0,n+ms):n+ms;p.fadeTrailTeam=team;}
export function constrainFade(p,n){const e=p.fadeTether;if(!e||p.realm||p.hp<=0||e.until<=n)return;const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);if(d>RECON.seizeRadius-.3){p.x=e.x+dx/d*(RECON.seizeRadius-.3);p.z=e.z+dz/d*(RECON.seizeRadius-.3);}}
export function inNightfall(p,e,step){const x=p.x-e.x,z=p.z-e.z,along=x*e.dx+z*e.dz;return along>=step*RECON.nightLength/RECON.nightBands&&along<=(step+1)*RECON.nightLength/RECON.nightBands&&Math.abs(x*e.dz-z*e.dx)<=RECON.nightWidth/2&&Math.abs(p.y-2.2-e.y)<5;}
