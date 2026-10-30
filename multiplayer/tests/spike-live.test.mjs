import {test} from 'node:test';import assert from 'node:assert/strict';import WebSocket from 'ws';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000',delay=ms=>new Promise(r=>setTimeout(r,ms));
function peer(code){const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];const p={ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async fn=>{for(let i=0;i<800;i++){const m=messages.find(fn);if(m)return m;await delay(10);}throw Error('Timeout '+fn);}};ws.on('open',()=>p.send({type:'join',name:'Spike測試',weapon:'vandal',mapVersion:1,roundRules:1,mapChange:1}));ws.on('message',b=>messages.push(JSON.parse(String(b))));ws.on('error',()=>{});return p;}
const pose=x=>({type:'state',x,y:8.2,z:-80,yaw:0,active:true,weapon:'vandal',shield:50});
test('actual Worker drops a killed carrier, lets an attacking teammate pick up, and drops on disconnect',async()=>{
 const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"map":"ascent","mode":"rounds"}'});assert.equal(r.status,201);const {code}=await r.json(),a=peer(code),clients=[a];
 try{
  const aw=await a.wait(m=>m.type==='welcome'),b=peer(code);clients.push(b);const bw=await b.wait(m=>m.type==='welcome'),c=peer(code);clients.push(c);const cw=await c.wait(m=>m.type==='welcome');
  a.send(pose(-88));b.send(pose(-86));c.send(pose(-88));await b.wait(m=>m.type==='players'&&m.round?.phase==='playing');
  b.send({type:'shot',sx:-86,sy:8.2,sz:-80,ex:-88,ey:7.2,ez:-80});b.send({type:'hit',targetUid:aw.uid,isHead:true});await a.wait(m=>m.type==='damage'&&m.hp===0);
  const dropped=await c.wait(m=>m.type==='players'&&m.round?.spike?.phase==='dropped');assert.equal(dropped.round.phase,'playing');const id=dropped.round.spike.id;
  b.send({type:'spike_pickup',id});await b.wait(m=>m.type==='spike_error');c.send(pose(-88));await b.wait(m=>m.type==='players'&&m.round?.spike?.carrierUid===cw.uid);
  c.ws.close();await b.wait(m=>m.type==='players'&&m.round?.spike?.phase==='dropped'&&m.round.spike.droppedBy===cw.uid);assert.notEqual(aw.player.team,bw.player.team);assert.equal(aw.player.team,cw.player.team);
 }finally{clients.forEach(c=>c.ws.close());}
});
