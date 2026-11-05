import {vyseEvent,tickVyse} from './vyse-events.mjs';
import{mechanismState,mechanismEvent,mechanismShot,tickMechanisms}from'./map-mechanism-events.mjs';
import{marketDoorState,marketDoorEvent,marketDoorShot,resetMarketDoor}from'./market-door-events.mjs';
import {reconEvent,liveReconEffects,tickRecon,cancelRecon} from './recon-events.mjs';
import {reconPublic,reconAgent,resetRecon,reconBusy,reconHealing,constrainFade} from './recon-rules.mjs';
import {razeEvent,liveRazeEffects,tickRaze} from './raze-events.mjs';
import {razePublic,resetRaze,stopRaze,razeEquipped} from './raze-rules.mjs';
import {astraEvent,liveAstraEffects,tickAstra,astraShotBlock} from './astra-events.mjs';
import {astraPublic,resetAstra,stopAstra,astraPlanning} from './astra-rules.mjs';
import {viperEvent,liveViperEffects,tickViper} from './viper-events.mjs';
import {viperPublic,resetViper,stopViper} from './viper-rules.mjs';
import {breachEvent,liveBreachEffects,tickBreach} from './breach-events.mjs';
import {breachPublic,resetBreach,breachCharging} from './breach-rules.mjs';
import {neonEvent,liveNeonEffects,tickNeon,interruptNeon} from './neon-events.mjs';
import {neonPublic,resetNeon,neonLocked} from './neon-rules.mjs';
import {cypherEvent,liveCypherEffects,tickCypher,cancelCypher} from './cypher-events.mjs';
import {CYPHER,cypherPublic,resetCypher,cypherBusy,cameraControl,constrainTether,concussed} from './cypher-rules.mjs';
import {killjoyEvent,liveKilljoyEffects,tickKilljoy} from './killjoy-events.mjs';
import {killjoyPublic,resetKilljoy,detained} from './killjoy-rules.mjs';
import {sovaEvent,liveSovaEffects,tickSova,cancelSova} from './sova-events.mjs';
import {sovaPublic,sovaBusy,resetSova} from './sova-rules.mjs';
import {reynaEvent,liveReynaEffects,tickReyna,awardReynaSouls} from './reyna-events.mjs';
import {resetReyna,reynaPublic,reynaBusy,empressActive,REYNA} from './reyna-rules.mjs';
import {brimEvent,liveBrimEffects,tickBrim} from './brimstone-events.mjs';
import {brimPublic,resetBrim,stimActive,BRIM} from './brimstone-rules.mjs';
import {omenEvent,liveOmenEffects,tickOmen,cancelOmenChannel} from './omen-events.mjs';
import {omenPublic,omenBusy,omenShadow,resetOmen} from './omen-rules.mjs';
import {isoEvent,liveIsoEffects,isoShotBlock,tickIso,awardIsoOrbs,endIsoDuel} from './iso-events.mjs';
import {isoPublic,isoDamage,resetIso,sameRealm,validDuelPose} from './iso-rules.mjs';
import {cloveEvent,liveCloveEffects,tickClove,recordCloveDeath,awardCloveContributors} from './clove-events.mjs';
import {clovePublic,cloveInvulnerable,resetClove} from './clove-rules.mjs';
import {normalizeAgent} from './agents.mjs';
import {ARMORS,equipArmor,markArmorDamage,tickArmor} from './armor.mjs';
import {FIREARMS,isSidearm,firearmDamage} from './firearms.mjs';
import {acceptPellet} from './shotgun.mjs';
import {RoomSpike} from './spike.mjs';
import {choosePublicMap} from './match-rules.mjs';
import {acceptBladeVolley} from './blade-volley.mjs';
import {slowEvent,liveSlowFields,liveSlowFlights,updateSlowObjects} from './slow-events.mjs';
import {barrierEvent,liveBarriers,updateBarriers} from './barriers.mjs';
import {FEATURES,skillEvent,expireSmokeFlights} from './skill-events.mjs';
import {RoundRules} from './rounds.mjs';
import {VERSION,MAP_IDS,WEAPONS,isWeapon,spawn,cleanText,finite,validPose,applyDamage} from './protocol.mjs';
const ROOM=/^[A-Z2-9]{6}$/;
const allowed=(request,env)=>(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).includes(request.headers.get('Origin'));
const json=(body,status=200,headers={})=>Response.json(body,{status,headers});
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if((url.pathname==='/'||url.pathname==='/health')&&request.method==='GET')return json({ok:true,protocol:VERSION,service:'valo-multiplayer',maps:MAP_IDS,features:FEATURES});
  if(!allowed(request,env))return json({error:'ORIGIN_NOT_ALLOWED'},403);
  const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(url.pathname==='/rooms'&&request.method==='POST'){
   const lobby=env.ROOMS.get(env.ROOMS.idFromName('__creation_rate__'));
   const gate=await lobby.fetch(new Request('https://internal/rate',{method:'POST',body:request.headers.get('CF-Connecting-IP')||'local'}));
   if(!gate.ok)return json({error:'CREATE_RATE_LIMIT'},429,cors);
   let body={};try{body=await request.json();}catch{}if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'INVALID_MAP'},400,cors);if(body.map&&!MAP_IDS.includes(body.map))return json({error:'INVALID_MAP'},400,cors);const map=body.map||'ascent';const mode=body.mode==='rounds'?'rounds':'practice';const duration=[0,60,90,120,180,300,600].includes(body.duration)?body.duration:300;
   const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   for(let attempt=0;attempt<5;attempt++){
    const bytes=crypto.getRandomValues(new Uint8Array(6));const code=[...bytes].map(b=>chars[b%chars.length]).join('');
    const room=env.ROOMS.get(env.ROOMS.idFromName(code));const result=await room.fetch(new Request('https://internal/create',{method:'POST',body:JSON.stringify({map,mode,duration})}));
    if(result.ok)return json({code,protocol:VERSION,map,mode},201,cors);
   }
   return json({error:'CREATE_FAILED'},503,cors);
  }
  const match=url.pathname.match(/^\/rooms\/([A-Z2-9]{6}|PUBLIC)$/);
  if(match&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   const room=env.ROOMS.get(env.ROOMS.idFromName(match[1]));
   if(match[1]==='PUBLIC')await room.fetch(new Request('https://internal/create',{method:'POST',body:JSON.stringify({public:true})}));
   return room.fetch(new Request('https://internal/connect',{headers:request.headers}));
  }
  return json({error:'NOT_FOUND'},404,cors);
 }
};
export class GameRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.rate=new Map();this.meta=null;this.rounds=new RoundRules(this);this.spike=new RoomSpike(this);this.ready=ctx.blockConcurrencyWhile(async()=>{this.meta=await ctx.storage.get('meta')||null;this.sprays=await ctx.storage.get('sprays')||[];this.barriers=await ctx.storage.get('barriers')||[];const slow=await ctx.storage.get('slow');this.slowFields=slow?.fields||[];this.slowFlights=slow?.flights||[];this.cloveEffects=await ctx.storage.get('cloveEffects')||{smokes:[],flights:[]};this.isoEffects=await ctx.storage.get('isoEffects')||{walls:[],flights:[],orbs:[],duel:null};this.omenEffects=await ctx.storage.get('omenEffects')||{smokes:[],flights:[]};this.brimEffects=await ctx.storage.get('brimEffects')||{areas:[],flights:[]};this.reynaEffects=await ctx.storage.get('reynaEffects')||{eyes:[],orbs:[]};this.sovaEffects=await ctx.storage.get('sovaEffects')||{flights:[],recons:[],beams:[]};this.reconEffects=await ctx.storage.get('reconEffects')||{devices:[],flights:[],areas:[]};this.razeEffects=await ctx.storage.get('razeEffects')||{devices:[],flights:[]};this.astraEffects=await ctx.storage.get('astraEffects')||{stars:[],areas:[]};this.viperEffects=await ctx.storage.get('viperEffects')||{devices:[],flights:[]};this.breachEffects=await ctx.storage.get('breachEffects')||{waves:[]};this.neonEffects=await ctx.storage.get('neonEffects')||{walls:[],flights:[],stuns:[]};this.cypherEffects=await ctx.storage.get('cypherEffects')||{devices:[],flights:[],hats:[]};this.killjoyEffects=await ctx.storage.get('killjoyEffects')||{devices:[],flights:[]};});}
 sockets(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
 data(ws){return ws.deserializeAttachment();}
 save(ws,p){ws.serializeAttachment(p);}
 send(ws,p){try{ws.send(JSON.stringify(p));}catch{}}
 broadcast(p){for(const ws of this.sockets())this.send(ws,p);}
 players(){return this.sockets().map(ws=>{const p=this.data(ws);if(!p?.joined||p.leaving)return null;const {uid,name,team,agent,weapon,x,y,z,yaw,pitch,crouching,walking,hp,shield,kills,deaths,active,inRound,ultUsed,reviveAt}=p;return {vyseFlower:p.vyseFlower||null,vyseReadyAt:p.vyseReadyAt||0,recon:reconAgent(p)?reconPublic(p):null,fadeTether:p.fadeTether||null,fadeTrailUntil:p.fadeTrailUntil||0,fadeTrailTeam:p.fadeTrailTeam||null,skyeConcussUntil:p.skyeConcussUntil||0,skyeFlashUntil:p.skyeFlashUntil||0,raze:p.agent==='raze'?razePublic(p):null,astra:p.agent==='astra'?astraPublic(p):null,astraPull:p.astraPull||null,astraConcussUntil:p.astraConcussUntil||0,viper:p.agent==='viper'?viperPublic(p):null,viperPoisonUntil:p.viperPoisonUntil||0,breach:p.agent==='breach'?breachPublic(p):null,breachConcussUntil:p.breachConcussUntil||0,breachFlashUntil:p.breachFlashUntil||0,neon:p.agent==='neon'?neonPublic(p,Date.now()):null,neonConcussUntil:p.neonConcussUntil||0,cypher:cypherPublic(p),cypherTag:p.cypherTag||null,cypherAnchor:p.cypherAnchor||null,cypherSnaredUntil:p.cypherSnaredUntil||0,cypherConcussUntil:p.cypherConcussUntil||0,lastDeathAt:p.lastDeathAt||0,killjoy:p.agent==='killjoy'?killjoyPublic(p):null,detainedUntil:p.detainedUntil||0,sova:p.agent==='sova'?sovaPublic(p):null,sovaRevealUntil:p.sovaRevealUntil||0,sovaRevealTeam:p.sovaRevealTeam||null,reyna:p.agent==='reyna'?reynaPublic(p):null,leerUntil:p.leerUntil||0,brimstone:p.agent==='brimstone'?brimPublic(p):null,stimUntil:p.stimUntil||0,omen:p.agent==='omen'?omenPublic(p,Date.now()):null,nearsightUntil:p.nearsightUntil||0,deafenedUntil:p.deafenedUntil||0,realm:p.realm||null,iso:p.agent==='iso'?isoPublic(p):null,isoDuel:p.realm===this.isoEffects?.duel?.id?this.isoEffects.duel:null,vulnerableUntil:p.vulnerableUntil||0,clove:p.agent==='clove'?clovePublic(p,Date.now()):null,tempHealth:p.tempHealth||0,decayUntil:p.decayUntil||0,armorType:p.armorType||(shield===25?'light':shield>0?'heavy':'none'),shieldReserve:p.shieldReserve||0,primaryWeapon:p.primaryWeapon||'vandal',secondaryWeapon:p.secondaryWeapon||'classic',uid,name,team,agent,weapon,x,y,z,yaw,pitch,crouching,walking,hp,shield,kills,deaths,active,inRound,ultUsed,reviveAt,barrierUsed:p.agent==='phoenix'&&p.cUsed>=1,slowCharges:p.agent==='phoenix'?Math.max(0,2-(p.qUsed||0)):null,healCooldown:Math.max(0,45-(Date.now()-(p.lastHeal||0))/1000)};}).filter(Boolean);}
 hostUid(){
  const now=Date.now(),members=this.players();
  if(this.meta.hostUid&&(members.some(p=>p.uid===this.meta.hostUid)||this.meta.hostUntil>now))return this.meta.hostUid;
  this.meta.hostUid=members[0]?.uid||null;this.meta.hostUntil=0;void this.ctx.storage.put('meta',this.meta);return this.meta.hostUid;
 }
 snapshot(){this.lastSnapshot=Date.now();this.broadcast({type:'players',players:this.players(),hostUid:this.hostUid(),round:this.rounds.state()});}
 queueSnapshot(){if(Date.now()-(this.lastSnapshot||0)>=50){this.snapshot();return;}if(!this.snapshotTimer)this.snapshotTimer=setTimeout(()=>{this.snapshotTimer=null;this.snapshot();},50);}
 async fetch(request){
  await this.ready;const path=new URL(request.url).pathname;
  if(path==='/rate'){
   const ip=(await request.text()).slice(0,80),now=Date.now();let entry=this.rate.get(ip);if(!entry||now-entry.start>3600000)entry={start:now,count:0};entry.count++;this.rate.set(ip,entry);
   for(const [key,v]of this.rate)if(now-v.start>3600000)this.rate.delete(key);
   return new Response(null,{status:entry.count>20?429:204});
  }
  if(path==='/create'){
   let body={};try{body=await request.json();}catch{}if(this.meta){if(body.public&&!this.meta.public){this.meta.public=true;await this.ctx.storage.put('meta',this.meta);}if(body.public&&this.meta.mode!=='rounds'){this.meta.mode='rounds';await this.resetMatchMap(choosePublicMap(MAP_IDS,this.meta.map),Date.now());}return json({error:'EXISTS'},409);}
   this.meta={createdAt:Date.now(),map:body.public?choosePublicMap(MAP_IDS):MAP_IDS.includes(body.map)?body.map:'ascent',mode:body.public||body.mode==='rounds'?'rounds':'practice',duration:body.duration??300,public:body.public===true,mapEpoch:0,round:{number:1,phase:'waiting',endsAt:0,nextAt:0,scoreAttack:0,scoreDefend:0}};await this.ctx.storage.put('meta',this.meta);await this.ctx.storage.setAlarm(Date.now()+120000);return json({ok:true});
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
  const now=Date.now();if(this.meta&&this.rounds.enabled)await this.spike.tick(now);const p=this.data(ws);if(!p)return;
  if(now-p.windowAt>=1000){p.windowAt=now;p.messages=0;p.rawMessages=0;}p.messages+=(['shot','hit'].includes(m?.type)&&WEAPONS[p.weapon]?.pellets>1?.4:1);p.rawMessages=(p.rawMessages||0)+1;if(p.messages>90||p.rawMessages>180){ws.close(1008,'Rate limit');return;}
  p.lastSeen=now;this.save(ws,p);
  if(!m||typeof m.type!=='string')return;
  if(m.type==='join'){
   if(p.joined)return;if(this.meta.public&&m.publicRules!==1){ws.close(1008,'Update client for public matches');return;}p.isoClient=m.isoRules===1;p.armoryClient=m.armoryVersion===1;p.mapChange=m.mapChange===1;if(this.rounds.enabled&&m.roundRules!==1){ws.close(1008,'Update client for rounds');return;}if(this.meta?.map&&this.meta.map!=='ascent'&&m.mapVersion!==1){ws.close(1008,'Update client for this map');return;}
   if(typeof m.resumeToken==='string'&&/^[a-f0-9]{64}$/.test(m.resumeToken)){
    let saved;await this.ctx.blockConcurrencyWhile(async()=>{saved=await this.ctx.storage.get('resume:'+m.resumeToken);if(saved)await this.ctx.storage.delete('resume:'+m.resumeToken);});
    if(!saved||saved.expires<now){ws.close(1008,'Resume expired');return;}
    Object.assign(p,saved,{active:false,lastSeen:now,windowAt:now,messages:0,isoClient:m.isoRules===1,armoryClient:m.armoryVersion===1,mapChange:m.mapChange===1,mapPending:false});delete p.expires;
    if(p.mapEpoch!==(this.meta.mapEpoch||0)){this.resetForMap(p);}
    for(const old of this.sockets()){if(old!==ws&&this.data(old)?.uid===p.uid){const previous=this.data(old);previous.mapPending=true;this.save(old,previous);old.close(1000,'Replaced');}}
    if(this.rounds.enabled&&p.roundNumber!==this.meta.round.number){Object.assign(p,{hp:100,shield:50,cUsed:0,qUsed:0,ultUsed:false,inRound:false,reviveAt:0,roundNumber:this.meta.round.number},spawn(p.team,this.meta.map));resetClove(p);resetIso(p);resetOmen(p);resetBrim(p);resetReyna(p);resetSova(p);resetKilljoy(p);resetCypher(p);resetNeon(p);resetBreach(p);p.vyseFlower=null;p.vyseReadyAt=0;resetViper(p);resetRaze(p);resetAstra(p);resetRecon(p);equipArmor(p,p.armorType||'heavy');p.armorBase=null;}
    if(!this.rounds.enabled&&p.hp===0&&now>=p.respawnAt&&!(p.clove?.reviveWindow>now||p.clove?.riseAt)){Object.assign(p,{hp:100,shield:50,cUsed:0,qUsed:0},spawn(p.team,this.meta?.map));resetClove(p);resetIso(p);resetOmen(p);resetBrim(p);resetReyna(p);resetSova(p);resetKilljoy(p);resetCypher(p);resetNeon(p);resetBreach(p);p.vyseFlower=null;p.vyseReadyAt=0;resetViper(p);resetRaze(p);resetAstra(p);resetRecon(p);equipArmor(p,p.armorType||'heavy');}
    if(m.map&&m.map!==this.meta.map)p.mapPending=true;this.save(ws,p);if(m.map&&m.map!==this.meta.map)await this.ctx.storage.put('resume:'+p.resumeToken,{...p,active:false,expires:now+180000});this.send(ws,{type:'welcome',protocol:VERSION,serverNow:now,features:FEATURES,mechanisms:mechanismState(this),marketDoor:marketDoorState(this),reconEffects:liveReconEffects(this,now),razeEffects:liveRazeEffects(this,now),astraEffects:liveAstraEffects(this,now),viperEffects:liveViperEffects(this,now),breachEffects:liveBreachEffects(this,now),neonEffects:liveNeonEffects(this,now),cypherEffects:liveCypherEffects(this,now),killjoyEffects:liveKilljoyEffects(this,now),sovaEffects:liveSovaEffects(this,now),reynaEffects:liveReynaEffects(this,p.uid,now),brimEffects:liveBrimEffects(this,now),omenEffects:liveOmenEffects(this,now),isoEffects:liveIsoEffects(this,p.uid,now),cloveEffects:liveCloveEffects(this,now),slowFields:liveSlowFields(this,now),slowFlights:liveSlowFlights(this,now),barriers:liveBarriers(this,now),sprays:(this.sprays||[]).filter(s=>s.expiresAt>now),map:this.meta.map||'ascent',hostUid:this.hostUid(),mode:this.meta.mode||'practice',round:this.rounds.state(),uid:p.uid,resumeToken:p.resumeToken,player:this.players().find(x=>x.uid===p.uid)});await this.spike.ensureCarrier();this.snapshot();await this.ctx.storage.setAlarm(now+1000);return;
   }
   const members=this.players(),attack=members.filter(x=>x.team==='attack').length,defend=members.length-attack;
   Object.assign(p,{joined:true,name:cleanText(m.name)||'特務',team:attack<=defend?'attack':'defend',agent:normalizeAgent(m.agent),weapon:isWeapon(m.weapon)&&m.weapon!=='bladestorm'?m.weapon:'vandal',hp:100,shield:50,kills:0,deaths:0,active:false,resumeToken:[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join(''),lastShot:0,lastChat:0,lastAbility:0,cUsed:0,qUsed:0,ultUsed:false,inRound:false,reviveAt:0,roundNumber:this.meta.round?.number||1,mapEpoch:this.meta.mapEpoch||0},spawn(attack<=defend?'attack':'defend',this.meta?.map));
   if(m.map&&m.map!==this.meta.map)p.mapPending=true;this.save(ws,p);if(m.map&&m.map!==this.meta.map)await this.ctx.storage.put('resume:'+p.resumeToken,{...p,active:false,expires:now+180000});this.send(ws,{type:'welcome',protocol:VERSION,serverNow:now,features:FEATURES,mechanisms:mechanismState(this),marketDoor:marketDoorState(this),reconEffects:liveReconEffects(this,now),razeEffects:liveRazeEffects(this,now),astraEffects:liveAstraEffects(this,now),viperEffects:liveViperEffects(this,now),breachEffects:liveBreachEffects(this,now),neonEffects:liveNeonEffects(this,now),cypherEffects:liveCypherEffects(this,now),killjoyEffects:liveKilljoyEffects(this,now),sovaEffects:liveSovaEffects(this,now),reynaEffects:liveReynaEffects(this,p.uid,now),brimEffects:liveBrimEffects(this,now),omenEffects:liveOmenEffects(this,now),isoEffects:liveIsoEffects(this,p.uid,now),cloveEffects:liveCloveEffects(this,now),slowFields:liveSlowFields(this,now),slowFlights:liveSlowFlights(this,now),barriers:liveBarriers(this,now),sprays:(this.sprays||[]).filter(s=>s.expiresAt>now),map:this.meta.map||'ascent',hostUid:this.hostUid(),mode:this.meta.mode||'practice',round:this.rounds.state(),uid:p.uid,resumeToken:p.resumeToken,player:this.players().find(x=>x.uid===p.uid)});await this.spike.ensureCarrier();this.snapshot();await this.ctx.storage.setAlarm(now+1000);return;
  }
  if(!p.joined||p.leaving)return;
  if(m.type==='match_restart'&&!p.mapPending){if(this.meta.public||this.hostUid()!==p.uid||this.meta.round.phase!=='finished'){this.send(ws,{type:'map_error',reason:'比賽結束後由房主重新開局；公開房會自動換圖'});return;}await this.resetMatchMap(this.meta.map,now);return;}
  if(m.type==='map_change'&&!p.mapPending){await this.changeMap(ws,p,m.map,now);return;}
  if(m.type==='leave'){await cancelRecon(this,ws,p);stopRaze(p);stopAstra(p);stopViper(p);if(p.breach)p.breach.chargeAt=0;this.save(ws,p);interruptNeon(this,ws,p);await cancelCypher(this,ws,p);if(sovaBusy(p))await cancelSova(this,ws,p,now);if(omenBusy(p))await cancelOmenChannel(this,ws,p,now);if(p.realm)await endIsoDuel(this,now,{winnerUid:this.isoEffects.duel.aUid===p.uid?this.isoEffects.duel.bUid:this.isoEffects.duel.aUid,disconnectedUid:p.uid,cached:[{ws,p}]});if(this.meta.hostUid===p.uid){this.meta.hostUid=null;this.meta.hostUntil=0;}await this.spike.drop(p,now);p.leaving=true;this.save(ws,p);ws.close(1000,'Leave');return;}
  if(p.mapPending)return;
  if(await mechanismEvent(this,ws,p,m,now))return;
  if(cypherBusy(p,now)&&!['state','ping','chat','leave','map_change','match_restart','cypher_cancel','cypher_recall','cypher_dart','cypher_contact','neon_contact','viper_contact','raze_contact','raze_bot_move','recon_contact','recon_move','recon_seen','recon_flash_seen','cypher_untag_cancel'].includes(m.type))return;
  if(detained(p,now)&&!['state','ping','chat','leave','map_change','match_restart','killjoy_contact','cypher_contact','neon_contact','viper_contact','raze_contact','raze_bot_move','recon_contact','recon_move','recon_seen','recon_flash_seen','killjoy_seen','killjoy_move','sova_contact','brim_land','brim_bounce','reyna_exposed','sova_recon_seen','sova_cancel','omen_cancel'].includes(m.type))return;
  if(omenBusy(p)&&!['state','ping','chat','leave','map_change','match_restart','omen_cancel'].includes(m.type))return;
  if(reynaBusy(p,now)&&!['state','ping','chat','leave','map_change','match_restart','reyna_cancel'].includes(m.type))return;
  if(sovaBusy(p)&&!['state','ping','chat','leave','map_change','match_restart','sova_drone_move','sova_dart','sova_beam','sova_cancel','sova_contact','sova_recon_seen','reyna_exposed','killjoy_contact','cypher_contact','neon_contact','viper_contact','raze_contact','raze_bot_move','recon_contact','recon_move','recon_seen','recon_flash_seen'].includes(m.type))return;
  if(p.realm&&!['state','shot','hit','ping','chat','leave','map_change','match_restart','sova_contact','killjoy_contact','cypher_contact','neon_contact','viper_contact','raze_contact','raze_bot_move','recon_contact','recon_move','recon_seen','recon_flash_seen'].includes(m.type))return;
  if(m.type==='ping'){this.send(ws,{type:'pong',at:m.at});return;}
  if(reconBusy(p)&&!['state','ping','chat','leave','map_change','match_restart','recon_move','recon_pounce','recon_cancel','recon_contact','recon_seen','recon_flash_seen'].includes(m.type))return;
  if(m.type==='state'&&validPose(m)){
   if(p.mapTeleportUntil>now&&Math.hypot(m.x-p.mapTeleportSource.x,m.y-p.mapTeleportSource.y,m.z-p.mapTeleportSource.z)<8)return;
   if(!m.active&&(reconBusy(p)||reconHealing(p)))await cancelRecon(this,ws,p);
   if(p.realm&&(!this.isoEffects?.duel||!validDuelPose({...m,uid:p.uid},this.isoEffects.duel,now)))return;
   if(p.hp>0){if(this.rounds.enabled&&['ending','finished'].includes(this.meta.round.phase))return;if(m.active)p.inRound=true;if(!p.active&&!p.armoryClient&&p.armorType!=='regen'&&[0,25,50].includes(m.shield)){p.shield=m.shield;p.armorType=m.shield===25?'light':m.shield===50?'heavy':'none';}if(m.active)p.armorBase=null;if(FIREARMS[m.primaryWeapon]?.slot==='primary')p.primaryWeapon=m.primaryWeapon;if(isSidearm(m.secondaryWeapon))p.secondaryWeapon=m.secondaryWeapon;for(const key of ['x','y','z','yaw'])if(!omenBusy(p)&&!sovaBusy(p)&&!cameraControl(p)&&!astraPlanning(p)&&!reconBusy(p)||key==='yaw')p[key]=m[key];p.pitch=finite(m.pitch,-2,2)?m.pitch:0;p.crouching=!!m.crouching;p.walking=!!m.walking;p.active=omenBusy(p)||sovaBusy(p)||cameraControl(p)?true:!!m.active;p.spikeEquipped=!!m.holdingSpike&&this.meta.spike?.carrierUid===p.uid;if(!p.realm&&!omenBusy(p)&&!sovaBusy(p)&&!cypherBusy(p,now)&&!reconBusy(p)&&!detained(p,now)&&!reynaBusy(p,now)){if(p.agent!==normalizeAgent(m.agent)){resetClove(p);resetIso(p);resetOmen(p);resetBrim(p);resetReyna(p);resetSova(p);resetKilljoy(p);resetCypher(p);resetNeon(p);resetBreach(p);p.vyseFlower=null;p.vyseReadyAt=0;resetViper(p);resetRaze(p);resetAstra(p);resetRecon(p);}p.agent=normalizeAgent(m.agent);}if(isWeapon(m.weapon)&&!(p.realm&&m.weapon==='bladestorm')){if(p.weapon!==m.weapon){await cancelRecon(this,ws,p);stopRaze(p);stopAstra(p);interruptNeon(this,ws,p);if(p.breach)p.breach.chargeAt=0;}p.weapon=m.weapon;}if(!p.active){await cancelRecon(this,ws,p);stopRaze(p);stopAstra(p);interruptNeon(this,ws,p);}if(p.breach&&!p.active)p.breach.chargeAt=0;}
   if(cloveInvulnerable(p,now)||p.realm){p.cypherSnaredUntil=0;p.cypherAnchor=null;p.fadeTether=null;}else {constrainTether(p,now);constrainFade(p,now);}this.save(ws,p);await this.spike.onState(p,now);await this.rounds.activated();this.queueSnapshot();return;
  }
  if(m.type==='armor_buy'){
   const phase=this.meta.round?.phase;if(phase==='finished'||(p.active&&p.hp>0&&!['waiting','ending'].includes(phase))){this.send(ws,{type:'armor_error',reason:'請開啟商店後購買護盾'});return;}
   if(m.refund){if(p.armorBase){Object.assign(p,p.armorBase);if(p.hp<=0){p.shield=0;p.shieldReserve=0;}p.regenTickAt=now;p.armorBase=null;}}
   else if(Object.hasOwn(ARMORS,m.armor)){p.armorBase ||= {armorType:p.armorType||(p.shield===25?'light':'heavy'),shield:p.shield,shieldReserve:p.shieldReserve||0,regenReadyAt:p.regenReadyAt||0};equipArmor(p,m.armor);if(p.hp<=0){p.shield=0;p.shieldReserve=0;}}
   else return;
   this.save(ws,p);this.send(ws,{type:'armor_result',player:this.players().find(x=>x.uid===p.uid)});this.queueSnapshot();return;
  }
  if(this.rounds.enabled&&this.meta.round.phase==='finished'&&!['chat','ping'].includes(m.type))return;
  if(m.type==='team'&&['attack','defend'].includes(m.team)&&!p.active&&p.hp>0){await this.spike.drop(p,now);p.team=m.team;Object.assign(p,spawn(p.team,this.meta?.map));this.save(ws,p);this.send(ws,{type:'spawn',player:this.players().find(x=>x.uid===p.uid)});await this.spike.ensureCarrier();this.snapshot();return;}
  if((cloveInvulnerable(p,now)||reconBusy(p)||reconHealing(p)||astraPlanning(p)||razeEquipped(p,now)||breachCharging(p)||neonLocked(p,now))&&m.type.startsWith('spike_'))return;
  if(await this.spike.handle(ws,p,m,now))return;
  if(m.type==='revive'){await this.rounds.revive(ws,p,m.targetUid);return;}
  if(this.rounds.enabled&&['ending','finished'].includes(this.meta.round.phase)&&['shot','hit','heal','smoke_launch'].includes(m.type))return;
  if(await slowEvent(this,ws,p,m,now))return;
  if(await barrierEvent(this,ws,p,m,now))return;
  if(await reconEvent(this,ws,p,m,now))return;
  if(await razeEvent(this,ws,p,m,now))return;
  if(await astraEvent(this,ws,p,m,now))return;
  if(await viperEvent(this,ws,p,m,now))return;
  if(await vyseEvent(this,ws,p,m,now))return;
  if(await breachEvent(this,ws,p,m,now))return;
  if(await neonEvent(this,ws,p,m,now))return;
  if(await cypherEvent(this,ws,p,m,now))return;
  if(await killjoyEvent(this,ws,p,m,now))return;
  if(await sovaEvent(this,ws,p,m,now))return;
  if(await reynaEvent(this,ws,p,m,now))return;
  if(await brimEvent(this,ws,p,m,now))return;
  if(await omenEvent(this,ws,p,m,now))return;
  if(await isoEvent(this,ws,p,m,now))return;
  if(await cloveEvent(this,ws,p,m,now))return;
  if(await skillEvent(this,ws,p,m,now))return;
  if(m.type==='chat'&&now-p.lastChat>=500){p.lastChat=now;this.save(ws,p);this.broadcast({type:'event',event:{type:'chat',senderUid:p.uid,senderName:p.name,senderTeam:p.team,text:cleanText(m.text,240)}});return;}
  if(['shot','hit'].includes(m.type)&&(reconBusy(p)||reconHealing(p)||astraPlanning(p)||razeEquipped(p,now)||breachCharging(p)||neonLocked(p,now)||p.spikeEquipped||this.meta.spike?.action?.uid===p.uid))return;
  if(await marketDoorEvent(this,ws,p,m,now))return;
  if(m.type==='shot'&&p.hp>0&&p.active&&!cloveInvulnerable(p,now)){
   const w=WEAPONS[p.weapon];if(!w)return;
   if(m.pellet){if(!acceptPellet(p,m,now,(stimActive(p,now)||empressActive(p,now))?{...w,interval:w.interval/Math.max(stimActive(p,now)?BRIM.fireRate:1,empressActive(p,now)?REYNA.fireRate:1)}:w))return;}else if(w.pellets>1)return;else if(m.volley){if(!acceptBladeVolley(p,m,now))return;}else if(now-p.lastShot<w.interval*.8/(concussed(p,now)?CYPHER.concussRate:1)/(FIREARMS[p.weapon]?Math.max(stimActive(p,now)?BRIM.fireRate:1,empressActive(p,now)?REYNA.fireRate:1):1))return;
   if(!['sx','sy','sz','ex','ey','ez'].every(k=>finite(m[k])))return;
   if(Math.hypot(m.sx-p.x,m.sy-p.y,m.sz-p.z)>6)return;
   const shotStart={x:m.sx,y:m.sy,z:m.sz},shotEnd={x:m.ex,y:m.ey,z:m.ez},blocked=[isoShotBlock(this,p,shotStart,shotEnd,now),astraShotBlock(this,p,shotStart,shotEnd,now)].filter(Boolean).sort((a,b)=>a.t-b.t)[0];if(blocked){m.ex=blocked.x;m.ey=blocked.y;m.ez=blocked.z;}
   p.lastShot=now;p.shotGroup=p.uid+':'+(m.pellet?.id||m.volley?.id||now);p.shotUsed=!!blocked;p.shotWeapon=p.weapon;p.shotEnd={x:m.ex,y:m.ey,z:m.ez};this.save(ws,p);mechanismShot(this,ws,p,m,now);await marketDoorShot(this,ws,p,m,now);
   this.broadcast({type:'event',event:{type:'shot',senderUid:p.uid,weapon:p.weapon,pelletIndex:m.pellet?.index||0,sx:m.sx,sy:m.sy,sz:m.sz,ex:m.ex,ey:m.ey,ez:m.ez,color:0xb9f5ff}});return;
  }
  if(m.type==='hit'&&p.hp>0&&p.active&&!cloveInvulnerable(p,now)){
   const victim=this.sockets().find(s=>this.data(s)?.uid===m.targetUid);if(!victim)return;const v=this.data(victim);
   if(!sameRealm(p,v)||p.realm&&now<(this.isoEffects?.duel?.startsAt||0))return;
   if(v.hp<=0||v.team===p.team||!v.active||cloveInvulnerable(v,now)||omenShadow(v))return;
   const melee=p.weapon==='melee';if(melee){if(Math.hypot(p.x-v.x,p.y-v.y,p.z-v.z)>4.5||now-p.lastShot<420)return;p.lastShot=now;}
   else{if(p.shotUsed||now-p.lastShot>400||!p.shotEnd||Math.hypot(p.shotEnd.x-v.x,p.shotEnd.y-(v.y-1),p.shotEnd.z-v.z)>3.5)return;p.shotUsed=true;}
   const hitWeapon=melee?p.weapon:(p.shotWeapon||p.weapon),w=WEAPONS[hitWeapon],part=m.isHead===true?'head':m.part==='legs'?'legs':'body',damage=firearmDamage(hitWeapon,part,Math.hypot(p.x-v.x,p.y-v.y,p.z-v.z))??(m.isHead===true?w.head:w.body);const adjusted=isoDamage(v,damage,now,melee?p.uid+':melee:'+now:p.shotGroup||p.uid+':'+now);if(adjusted===0){this.save(ws,p);this.save(victim,v);this.broadcast({type:'event',event:{type:'iso_shield_break',ownerUid:v.uid,x:v.x,y:v.y,z:v.z}});this.snapshot();return;}Object.assign(v,applyDamage(v,adjusted));v.damageContributors||={};v.damageContributors[p.uid]=now;v.lastDamage=now;markArmorDamage(v,now);if(v.armorType==='regen'&&v.hp>0)await this.ctx.storage.setAlarm(now+250);
   if(v.hp===0){await awardReynaSouls(this,p,v,now);await awardIsoOrbs(this,p,v,now);if(v.realm)await endIsoDuel(this,now,{winnerUid:p.uid,cached:[{ws,p},{ws:victim,p:v}]});recordCloveDeath(v,now);awardCloveContributors(this,p,v,now);v.shieldReserve=0;v.healRemaining=0;v.deaths++;v.respawnAt=this.rounds.enabled?0:now+5000;p.kills++;this.broadcast({type:'event',event:{type:'kill',killerUid:p.uid,killerName:p.name,victimUid:v.uid,victimName:v.name,weaponName:hitWeapon.toUpperCase(),isHead:!!m.isHead}});}
   this.send(victim,{type:'damage',hp:v.hp,shield:v.shield,tempHealth:v.tempHealth||0,attacker:p.name});
   this.save(ws,p);this.save(victim,v);if(v.hp===0){await this.spike.drop(v,now);await this.rounds.elimination();await this.ctx.storage.setAlarm(now+250);}this.snapshot();return;
  }

  this.save(ws,p);
 }
 resetForMap(p){
  resetClove(p);resetIso(p);resetOmen(p);resetBrim(p);resetReyna(p);resetSova(p);resetKilljoy(p);resetCypher(p);resetNeon(p);resetBreach(p);p.vyseFlower=null;p.vyseReadyAt=0;resetViper(p);resetRaze(p);resetAstra(p);resetRecon(p);
  if(p.weapon==='bladestorm')p.weapon='vandal';
  Object.assign(p,{hp:100,shield:50,kills:0,deaths:0,spikeEquipped:false,active:false,inRound:false,ultUsed:false,reviveAt:0,respawnAt:0,roundNumber:this.meta.round.number,mapEpoch:this.meta.mapEpoch||0,healRemaining:0,lastHeal:0,smokeFlights:{},cUsed:0,qUsed:0,lastShot:0,shotUsed:true,shotEnd:null,volley:null,pelletBatch:null,armorType:'heavy',shieldReserve:0,regenReadyAt:0,regenTickAt:0,armorBase:null},spawn(p.team,this.meta.map));
 }
 async changeMap(ws,p,map,now){
  const fail=reason=>this.send(ws,{type:'map_error',reason});
  if(this.meta.public)return fail('公開房由系統隨機選圖，無法手動更換');
  if(this.hostUid()!==p.uid)return fail('只有房主可以更換地圖');
  if(!MAP_IDS.includes(map))return fail('不支援這張地圖');
  if(map===this.meta.map)return fail('目前已是這張地圖');
  if(now-(this.meta.lastMapChange||0)<10000)return fail('正在換圖，請稍候再試');
  if(this.sockets().some(s=>{const v=this.data(s);return v?.joined&&!v.mapChange;}))return fail('請所有玩家先重新整理網站，再更換地圖');
  await this.resetMatchMap(map,now);
 }
 async resetMatchMap(map,now=Date.now()){
  await this.ctx.blockConcurrencyWhile(async()=>{
   this.meta.map=map;delete this.meta.mechanisms;this.meta.mapEpoch=(this.meta.mapEpoch||0)+1;this.meta.lastMapChange=now;this.meta.hostUntil=now+180000;this.meta.transferUntil=now+180000;
   await resetMarketDoor(this,now);this.meta.spike=null;this.meta.round={number:1,phase:'waiting',endsAt:0,nextAt:0,scoreAttack:0,scoreDefend:0};
   this.reconEffects={devices:[],flights:[],areas:[]};this.razeEffects={devices:[],flights:[]};this.astraEffects={stars:[],areas:[]};this.viperEffects={devices:[],flights:[]};this.breachEffects={waves:[]};this.neonEffects={walls:[],flights:[],stuns:[]};this.cypherEffects={devices:[],flights:[],hats:[]};this.killjoyEffects={devices:[],flights:[]};this.sovaEffects={flights:[],recons:[],beams:[]};this.reynaEffects={eyes:[],orbs:[]};this.brimEffects={areas:[],flights:[]};this.omenEffects={smokes:[],flights:[]};this.isoEffects={walls:[],flights:[],orbs:[],duel:null};this.cloveEffects={smokes:[],flights:[]};this.slowFlights=[];this.slowFields=[];this.sprays=[];this.barriers=[];
   await this.ctx.storage.delete(['slow','sprays','barriers','cloveEffects','isoEffects','omenEffects','brimEffects','reynaEffects','sovaEffects','killjoyEffects','cypherEffects','neonEffects','breachEffects','viperEffects','razeEffects','astraEffects','reconEffects']);
   await this.ctx.storage.put('meta',this.meta);
   const tickets=[];
   for(const socket of this.sockets()){
    const player=this.data(socket);if(!player?.joined)continue;
    this.resetForMap(player);player.mapPending=true;this.save(socket,player);
    await this.ctx.storage.put('resume:'+player.resumeToken,{...player,expires:now+180000});tickets.push([socket,player.resumeToken]);
   }
   for(const [socket,resumeToken]of tickets)this.send(socket,{type:'map_changed',map,resumeToken});
  });
  await this.ctx.storage.setAlarm(now+1000);
 }
 async webSocketClose(ws){let p=this.data(ws);if(p){await cancelRecon(this,ws,p);stopRaze(p);stopAstra(p);stopViper(p);if(p.breach)p.breach.chargeAt=0;this.save(ws,p);interruptNeon(this,ws,p);await cancelCypher(this,ws,p);p=this.data(ws);}if(p?.sova?.control){await cancelSova(this,ws,p,Date.now());p=this.data(ws);}if(p?.omen?.channel){await cancelOmenChannel(this,ws,p,Date.now());p=this.data(ws);}if(p?.realm){await endIsoDuel(this,Date.now(),{winnerUid:this.isoEffects?.duel?.aUid===p.uid?this.isoEffects.duel.bUid:this.isoEffects?.duel?.aUid,disconnectedUid:p.uid,cached:[{ws,p}]});p=this.data(ws);}if(p&&!p.mapPending)await this.spike.drop(p);if(p?.smokeFlights){for(const[id,f]of Object.entries(p.smokeFlights))this.broadcast({type:'event',event:{type:'smoke',flightId:id,senderUid:p.uid,expiresAt:Date.now()+2500,...f.last}});p.smokeFlights={};}if(p?.joined&&!p.leaving&&p.resumeToken&&!p.mapPending)await this.ctx.storage.put('resume:'+p.resumeToken,{...p,active:false,expires:Date.now()+60000});if(p?.uid===this.meta?.hostUid&&!p.leaving&&!this.meta.hostUntil){this.meta.hostUntil=Date.now()+60000;await this.ctx.storage.put('meta',this.meta);}try{ws.close(1000,'Closed');}catch{}if(!p?.mapPending)await this.rounds.elimination();this.snapshot();if(this.sockets().length===0)await this.ctx.storage.setAlarm(Math.max(Date.now()+120000,this.meta?.transferUntil||0));}
 async webSocketError(ws){await this.webSocketClose(ws);}
 async alarm(){
  await this.ready;const sockets=this.sockets(),now=Date.now();if(sockets.length===0){if(this.meta?.transferUntil>now){await this.ctx.storage.setAlarm(this.meta.transferUntil);return;}await this.ctx.storage.deleteAll();this.meta=null;return;}
  let pending=await this.spike.tick(now);pending=await tickMechanisms(this,now)||pending;pending=await tickRecon(this,now)||pending;pending=await tickRaze(this,now)||pending;pending=await tickAstra(this,now)||pending;pending=await tickViper(this,now)||pending;pending=await tickVyse(this,now)||pending;pending=await tickBreach(this,now)||pending;pending=await this.rounds.alarm(now)||pending;pending=await tickCypher(this,now)||pending;pending=await tickKilljoy(this,now)||pending;pending=await tickSova(this,now)||pending;pending=await tickReyna(this,now)||pending;pending=await tickBrim(this,now)||pending;pending=await tickOmen(this,now)||pending;pending=await tickIso(this,now)||pending;pending=await tickClove(this,now)||pending;pending=await tickNeon(this,now)||pending;pending=expireSmokeFlights(this,now)||pending;pending=await updateBarriers(this,now)||pending;pending=await updateSlowObjects(this,now)||pending;
  const stale=await this.ctx.storage.list({prefix:'resume:',limit:1000});for(const [key,value]of stale)if(value.expires<now)await this.ctx.storage.delete(key);
  for(const ws of sockets){const p=this.data(ws);if((!p.joined&&now-p.connectedAt>15000)||(now-p.lastSeen>30000)){ws.close(1008,'Join timeout');continue;}if(p.mapPending)continue;if(p.armorType==='regen'){pending=tickArmor(p,now)||pending;this.save(ws,p);}if(p.healRemaining>0&&p.hp>0){if(now>=p.nextHeal&&now-(p.lastDamage||0)>=2000){const amount=Math.min(p.healRate||3,p.healRemaining,100-p.hp);p.hp+=amount;p.tempHealth=Math.min(p.tempHealth||0,Math.max(0,150-p.hp));p.healRemaining-=amount;p.nextHeal=now+1000;if(p.hp===100)p.healRemaining=0;this.save(ws,p);}pending ||= p.healRemaining>0;}if(p.hp===0&&!this.rounds.enabled&&!p.reviveAt&&!(p.clove?.reviveWindow>now||p.clove?.riseAt)){if(now>=p.respawnAt){Object.assign(p,{hp:100,shield:50,cUsed:0,qUsed:0,ultUsed:false,lastHeal:0,smokeFlights:{},active:false},spawn(p.team,this.meta?.map));resetClove(p);resetIso(p);resetOmen(p);resetBrim(p);resetReyna(p);resetSova(p);resetKilljoy(p);resetCypher(p);resetNeon(p);resetBreach(p);p.vyseFlower=null;p.vyseReadyAt=0;resetViper(p);resetRaze(p);resetAstra(p);resetRecon(p);equipArmor(p,p.armorType||'heavy');this.save(ws,p);this.send(ws,{type:'spawn',player:this.players().find(x=>x.uid===p.uid)});}else pending=true;}}
  this.snapshot();await this.ctx.storage.setAlarm(now+(pending?250:15000));
 }
}
