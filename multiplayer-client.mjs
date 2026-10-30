export function normalizeServer(value){
 const u=new URL(String(value).trim());
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('請填伺服器根網址，例如 https://valo-multiplayer.example.workers.dev');
 if(u.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(u.hostname))throw Error('公開連線伺服器必須使用 HTTPS');
 return u.origin;
}
export class RoomClient {
 constructor(server,callbacks={}){this.server=normalizeServer(server);this.callbacks=callbacks;this.socket=null;this.connected=false;this.desiredRoom=null;this.generation=0;this.attempts=0;this.retryTimer=null;}
 async createRoom(map='ascent',{mode='rounds',duration=300}={}){if(!['ascent','haven','summit','abyss'].includes(map))throw Error('Unknown map');const r=await fetch(this.server+'/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({map,mode,duration}),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error(r.status===429?'建立房間太頻繁，請稍後再試':'無法建立房間，請確認伺服器網址和允許的網站網域');const data=await r.json();if(mode==='rounds'&&data.mode!=='rounds')throw Error('連線後端尚未支援回合與復活，請更新 Cloudflare 部署');if(map!=='ascent'&&data.map!==map)throw Error('此伺服器尚未支援 '+map.toUpperCase()+'，請在 Cloudflare 部署最新版本；目前仍可使用 Ascent');return data.code;}
 async join(code,profile){
  if(!/^(?:[A-Z2-9]{6}|PUBLIC)$/.test(code))throw Error('房號須為 6 碼英數字');
  this.leave();this.desiredRoom=code;this.profile=profile;this.attempts=0;
  try{const key=this.transferKey(),ticket=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.removeItem(key);if(ticket?.expires>Date.now())this.resumeToken=ticket.resumeToken;}catch{}
  return this.open();
 }
 open(){
  const generation=++this.generation;this.connected=false;this.callbacks.status?.(this.attempts?'reconnecting':'connecting');
  return new Promise((resolve,reject)=>{
   const url=new URL(this.server+'/rooms/'+this.desiredRoom);url.protocol=url.protocol==='https:'?'wss:':'ws:';
   const ws=new WebSocket(url);this.socket=ws;let welcomed=false;
   const timeout=setTimeout(()=>{reject(Error('連線逾時，請確認房號與伺服器狀態'));ws.close();},8000);
   ws.onopen=()=>ws.send(JSON.stringify({type:'join',...this.profile,resumeToken:this.resumeToken}));
   ws.onmessage=e=>{
    if(generation!==this.generation)return;
    let message;try{message=JSON.parse(e.data);}catch{return;}
    if(message.type==='welcome'){
     if(message.protocol!==1){ws.close(1002,'Protocol mismatch');return;}
     welcomed=true;this.hadConnection=true;clearTimeout(timeout);this.connected=true;this.attempts=0;this.serverFeatures=Array.isArray(message.features)?message.features:[];this.uid=message.uid;this.resumeToken=message.resumeToken;this.callbacks.welcome?.(message);this.callbacks.status?.('connected');resolve(message);
    }else if(message.type==='players'){this.callbacks.host?.(message.hostUid);this.callbacks.players?.(message.players,message.round);}
    else if(message.type==='map_changed')this.callbacks.mapChanged?.(message);
    else if(message.type==='spike_error')this.callbacks.spikeError?.(message.reason);
    else if(message.type==='map_error')this.callbacks.mapError?.(message.reason);
    else if(message.type==='round')this.callbacks.round?.(message.round);
    else if(message.type==='ability_result')this.callbacks.abilityResult?.(message);
    else if(message.type==='ability_error')this.callbacks.abilityError?.(message.reason);
    else if(message.type==='event')this.callbacks.event?.(message.event);
    else if(message.type==='damage')this.callbacks.damage?.(message);
    else if(message.type==='spawn')this.callbacks.spawn?.(message.player);
    else if(message.type==='pong')this.callbacks.latency?.(Math.max(0,Date.now()-message.at));
   };
   ws.onerror=()=>{if(!welcomed){clearTimeout(timeout);reject(Error('無法加入：房間不存在、已滿，或伺服器拒絕此網站網域'));}};
   ws.onclose=()=>{
    clearTimeout(timeout);if(generation!==this.generation)return;this.connected=false;
    if(!welcomed)reject(Error('未能加入房間，請確認房號與後端部署'));
    if(this.hadConnection&&this.desiredRoom&&this.attempts<5){this.callbacks.status?.('reconnecting');this.retryTimer=setTimeout(()=>{this.attempts++;this.open().catch(()=>{});},Math.min(5000,500*2**this.attempts));}
    else{this.callbacks.status?.('disconnected');}
   };
  });
 }
 send(payload){if(!this.connected||this.socket?.readyState!==WebSocket.OPEN||this.socket.bufferedAmount>65536)return false;this.socket.send(JSON.stringify(payload));return true;}
 transferKey(){return 'valo-map-transfer:'+this.server+'/'+this.desiredRoom;}
 prepareMapTransfer(resumeToken){
  try{sessionStorage.setItem(this.transferKey(),JSON.stringify({resumeToken,expires:Date.now()+180000}));return true;}catch{return false;}
 }
 leave(){this.resumeToken=null;this.hadConnection=false;this.desiredRoom=null;this.generation++;clearTimeout(this.retryTimer);this.socket?.close(1000,'Leave');this.socket=null;this.connected=false;}
}
