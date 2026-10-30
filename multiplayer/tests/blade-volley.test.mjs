import {test} from 'node:test';import assert from 'node:assert/strict';import WebSocket from 'ws';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000',delay=ms=>new Promise(r=>setTimeout(r,ms));
function peer(code,name){const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];const p={ws,messages,send:v=>ws.send(JSON.stringify(v)),wait:async fn=>{for(let i=0;i<700;i++){const found=messages.find(fn);if(found)return found;await delay(10);}throw Error('Timed out '+fn)}};ws.on('open',()=>p.send({type:'join',name,agent:'jett',weapon:'vandal',mapVersion:1}));ws.on('message',b=>messages.push(JSON.parse(b)));return p;}
test('actual Worker accepts five simultaneous knives, pairs damage once and preserves firearm cooldown',{timeout:15000},async()=>{
 const res=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,201);const {code}=await res.json(),a=peer(code,'Jett'),b=peer(code,'Target');
 try{const aw=await a.wait(m=>m.type==='welcome'),bw=await b.wait(m=>m.type==='welcome');assert(aw.features.includes('blade-volley'));
 const pose=(x,weapon)=>({type:'state',agent:'jett',weapon,x,y:4.8667,z:0,yaw:0,pitch:0,active:true,shield:50});a.send(pose(0,'bladestorm'));b.send(pose(3,'vandal'));await a.wait(m=>m.type==='players'&&m.players.find(p=>p.uid===aw.uid)?.weapon==='bladestorm');
 const id=crypto.randomUUID();for(let i=0;i<5;i++){a.send({type:'shot',sx:0,sy:4.8,sz:0,ex:i===4?3:40,ey:4.9,ez:0,volley:{id,count:5,index:i}});if(i===4)a.send({type:'hit',targetUid:bw.uid,isHead:true});}
 await b.wait(m=>m.type==='damage');await a.wait(m=>m.type==='event'&&m.event.type==='kill');
 a.send({type:'shot',sx:0,sy:4.8,sz:0,ex:3,ey:4.9,ez:0,volley:{id,count:5,index:4}});
 a.send(pose(0,'vandal'));a.send({type:'shot',sx:0,sy:4.8,sz:0,ex:3,ey:4.9,ez:0,volley:{id:crypto.randomUUID(),count:5,index:0}});await delay(100);
 const shots=a.messages.filter(m=>m.type==='event'&&m.event.type==='shot'&&m.event.senderUid===aw.uid);assert.equal(shots.length,5);assert.equal(b.messages.filter(m=>m.type==='damage').length,1);assert.equal(a.messages.find(m=>m.type==='event'&&m.event.type==='kill').event.weaponName,'BLADESTORM');
 }finally{a.ws.close();b.ws.close();}
});
