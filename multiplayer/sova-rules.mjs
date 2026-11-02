// Authored trainer tuning. Slot names and mechanics follow the pinned agent research.
export const SOVA=Object.freeze({gravity:9,flightMs:8000,arrowMinSpeed:18,arrowMaxSpeed:45,chargeMs:1000,shockRadius:5,shockDamage:75,reconRadius:40,reconHp:20,reconArmMs:500,pulseMs:1500,pulses:3,revealMs:1000,reconRechargeMs:40000,droneMs:8000,droneHp:100,droneSpeed:10,droneRange:45,dartRange:40,dartCooldownMs:1500,tagMs:2500,ultMs:7000,beamWindupMs:700,beamIntervalMs:1100,beamRange:100,beamRadius:2,beamDamage:80});
export const sovaState=p=>(p.sova||={});
export const sovaBusy=p=>!!p.sova?.control;
export function resetSova(p){p.sova={};p.sovaRevealUntil=0;p.sovaRevealTeam=null;}
export function sovaDeath(p){if(p.sova)p.sova.control=null;p.sovaRevealUntil=0;}
export function sovaPublic(p){const s=p.sova||{};return{cUsed:!!s.cUsed,qUsed:s.qUsed||0,reconReadyAt:s.reconReadyAt||0,control:s.control||null};}
export function sovaFlight(f,now){const t=Math.max(0,now-f.segmentAt)/1000;return{x:f.x+f.vx*t,y:f.y+f.vy*t-SOVA.gravity*t*t/2,z:f.z+f.vz*t};}
export const reconPulse=(e,now)=>{const age=now-e.createdAt-SOVA.reconArmMs,index=Math.floor(age/SOVA.pulseMs);return index>=0&&index<SOVA.pulses&&age%SOVA.pulseMs<600;};
export function reveal(p,team,now,ms=SOVA.revealMs){p.sovaRevealUntil=Math.max(p.sovaRevealUntil||0,now+ms);p.sovaRevealTeam=team;}
