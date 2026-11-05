// Skill worlds are ephemeral simulation state. Keep the latest copy in memory,
// checkpoint changes together, and fence each record by map/round on recovery.
export const CHECKPOINT_MS=10000;
export const RECOVERY_ALARM_MS=30000;
const WORLDS=new Set(['agentBatchEffects','sprays','barriers','slow','cloveEffects','isoEffects','omenEffects','brimEffects','reynaEffects','sovaEffects','reconEffects','razeEffects','astraEffects','viperEffects','breachEffects','neonEffects','cypherEffects','killjoyEffects']);
const copy=value=>value===undefined?undefined:structuredClone(value);
const empty=value=>value==null||Array.isArray(value)&&value.length===0||typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([key,v])=>['tickAt','lastTick'].includes(key)||empty(v));
const epoch=meta=>`${meta?.mapEpoch||0}:${meta?.round?.number||1}`;
const signature=(key,value)=>WORLDS.has(key)&&empty(value)?'empty':JSON.stringify(value);
function metaCore(value){if(!value)return JSON.stringify(value);const core=copy(value);delete core.mechanisms;delete core.marketDoor;if(core.spike?.action)delete core.spike.action.heartbeatAt;return JSON.stringify(core);}

export class RoomStorage {
 constructor(raw,{now=()=>Date.now(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),checkpointMs=CHECKPOINT_MS,onError=()=>{}}={}){
  this.raw=raw;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.checkpointMs=checkpointMs;this.onError=onError;this.cache=new Map();this.dirty=new Set();this.chain=Promise.resolve();this.timer=null;this.revision=0;this.stats={putRequests:0,requestedKeys:0,deduplicatedKeys:0,deferredKeys:0,backendPutCalls:0,backendPutKeys:0,backendDeleteCalls:0,backendDeleteKeys:0,checkpointFlushes:0,errors:0};
 }
 enqueue(fn){const task=this.chain.then(fn);this.chain=task.catch(()=>{});return task;}
 error(error){this.stats.errors++;this.stats.lastErrorAt=this.now();this.onError(error);}
 async get(key){
  if(Array.isArray(key))return new Map((await Promise.all(key.map(async k=>[k,await this.get(k)]))).filter(([,v])=>v!==undefined));
  if(this.cache.has(key))return copy(this.cache.get(key).value);
  const raw=await this.raw.get(key);let value=raw;
  if(WORLDS.has(key)&&raw?.__valoCheckpoint===1){const meta=await this.get('meta');value=raw.epoch===epoch(meta)?raw.data:undefined;}
  const current=this.cache.get(key);if(current)return copy(current.value);
  const entry={value:copy(value),sig:signature(key,value),baseline:signature(key,value),exists:raw!==undefined,epoch:WORLDS.has(key)?epoch(this.cache.get('meta')?.value):null,persistedEpoch:raw?.__valoCheckpoint===1?raw.epoch:undefined,coreBaseline:key==='meta'?metaCore(value):null,rev:++this.revision};
  // An old-epoch checkpoint must eventually be removed, even if its logical value is empty.
  if(WORLDS.has(key)&&raw!==undefined&&value===undefined)entry.baseline='stale';
  this.cache.set(key,entry);return copy(value);
 }
 async put(key,value){
  const values=typeof key==='string'?{[key]:value}:key;this.stats.putRequests++;const immediate=[];
  for(const [name,v]of Object.entries(values)){
   this.stats.requestedKeys++;if(!this.cache.has(name))await this.get(name);
   const entry=this.cache.get(name),sig=signature(name,v),oldSig=entry.sig;
   const currentEpoch=WORLDS.has(name)?epoch(this.cache.get('meta')?.value):null;
   entry.value=copy(v);entry.sig=sig;entry.epoch=currentEpoch;entry.rev=++this.revision;
   const sameEpoch=!WORLDS.has(name)||entry.persistedEpoch===undefined||entry.persistedEpoch===currentEpoch;
   if(sig===entry.baseline&&sameEpoch&&!entry.inFlight){this.dirty.delete(name);this.stats.deduplicatedKeys++;continue;}
   if(sig===oldSig&&this.dirty.has(name)&&(WORLDS.has(name)||name==='meta'&&!entry.inFlight&&entry.coreBaseline===metaCore(v))){this.stats.deduplicatedKeys++;this.schedule();continue;}
   this.dirty.add(name);
   if(WORLDS.has(name)||name==='meta'&&!entry.inFlight&&entry.coreBaseline===metaCore(v)){this.stats.deferredKeys++;this.schedule();}
   else immediate.push(name);
  }
  if(immediate.length)await this.flushKeys(immediate);
 }
 schedule(){if(this.timer!==null||!this.dirty.size)return;this.timer=this.setTimer(()=>{this.timer=null;void this.flush().catch(e=>{this.error(e);this.scheduleRetry();});},this.checkpointMs);this.timer?.unref?.();}
 scheduleRetry(){if(this.timer!==null||!this.dirty.size)return;this.timer=this.setTimer(()=>{this.timer=null;void this.flush().catch(e=>{this.error(e);this.scheduleRetry();});},60000);this.timer?.unref?.();}
 snapshot(keys){return keys.filter(key=>this.dirty.has(key)).map(key=>{const e=this.cache.get(key);return{key,entry:e,rev:e.rev,sig:e.sig,epoch:e.epoch,remove:WORLDS.has(key)&&e.sig==='empty',value:copy(e.value)};});}
 async flushKeys(keys){const snapshots=this.snapshot(keys);if(!snapshots.length)return;
  for(const s of snapshots)s.entry.inFlight=(s.entry.inFlight||0)+1;
  return this.enqueue(async()=>{
   const removed=snapshots.filter(s=>s.remove&&s.entry.exists),put=snapshots.filter(s=>!s.remove);
   if(put.length){const values=Object.fromEntries(put.map(s=>[s.key,WORLDS.has(s.key)?{__valoCheckpoint:1,epoch:s.epoch,data:s.value}:s.value]));if(put.length===1)await this.raw.put(put[0].key,values[put[0].key]);else await this.raw.put(values);this.stats.backendPutCalls++;this.stats.backendPutKeys+=put.length;}
   if(removed.length){await this.raw.delete(removed.map(s=>s.key));this.stats.backendDeleteCalls++;this.stats.backendDeleteKeys+=removed.length;}
   for(const s of snapshots){if(this.cache.get(s.key)!==s.entry)continue;const e=s.entry;e.baseline=s.sig;if(s.key==='meta')e.coreBaseline=metaCore(s.value);e.persistedEpoch=s.epoch;e.exists=!s.remove;if(e.rev===s.rev)this.dirty.delete(s.key);else if(e.sig===e.baseline&&e.epoch===s.epoch)this.dirty.delete(s.key);else this.dirty.add(s.key);}
   if(!this.dirty.size&&this.timer!==null){this.clearTimer(this.timer);this.timer=null;}
  }).finally(()=>{for(const s of snapshots)s.entry.inFlight--;});
 }
 async flush(){if(!this.dirty.size)return;this.stats.checkpointFlushes++;await this.flushKeys([...this.dirty]);if(this.dirty.size)this.schedule();}
 async delete(keys){const list=Array.isArray(keys)?keys:[keys],direct=[];let count=0;
  for(const key of list){if(!this.cache.has(key))await this.get(key);const e=this.cache.get(key);if(e.value!==undefined||e.exists)count++;e.value=undefined;e.sig=signature(key,undefined);e.rev=++this.revision;
   if(WORLDS.has(key)){if(e.baseline==='empty'&&!e.exists&&!e.inFlight)this.dirty.delete(key);else{this.dirty.add(key);this.schedule();}}
   else {this.dirty.delete(key);if(e.exists||e.inFlight)direct.push(key);}
  }
  if(direct.length)await this.enqueue(async()=>{await this.raw.delete(direct);this.stats.backendDeleteCalls++;this.stats.backendDeleteKeys+=direct.length;for(const key of direct){const e=this.cache.get(key);if(e?.value===undefined){e.exists=false;e.baseline=e.sig;this.dirty.delete(key);}}});
  return Array.isArray(keys)?count:count>0;
 }
 async deleteAll(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;this.cache.clear();this.dirty.clear();await this.enqueue(()=>this.raw.deleteAll());}
 async list(options){return this.raw.list(options);}
 report(){return{...this.stats,pendingKeys:this.dirty.size,checkpointMs:this.checkpointMs};}
}

// Simulation uses volatile timers while players are active. A low-frequency durable
// alarm recovers the loop after eviction; idle/empty rooms still use durable alarms.
export class RoomGameLoop {
 constructor(raw,run,{now=()=>Date.now(),setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),hasPlayers=()=>true,onError=()=>{},recoveryMs=RECOVERY_ALARM_MS}={}){this.raw=raw;this.run=run;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.hasPlayers=hasPlayers;this.onError=onError;this.recoveryMs=recoveryMs;this.timer=null;this.nextAt=0;this.durableAt=0;this.chain=Promise.resolve();this.stats={memoryTicks:0,durableAlarmWrites:0,errors:0};}
 async init(){this.durableAt=await this.raw.getAlarm?.()||0;}
 durableFired(){this.durableAt=0;}
 cancelTimer(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;this.nextAt=0;}
 async arm(at){const task=this.chain.then(async()=>{if(this.durableAt>this.now()&&this.durableAt<=at)return;await this.raw.setAlarm(at);this.durableAt=at;this.stats.durableAlarmWrites++;});this.chain=task.catch(()=>{});return task;}
 async schedule(at){at=Number(at);if(!Number.isFinite(at))throw new TypeError('Invalid alarm time');const n=this.now(),active=this.hasPlayers()&&at-n<=1000;
  if(active){if(this.timer===null||at<this.nextAt){this.cancelTimer();this.nextAt=at;this.timer=this.setTimer(()=>{this.timer=null;this.nextAt=0;this.stats.memoryTicks++;Promise.resolve().then(this.run).catch(e=>{this.stats.errors++;this.onError(e);void this.schedule(this.now()+500).catch(this.onError);});},Math.max(1,at-n));this.timer?.unref?.();}try{await this.arm(n+this.recoveryMs);}catch(e){this.stats.errors++;this.onError(e);}return;}
  if(this.timer!==null&&this.nextAt<=at)return;this.cancelTimer();await this.arm(at);
 }
 report(){return{...this.stats,recoveryMs:this.recoveryMs};}
}

export function optimizedRoomContext(ctx,room,options={}){
 const error=e=>console.error('ValoNow storage:',e?.message||String(e));
 const store=new RoomStorage(ctx.storage,{...options,onError:error});
 const loop=new RoomGameLoop(ctx.storage,()=>ctx.blockConcurrencyWhile(()=>room.runAlarm(true)),{...options,hasPlayers:()=>room.sockets().length>0,onError:error});
 store.setAlarm=loop.schedule.bind(loop);
 const context={storage:store};
 for(const key of ['getWebSockets','acceptWebSocket','blockConcurrencyWhile','waitUntil'])if(typeof ctx[key]==='function')context[key]=ctx[key].bind(ctx);
 return{context,store,loop};
}
