import{VIPER as V,viperState,tickViperFuel,viperFlight,inViperGas,poisonViper}from'./viper-rules.mjs';
import{finite}from'./protocol.mjs';import{detained}from'./killjoy-rules.mjs';import{cloveInvulnerable}from'./clove-rules.mjs';import{abilityDamage}from'./sova-events.mjs';
export const viperEffects=r=>(r.viperEffects||={devices:[],flights:[]});
const persist=r=>r.ctx.storage.put('viperEffects',viperEffects(r)),emit=(r,e)=>r.broadcast({type:'event',event:e});
const playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing',point=p=>p&&['x','y','z'].every(k=>finite(p[k])),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),dir=m=>['dx','dy','dz'].every(k=>finite(m[k],-1,1))&&Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)<.05;
const vulnerable=(p,n)=>p?.joined&&p.hp>0&&p.active&&!p.realm&&!cloveInvulnerable(p,n)&&p.omen?.channel?.kind!=='ultimate';
export function liveViperEffects(r,n){const fx=viperEffects(r);return{devices:fx.devices.filter(e=>!e.expiresAt||e.expiresAt>n),flights:fx.flights.filter(e=>e.createdAt+V.flightMs>n)};}
export async function viperEvent(r,w,p,m,n){if(!m.type.startsWith('viper_'))return false;const fx=viperEffects(r),fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};
 if(!playing(r))return fail('回合結束後無法使用技能');
 if(m.type==='viper_contact'){
  const f=fx.flights.find(e=>e.id===m.id&&e.ownerUid===p.uid),at=f&&finite(m.at,n-600,n+100)?Math.min(n,m.at):n;if(!f||!point(m)||at<(f.segmentAt||f.createdAt)||f.createdAt+V.flightMs<n||dist(viperFlight(f,at),m)>3||!['nx','ny','nz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.nx,m.ny,m.nz)-1)>.05)return fail('落點資料無效');
  const vy=f.vy-V.gravity*(at-(f.segmentAt||f.createdAt))/1000,dot=f.vx*m.nx+vy*m.ny+f.vz*m.nz;if(dot>=0)return true;
  if(m.ny<.45){Object.assign(f,{x:m.x,y:m.y,z:m.z,vx:(f.vx-2*dot*m.nx)*.65,vy:(vy-2*dot*m.ny)*.65,vz:(f.vz-2*dot*m.nz)*.65,segmentAt:at});emit(r,f);await persist(r);return true;}
  fx.flights=fx.flights.filter(e=>e.id!==f.id);emit(r,{type:'viper_flight_end',id:f.id});const e={type:'viper_device',kind:f.kind==='acid'?'acid':'orb',id:f.id,ownerUid:f.ownerUid,ownerName:f.ownerName,team:f.team,x:m.x,y:m.y+(f.kind==='orb'?V.orbRadius*.5:.04),z:m.z,createdAt:n,on:false,radius:f.kind==='acid'?V.acidRadius:V.orbRadius,lastTick:n};if(f.kind==='acid')e.expiresAt=n+V.acidMs;fx.devices.push(e);emit(r,e);await persist(r);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;
 }
 if(p.agent!=='viper'||!vulnerable(p,n)||detained(p,n))return fail('目前無法施放 Viper 技能');const s=tickViperFuel(p,n);
 if(m.type==='viper_throw'){
  if(!dir(m)||!['acid','orb'].includes(m.kind)||m.kind==='acid'&&s.cUsed||m.kind==='orb'&&s.qUsed)return fail('投擲技能尚未就緒');if(m.kind==='acid')s.cUsed=true;else s.qUsed=true;
  const f={type:'viper_flight',kind:m.kind,id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-.25,z:p.z,vx:m.dx*V.throwSpeed,vy:m.dy*V.throwSpeed,vz:m.dz*V.throwSpeed,createdAt:n};if(m.kind==='orb')s.orbId=f.id;fx.flights.push(f);emit(r,f);
 }else if(m.type==='viper_wall'){
  if(s.eUsed||!Array.isArray(m.path)||m.path.length<2||m.path.length>21||m.path.some((v,i)=>!point(v)||dist(p,v)>V.wallLength+5||i>0&&(dist(v,m.path[i-1])>4||Math.hypot(v.x-m.path[i-1].x,v.z-m.path[i-1].z)<.1)))return fail('毒幕路徑無效');s.eUsed=true;s.wallId=crypto.randomUUID();const e={type:'viper_device',kind:'wall',id:s.wallId,ownerUid:p.uid,ownerName:p.name,team:p.team,path:m.path,createdAt:n,on:false};fx.devices.push(e);emit(r,e);
 }else if(m.type==='viper_toggle'){
  if(!['orb','wall'].includes(m.kind)||n<(s.toggleAt||0))return true;const e=fx.devices.find(e=>e.ownerUid===p.uid&&e.kind===m.kind&&e.id===s[m.kind+'Id']);if(!e)return fail('先部署毒氣裝置');const on=!s[m.kind+'On'];if(on&&s.fuel<V.minFuel)return fail('需要至少 20 燃料');s[m.kind+'On']=on;s.toggleAt=n+V.toggleMs;if(!on)s.regenAt=n+V.regenDelayMs;e.on=on;emit(r,e);
 }else if(m.type==='viper_pit'){
  const old=fx.devices.find(e=>e.kind==='pit'&&e.ownerUid===p.uid);if(old){fx.devices=fx.devices.filter(e=>e.id!==old.id);s.pitId=null;s.outsideAt=0;emit(r,{type:'viper_remove',id:old.id});}
  else{if(p.ultUsed||!point(m)||Math.hypot(m.x-p.x,m.y-(p.y-2.2),m.z-p.z)>V.pitRange)return fail('大招落點無效或已使用');p.ultUsed=true;s.pitId=crypto.randomUUID();const e={type:'viper_device',kind:'pit',id:s.pitId,ownerUid:p.uid,ownerName:p.name,team:p.team,x:m.x,y:m.y+V.pitHeight/2,z:m.z,radius:V.pitRadius,on:true,createdAt:n,lastTick:n};fx.devices.push(e);emit(r,e);}
 }else return true;
 r.save(w,p);await persist(r);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;
}
export async function tickViper(r,n){const fx=viperEffects(r),active=playing(r);let pending=false;
 for(const w of r.sockets()){const p=r.data(w);if(!p?.joined)continue;if(p.agent==='viper'){const s=tickViperFuel(p,n,!active||!p.active||detained(p,n));r.save(w,p);pending ||=s.fuel<100||s.orbOn||s.wallOn;}pending ||= p.viperPoisonUntil>n;}
 if(!active){fx.devices=[];fx.flights=[];await persist(r);return pending;}
 for(const e of [...fx.devices]){
  const ownerSocket=r.sockets().find(w=>r.data(w)?.uid===e.ownerUid),owner=ownerSocket&&r.data(ownerSocket),s=owner?.viper;
  if(e.kind==='pit'){
   const alive=owner?.agent==='viper'&&owner.hp>0&&owner.joined&&!owner.leaving&&s?.pitId===e.id;if(alive&&inViperGas({...owner,y:owner.y-1},e))s.outsideAt=0;else if(alive&&!s.outsideAt)s.outsideAt=n;
   if(!alive||s.outsideAt&&n>=s.outsideAt+V.pitExitMs){fx.devices=fx.devices.filter(v=>v.id!==e.id);if(s){s.pitId=null;s.outsideAt=0;r.save(ownerSocket,owner);}emit(r,{type:'viper_remove',id:e.id});continue;}r.save(ownerSocket,owner);
  }else if(['orb','wall'].includes(e.kind)){const on=owner?.agent==='viper'&&owner.hp>0&&owner.active&&!owner.realm&&!detained(owner,n)&&!!s?.[e.kind+'On'];if(e.on!==on){e.on=on;emit(r,e);}}
  if(e.expiresAt&&n>=e.expiresAt){fx.devices=fx.devices.filter(v=>v.id!==e.id);emit(r,{type:'viper_remove',id:e.id});continue;}
  if(e.kind!=='acid'&&!e.on)continue;const dt=Math.min(1,Math.max(0,n-(e.lastTick||n))/1000);e.lastTick=n;
  for(const w of r.sockets()){const p=r.data(w);if(!vulnerable(p,n))continue;const at={...p,y:p.y-1};if(e.kind==='acid'){
    if(Math.hypot(p.x-e.x,p.z-e.z)>e.radius||Math.abs(p.y-2.2-e.y)>2)continue;p.vulnerableUntil=Math.max(p.vulnerableUntil||0,n+V.vulnerableMs);r.save(w,p);if(dt>0)await abilityDamage(r,w,p,V.acidDps*dt,{...e,kind:'acid',id:e.id+':'+n,cause:'viper',weaponName:'SNAKE BITE'},n);
   }else if(p.team!==e.team&&inViperGas(at,e)){
    // A player standing in overlapping clouds pays for one poison tick only.
    if(p.viperLastPoisonAt===n)continue;poisonViper(p,n,dt);r.save(w,p);
   }
  }
 }
 fx.flights=fx.flights.filter(e=>e.createdAt+V.flightMs>n);await persist(r);await r.rounds.elimination();return pending||fx.flights.length>0||fx.devices.some(e=>e.on||e.kind==='acid');
}
