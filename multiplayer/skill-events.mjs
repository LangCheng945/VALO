import{finite,validPose}from'./protocol.mjs';
export const FEATURES=Object.freeze(['rounds','resurrection','guided-smoke','ally-heal','sprays','segmented-barrier','thrown-slow','blade-volley','map-change','match-rules','public-random-map','spike']);
const unit=(m,keys)=>keys.every(k=>finite(m[k],-1.1,1.1))&&Math.abs(Math.hypot(...keys.map(k=>m[k]))-1)<.15;
const point=m=>validPose({...m,yaw:0});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const fail=(room,ws,reason)=>room.send(ws,{type:'ability_error',reason});
export async function skillEvent(room,ws,p,m,now){
 if(m.type==='heal'){
  if(p.agent!=='phoenix'||p.hp<=0||!p.active||now-(p.lastHeal||0)<45000){fail(room,ws,'治療尚未就緒');return true;}
  const target=m.targetUid?room.sockets().find(s=>room.data(s)?.uid===m.targetUid):ws,v=target&&room.data(target);
  if(!v?.joined||v.hp<=0||v.hp>=100||v.team!==p.team||dist(p,v)>40){fail(room,ws,'請瞄準範圍內受傷的隊友，或右鍵自補');return true;}
  p.lastHeal=now;room.save(ws,p);const self=v.uid===p.uid;
  // Re-read the attachment when healing self, preserving the cooldown written above.
  const healed=room.data(target);healed.healRemaining=self?30:100;healed.healRate=self?3:20;healed.nextHeal=now+1000;room.save(target,healed);
  room.send(ws,{type:'ability_result',key:'e',cooldown:45,targetUid:v.uid});room.broadcast({type:'event',event:{type:'healing',senderUid:p.uid,targetUid:v.uid}});await room.ctx.storage.setAlarm(now+250);return true;
 }
 if(m.type==='spray'){
  if(p.hp<=0||!p.active||now-(p.lastSpray||0)<3000||!point(m)||dist(p,m)>8||!unit(m,['nx','ny','nz'])||!['jett','sage','gg'].includes(m.design)){fail(room,ws,'噴漆尚未就緒或表面距離太遠');return true;}
  const event={type:'spray',id:crypto.randomUUID(),ownerUid:p.uid,x:m.x,y:m.y,z:m.z,nx:m.nx,ny:m.ny,nz:m.nz,yaw:finite(m.yaw,-1000,1000)?m.yaw:0,design:m.design,expiresAt:now+30000};
  p.lastSpray=now;room.save(ws,p);room.sprays=(room.sprays||[]).filter(s=>s.expiresAt>now&&s.ownerUid!==p.uid);room.sprays.push(event);room.sprays=room.sprays.slice(-20);await room.ctx.storage.put('sprays',room.sprays);room.broadcast({type:'event',event});return true;
 }
 if(m.type==='smoke_launch'){
  if(p.hp<=0||!p.active||p.agent!=='jett'||p.cUsed>=2||!point(m)||dist(p,m)>4||!unit(m,['dx','dy','dz'])||typeof m.id!=='string'||!/^[a-zA-Z0-9-]{1,48}$/.test(m.id))return true;
  p.smokeFlights||={};if(p.smokeFlights[m.id])return true;p.cUsed++;p.smokeFlights[m.id]={at:now,origin:{x:m.x,y:m.y,z:m.z},last:{x:m.x,y:m.y,z:m.z},lastUpdate:0};room.save(ws,p);
  room.broadcast({type:'event',event:{type:'smoke_launch',id:m.id,senderUid:p.uid,x:m.x,y:m.y,z:m.z,dx:m.dx,dy:m.dy,dz:m.dz}});await room.ctx.storage.setAlarm(now+250);return true;
 }
 if(m.type==='smoke_guide'||m.type==='smoke_land'){
  const flight=typeof m.id==='string'&&Object.hasOwn(p.smokeFlights||{},m.id)?p.smokeFlights[m.id]:null;if(!flight||!point(m)||dist(flight.origin,m)>40||now-flight.at>3000)return true;
  if(m.type==='smoke_guide'){if(now-flight.lastUpdate<100||!unit(m,['dx','dy','dz']))return true;flight.lastUpdate=now;flight.last={x:m.x,y:m.y,z:m.z};room.save(ws,p);room.broadcast({type:'event',event:{type:'smoke_guide',id:m.id,senderUid:p.uid,x:m.x,y:m.y,z:m.z,dx:m.dx,dy:m.dy,dz:m.dz}});}
  else{delete p.smokeFlights[m.id];room.save(ws,p);room.broadcast({type:'event',event:{type:'smoke',flightId:m.id,senderUid:p.uid,x:m.x,y:m.y,z:m.z,expiresAt:now+2500}});}
  return true;
 }
 return false;
}
export function expireSmokeFlights(room,now){let pending=false;for(const ws of room.sockets()){const p=room.data(ws);if(!p?.smokeFlights)continue;let changed=false;for(const[id,f]of Object.entries(p.smokeFlights)){if(now-f.at<1800){pending=true;continue;}delete p.smokeFlights[id];changed=true;room.broadcast({type:'event',event:{type:'smoke',flightId:id,senderUid:p.uid,expiresAt:now+2500,...f.last}});}if(changed)room.save(ws,p);}return pending;}
