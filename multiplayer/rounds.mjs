import {spawn} from './protocol.mjs';

// Durable Object attachments own health and ultimate charges; clients only request actions.
export class RoundRules {
 constructor(room){this.room=room;}
 get enabled(){return this.room.meta?.mode==='rounds';}
 state(){const m=this.room.meta;if(!this.enabled)return null;return {...m.round,serverNow:Date.now()};}
 async publish(){await this.room.ctx.storage.put('meta',this.room.meta);this.room.broadcast({type:'round',round:this.state()});}
 async activated(){
  if(!this.enabled||this.room.meta.round.phase!=='waiting')return;
  const members=this.room.players().filter(p=>p.inRound);
  if(!members.some(p=>p.team==='attack')||!members.some(p=>p.team==='defend'))return;
  const r=this.room.meta.round;r.phase='playing';r.endsAt=this.room.meta.duration?Date.now()+this.room.meta.duration*1000:0;
  await this.publish();await this.room.ctx.storage.setAlarm(Date.now()+250);
 }
 async finish(winner,reason){
  if(!this.enabled||this.room.meta.round.phase!=='playing')return;
  const r=this.room.meta.round;r.phase='ending';r.winner=winner;r.reason=reason;r.nextAt=Date.now()+3300;
  if(winner==='attack')r.scoreAttack++;else if(winner==='defend')r.scoreDefend++;
  await this.publish();await this.room.ctx.storage.setAlarm(Date.now()+250);
 }
 async elimination(){
  if(!this.enabled||this.room.meta.round.phase!=='playing')return;
  const now=Date.now(),players=this.room.players().filter(p=>p.inRound);
  const attack=players.filter(p=>p.team==='attack'),defend=players.filter(p=>p.team==='defend');
  if(!attack.some(p=>p.hp>0||p.reviveAt>now))await this.finish('defend','敵方已全數倒地');
  else if(!defend.some(p=>p.hp>0||p.reviveAt>now))await this.finish('attack','敵方已全數倒地');
 }
 async revive(ws,caster,targetUid){
  const room=this.room,fail=reason=>room.send(ws,{type:'ability_error',reason});
  if(caster.agent!=='phoenix'||caster.hp<=0||!caster.active||caster.ultUsed)return fail('目前無法使用復活');
  if(this.enabled&&room.meta.round.phase!=='playing')return fail('回合結束後無法復活');
  const target=room.sockets().find(s=>room.data(s)?.uid===targetUid),p=target&&room.data(target);
  if(!p?.joined||p.uid===caster.uid||p.team!==caster.team||p.hp>0||p.reviveAt)return fail('請選擇倒地的隊友');
  if(Math.hypot(caster.x-p.x,caster.y-p.y,caster.z-p.z)>8)return fail('隊友距離太遠');
  caster.ultUsed=true;p.reviveAt=Date.now()+2500;p.reviveBy=caster.uid;
  room.save(ws,caster);room.save(target,p);
  room.broadcast({type:'event',event:{type:'revive',phase:'start',casterUid:caster.uid,targetUid:p.uid,reviveAt:p.reviveAt,x:p.x,y:p.y-2.2,z:p.z}});
  room.snapshot();await room.ctx.storage.setAlarm(Date.now()+250);
 }
 async alarm(now){
  const room=this.room;let pending=false;
  for(const ws of room.sockets()){
   const p=room.data(ws);if(!p?.joined||!p.reviveAt)continue;
   if(this.enabled&&room.meta.round.phase!=='playing'){p.reviveAt=0;room.save(ws,p);continue;}
   if(now<p.reviveAt){pending=true;continue;}
   Object.assign(p,{hp:100,shield:0,active:false,reviveAt:0,respawnAt:0,healRemaining:0});room.save(ws,p);
   room.send(ws,{type:'spawn',player:room.players().find(x=>x.uid===p.uid)});
   room.broadcast({type:'event',event:{type:'revive',phase:'complete',targetUid:p.uid}});
  }
  if(!this.enabled)return pending;
  const r=room.meta.round;
  if(r.phase==='playing'){
   pending=true;if(r.endsAt&&now>=r.endsAt)await this.finish('defend','回合時間結束');
  }else if(r.phase==='ending'){
   pending=true;
   if(now>=r.nextAt){
    r.number++;r.phase='waiting';r.endsAt=0;r.nextAt=0;r.winner=null;r.reason='';
    for(const ws of room.sockets()){
     const p=room.data(ws);if(!p?.joined)continue;
     Object.assign(p,{hp:100,shield:50,active:false,inRound:false,ultUsed:false,reviveAt:0,respawnAt:0,roundNumber:r.number,healRemaining:0,cUsed:0,qUsed:0},spawn(p.team,room.meta.map));room.save(ws,p);
     room.send(ws,{type:'spawn',player:room.players().find(x=>x.uid===p.uid)});
    }
    await this.publish();
   }
  }
  return pending;
 }
}
