import{test}from'node:test';import assert from'node:assert/strict';import WebSocket from'ws';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000',delay=ms=>new Promise(r=>setTimeout(r,ms));
function peer(code,agent){const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];const c={ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async(f,ms=7000)=>{const t=Date.now();while(Date.now()-t<ms){const m=messages.find(f);if(m)return m;await delay(10);}throw Error('timeout '+f)}};ws.on('open',()=>c.send({type:'join',name:agent,agent,mapVersion:1,roundRules:1}));ws.on('message',b=>messages.push(JSON.parse(String(b))));ws.on('error',()=>{});return c;}
const pose=(agent,x)=>({type:'state',x,y:4.8667,z:0,yaw:0,pitch:0,active:true,agent,weapon:'vandal',shield:50});
test('rounds retain corpses, validate Sage resurrection and respawn only at the next round',{timeout:25000},async()=>{
 const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({map:'ascent',mode:'rounds',duration:300})});assert.equal(r.status,201);const{code,mode}=await r.json();assert.equal(mode,'rounds');
 const a=peer(code,'phoenix'),b=peer(code,'jett'),c=peer(code,'jett');
 try{const aw=await a.wait(m=>m.type==='welcome'),bw=await b.wait(m=>m.type==='welcome'),cw=await c.wait(m=>m.type==='welcome');assert.equal(aw.player.team,cw.player.team);assert.notEqual(bw.player.team,cw.player.team);
 a.send(pose('phoenix',0));b.send(pose('jett',2));c.send(pose('jett',3));await a.wait(m=>m.type==='players'&&m.round?.phase==='playing');
 const kill=async(target,x)=>{b.send({type:'shot',sx:2,sy:4.8667,sz:0,ex:x,ey:4,ez:0});b.send({type:'hit',targetUid:target,isHead:true});await b.wait(m=>m.type==='event'&&m.event.type==='kill'&&m.event.victimUid===target);};
 await kill(cw.uid,3);await delay(5500);assert(!c.messages.some(m=>m.type==='spawn'));const dead=a.messages.filter(m=>m.type==='players').at(-1);assert.equal(dead.players.find(p=>p.uid===cw.uid).hp,0);assert.equal(dead.round.phase,'playing');
 b.send({type:'revive',targetUid:cw.uid});await b.wait(m=>m.type==='ability_error');a.send(pose('phoenix',30));a.send({type:'revive',targetUid:cw.uid});await a.wait(m=>m.type==='ability_error'&&m.reason.includes('距離'));
 a.send(pose('phoenix',0));a.send({type:'revive',targetUid:cw.uid});await a.wait(m=>m.type==='event'&&m.event.type==='revive'&&m.event.phase==='start');a.send({type:'revive',targetUid:cw.uid});await a.wait(m=>m.type==='ability_error'&&m.reason.includes('目前'));
 const restored=await c.wait(m=>m.type==='spawn');assert.equal(restored.player.hp,100);assert.equal(restored.player.shield,0);assert.equal(restored.player.x,3);
 c.send(pose('jett',3));await delay(100);await kill(cw.uid,3);a.send({type:'revive',targetUid:cw.uid});await delay(100);assert.equal(a.messages.filter(m=>m.type==='event'&&m.event.type==='revive'&&m.event.phase==='start').length,1);
 await delay(150);await kill(aw.uid,0);const ended=await b.wait(m=>m.type==='round'&&m.round.phase==='ending');assert.equal(ended.round.winner,'defend');
 const next=await b.wait(m=>m.type==='round'&&m.round.number===2);assert.equal(next.round.scoreDefend,1);assert.equal(c.messages.filter(m=>m.type==='spawn').at(-1).player.hp,100);assert.equal(a.messages.filter(m=>m.type==='spawn').at(-1).player.ultUsed,false);
 }finally{a.ws.close();b.ws.close();c.ws.close();}
});
