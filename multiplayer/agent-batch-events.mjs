import {AgentBatchEngine} from './agent-batch-engine.mjs';
import {BATCH_KITS,batchAgent,batchState,batchPoint,batchDistance,batchStatus,batchSuppressed,batchUntargetable,batchAbilityImmune,batchAttackBlocked,batchShotBlock,interceptBatchLethal} from './agent-batch-rules.mjs';
import {abilityDamage,cancelSova} from './sova-events.mjs';
import {finite,WEAPONS} from './protocol.mjs';
import {spikeSite} from './map-sites.mjs';
import {SPIKE} from './spike.mjs';
import {cancelOmenChannel} from './omen-events.mjs';import {cancelRecon} from './recon-events.mjs';import {cancelCypher} from './cypher-events.mjs';
export const batchWorld=r=>(r.agentBatchEffects||={effects:[]});
export function liveBatchEffects(r,n){return batchWorld(r).effects.filter(e=>e.expiresAt>n).map(({observedAt,hit,...e})=>e);}
export const batchPublic=p=>p.agentBatch||null;
const emit=(r,e)=>r.broadcast({type:'event',event:e});
const playing=r=>!r.rounds.enabled||r.meta.round.phase==='playing';
const actors=r=>r.sockets().map(w=>r.data(w)).filter(p=>p?.joined);
const ownerSocket=(r,uid)=>r.sockets().find(w=>r.data(w)?.uid===uid);
const persist=r=>r.ctx.storage.put('agentBatchEffects',batchWorld(r));
export async function interruptBatchTarget(r,w,p,n){if(!batchSuppressed(p,n))return;if(p.sova?.control)await cancelSova(r,w,p,n);if(p.omen?.channel)await cancelOmenChannel(r,w,p,n);if(p.cypher?.control)await cancelCypher(r,w,p);if(p.recon?.control)await cancelRecon(r,w,p);const current=r.data(w);if(current.neon){current.neon.running=false;current.neon.equipped=false;}if(current.astra)current.astra.planning=false;if(current.raze)current.raze.equipped=false;if(current.breach)current.breach.chargeAt=0;if(current.agentBatch)current.agentBatch.controlId=null;r.save(w,current);}
async function commands(r,engine,n){
 for(const command of engine.commands){
  if(command.type==='upsert')emit(r,{type:'batch_effect',effect:command.effect});
  else if(command.type==='remove')emit(r,{type:'batch_remove',id:command.id});
  else if(command.type==='damage'){const w=ownerSocket(r,command.uid),p=w&&r.data(w);if(p){await abilityDamage(r,w,p,command.damage,{...command.source,cause:'agent',weaponName:command.source.weaponName||command.source.role?.toUpperCase()||'ABILITY'},n);if(command.source.weaponName==='TOUR DE FORCE'&&p.hp<=0){const shooter=engine.actors.find(a=>a.uid===command.source.ownerUid);if(shooter)engine.effect(shooter,'slow-field',{x:p.x,y:p.y-2.2,z:p.z},5000,{radius:4});}}}
  else if(command.type==='relocate'){const w=ownerSocket(r,command.uid);if(w)r.send(w,{type:'event',event:{type:'batch_relocate',position:command.position}});}
  else if(command.type==='weapon'){const w=ownerSocket(r,command.uid);if(w)r.send(w,{type:'event',event:{type:'batch_weapon',...command}});}
  else if(command.type==='flash_check'){const w=ownerSocket(r,command.uid);if(w)r.send(w,{type:'event',event:{type:'batch_flash_check',effect:command.effect}});}
  else if(command.type==='impulse'){const w=ownerSocket(r,command.uid);if(w)r.send(w,{type:'event',event:{type:'batch_impulse',...command}});}
  else if(command.type==='intercept_check'){const w=ownerSocket(r,command.ownerUid);if(w)r.send(w,{type:'event',event:{type:'batch_intercept_check',...command}});}
  else if(command.type==='wingman_start'){const s=r.spike.state();if(s&&s.phase==='carried')s.wingmanCarrierId=command.effect.id;}
  else if(command.type==='wingman_tick')await wingmanTick(r,command.effect,n);
  else if(command.type==='wingman_cancel'){const s=r.spike.state(),e=command.effect;if(s?.wingmanCarrierId===e.id){if(s.phase==='carried')Object.assign(s,{phase:'dropped',carrierUid:null,x:e.x,y:e.y,z:e.z,action:null});s.wingmanCarrierId=null;if(s.action?.wingmanId===e.id)s.action=null;await r.spike.publish();}}
 }
}
async function wingmanTick(r,e,n){const s=r.spike.state(),ws=ownerSocket(r,e.ownerUid),p=ws&&r.data(ws);if(!s||!p||!playing(r)||e.hp<=0)return;const proxy={...p,x:e.x,y:e.y+2.2,z:e.z,hp:e.hp,active:true};const plant=p.team==='attack',site=plant?spikeSite(r.meta.map,proxy):s.site;if(plant?(!site||s.phase!=='carried'||s.carrierUid!==p.uid):(s.phase!=='planted'||batchDistance({...s,y:s.y+.3},e)>SPIKE.reach))return;if(s.action&&s.action.wingmanId!==e.id)return;const base=plant?0:s.checkpoint||0;if(!s.action)s.action={kind:plant?'plant':'defuse',uid:p.uid,wingmanId:e.id,site,base,startedAt:n,endsAt:n+(plant?SPIKE.plantMs:SPIKE.defuseMs*(1-base)),heartbeatAt:n,anchor:{x:e.x,y:e.y+2.2,z:e.z}};else s.action.heartbeatAt=n;await r.spike.publish();}
async function applyEngine(r,engine,n){for(const p of engine.actors){const w=ownerSocket(r,p.uid);if(w)r.save(w,p);}await commands(r,engine,n);for(const w of r.sockets()){const p=r.data(w);if(p?.joined)await interruptBatchTarget(r,w,p,n);}if(engine.changed)await persist(r);r.queueSnapshot();}
export async function batchEvent(r,w,p,m,n){if(!m.type.startsWith('batch_'))return false;const fail=reason=>{r.send(w,{type:'ability_error',reason});return true;};if(m.type!=='batch_cancel_control'&&(!playing(r)||p.hp<=0||!p.active||p.realm))return fail('目前無法使用技能');
 const world=batchWorld(r),list=actors(r),self=list.find(a=>a.uid===p.uid),engine=new AgentBatchEngine(world,list,n);
 if(m.type==='batch_cancel_control'){engine.cancelControl(self);
 }else if(m.type==='batch_cast'){
  if(p.agent==='gekko'&&m.key==='q'&&m.alt){const s=r.spike.state(),at=m.point;if(!s||!at||(p.team==='attack'?(s.phase!=='carried'||s.carrierUid!==p.uid||!spikeSite(r.meta.map,{...at,y:at.y+2.2})):(s.phase!=='planted'||batchDistance(at,s)>4)))return fail('Wingman 需要有效的安裝據點或已安裝 Spike');}
  const result=engine.cast(self,m);if(!result.ok)return fail(result.reason);
 }else if(m.type==='batch_contact'){if(!engine.contact(self,m))return true;
 }else if(m.type==='batch_observe'){if(!engine.observe(self,m))return true;
 }else if(m.type==='batch_interact'){if(!engine.interact(self,m))return true;
 }else if(m.type==='batch_steer'){if(!engine.steer(self,m))return true;
 }else if(m.type==='batch_control'){if(!engine.control(self,m))return true;
 }else if(m.type==='batch_stow'){if(self.agentBatch?.weapon)self.agentBatch.weapon.equipped=false;
 }else if(m.type==='batch_flash_seen'){
  if((self.batchFlashSeen||[]).includes(m.id))return true;const e=(r.batchFlashes||=[]).find(e=>e.id===m.id&&e.expiresAt>n);if(!e||batchAbilityImmune(self,n)||batchDistance(self,e)>35)return true;const dx=e.x-self.x,dy=e.y-self.y,dz=e.z-self.z,len=Math.hypot(dx,dy,dz),dot=len?(-Math.sin(self.yaw||0)*Math.cos(self.pitch||0)*dx+Math.sin(self.pitch||0)*dy-Math.cos(self.yaw||0)*Math.cos(self.pitch||0)*dz)/len:1;batchStatus(self,'flash',n,dot>.25?1800:350);self.batchFlashSeen=[...(self.batchFlashSeen||[]),m.id].slice(-20);
 }else if(m.type==='batch_floor'){const e=world.effects.find(e=>e.id===m.id&&e.ownerUid===p.uid&&['clone','gate','wingman','thrash'].includes(e.role));if(e&&finite(m.y)&&Math.abs(m.y-e.y)<2){e.y=m.y;engine.emit('upsert',{effect:e});engine.changed=true;}
 }else if(m.type==='batch_block'){const e=world.effects.find(e=>e.id===m.id&&e.ownerUid===p.uid&&['clone','gate','wingman','drone','thrash','dizzy'].includes(e.role));if(e&&['x','y','z'].every(k=>finite(m[k]))&&batchDistance(e,m)<2){Object.assign(e,{x:m.x,y:m.y,z:m.z,vx:0,vy:0,vz:0});engine.emit('upsert',{effect:e});engine.changed=true;}
 }else if(m.type==='batch_intercept'){const device=world.effects.find(e=>e.id===m.interceptorId&&e.ownerUid===p.uid&&e.role==='interceptor'&&e.enabled),target=world.effects.find(e=>e.id===m.id&&e.team!==p.team&&(e.phase==='flight'||e.hp>0&&!e.bulletShield));if(device&&target&&batchDistance(device,target)<device.radius)engine.remove(target);
 }else if(m.type==='batch_hit'){
  const e=world.effects.find(e=>e.id===m.id);if(!e||p.shotUsed||n-p.lastShot>400||!p.shotEnd||batchDistance(p.shotEnd,e)>Math.max(1.3,e.radius||0))return true;self.shotUsed=true;engine.hit(self,m,WEAPONS[p.shotWeapon||p.weapon]?.body||30);
 }else if(m.type==='batch_shot'){
  const s=batchState(self),gun=s.weapon;if(!gun?.equipped||gun.ammo<=0||batchSuppressed(self,n)||batchAttackBlocked(self,n)||gun.kind==='tour'&&p.vyseJammedUntil>n||n-(gun.lastShot||0)<(gun.kind==='tour'?1100:300)||!['x','y','z'].every(k=>finite(m[k]))||batchDistance(self,m)>300)return true;gun.ammo--;gun.lastShot=n;self.lastShot=n;engine.emit('weapon',{uid:p.uid,...gun});emit(r,{type:'shot',senderUid:p.uid,weapon:gun.kind==='tour'?'operator':'sheriff',sx:p.x,sy:p.y,sz:p.z,ex:m.x,ey:m.y,ez:m.z});const object=world.effects.find(e=>e.id===m.effectId&&e.hp>0&&batchDistance(e,m)<Math.max(1.3,e.radius||0));if(object)engine.hit(self,{id:object.id},gun.kind==='tour'?150:55);const target=list.find(a=>a.uid===m.targetUid);if(target&&target.team!==p.team&&batchDistance({x:target.x,y:target.y-1,z:target.z},m)<2.5&&!batchShotBlock(p,m,world.effects,n)){engine.emit('damage',{uid:target.uid,damage:gun.kind==='tour'?(m.part==='legs'?85:m.part==='head'?255:150):(m.part==='head'?159:m.part==='legs'?46:55),source:{id:crypto.randomUUID(),ownerUid:p.uid,ownerName:p.name,team:p.team,weaponName:gun.kind==='tour'?'TOUR DE FORCE':'HEADHUNTER',weaponDamage:true}});}
 }else return true;
 // Keep short-lived flash checks server-owned; clients only report line of sight.
 for(const c of engine.commands)if(c.type==='flash_check'){r.batchFlashes||=[];r.batchFlashes.push(c.effect);}r.batchFlashes=(r.batchFlashes||[]).filter(e=>e.expiresAt>n).slice(-100);
 await applyEngine(r,engine,n);await r.ctx.storage.setAlarm(n+100);return true;
}
export async function tickBatch(r,n){const world=batchWorld(r),list=actors(r);if(!playing(r)){if(world.effects.length){for(const e of world.effects)emit(r,{type:'batch_remove',id:e.id});world.effects=[];await persist(r);}return false;}if(!world.effects.length&&!list.some(p=>p.agentBatch||p.batchNet||p.batchTether))return false;const engine=new AgentBatchEngine(world,list,n),dt=Math.min(.25,Math.max(0,(n-(world.tickAt||n))/1000));world.tickAt=n;engine.tick(dt);for(const c of engine.commands)if(c.type==='flash_check')(r.batchFlashes||=[]).push(c.effect);r.batchFlashes=(r.batchFlashes||[]).filter(e=>e.expiresAt>n).slice(-100);await applyEngine(r,engine,n);await r.rounds.elimination();return world.effects.length>0||list.some(p=>p.hp>0&&(p.batchNet?.removingAt>n||p.agentBatch?.revive||p.agentBatch?.evolutionUntil>n||p.agentBatch?.nullUntil>n||p.agentBatch?.rewind||p.agentBatch?.downedUntil>n||p.agentBatch?.returnAt>n));}
