import {GameRoom} from '../multiplayer/worker.mjs';
// Only this adapter emulates DO storage/attachments. No Cloudflare SDK or SQL is used.
export class MemoryStorage{
 constructor(schedule){this.values=new Map();this.schedule=schedule;this.writes=0;}
 async get(key){return structuredClone(this.values.get(key));}
 async put(key,value){if(typeof key==='object'){for(const [k,v]of Object.entries(key))this.values.set(k,structuredClone(v));}else this.values.set(key,structuredClone(value));this.writes++;}
 async delete(keys){if(Array.isArray(keys)){let n=0;for(const k of keys)n+=this.values.delete(k)?1:0;return n;}return this.values.delete(keys);}
 async deleteAll(){this.values.clear();}
 async list({prefix='',limit=1000}={}){return new Map([...this.values].filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit).map(([k,v])=>[k,structuredClone(v)]));}
 async setAlarm(time){this.schedule(Number(time));}
}
function quantize(p){const out={...p};for(const key of ['x','y','z','hp','shield','pitch','yaw'])if(Number.isFinite(out[key]))out[key]=Math.round(out[key]*1000)/1000;if(Number.isFinite(out.healCooldown))out.healCooldown=Math.round(out.healCooldown*10)/10;return out;}
export class LanSocket{
 constructor(raw,stats){this.raw=raw;this.stats=stats;this.delta=false;this.baseline=null;}
 get readyState(){return this.raw.readyState;}
 serializeAttachment(value){this.attachment=structuredClone(value);}
 deserializeAttachment(){return structuredClone(this.attachment);}
 close(code=1000,reason=''){this.raw.close(code,reason);}
 send(data){if(this.raw.readyState!==1)return;let packet=JSON.parse(data);
  if(packet.type==='welcome')packet={...packet,transport:'lan',features:[...packet.features,'lan','lan-delta-1']};
  if(packet.type==='players'){
   packet={...packet,players:packet.players.map(quantize)};const players=new Map(packet.players.map(p=>[p.uid,JSON.stringify(p)]));const roundKey=JSON.stringify(packet.round?{...packet.round,serverNow:0}:null),host=packet.hostUid;
   if(this.baseline){const changed=packet.players.filter(p=>this.baseline.players.get(p.uid)!==players.get(p.uid)),removed=[...this.baseline.players.keys()].filter(id=>!players.has(id)),roundChanged=roundKey!==this.baseline.roundKey,hostChanged=host!==this.baseline.host;
    if(!changed.length&&!removed.length&&!roundChanged&&!hostChanged){this.stats.suppressedSnapshots++;return;}
    if(this.delta){packet={type:'players_delta',players:changed,removed,hostUid:host,...(roundChanged?{round:packet.round}:{})};this.stats.deltaSnapshots++;}
   }
   this.baseline={players,roundKey,host};
  }
  const text=JSON.stringify(packet);if(this.raw.bufferedAmount>1024*1024){this.raw.close(1013,'Client too slow');return;}this.raw.send(text);this.stats.sentBytes+=Buffer.byteLength(text);this.stats.sentPackets++;
 }
}
class LanRoom extends GameRoom{
 snapshot(){this.queueSnapshot();}
 queueSnapshot(){if(this.snapshotTimer)return;this.snapshotTimer=setTimeout(()=>{this.snapshotTimer=null;if(this.meta)GameRoom.prototype.snapshot.call(this);},50);this.snapshotTimer.unref?.();}
}
export class RoomRuntime{
 constructor(code,stats,onExpired=()=>{}){this.code=code;this.stats=stats;this.sockets=new Set();this.chain=Promise.resolve();this.closed=false;this.onExpired=onExpired;
  this.storage=new MemoryStorage(time=>{clearTimeout(this.timer);this.timer=setTimeout(()=>this.run(async()=>{await this.room.alarm();if(!this.room.meta&&!this.sockets.size)this.onExpired(this.code);}).catch(e=>console.error('LAN alarm:',e.message)),Math.max(1,time-Date.now()));this.timer.unref?.();});
  const ctx={storage:this.storage,blockConcurrencyWhile:fn=>Promise.resolve().then(fn),acceptWebSocket:ws=>this.sockets.add(ws),getWebSockets:()=>[...this.sockets]};this.room=new LanRoom(ctx,{LAN_MODE:true});
 }
 run(fn){const next=this.chain.then(()=>{if(this.closed)return;return fn();});this.chain=next.catch(()=>{});return next;}
 async create(body){return this.run(()=>this.room.fetch(new Request('http://lan/create',{method:'POST',body:JSON.stringify(body)})));}
 async attach(raw,{admitted=false}={}){const socket=new LanSocket(raw,this.stats);if(admitted)this.room.attachSocket(socket);else await this.run(async()=>{await this.room.ready;this.room.attachSocket(socket);});raw.on('message',(bytes,binary)=>{if(binary){raw.close(1003,'Text JSON required');return;}const text=bytes.toString();try{const p=JSON.parse(text);if(p.type==='join')socket.delta=p.lanVersion===1;}catch{}this.stats.receivedBytes+=bytes.length;this.run(()=>this.room.webSocketMessage(socket,text)).catch(e=>{console.error('LAN packet:',e.message);raw.close(1011,'Room error');});});
  raw.on('close',()=>this.run(async()=>{await this.room.webSocketClose(socket);this.sockets.delete(socket);}).catch(e=>console.error('LAN close:',e.message)));raw.on('error',()=>{});return socket;
 }
 dispose(){this.closed=true;clearTimeout(this.timer);clearTimeout(this.room.snapshotTimer);for(const s of this.sockets){if(s.readyState===1){s.send(JSON.stringify({type:'server_shutdown',reason:'房主已關閉 LAN 伺服器'}));s.close(1001,'LAN server shutdown');}}this.sockets.clear();}
}
