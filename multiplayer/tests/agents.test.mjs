import {test} from 'node:test';import assert from 'node:assert/strict';import WebSocket from 'ws';
import {AGENTS,AGENT_KEYS,agentLabel,agentModelKey,normalizeAgent,isAgent,agentSupported} from '../agents.mjs';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000',delay=ms=>new Promise(r=>setTimeout(r,ms));
test('all model-backed identities have explicit model names and only implemented kits expose abilities',()=>{
 assert.equal(AGENT_KEYS.length,28);assert(AGENT_KEYS.includes('kayo')&&AGENT_KEYS.includes('vyse'));assert(!AGENT_KEYS.includes('phoenix-original'));assert(!agentSupported('vyse',['agent-models-4']));assert(agentSupported('vyse',['agent-models-28']));assert.equal(agentModelKey('phoenix'),'sage');assert.equal(agentModelKey('iso'),'iso');assert.equal(agentModelKey('clove'),'clove');assert.equal(agentLabel('clove'),'CLOVE');
 for(const key of ['constructor','__proto__',null,{},'']){assert(!isAgent(key));assert.equal(normalizeAgent(key),'jett');}
 assert(AGENTS.jett.abilities&&AGENTS.phoenix.abilities);assert(!AGENTS.iso.abilities&&!AGENTS.clove.abilities);
});
function peer(code,agent,resumeToken){
 const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];
 const p={ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async f=>{const until=Date.now()+7000;while(Date.now()<until){const m=messages.find(f);if(m)return m;await delay(10);}throw Error('timeout '+f)}};
 ws.on('message',b=>messages.push(JSON.parse(String(b))));ws.on('error',()=>{});ws.on('open',()=>p.send({type:'join',name:agent,agent,resumeToken,mapVersion:1,roundRules:1}));return p;
}
test('real Worker preserves Iso/Clove on join, updates and reconnect, and rejects Sage ability impersonation',{timeout:20000},async()=>{
 const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"map":"ascent"}'});assert.equal(r.status,201);const {code}=await r.json();let a,b,resumed;
 try{
  a=peer(code,'iso');const aw=await a.wait(m=>m.type==='welcome');assert.equal(aw.player.agent,'iso');assert(aw.features.includes('agent-models-4'));
  b=peer(code,'clove');const bw=await b.wait(m=>m.type==='welcome');assert.equal(bw.player.agent,'clove');
  const both=await a.wait(m=>m.type==='players'&&m.players.some(p=>p.agent==='clove'));assert.equal(both.players.find(p=>p.uid===aw.uid).agent,'iso');
  a.send({type:'state',x:0,y:4.8667,z:0,yaw:0,agent:'clove',weapon:'vandal',active:true});await b.wait(m=>m.type==='players'&&m.players.some(p=>p.uid===aw.uid&&p.agent==='clove'));
  for(const agent of AGENT_KEYS){a.send({type:'state',x:0,y:4.8667,z:0,yaw:0,agent,weapon:'vandal',active:true});await b.wait(m=>m.type==='players'&&m.players.some(p=>p.uid===aw.uid&&p.agent===agent));}
  a.send({type:'state',x:0,y:4.8667,z:0,yaw:0,agent:'clove',weapon:'vandal',active:true});
  a.send({type:'heal',targetUid:aw.uid});a.send({type:'wall',x:0,y:2.6667,z:-5,yaw:0});a.send({type:'revive',targetUid:bw.uid});
  await a.wait(m=>m.type==='ability_error'&&m.reason.includes('治療'));await a.wait(m=>m.type==='ability_error'&&m.reason.includes('屏障'));await a.wait(m=>m.type==='ability_error'&&m.reason.includes('復活'));
  a.ws.close();await delay(150);resumed=peer(code,'iso',aw.resumeToken);const rw=await resumed.wait(m=>m.type==='welcome');assert.equal(rw.uid,aw.uid);assert.equal(rw.player.agent,'clove');
 }finally{a?.ws.close();b?.ws.close();resumed?.ws.close();}
});
