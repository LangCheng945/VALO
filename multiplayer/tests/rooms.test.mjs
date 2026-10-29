import {test} from 'node:test';import assert from 'node:assert/strict';import WebSocket from 'ws';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function create(map='ascent'){const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({map})});assert.equal(r.status,201);return (await r.json()).code;}
function peer(code,name,resumeToken){
 const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];
 const result={ws,messages,send:p=>ws.send(JSON.stringify(p)),wait:async(predicate,timeout=7000)=>{const start=Date.now();while(Date.now()-start<timeout){const m=messages.find(predicate);if(m)return m;await delay(10);}throw Error('Message timeout: '+predicate.toString());}};
 ws.on('message',b=>messages.push(JSON.parse(String(b))));ws.on('open',()=>result.send({type:'join',name,agent:'jett',weapon:'vandal',resumeToken,mapVersion:1}));ws.on('error',()=>{});return result;
}
const pose=(p,x=0)=>({type:'state',x,y:4.8667,z:0,yaw:0,pitch:0,weapon:'vandal',agent:'jett',active:true,hp:99999,kills:99999,shield:50,...p});
test('actual Worker rooms synchronize players/chat/combat and isolate membership',{timeout:25000},async()=>{
 const code=await create(),other=await create(),a=peer(code,'甲'),b=peer(code,'乙'),c=peer(other,'丙');
 try{
  const aw=await a.wait(m=>m.type==='welcome'),bw=await b.wait(m=>m.type==='welcome');await c.wait(m=>m.type==='welcome');assert.notEqual(aw.uid,bw.uid);assert.notEqual(aw.player.team,bw.player.team);
  await a.wait(m=>m.type==='players'&&m.players.length===2);
  a.send(pose({},0));b.send(pose({},3));await a.wait(m=>m.type==='players'&&m.players.some(p=>p.uid===bw.uid&&p.x===3));
  a.send(pose({weapon:'constructor'},.1));const checked=await b.wait(m=>m.type==='players'&&m.players.some(p=>p.uid===aw.uid&&p.x===.1));assert.equal(checked.players.find(p=>p.uid===aw.uid).weapon,'vandal');
  a.send({type:'chat',text:'同步測試 <img onerror=bad>',senderUid:bw.uid});const chat=await b.wait(m=>m.type==='event'&&m.event.type==='chat');assert.equal(chat.event.senderUid,aw.uid);assert(!chat.event.text.includes('<'));
  await delay(100);assert(!c.messages.some(m=>m.type==='event'));
  const state=b.messages.filter(m=>m.type==='players').at(-1).players.find(p=>p.uid===aw.uid);assert.equal(state.hp,100);assert.equal(state.kills,0);
  // An unpaired hit and a spoofed kill cannot alter server-owned health or counters.
  a.send({type:'hit',targetUid:bw.uid,dmg:9999,isHead:true});a.send({type:'kill',killerUid:aw.uid});await delay(80);
  a.send({type:'shot',sx:0,sy:4.8,sz:0,ex:3,ey:4.9,ez:0});a.send({type:'hit',targetUid:bw.uid,dmg:99999,isHead:true});
  const damage=await b.wait(m=>m.type==='damage');assert.equal(damage.hp,0);assert.equal(damage.shield,0);
  const kill=await a.wait(m=>m.type==='event'&&m.event.type==='kill');assert.equal(kill.event.killerUid,aw.uid);
  const respawn=await b.wait(m=>m.type==='spawn',8000);assert.equal(respawn.player.hp,100);assert.equal(respawn.player.deaths,1);
  b.ws.close();await a.wait(m=>m.type==='players'&&m.players.length===1&&m.players[0].uid===aw.uid);
 }finally{a.ws.close();b.ws.close();c.ws.close();}
});
test('unknown rooms and unapproved web origins are rejected',async()=>{
 const denied=await fetch(base+'/rooms',{method:'POST',headers:{Origin:'https://unapproved.invalid'}});assert.equal(denied.status,403);
 const closed=new WebSocket(base.replace('http','ws')+'/rooms/ZZZZZZ',{headers:{Origin:origin}});await new Promise(resolve=>{closed.on('unexpected-response',(_,r)=>{assert.equal(r.statusCode,404);r.resume();closed.terminate();resolve();});closed.on('error',resolve);});
});

test('reconnecting with the issued token preserves identity and team',async()=>{
 const code=await create(),a=peer(code,'保留角色');let b;
 try{const first=await a.wait(m=>m.type==='welcome');a.ws.close();await delay(200);b=peer(code,'新名稱不能覆蓋舊角色',first.resumeToken);const second=await b.wait(m=>m.type==='welcome');assert.equal(second.uid,first.uid);assert.equal(second.player.team,first.player.team);assert.equal(second.player.name,first.player.name);}finally{a.ws.close();b?.ws.close();}
});
test('ten-player capacity rejects an eleventh connection',async()=>{
 const code=await create(),clients=[];
 try{for(let i=0;i<10;i++){const c=peer(code,'玩家'+i);clients.push(c);await c.wait(m=>m.type==='welcome');}const extra=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}});await new Promise(resolve=>{extra.on('unexpected-response',(_,r)=>{assert.equal(r.statusCode,409);r.resume();extra.terminate();resolve();});extra.on('error',resolve);});}finally{clients.forEach(c=>c.ws.close());}
});

test('Haven rooms keep map identity, spawn teams in Haven and reject incompatible clients',async()=>{
 const code=await create('haven'),a=peer(code,'Haven甲'),b=peer(code,'Haven乙');
 try{const aw=await a.wait(m=>m.type==='welcome'),bw=await b.wait(m=>m.type==='welcome');assert.equal(aw.map,'haven');assert.equal(bw.map,'haven');assert(Math.abs(aw.player.y-6.2)<.01);assert(aw.player.x<-30&&bw.player.x<-30);const legacy=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}});legacy.on('open',()=>legacy.send(JSON.stringify({type:'join',name:'舊版本'})));await new Promise((resolve,reject)=>{legacy.on('close',code=>{assert.equal(code,1008);resolve();});legacy.on('error',reject);});}finally{a.ws.close();b.ws.close();}
 const bad=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"map":"unknown"}'});assert.equal(bad.status,400);
});

test('Summit rooms publish their map and use Summit spawn positions',async()=>{
 const code=await create('summit'),a=peer(code,'Summit甲'),b=peer(code,'Summit乙');
 try{const aw=await a.wait(m=>m.type==='welcome'),bw=await b.wait(m=>m.type==='welcome');assert.equal(aw.map,'summit');assert.equal(bw.map,'summit');const attack=[aw.player,bw.player].find(p=>p.team==='attack'),defend=[aw.player,bw.player].find(p=>p.team==='defend');assert(Math.abs(attack.x-78.6667)<.001);assert(Math.abs(attack.y-4.8667)<.001);assert(Math.abs(defend.z+161)<.001);}finally{a.ws.close();b.ws.close();}
});
