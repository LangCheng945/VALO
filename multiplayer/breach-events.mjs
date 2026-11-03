import{BREACH as B,breachState,breachPublic,inBreachLane,flashDuration}from'./breach-rules.mjs';
import{finite}from'./protocol.mjs';
import{detained}from'./killjoy-rules.mjs';
import{cloveInvulnerable}from'./clove-rules.mjs';
import{abilityDamage}from'./sova-events.mjs';
export const breachEffects=r=>(r.breachEffects||={waves:[]});
export const liveBreachEffects=(r,n)=>({waves:breachEffects(r).waves.filter(e=>e.expiresAt>n)});
const persist=r=>r.ctx.storage.put('breachEffects',breachEffects(r));
const emit=(r,e)=>r.broadcast({type:'event',event:e});
const playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing';
const vulnerable=(p,n)=>p?.joined&&p.hp>0&&p.active&&!p.realm&&!cloveInvulnerable(p,n)&&p.omen?.channel?.kind!=='ultimate';
export async function breachEvent(r,w,p,m,n){
 if(!m.type.startsWith('breach_'))return false;const fx=breachEffects(r),fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};
 if(m.type==='breach_cancel'){if(p.breach)p.breach.chargeAt=0;r.save(w,p);r.snapshot();return true;}
 if(m.type==='breach_flash_seen'){
  const e=fx.waves.find(e=>e.id===m.id&&e.kind==='flash'&&n>=e.firesAt&&n<=e.firesAt+700);
  if(!playing(r)||!e||!vulnerable(p,n)||e.seen?.includes(p.uid))return true;const duration=flashDuration(p,e);if(!duration)return true;(e.seen||=[]).push(p.uid);p.breachFlashUntil=Math.max(p.breachFlashUntil||0,e.firesAt+duration);r.save(w,p);await persist(r);r.snapshot();return true;
 }
 if(!playing(r)||p.agent!=='breach'||!vulnerable(p,n)||detained(p,n))return fail('目前無法施放 Breach 技能');
 const s=breachState(p);
 if(m.type==='breach_charge'){if(s.eReadyAt>n||s.chargeAt)return fail('震盪尚未就緒');s.chargeAt=n;p.shotUsed=true;p.spikeEquipped=false;await r.spike.cancel(p.uid,n);}
 else{
  if(!['dx','dy','dz'].every(k=>finite(m[k],-1,1))||Math.abs(Math.hypot(m.dx,m.dy,m.dz)-1)>.05)return fail('技能方向無效');
  const flat=Math.hypot(m.dx,m.dz);if(flat<.1)return fail('請瞄準前方');const e={type:'breach_wave',id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,x:p.x,y:p.y-2.2,z:p.z,dx:m.dx/flat,dz:m.dz/flat,createdAt:n,hits:[]};
  if(m.type==='breach_aftershock'||m.type==='breach_flash'){
   if(!['x','y','z'].every(k=>finite(m[k]))||Math.hypot(m.x-p.x,m.y-p.y,m.z-p.z)>B.surfaceRange+B.wallDepth||Math.abs(m.y-p.y)>12)return fail('請瞄準可穿透的牆面');
   const v={x:m.x-p.x,y:m.y-p.y,z:m.z-p.z},len=Math.hypot(v.x,v.y,v.z);if(len<.2||(v.x*m.dx+v.y*m.dy+v.z*m.dz)/len<.95)return fail('牆面位置與瞄準方向不符');
   if(m.type==='breach_aftershock'){if(s.cUsed)return fail('爆破已用盡');s.cUsed=1;Object.assign(e,{kind:'aftershock',x:m.x,y:m.y-1,z:m.z,width:B.afterWidth,length:B.afterLength,firesAt:n+B.afterDelay,pulses:0});e.expiresAt=e.firesAt+B.afterInterval*(B.afterPulses-1)+500;}
   else{if(s.qUsed>=2)return fail('閃光已用盡');s.qUsed++;Object.assign(e,{kind:'flash',x:m.x,y:m.y,z:m.z,firesAt:n+B.flashDelay});e.expiresAt=e.firesAt+800;}
  }else if(m.type==='breach_fault'){
   if(!s.chargeAt||s.eReadyAt>n)return fail('先按住左鍵蓄力');const charge=Math.min(1,Math.max(0,n-s.chargeAt)/B.chargeMs);s.eReadyAt=n+B.rechargeMs;Object.assign(e,{kind:'fault',width:B.faultWidth,length:B.faultMin+(B.faultMax-B.faultMin)*charge,firesAt:n+B.faultDelay});e.expiresAt=e.firesAt+500;
  }else if(m.type==='breach_ultimate'){
   if(p.ultUsed)return fail('大招已使用');p.ultUsed=true;Object.assign(e,{kind:'ultimate',width:B.ultWidth,length:B.ultLength,firesAt:n+B.ultDelay,band:0});e.expiresAt=e.firesAt+B.ultStep*(B.ultBands-1)+500;
  }else return true;
  s.chargeAt=0;fx.waves.push(e);emit(r,e);
 }
 r.save(w,p);await persist(r);r.snapshot();await r.ctx.storage.setAlarm(n+100);return true;
}
export async function tickBreach(r,n){const fx=breachEffects(r),active=playing(r);let pending=false;
 for(const w of r.sockets()){const p=r.data(w);if(!p?.joined)continue;if(p.breach?.chargeAt&&(!active||!vulnerable(p,n)||detained(p,n))){p.breach.chargeAt=0;r.save(w,p);}pending ||= !!p.breach?.chargeAt||p.breach?.eReadyAt>n||p.breachFlashUntil>n||p.breachConcussUntil>n;}
 if(!active){fx.waves=[];await persist(r);return pending;}
 for(const e of fx.waves){if(n<e.firesAt)continue;
  if(e.kind==='flash'){if(!e.fired){e.fired=true;emit(r,{...e,type:'breach_flash_pop'});}continue;}
  const count=e.kind==='aftershock'?B.afterPulses:e.kind==='ultimate'?B.ultBands:1,interval=e.kind==='aftershock'?B.afterInterval:e.kind==='ultimate'?B.ultStep:1;
  while((e.step||0)<count&&n>=e.firesAt+(e.step||0)*interval){const step=e.step||0;e.step=step+1;emit(r,{...e,type:'breach_burst',step});
   for(const w of r.sockets()){const p=r.data(w);if(!vulnerable(p,n)||e.kind!=='aftershock'&&p.uid===e.ownerUid)continue;const min=e.kind==='ultimate'?step*e.length/count:0,max=e.kind==='ultimate'?(step+1)*e.length/count:e.length;if(!inBreachLane(p,e,min,max)||e.kind!=='aftershock'&&e.hits.includes(p.uid))continue;
    if(e.kind==='aftershock')await abilityDamage(r,w,p,B.afterDamage,{...e,kind:'aftershock',cause:'breach',weaponName:'AFTERSHOCK',id:e.id+':'+step},n);
    else{e.hits.push(p.uid);p.breachConcussUntil=Math.max(p.breachConcussUntil||0,n+(e.kind==='ultimate'?B.ultMs:B.faultMs));r.save(w,p);if(e.kind==='ultimate')r.send(w,{type:'event',event:{type:'breach_lift',id:e.id,targetUid:p.uid}});}
   }
  }
 }
 fx.waves=fx.waves.filter(e=>e.expiresAt>n);await persist(r);await r.rounds.elimination();return pending||fx.waves.length>0;
}
