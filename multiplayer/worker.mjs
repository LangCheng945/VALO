import {VERSION,WEAPONS,isWeapon,spawn,cleanText,finite,validPose,applyDamage} from './protocol.mjs';
const ROOM=/^[A-Z2-9]{6}$/;
const allowed=(request,env)=>(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).includes(request.headers.get('Origin'));
const json=(body,status=200,headers={})=>Response.json(body,{status,headers});
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if((url.pathname==='/'||url.pathname==='/health')&&request.method==='GET')return json({ok:true,protocol:VERSION,service:'valo-multiplayer'});
  if(!allowed(request,env))return json({error:'ORIGIN_NOT_ALLOWED'},403);
  const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(url.pathname==='/rooms'&&request.method==='POST'){
   const lobby=env.ROOMS.get(env.ROOMS.idFromName('__creation_rate__'));
   const gate=await lobby.fetch(new Request('https://internal/rate',{method:'POST',body:request.headers.get('CF-Connecting-IP')||'local'}));
   if(!gate.ok)return json({error:'CREATE_RATE_LIMIT'},429,cors);
   const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   for(let attempt=0;attempt<5;attempt++){
    const bytes=crypto.getRandomValues(new Uint8Array(6));const code=[...bytes].map(b=>chars[b%chars.length]).join('');
    const room=env.ROOMS.get(env.ROOMS.idFromName(code));const result=await room.fetch(new Request('https://internal/create',{method:'POST'}));
    if(result.ok)return json({code,protocol:VERSION},201,cors);
   }
   return json({error:'CREATE_FAILED'},503,cors);
  }
  const match=url.pathname.match(/^\/rooms\/([A-Z2-9]{6}|PUBLIC)$/);
  if(match&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   const room=env.ROOMS.get(env.ROOMS.idFromName(match[1]));
   if(match[1]==='PUBLIC')await room.fetch(new Request('https://internal/create',{method:'POST'}));
   return room.fetch(new Request('https://internal/connect',{headers:request.headers}));
  }
  return json({error:'NOT_FOUND'},404,cors);
 }
};
export class GameRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.rate=new Map();this.meta=null;this.ready=ctx.blockConcurrencyWhile(async()=>{this.meta=await ctx.storage.get('meta')||null;});}
 sockets(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
 data(ws){return ws.deserializeAttachment();}
 save(ws,p){ws.serializeAttachment(p);}
 send(ws,p){try{ws.send(JSON.stringify(p));}catch{}}
 broadcast(p){for(const ws of this.sockets())this.send(ws,p);}
 players(){return this.sockets().map(ws=>{const p=this.data(ws);if(!p?.joined)return null;const {uid,name,team,agent,weapon,x,y,z,yaw,pitch,crouching,walking,hp,shield,kills,deaths,active}=p;return {uid,name,team,agent,weapon,x,y,z,yaw,pitch,crouching,walking,hp,shield,kills,deaths,active};}).filter(Boolean);}
 snapshot(){this.lastSnapshot=Date.now();this.broadcast({type:'players',players:this.players()});}
 queueSnapshot(){if(Date.now()-(this.lastSnapshot||0)>=50){this.snapshot();return;}if(!this.snapshotTimer)this.snapshotTimer=setTimeout(()=>{this.snapshotTimer=null;this.snapshot();},50);}
 async fetch(request){
  await this.ready;const path=new URL(request.url).pathname;
  if(path==='/rate'){
   const ip=(await request.text()).slice(0,80),now=Date.now();let entry=this.rate.get(ip);if(!entry||now-entry.start>3600000)entry={start:now,count:0};entry.count++;this.rate.set(ip,entry);
   for(const [key,v]of this.rate)if(now-v.start>3600000)this.rate.delete(key);
   return new Response(null,{status:entry.count>20?429:204});
  }
  if(path==='/create'){
   if(this.meta)return json({error:'EXISTS'},409);
   this.meta={createdAt:Date.now()};await this.ctx.storage.put('meta',this.meta);await this.ctx.storage.setAlarm(Date.now()+120000);return json({ok:true});
  }
  if(path!=='/connect'||!this.meta)return json({error:'ROOM_NOT_FOUND'},404);
  if(this.sockets().length>=10)return json({error:'ROOM_FULL'},409);
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);
  this.save(server,{uid:crypto.randomUUID(),joined:false,connectedAt:Date.now(),lastSeen:Date.now(),windowAt:Date.now(),messages:0});
  return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,raw){
  if(typeof raw!=='string'||raw.length>4096){ws.close(1009,'Packet too large');return;}
  let m;try{m=JSON.parse(raw);}catch{ws.close(1003,'Invalid JSON');return;}
  const p=this.data(ws),now=Date.now();if(!p)return;
  if(now-p.windowAt>=1000){p.windowAt=now;p.messages=0;}if(++p.messages>90){ws.close(1008,'Rate limit');return;}
  p.lastSeen=now;this.save(ws,p);
  if(!m||typeof m.type!=='string')return;
  if(m.type==='join'){
   if(p.joined)return;
   if(typeof m.resumeToken==='string'&&/^[a-f0-9]{64}$/.test(m.resumeToken)){
    let saved;await this.ctx.blockConcurrencyWhile(async()=>{saved=await this.ctx.storage.get('resume:'+m.resumeToken);if(saved)await this.ctx.storage.delete('resume:'+m.resumeToken);});
    if(!saved||saved.expires<now){ws.close(1008,'Resume expired');return;}
    Object.assign(p,saved,{active:false,lastSeen:now,windowAt:now,messages:0});delete p.expires;
    if(p.hp===0&&now>=p.respawnAt)Object.assign(p,{hp:100,shield:50,cUsed:0,qUsed:0},spawn(p.team));
    this.save(ws,p);this.send(ws,{type:'welcome',protocol:VERSION,uid:p.uid,resumeToken:p.resumeToken,player:this.players().find(x=>x.uid===p.uid)});this.snapshot();await this.ctx.storage.setAlarm(now+1000);return;
   }
   const members=this.players(),attack=members.filter(x=>x.team==='attack').length,defend=members.length-attack;
   Object.assign(p,{joined:true,name:cleanText(m.name)||'特務',team:attack<=defend?'attack':'defend',agent:m.agent==='phoenix'?'phoenix':'jett',weapon:isWeapon(m.weapon)&&m.weapon!=='bladestorm'?m.weapon:'vandal',hp:100,shield:50,kills:0,deaths:0,active:false,resumeToken:[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join(''),lastShot:0,lastChat:0,lastAbility:0,cUsed:0,qUsed:0},spawn(attack<=defend?'attack':'defend'));
   this.save(ws,p);this.send(ws,{type:'welcome',protocol:VERSION,uid:p.uid,resumeToken:p.resumeToken,player:this.players().find(x=>x.uid===p.uid)});this.snapshot();await this.ctx.storage.setAlarm(now+15000);return;
  }
  if(!p.joined)return;
  if(m.type==='ping'){this.send(ws,{type:'pong',at:m.at});return;}
  if(m.type==='state'&&validPose(m)){
   if(p.hp>0){if(!p.active&&[0,25,50].includes(m.shield))p.shield=m.shield;for(const key of ['x','y','z','yaw'])p[key]=m[key];p.pitch=finite(m.pitch,-2,2)?m.pitch:0;p.crouching=!!m.crouching;p.walking=!!m.walking;p.active=!!m.active;p.agent=m.agent==='phoenix'?'phoenix':'jett';if(isWeapon(m.weapon))p.weapon=m.weapon;}
   this.save(ws,p);this.queueSnapshot();return;
  }
  if(m.type==='team'&&['attack','defend'].includes(m.team)&&!p.active&&p.hp>0){p.team=m.team;Object.assign(p,spawn(p.team));this.save(ws,p);this.send(ws,{type:'spawn',player:this.players().find(x=>x.uid===p.uid)});this.snapshot();return;}
  if(m.type==='chat'&&now-p.lastChat>=500){p.lastChat=now;this.save(ws,p);this.broadcast({type:'event',event:{type:'chat',senderUid:p.uid,senderName:p.name,senderTeam:p.team,text:cleanText(m.text,240)}});return;}
  if(m.type==='shot'&&p.hp>0&&p.active){
   const w=WEAPONS[p.weapon];if(!w||now-p.lastShot<w.interval*.8)return;
   if(!['sx','sy','sz','ex','ey','ez'].every(k=>finite(m[k])))return;
   if(Math.hypot(m.sx-p.x,m.sy-p.y,m.sz-p.z)>6)return;
   p.lastShot=now;p.shotUsed=false;p.shotEnd={x:m.ex,y:m.ey,z:m.ez};this.save(ws,p);
   this.broadcast({type:'event',event:{type:'shot',senderUid:p.uid,weapon:p.weapon,sx:m.sx,sy:m.sy,sz:m.sz,ex:m.ex,ey:m.ey,ez:m.ez,color:0xb9f5ff}});return;
  }
  if(m.type==='hit'&&p.hp>0&&p.active){
   const victim=this.sockets().find(s=>this.data(s)?.uid===m.targetUid);if(!victim)return;const v=this.data(victim);
   if(v.hp<=0||v.team===p.team||!v.active)return;
   const melee=p.weapon==='melee';if(melee){if(Math.hypot(p.x-v.x,p.y-v.y,p.z-v.z)>4.5||now-p.lastShot<420)return;p.lastShot=now;}
   else{if(p.shotUsed||now-p.lastShot>400||!p.shotEnd||Math.hypot(p.shotEnd.x-v.x,p.shotEnd.y-(v.y-1),p.shotEnd.z-v.z)>3.5)return;p.shotUsed=true;}
   const w=WEAPONS[p.weapon],damage=m.isHead===true?w.head:w.body;Object.assign(v,applyDamage(v,damage));
   this.send(victim,{type:'damage',hp:v.hp,shield:v.shield,attacker:p.name});
   if(v.hp===0){v.healRemaining=0;v.deaths++;v.respawnAt=now+5000;p.kills++;this.broadcast({type:'event',event:{type:'kill',killerUid:p.uid,killerName:p.name,victimName:v.name,weaponName:p.weapon.toUpperCase(),isHead:!!m.isHead}});}
   this.save(ws,p);this.save(victim,v);if(v.hp===0)await this.ctx.storage.setAlarm(now+1000);this.snapshot();return;
  }
  if(m.type==='heal'&&p.agent==='phoenix'&&p.hp>0&&p.hp<100&&p.active&&now-(p.lastHeal||0)>=45000){p.lastHeal=now;p.healRemaining=30;p.nextHeal=now+1000;this.save(ws,p);await this.ctx.storage.setAlarm(now+1000);return;}
  if(['smoke','wall','slow'].includes(m.type)&&p.hp>0&&p.active&&now-p.lastAbility>=200&&validPose({...m,yaw:0})&&Math.hypot(m.x-p.x,m.y-p.y,m.z-p.z)<35){
   const sage=p.agent==='phoenix';if((m.type==='smoke'&&(sage||p.cUsed>=2))||(m.type==='wall'&&(!sage||p.cUsed>=1))||(m.type==='slow'&&(!sage||p.qUsed>=2)))return;
   if(m.type==='slow')p.qUsed++;else p.cUsed++;p.lastAbility=now;this.save(ws,p);this.broadcast({type:'event',event:{type:m.type,senderUid:p.uid,x:m.x,y:m.y,z:m.z,yaw:finite(m.yaw)?m.yaw:0}});return;
  }
  this.save(ws,p);
 }
 async webSocketClose(ws){const p=this.data(ws);if(p?.joined&&p.resumeToken)await this.ctx.storage.put('resume:'+p.resumeToken,{...p,active:false,expires:Date.now()+60000});try{ws.close(1000,'Closed');}catch{}this.snapshot();if(this.sockets().length===0)await this.ctx.storage.setAlarm(Date.now()+120000);}
 async webSocketError(ws){await this.webSocketClose(ws);}
 async alarm(){
  await this.ready;const sockets=this.sockets(),now=Date.now();if(sockets.length===0){await this.ctx.storage.deleteAll();this.meta=null;return;}
  let pending=false;
  const stale=await this.ctx.storage.list({prefix:'resume:',limit:1000});for(const [key,value]of stale)if(value.expires<now)await this.ctx.storage.delete(key);
  for(const ws of sockets){const p=this.data(ws);if((!p.joined&&now-p.connectedAt>15000)||(now-p.lastSeen>30000)){ws.close(1008,'Join timeout');continue;}if(p.healRemaining>0&&p.hp>0){if(now>=p.nextHeal){const amount=Math.min(3,p.healRemaining,100-p.hp);p.hp+=amount;p.healRemaining-=amount;p.nextHeal=now+1000;if(p.hp===100)p.healRemaining=0;this.save(ws,p);}pending ||= p.healRemaining>0;}if(p.hp===0){if(now>=p.respawnAt){Object.assign(p,{hp:100,shield:50,cUsed:0,qUsed:0,active:false},spawn(p.team));this.save(ws,p);this.send(ws,{type:'spawn',player:this.players().find(x=>x.uid===p.uid)});}else pending=true;}}
  this.snapshot();await this.ctx.storage.setAlarm(now+(pending?1000:15000));
 }
}
