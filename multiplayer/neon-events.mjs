import{beamDevice,damageBeamDevice}from'./neon-devices.mjs';
import{NEON as N,neonState,tickNeonState,overdrive,neonSliding,neonFlight}from'./neon-rules.mjs';
import{finite}from'./protocol.mjs';
import{detained}from'./killjoy-rules.mjs';
import{cloveInvulnerable}from'./clove-rules.mjs';
import{abilityDamage}from'./sova-events.mjs';
export const neonEffects=r=>(r.neonEffects||={walls:[],flights:[],stuns:[]});
const emit=(r,e)=>r.broadcast({type:'event',event:e}),persist=r=>r.ctx.storage.put('neonEffects',neonEffects(r));
const point=p=>p&&['x','y','z'].every(k=>finite(p[k])),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),direction=m=>['dx','dy','dz'].every(k=>finite(m[k],-1,1))&&Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)<.05;
const playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing';
export function liveNeonEffects(r,n){const fx=neonEffects(r);return{walls:fx.walls.filter(e=>e.expiresAt>n),flights:fx.flights.filter(e=>e.createdAt+N.flightMs>n),stuns:fx.stuns.filter(e=>e.firesAt+450>n)};}
export function interruptNeon(r,w,p){if(p.neon){p.neon.running=false;p.neon.slideUntil=0;p.neon.equipped=false;r.save(w,p);}}
export async function neonEvent(r,w,p,m,n){if(!m.type.startsWith('neon_'))return false;const fx=neonEffects(r),fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};
 if(m.type==='neon_stop'){interruptNeon(r,w,p);r.snapshot();return true;}
 if(!playing(r))return fail('回合結束後無法施放技能');
 if(m.type==='neon_contact'){
  const f=fx.flights.find(e=>e.id===m.id&&e.ownerUid===p.uid),at=f&&finite(m.at,n-600,n+100)&&m.at>=f.segmentAt?Math.min(n,m.at):n;if(!f||!point(m)||dist(neonFlight(f,at),m)>3||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return true;
  const contactVy=f.vy-N.gravity*(at-f.segmentAt)/1000,contactDot=f.vx*m.nx+contactVy*m.ny+f.vz*m.nz;if(contactDot>=0)return true;const stun={type:'neon_stun',id:crypto.randomUUID(),ownerUid:f.ownerUid,team:f.team,x:m.x,y:m.y,z:m.z,firesAt:n+N.stunDelayMs};fx.stuns.push(stun);emit(r,stun);
  if(f.bounces>=1){fx.flights=fx.flights.filter(e=>e.id!==f.id);emit(r,{type:'neon_flight_end',id:f.id});}else{const vy=f.vy-N.gravity*(at-f.segmentAt)/1000,d=f.vx*m.nx+vy*m.ny+f.vz*m.nz;if(d<0){Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:(f.vx-2*d*m.nx)*.8,vy:(vy-2*d*m.ny)*.8,vz:(f.vz-2*d*m.nz)*.8,segmentAt:at,bounces:1});emit(r,f);}else{fx.stuns.pop();return true;}}
 }else{
  if(p.agent!=='neon'||p.hp<=0||!p.active||p.realm||detained(p,n)||cloveInvulnerable(p,n))return fail('目前無法施放 Neon 技能');const s=tickNeonState(p,n);
  if(m.type==='neon_run'){if(neonSliding(p,n))return true;if(s.running)s.running=false;else{if(s.energy<=0)return fail('能量不足');s.running=true;s.equipped=false;p.spikeEquipped=false;await r.spike.cancel(p.uid,n);}r.save(w,p);
  }else if(m.type==='neon_slide'){
   if(!s.running||!s.slideCharges||neonSliding(p,n)||!direction(m)||Math.abs(m.dy)>.02)return fail('需要疾跑且滑鏟已就緒');s.slideCharges--;s.slideUntil=n+N.slideMs;s.slideDx=m.dx;s.slideDz=m.dz;s.running=false;s.regenAt=n+N.regenDelayMs;r.save(w,p);
  }else if(m.type==='neon_ult'){
   if(overdrive(p,n))s.equipped=!s.equipped;else{if(p.ultUsed)return fail('超載已使用');p.ultUsed=true;s.ultUntil=n+N.ultMs;s.battery=N.battery;s.equipped=true;s.lastKills=p.kills||0;}s.running=false;s.slideUntil=0;p.spikeEquipped=false;await r.spike.cancel(p.uid,n);r.save(w,p);
  }else if(m.type==='neon_beam'){
   if(!overdrive(p,n)||!s.equipped||s.running||neonSliding(p,n)||s.battery<1||n-(s.lastBeamAt||0)<N.beamMs*.8||!direction(m))return true;s.battery-=1;s.lastBeamAt=n;r.save(w,p);const origin={x:p.x,y:p.y-(p.crouching?.75:0),z:p.z},end={x:origin.x+m.dx*N.beamRange,y:origin.y+m.dy*N.beamRange,z:origin.z+m.dz*N.beamRange},ws=r.sockets().find(v=>r.data(v)?.uid===m.targetUid),v=ws&&r.data(ws);
   if(m.object){const target=beamDevice(r,m.object,origin,m,N.beamRange,n);if(target){await damageBeamDevice(r,target,N.beamBody,n);Object.assign(end,target.point);}}
   else if(v?.hp>0&&v.active&&!v.realm&&v.team!==p.team){const delta={x:v.x-p.x,y:v.y-1-(v.crouching?.4:0)-origin.y,z:v.z-p.z},along=delta.x*m.dx+delta.y*m.dy+delta.z*m.dz,radial=Math.hypot(delta.x-along*m.dx,delta.y-along*m.dy,delta.z-along*m.dz),headDelta={x:v.x-p.x,y:v.y-(v.crouching?.95:.2)-origin.y,z:v.z-p.z},headAlong=headDelta.x*m.dx+headDelta.y*m.dy+headDelta.z*m.dz,headRadial=Math.hypot(headDelta.x-headAlong*m.dx,headDelta.y-headAlong*m.dy,headDelta.z-headAlong*m.dz);if(along>0&&along<=N.beamRange&&(radial<.65||headRadial<.32)){const head=headRadial<.32;await abilityDamage(r,ws,v,head?N.beamHead:N.beamBody,{id:'neon:'+p.uid+':'+n,kind:'overdrive',ownerUid:p.uid,ownerName:p.name,team:p.team,cause:'neon',weaponName:'OVERDRIVE'},n);Object.assign(end,{x:v.x,y:head?v.y-(v.crouching?.95:.2):v.y-1-(v.crouching?.4:0),z:v.z});}}
   emit(r,{type:'neon_beam',ownerUid:p.uid,team:p.team,x:origin.x,y:origin.y,z:origin.z,ex:end.x,ey:end.y,ez:end.z,createdAt:n});
  }else{
   if(s.running||neonSliding(p,n))return fail('先結束疾跑或滑鏟');
   if(m.type==='neon_wall'){
    if(s.cUsed||!Array.isArray(m.paths)||m.paths.length!==2||m.paths.some(path=>!Array.isArray(path)||path.length<2||path.length>17||path.some((v,i)=>!point(v)||dist(p,v)>N.wallLength+5||i>0&&dist(v,path[i-1])>5)))return fail('電牆路徑無效');s.cUsed=true;s.equipped=false;const e={type:'neon_wall',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,paths:m.paths,createdAt:n,expiresAt:n+N.wallMs};fx.walls.push(e);emit(r,e);r.save(w,p);
   }else if(m.type==='neon_throw'){
    if((s.qUsed||0)>=1||!direction(m))return fail('震盪彈已用盡');s.qUsed=(s.qUsed||0)+1;s.equipped=false;const f={type:'neon_flight',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,x:p.x,y:p.y-.25,z:p.z,vx:m.dx*N.boltSpeed,vy:m.dy*N.boltSpeed,vz:m.dz*N.boltSpeed,createdAt:n,segmentAt:n,bounces:0};fx.flights.push(f);emit(r,f);r.save(w,p);
   }else return true;
  }
 }
 await persist(r);r.snapshot();await r.rounds.elimination();await r.ctx.storage.setAlarm(n+100);return true;}
export async function tickNeon(r,n){const fx=neonEffects(r);if(!playing(r)){fx.walls=[];fx.flights=[];fx.stuns=[];for(const w of r.sockets()){const p=r.data(w);if(p){interruptNeon(r,w,p);p.neonConcussUntil=0;r.save(w,p);}}await persist(r);return false;}
 for(const e of fx.stuns)if(!e.fired&&n>=e.firesAt){e.fired=true;for(const w of r.sockets()){const p=r.data(w);if(!p?.joined||p.hp<=0||!p.active||p.realm||cloveInvulnerable(p,n)||p.omen?.channel?.kind==='ultimate'||Math.hypot(p.x-e.x,p.y-1-e.y,p.z-e.z)>N.stunRadius)continue;p.neonConcussUntil=Math.max(p.neonConcussUntil||0,n+N.stunMs);r.save(w,p);}emit(r,{...e,type:'neon_stun_burst'});}
 let pending=false;for(const w of r.sockets()){const p=r.data(w);if(!p?.joined)continue;if(p.agent==='neon'){const s=tickNeonState(p,n,detained(p,n)||!p.active);r.save(w,p);pending ||= s.running||s.slideUntil>n||s.ultUntil>n||s.energy<100||s.battery<N.battery;}pending ||= p.neonConcussUntil>n;}
 fx.walls=fx.walls.filter(e=>e.expiresAt>n);fx.flights=fx.flights.filter(e=>e.createdAt+N.flightMs>n);fx.stuns=fx.stuns.filter(e=>e.firesAt+450>n);await persist(r);return pending||fx.walls.length>0||fx.flights.length>0||fx.stuns.length>0;}
