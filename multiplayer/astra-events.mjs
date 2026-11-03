import{ASTRA as A,astraState,tickAstraState,inAstraArea,cosmicIntersection}from'./astra-rules.mjs';import{finite}from'./protocol.mjs';import{cloveInvulnerable}from'./clove-rules.mjs';import{detained}from'./killjoy-rules.mjs';
export const astraEffects=r=>(r.astraEffects||={stars:[],areas:[]});
const persist=r=>r.ctx.storage.put('astraEffects',astraEffects(r)),emit=(r,e)=>r.broadcast({type:'event',event:e}),playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing';
const point=m=>m&&['x','y','z'].every(k=>finite(m[k]));
export function liveAstraEffects(r,n){const e=astraEffects(r);return{stars:e.stars,areas:e.areas.filter(e=>e.expiresAt>n)};}
export function astraShotBlock(r,p,a,b,n){if(p.realm)return null;return astraEffects(r).areas.map(e=>cosmicIntersection(e,a,b,n)).filter(Boolean).sort((a,b)=>a.t-b.t)[0]||null;}
export async function astraEvent(r,w,p,m,n){if(!m.type.startsWith('astra_'))return false;const fx=astraEffects(r),fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};
 if(m.type==='astra_exit'){if(p.astra)p.astra.planning=false;r.save(w,p);r.snapshot();return true;}
 if(p.agent!=='astra'||p.hp<=0||!p.active||p.realm||!playing(r)||detained(p,n)||cloveInvulnerable(p,n))return fail('目前無法使用 Astra 技能');const s=tickAstraState(p,n);
 if(m.type==='astra_plan'){s.planning=true;p.spikeEquipped=false;p.shotUsed=true;await r.spike.cancel(p.uid,n);}
 else if(m.type==='astra_place'){
  if(!s.planning||s.used>=A.stars||!point(m)||Math.hypot(m.x-p.x,m.z-p.z)>A.placeRange||Math.abs(m.y-p.y)>35||fx.stars.some(e=>e.ownerUid===p.uid&&Math.hypot(e.x-m.x,e.y-m.y,e.z-m.z)<1))return fail('星體位置無效或數量不足');s.used++;const e={type:'astra_star',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,x:m.x,y:m.y,z:m.z,createdAt:n};fx.stars.push(e);emit(r,e);
 }else if(m.type==='astra_activate'||m.type==='astra_recall'){
  const star=fx.stars.find(e=>e.id===m.id&&e.ownerUid===p.uid);if(!star||n<star.createdAt+A.armMs)return fail('星體尚未就緒');const kind=m.type==='astra_recall'?'dissipate':m.kind;if(!['gravity','nova','smoke','dissipate'].includes(kind))return true;
  if(kind==='gravity'&&s.cReadyAt>n||kind==='nova'&&s.qReadyAt>n||kind==='smoke'&&s.smokeReady.length>=2)return fail('技能冷卻中');
  if(kind==='gravity')s.cReadyAt=n+A.gravityCooldown;if(kind==='nova')s.qReadyAt=n+A.novaCooldown;if(kind==='smoke')s.smokeReady.push(n+A.smokeRecharge);if(kind==='dissipate')s.refunds.push(n+A.recallMs);
  fx.stars=fx.stars.filter(e=>e.id!==star.id);emit(r,{type:'astra_star_end',id:star.id});const delay=kind==='nova'?A.novaDelay:0,ms=kind==='gravity'?A.gravityMs:kind==='smoke'?A.smokeMs:kind==='dissipate'?A.recallSmokeMs:500;
  const e={...star,id:crypto.randomUUID(),type:'astra_area',kind,startsAt:n+delay,createdAt:n,expiresAt:n+delay+ms,radius:kind==='smoke'||kind==='dissipate'?A.smokeRadius:A.radius};fx.areas.push(e);emit(r,e);
 }else if(m.type==='astra_divide'){
  if(!s.planning||p.ultUsed||!point(m.a)||!point(m.b)||Math.hypot(m.a.x-m.b.x,m.a.z-m.b.z)<2||[m.a,m.b].some(v=>Math.hypot(v.x-p.x,v.z-p.z)>A.placeRange))return fail('宇宙分界位置無效或已使用');p.ultUsed=true;s.planning=false;const e={type:'astra_area',kind:'divide',id:crypto.randomUUID(),ownerUid:p.uid,team:p.team,ax:m.a.x,az:m.a.z,bx:m.b.x,bz:m.b.z,createdAt:n,startsAt:n,expiresAt:n+A.divideMs};fx.areas.push(e);emit(r,e);
 }else return true;
 r.save(w,p);await persist(r);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;
}
export async function tickAstra(r,n){const fx=astraEffects(r),active=playing(r);let pending=false;for(const w of r.sockets()){const p=r.data(w);if(!p?.joined)continue;if(p.agent==='astra'){const s=tickAstraState(p,n,!active||!p.active||detained(p,n));r.save(w,p);pending ||=s.planning||s.refunds.length>0||s.smokeReady.length>0||s.cReadyAt>n||s.qReadyAt>n;}if(p.astraPull&&(!active||p.hp<=0||p.realm||p.astraPull.until<=n)){p.astraPull=null;r.save(w,p);}pending ||=p.astraConcussUntil>n||!!p.astraPull;}
 if(!active){fx.stars=[];fx.areas=[];await persist(r);return pending;}
 for(const e of fx.areas){if(!['gravity','nova'].includes(e.kind)||n<e.startsAt)continue;
  if(e.kind==='nova'&&e.fired)continue;
  for(const w of r.sockets()){const p=r.data(w);if(!p?.joined||p.hp<=0||!p.active||p.realm||cloveInvulnerable(p,n)||p.omen?.channel?.kind==='ultimate'||!inAstraArea(p,e))continue;
   if(e.kind==='nova')p.astraConcussUntil=Math.max(p.astraConcussUntil||0,n+A.novaMs);
   else if(n<e.expiresAt){p.astraPull={id:e.id,x:e.x,y:e.y,z:e.z,until:Math.min(e.expiresAt,n+500)};if(p.astra)p.astra.planning=false;}
   else p.vulnerableUntil=Math.max(p.vulnerableUntil||0,n+A.vulnerableMs);r.save(w,p);
  }
  if(e.kind==='nova')e.fired=true;
 }
 fx.areas=fx.areas.filter(e=>e.expiresAt>n);await persist(r);return pending||fx.areas.length>0;
}
