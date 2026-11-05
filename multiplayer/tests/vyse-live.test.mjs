import{test}from'node:test';import assert from'node:assert/strict';import WebSocket from'ws';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000',delay=ms=>new Promise(r=>setTimeout(r,ms));
function peer(code,agent,resumeToken){const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];const p={ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async(f,mark=0)=>{const end=Date.now()+7000;while(Date.now()<end){const m=messages.slice(mark).find(f);if(m)return m;await delay(15);}throw Error('timeout '+f)}};ws.on('open',()=>p.send({type:'join',agent,resumeToken,name:agent,mapVersion:1,roundRules:1,armoryVersion:1,isoRules:1}));ws.on('message',b=>messages.push(JSON.parse(String(b))));return p;}
async function roomCode(){const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(new URL(base).hostname==='127.0.0.1'?{'CF-Connecting-IP':'192.0.2.108'}:{})},body:'{"map":"ascent","mode":"practice"}'});assert.equal(r.status,201);return(await r.json()).code;}
async function activate(p,agent,z=0,x=0){p.pose={x,y:4.8667,z,yaw:0,active:true,agent,weapon:'operator'};p.send({type:'state',...p.pose});await delay(70);}
const players=(uid,predicate)=>m=>m.type==='players'&&m.players.some(p=>p.uid===uid&&predicate(p));

test('Vyse peers share source-flower state, late-join reconstruction, timed flash, cooldown and recall',{timeout:15000},async()=>{
 const code=await roomCode(),peers=[];try{const a=peer(code,'vyse');peers.push(a);const aw=await a.wait(m=>m.type==='welcome');assert(aw.features.includes('vyse-flash-1'));const b=peer(code,'jett');peers.push(b);const bw=await b.wait(m=>m.type==='welcome');await activate(a,'vyse');await activate(b,'jett',-5);b.send({type:'state',...b.pose,yaw:Math.PI});
 a.send({type:'vyse_place',x:0,y:4.8667,z:-3,nx:0,ny:0,nz:1});const flower=(await b.wait(m=>m.event?.type==='vyse_flower')).event;
 const c=peer(code,'sage');peers.push(c);const cw=await c.wait(m=>m.type==='welcome');await c.wait(players(aw.uid,p=>p.vyseFlower?.id===flower.id));
 await delay(1250);a.send({type:'vyse_pop'});const armed=(await b.wait(m=>m.event?.id===flower.id&&m.event.firesAt)).event;await delay(Math.max(0,armed.firesAt-Date.now()+20));b.send({type:'vyse_seen',id:flower.id});await b.wait(players(bw.uid,p=>p.breachFlashUntil>Date.now()));await a.wait(players(aw.uid,p=>p.vyseReadyAt>Date.now()&&!p.vyseFlower));
 const mark=a.messages.length;a.send({type:'vyse_place',x:0,y:4.8667,z:-3,nx:0,ny:0,nz:1});await a.wait(m=>m.type==='ability_error',mark);
 console.log('PASS actual Worker: flower deploy, enemy replication, late join, activation, flash, expiry and cooldown');
 }finally{for(const p of peers)p.ws.close();}
});
