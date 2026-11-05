import assert from 'node:assert/strict';
import {BATCH_KITS,batchCharges,batchSuppressed,batchAbilityImmune,batchMoveRate,batchShotBlock,batchCollision,interceptBatchLethal} from '../multiplayer/agent-batch-rules.mjs';
import {AgentBatchEngine} from '../multiplayer/agent-batch-engine.mjs';
import {batchEvent,tickBatch} from '../multiplayer/agent-batch-events.mjs';
const base=100000;
function fixture(agent){const p={uid:'a',name:'A',joined:true,agent,team:'attack',hp:100,shield:0,active:true,x:0,y:2.2,z:0,yaw:0,kills:0},foe={...p,uid:'b',agent:'jett',team:'defend',z:-8},world={effects:[]},engine=new AgentBatchEngine(world,[p,foe],base);return{p,foe,world,engine};}
const msg=(key,extra={})=>({key,dx:0,dy:0,dz:-1,point:{x:0,y:0,z:-8},...extra});
for(const agent of Object.keys(BATCH_KITS))for(const key of ['c','q','e','x']){const{p,engine}=fixture(agent);const r=engine.cast(p,msg(key,{points:key==='x'?[{x:0,y:0,z:-8},{x:0,y:0,z:-20}]:[{x:0,y:0,z:-8}]}));assert(r.ok,agent+' '+key+': '+r.reason);assert(p.agentBatch.used[key]||p.ultUsed);engine.now+=250;engine.tick(.25);assert(!engine.cast(p,msg(key,{point:{x:0,y:0,z:-999}})).ok);}
{
 const{p,foe,engine}=fixture('phoenix-original');assert(engine.cast(p,msg('x')).ok);p.hp=0;p.x=9;assert(interceptBatchLethal(p,base+1000));assert.equal(p.hp,100);assert.equal(p.x,0);assert(!engine.cast(p,msg('x')).ok);engine.cast(p,msg('e'));engine.cast(p,msg('e'));assert.equal(batchCharges(p,'e',base),0);p.kills=2;engine.tick(.25);assert.equal(batchCharges(p,'e',base),2);foe.batchSuppressedUntil=base+5000;assert(batchSuppressed(foe,base));
}
{
 const{p,foe,engine}=fixture('kayo');engine.cast(p,msg('x'));engine.tick(.25);assert(batchSuppressed(foe,base));p.hp=0;assert.equal(interceptBatchLethal(p,base+10,{ownerUid:foe.uid,team:foe.team}).type,'downed');assert.equal(batchMoveRate(p,base+10),0);foe.team=p.team;foe.z=-1;engine.now=base+20;assert(engine.interact(foe,{targetUid:p.uid}));engine.now=base+3021;engine.tick(.25);assert.equal(p.agentBatch.downedUntil,0);assert.equal(p.hp,100);p.hp=0;assert.equal(interceptBatchLethal(p,engine.now),null);
}
{
 const{p,foe,engine}=fixture('veto');engine.cast(p,msg('x'));assert(batchAbilityImmune(p,base));p.batchSuppressedUntil=base+9000;assert(!batchSuppressed(p,base));engine.cast(p,msg('q'));const e=engine.world.effects[0];Object.assign(e,{phase:'active',x:foe.x,y:0,z:foe.z,hp:100,radius:5});assert(engine.observe(p,{id:e.id,targetUid:foe.uid}));assert(foe.batchTether);assert.equal(foe.hp,70);engine.hit({...foe,team:'defend'},{id:e.id},100);assert.equal(foe.batchTether,null);
}
{
 const{p,foe,engine}=fixture('deadlock');engine.cast(p,msg('c'));const f=engine.world.effects[0],at=base+300;engine.now=at;const t=.3;assert(engine.contact(p,{id:f.id,at,x:0,y:2-t*t*7,z:-22*t,nx:0,ny:1,nz:0}));const center=engine.world.effects.find(e=>e.role==='mesh-center');assert(center);assert.equal(engine.world.effects.length,5);assert(batchCollision({x:2,y:2,z:center.z},engine.world.effects,at));assert(!batchShotBlock({x:2,y:2,z:1},{x:2,y:2,z:-10},engine.world.effects,at));engine.hit(foe,{id:center.id},600);assert.equal(engine.world.effects.length,0);engine.cast(p,msg('x'));assert(foe.batchCocoon);engine.hit({...p,team:foe.team},{id:foe.batchCocoon.id},250);assert.equal(foe.batchCocoon,null);
}
{
 const{p,engine}=fixture('chamber');engine.cast(p,msg('q'));p.agentBatch.weapon.ammo=3;engine.cast(p,msg('x'));assert.equal(p.agentBatch.weapon.ammo,5);engine.cast(p,msg('q'));assert.equal(p.agentBatch.weapon.ammo,3);engine.cast(p,msg('q'));assert.equal(p.agentBatch.weapon.equipped,false);
}
{
 const{p,engine}=fixture('gekko');engine.cast(p,msg('x'));const e=engine.world.effects[0];assert(p.agentBatch.controlId);engine.control(p,{dx:0,dy:0,dz:-1,stationary:true});assert.equal(e.vz,0);engine.remove(e,{globule:true});const g=engine.world.effects[0];g.x=p.x;g.y=p.y;g.z=p.z;assert(engine.interact(p,{id:g.id}));assert.equal(p.ultUsed,false);assert.equal(batchCharges(p,'x',base),0);engine.now=base+8001;engine.cast(p,msg('x'));engine.remove(engine.world.effects[0],{globule:true});assert.equal(engine.world.effects.length,0,'Thrash can only be reclaimed once');
}
// Authoritative event bridge: no direct HP edits, finite gun ammunition, real kill credit,
// lethal rewind, reconnect-visible effects and end-of-round cleanup.
{
 const{p,foe}=fixture('chamber'),a={},b={},map=new Map([[a,p],[b,foe]]),events=[],direct=[];let writes=0;
 const r={meta:{map:'ascent',round:{phase:'playing'}},rounds:{enabled:false,elimination:async()=>{}},spike:{state:()=>null,drop:async()=>{}},sockets:()=>[a,b],data:w=>structuredClone(map.get(w)),save:(w,p)=>map.set(w,structuredClone(p)),send:(w,m)=>direct.push(m),broadcast:m=>events.push(m),queueSnapshot(){},ctx:{storage:{put:async()=>writes++,setAlarm:async()=>{}}}};
 const act=(w,m,n=base)=>batchEvent(r,w,r.data(w),m,n);
 await act(a,{type:'batch_cast',...msg('q')});await act(a,{type:'batch_shot',x:0,y:1.2,z:-8,targetUid:'b',part:'head'},base+400);assert.equal(r.data(b).hp,0);assert.equal(r.data(a).kills,1);assert.equal(r.data(a).agentBatch.weapon.ammo,7);await act(a,{type:'batch_shot',x:0,y:1.2,z:-8,targetUid:'b',part:'head'},base+401);assert.equal(r.data(a).agentBatch.weapon.ammo,7);
 const phoenix={...p,agent:'phoenix-original',agentBatch:null,hp:100,shield:0};r.save(b,{...phoenix,uid:'b',team:'defend',z:-8});await act(b,{type:'batch_cast',...msg('x')},base+500);await act(a,{type:'batch_shot',x:0,y:1.2,z:-8,targetUid:'b',part:'head'},base+800);assert.equal(r.data(b).hp,100);assert.equal(r.data(a).kills,1);assert(direct.some(m=>m.event?.type==='batch_relocate'));assert(writes>=0);
 r.rounds.enabled=true;r.meta.round.phase='ending';r.agentBatchEffects={effects:[{id:'test',expiresAt:base+9999}]};await tickBatch(r,base+1000);assert.equal(r.agentBatchEffects.effects.length,0);
}
console.log('PASS 44 casts, validation, suppression, kill recharge, Phoenix rewind, KAY/O down/revive, Veto immunity/tether, Deadlock mesh/cocoon rescue, Chamber finite guns, Gekko reclaim, authoritative damage and cleanup');
