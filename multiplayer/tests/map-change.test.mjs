import {test} from 'node:test';import assert from 'node:assert/strict';import WebSocket from 'ws';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000',delay=ms=>new Promise(r=>setTimeout(r,ms));
async function create(){const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({mode:'rounds'})});assert.equal(r.status,201);return(await r.json()).code;}
function peer(code,{token,map='ascent',legacy=false}={}){const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];const c={ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async fn=>{for(let i=0;i<700;i++){const m=messages.find(fn);if(m)return m;await delay(10);}throw Error('Timeout '+fn);}};ws.on('message',b=>messages.push(JSON.parse(String(b))));ws.on('error',()=>{});ws.on('open',()=>c.send({type:'join',name:'Test',agent:'phoenix',weapon:'vandal',roundRules:1,publicRules:1,mapVersion:1,mapChange:legacy?0:1,map,resumeToken:token}));return c;}
const pose=x=>({type:'state',x,y:4.8,z:0,yaw:0,pitch:0,agent:'phoenix',weapon:'vandal',active:true,shield:50});
test('host changes the whole room, resets combat, preserves IDs/teams and blocks stale packets',async()=>{
 const code=await create(),a=peer(code),clients=[a];
 try{
  const aw=await a.wait(m=>m.type==='welcome');assert.equal(aw.hostUid,aw.uid);const b=peer(code);clients.push(b);const bw=await b.wait(m=>m.type==='welcome');assert.equal(bw.hostUid,aw.uid);
  b.send({type:'map_change',map:'haven'});await b.wait(m=>m.type==='map_error'&&m.reason.includes('房主'));
  a.send({type:'map_change',map:'not-a-map'});await a.wait(m=>m.type==='map_error'&&m.reason.includes('不支援'));
  a.send(pose(0));b.send(pose(3));await a.wait(m=>m.type==='round'&&m.round.phase==='playing');
  a.send({type:'shot',sx:0,sy:4.8,sz:0,ex:3,ey:3.8,ez:0});a.send({type:'hit',targetUid:bw.uid,isHead:true});await b.wait(m=>m.type==='damage'&&m.hp===0);
  a.send({type:'map_change',map:'haven'});const am=await a.wait(m=>m.type==='map_changed'),bm=await b.wait(m=>m.type==='map_changed');assert.equal(am.map,'haven');assert.equal(bm.map,'haven');assert.equal(am.resumeToken,aw.resumeToken);
  // Pending old-map clients cannot activate the new round or move their respawn.
  a.send(pose(999));b.send(pose(999));await delay(100);a.ws.close();b.ws.close();
  const aa=peer(code,{token:am.resumeToken,map:'haven'});clients.push(aa);const anew=await aa.wait(m=>m.type==='welcome');const bb=peer(code,{token:bm.resumeToken,map:'haven'});clients.push(bb);const bnew=await bb.wait(m=>m.type==='welcome');
  for(const [old,next]of [[aw,anew],[bw,bnew]]){assert.equal(next.uid,old.uid);assert.equal(next.player.team,old.player.team);assert.equal(next.hostUid,aw.uid);assert.equal(next.map,'haven');assert.equal(next.player.hp,100);assert.equal(next.player.kills,0);assert.equal(next.player.deaths,0);assert.equal(next.player.active,false);assert.notEqual(next.player.x,999);assert.equal(next.round.phase,'waiting');assert.equal(next.round.scoreAttack,0);assert.equal(next.round.scoreDefend,0);assert.equal(next.round.number,1);assert.deepEqual(next.sprays,[]);assert.deepEqual(next.barriers,[]);assert.deepEqual(next.slowFields,[]);}
  aa.send({type:'map_change',map:'abyss'});await aa.wait(m=>m.type==='map_error'&&m.reason.includes('稍候'));
  aa.send({type:'leave'});await bb.wait(m=>m.type==='players'&&m.hostUid===bnew.uid&&m.players.length===1);
 }finally{clients.forEach(c=>c.ws.close());}
});
test('legacy room members block map changes without splitting the room',async()=>{const code=await create(),a=peer(code);await a.wait(m=>m.type==='welcome');const b=peer(code,{legacy:true});try{await b.wait(m=>m.type==='welcome');a.send({type:'map_change',map:'abyss'});await a.wait(m=>m.type==='map_error'&&m.reason.includes('重新整理'));assert(!b.messages.some(m=>m.type==='map_changed'));}finally{a.ws.close();b.ws.close();}});
test('public lobby rejects manual map selection',async()=>{const a=peer('PUBLIC',{map:null});try{await a.wait(m=>m.type==='welcome');a.send({type:'map_change',map:'summit'});await a.wait(m=>m.type==='map_error'&&m.reason.includes('公開房'));}finally{a.ws.close();}});
test('late join on an old map redirects with a reusable ticket and keeps the same identity',async()=>{
 const code=await create(),a=peer(code),clients=[a];
 try{await a.wait(m=>m.type==='welcome');a.send({type:'map_change',map:'abyss'});await a.wait(m=>m.type==='map_changed');const old=peer(code);clients.push(old);const wrong=await old.wait(m=>m.type==='welcome');assert.equal(wrong.map,'abyss');const next=peer(code,{token:wrong.resumeToken,map:'abyss'});clients.push(next);const correct=await next.wait(m=>m.type==='welcome');assert.equal(correct.uid,wrong.uid);assert.equal(correct.player.team,wrong.player.team);assert.equal(correct.player.active,false);await next.wait(m=>m.type==='players'&&m.players.filter(p=>p.uid===correct.uid).length===1);}finally{clients.forEach(c=>c.ws.close());}
});
