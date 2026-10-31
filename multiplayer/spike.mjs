import {spikeSite} from './map-sites.mjs';
export const SPIKE=Object.freeze({plantMs:4000,defuseMs:7000,halfMs:3500,fuseMs:45000,radius:60,reach:3.3,heartbeatMs:900});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-1.1-b.y,a.z-b.z);
const moved=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>.35;
export class RoomSpike {
 constructor(room){this.room=room;}
 state(){const r=this.room;if(!r.rounds.enabled)return null;const key=`${r.meta.mapEpoch||0}:${r.meta.round.number}`;if(r.meta.spike?.id!==key)r.meta.spike={id:key,phase:'empty',carrierUid:null,checkpoint:0,action:null};return r.meta.spike;}
 async publish(){await this.room.ctx.storage.put('meta',this.room.meta);this.room.queueSnapshot();}
 actor(uid){const ws=this.room.sockets().find(s=>this.room.data(s)?.uid===uid);return ws?{ws,p:this.room.data(ws)}:null;}
 valid(p){return p?.joined&&!p.leaving&&!p.mapPending&&p.hp>0;}
 async ensureCarrier(){const s=this.state();if(!s||s.phase!=='empty')return;const p=this.room.players().find(p=>p.team==='attack'&&p.hp>0&&this.valid(this.actor(p.uid)?.p));if(p){s.phase='carried';s.carrierUid=p.uid;await this.publish();}}
 async drop(p,now=Date.now()){
  const s=this.state();if(!s)return;
  if(s.action?.uid===p.uid){await this.cancel(p.uid,now);}
  if(s.phase!=='carried'||s.carrierUid!==p.uid)return;
  Object.assign(s,{phase:'dropped',carrierUid:null,x:p.x,y:p.y-2.2,z:p.z,droppedBy:p.uid,pickupAfter:now+1200,action:null});await this.publish();
 }
 async cancel(uid,now=Date.now()){
  const s=this.state(),c=s?.action;if(!c||c.uid!==uid)return;
  if(c.kind==='defuse'&&now>=c.startedAt+SPIKE.halfMs&&c.base===0&&Math.min(now,c.heartbeatAt+SPIKE.heartbeatMs)>=c.startedAt+SPIKE.halfMs)s.checkpoint=.5;
  s.action=null;await this.publish();
 }
 async claim(p,s){Object.assign(s,{phase:'carried',carrierUid:p.uid,action:null});await this.publish();}
 async onState(p,now){const s=this.state();if(!s)return;const c=s.action;if(c?.uid===p.uid&&(!p.active||p.hp<=0||moved(p,c.anchor)||p.team!==(c.kind==='plant'?'attack':'defend')||(c.kind==='plant'?spikeSite(this.room.meta.map,p)!==c.site:distance(p,s)>SPIKE.reach)))await this.cancel(p.uid,now);if(s.carrierUid===p.uid&&(p.hp<=0||p.team!=='attack'))await this.drop(p,now);if(s.phase==='dropped'&&p.active&&this.valid(p)&&p.team==='attack'&&p.uid!==s.droppedBy&&distance(p,s)<=1.6)await this.claim(p,s);}
 async handle(ws,p,m,now){
  if(!m.type.startsWith('spike_'))return false;
  const r=this.room,s=this.state(),fail=reason=>r.send(ws,{type:'spike_error',reason});
  if(!s||m.id!==s.id)return true;
  if(m.type==='spike_cancel'){await this.cancel(p.uid,now);return true;}
  if(!this.valid(p)||!p.active||!['waiting','playing'].includes(r.meta.round.phase)){fail('目前無法操作 Spike');return true;}
  if(m.type==='spike_drop'){if(s.carrierUid===p.uid)await this.drop(p,now);return true;}
  if(m.type==='spike_pickup'){
   if(p.team!=='attack'||s.phase!=='dropped'||distance(p,s)>SPIKE.reach||(p.uid===s.droppedBy&&now<s.pickupAfter)){fail('請靠近掉落的 Spike 後再撿取');return true;}
   await this.claim(p,s);return true;
  }
  if(m.type!=='spike_action'||!['plant','defuse'].includes(m.action))return true;
  if(r.meta.round.phase!=='playing'){fail('雙方開始回合後才能安裝');return true;}
  const plant=m.action==='plant',site=plant?spikeSite(r.meta.map,p):s.site;
  if(plant?(p.team!=='attack'||s.phase!=='carried'||s.carrierUid!==p.uid||!site):(p.team!=='defend'||s.phase!=='planted'||distance(p,s)>SPIKE.reach)){fail(plant?'請攜帶 Spike 前往據點安裝':'請靠近已安裝的 Spike 再拆除');return true;}
  if(s.action&&s.action.uid!==p.uid){fail('已有隊友正在操作 Spike');return true;}
  if(s.action){s.action.heartbeatAt=now;await this.publish();return true;}
  const base=plant?0:s.checkpoint||0;
  s.action={kind:m.action,uid:p.uid,site,base,startedAt:now,endsAt:now+(plant?SPIKE.plantMs:SPIKE.defuseMs*(1-base)),heartbeatAt:now,anchor:{x:p.x,y:p.y,z:p.z}};
  await this.publish();await r.ctx.storage.setAlarm(now+200);return true;
 }
 async tick(now=Date.now()){
  const r=this.room,s=this.state();if(!s)return false;
  if(r.meta.round.phase!=='playing'){if(s.action){s.action=null;await this.publish();}return false;}
  let changed=false;const c=s.action,actor=c&&this.actor(c.uid);
  if(c){
   const valid=this.valid(actor?.p)&&actor.p.active&&!moved(actor.p,c.anchor)&&actor.p.team===(c.kind==='plant'?'attack':'defend')&&(c.kind==='plant'?(s.phase==='carried'&&s.carrierUid===c.uid&&spikeSite(r.meta.map,actor.p)===c.site):(s.phase==='planted'&&distance(actor.p,s)<=SPIKE.reach));
   const finished=c.endsAt<=now&&c.endsAt<=c.heartbeatAt+SPIKE.heartbeatMs;
   if(valid&&c.kind==='defuse'&&c.base===0&&Math.min(now,c.heartbeatAt+SPIKE.heartbeatMs)>=c.startedAt+SPIKE.halfMs){s.checkpoint=.5;changed=true;}
   if(valid&&finished&&(c.kind==='plant'?(!r.meta.round.endsAt||c.endsAt<=r.meta.round.endsAt):c.endsAt<s.explodesAt)){
    if(c.kind==='plant'){
     Object.assign(s,{phase:'planted',carrierUid:null,x:c.anchor.x,y:c.anchor.y-2.2,z:c.anchor.z,site:c.site,plantedAt:c.endsAt,explodesAt:c.endsAt+SPIKE.fuseMs,action:null,checkpoint:0});r.meta.round.endsAt=0;changed=true;
    }else{Object.assign(s,{phase:'defused',action:null,defusedAt:c.endsAt,checkpoint:1});await this.publish();await r.rounds.finish('defend','Spike 已拆除');return false;}
   }else if(!valid||now>c.heartbeatAt+SPIKE.heartbeatMs){s.action=null;changed=true;}
  }
  if(s.phase==='planted'&&now>=s.explodesAt){
   Object.assign(s,{phase:'detonated',action:null,detonatedAt:s.explodesAt});
   for(const ws of r.sockets()){
    const p=r.data(ws);if(!this.valid(p)||distance(p,s)>=SPIKE.radius)continue;
    p.clove={};p.tempHealth=0;p.decayAmount=0;p.decayUntil=0;p.hp=0;p.shield=0;p.shieldReserve=0;p.deaths++;p.active=false;p.healRemaining=0;p.reviveAt=0;p.respawnAt=0;r.save(ws,p);
    r.send(ws,{type:'damage',hp:0,shield:0,attacker:'Spike',cause:'spike'});
    r.broadcast({type:'event',event:{type:'kill',killerUid:null,killerName:'Spike',victimUid:p.uid,victimName:p.name,weaponName:'SPIKE',isHead:false}});
   }
   await this.publish();await r.rounds.finish('attack','Spike 引爆');return false;
  }
  if(changed)await this.publish();return !!s.action||s.phase==='planted';
 }
}
