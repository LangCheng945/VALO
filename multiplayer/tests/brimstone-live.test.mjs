import{test}from'node:test';import assert from'node:assert/strict';import WebSocket from'ws';
const base=process.env.VALO_TEST_SERVER||'http://127.0.0.1:8790',origin='http://127.0.0.1:8000',delay=ms=>new Promise(r=>setTimeout(r,ms));
function peer(code,agent,resumeToken){const ws=new WebSocket(base.replace('http','ws')+'/rooms/'+code,{headers:{Origin:origin}}),messages=[];const p={ws,messages,send:m=>ws.send(JSON.stringify(m)),wait:async(f,from=0)=>{const until=Date.now()+7000;while(Date.now()<until){const m=messages.slice(from).find(f);if(m)return m;await delay(10);}throw Error('timeout '+f)}};ws.on('open',()=>p.send({type:'join',agent,resumeToken,name:agent,mapVersion:1,roundRules:1,armoryVersion:1,isoRules:1}));ws.on('message',m=>messages.push(JSON.parse(String(m))));return p;}
async function activate(p,agent,z=0,weapon='operator'){p.pose={x:0,y:4.8667,z,yaw:0,active:true,agent,weapon};p.send({type:'state',...p.pose});await delay(70);}
async function shot(p,target,uid,head=false){const mark=target.messages.length;p.send({type:'shot',sx:p.pose.x,sy:p.pose.y,sz:p.pose.z,ex:target.pose.x,ey:target.pose.y-1,ez:target.pose.z});p.send({type:'hit',targetUid:uid,isHead:head});await delay(130);return mark;}
test('real peers share Brimstone smoke, ally stim and warning-to-lethal orbital strike',{timeout:20000},async()=>{
 const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(new URL(base).hostname==='127.0.0.1'?{'CF-Connecting-IP':'192.0.2.44'}:{})},body:'{"map":"ascent","mode":"rounds","duration":60}'});assert.equal(r.status,201);const{code}=await r.json();const peers=[];
 try{
  const a=peer(code,'brimstone');peers.push(a);const aw=await a.wait(m=>m.type==='welcome');assert(aw.features.includes('brimstone-kit-1'));
  const b=peer(code,'jett');peers.push(b);const bw=await b.wait(m=>m.type==='welcome');const c=peer(code,'jett');peers.push(c);const cw=await c.wait(m=>m.type==='welcome');
  await activate(a,'brimstone',0);await activate(b,'jett',-5);await activate(c,'jett',-1);await a.wait(m=>m.round?.phase==='playing');
  a.send({type:'brim_stim'});const buff=await a.wait(m=>m.type==='players'&&m.players.some(p=>p.uid===cw.uid&&p.stimUntil>Date.now()));assert(!buff.players.find(p=>p.uid===bw.uid).stimUntil);
  a.send({type:'brim_smokes',points:[{x:10,y:3,z:0},{x:15,y:3,z:0},{x:20,y:3,z:0}]});await b.wait(m=>m.event?.kind==='smoke');
  const late=peer(code,'jett');peers.push(late);const lw=await late.wait(m=>m.type==='welcome');assert.equal(lw.brimEffects.areas.filter(e=>e.kind==='smoke').length,3);
  const mark=a.messages.length;a.send({type:'brim_smokes',points:[{x:3,y:3,z:0}]});await a.wait(m=>m.type==='ability_error',mark);
  a.send({type:'brim_ultimate',x:0,y:2.6667,z:-5});const strike=(await b.wait(m=>m.event?.kind==='strike')).event;await delay(500);assert(!b.messages.some(m=>m.type==='damage'&&m.cause==='strike'));
  await b.wait(m=>m.type==='damage'&&m.hp===0);const dead=await a.wait(m=>m.type==='players'&&m.players.some(p=>p.uid===bw.uid&&p.hp===0));assert.equal(dead.players.find(p=>p.uid===aw.uid).kills,1);assert.equal(strike.startsAt-strike.createdAt,2000);
  console.log('PASS real Worker: ally-only stim, all three smoke charges, late-join effects, warning then lethal damage, kill credit and round elimination');
 }finally{for(const p of peers)p.ws.close();}
});

test('real Worker validates grenade launch/landing and the fire field hurts an enemy',{timeout:15000},async()=>{
 const r=await fetch(base+'/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(new URL(base).hostname==='127.0.0.1'?{'CF-Connecting-IP':'192.0.2.44'}:{})},body:'{"map":"ascent","mode":"practice"}'});assert.equal(r.status,201);const{code}=await r.json();let a,b;
 try{a=peer(code,'brimstone');await a.wait(m=>m.type==='welcome');b=peer(code,'jett');const bw=await b.wait(m=>m.type==='welcome');await activate(a,'brimstone');await activate(b,'jett',-12.5);
 a.send({type:'brim_incendiary',dx:0,dy:0,dz:-1});const flight=(await b.wait(m=>m.event?.type==='brim_flight')).event;await delay(400);const t=(Date.now()-flight.segmentAt)/1000;
 a.send({type:'brim_land',id:flight.id,x:flight.x+flight.vx*t,y:flight.y+flight.vy*t-5*t*t,z:flight.z+flight.vz*t});const fire=(await b.wait(m=>m.event?.kind==='fire')).event;assert.equal(fire.radius,4.5);const damage=await b.wait(m=>m.type==='damage'&&m.cause==='fire');assert(damage.hp+damage.shield<150);
 const mark=a.messages.length;a.send({type:'brim_incendiary',dx:0,dy:0,dz:-1});await a.wait(m=>m.type==='ability_error',mark);assert(bw.uid);console.log('PASS real Worker: ballistic grenade landing, one fire field, damage and spent-charge rejection');
 }finally{a?.ws.close();b?.ws.close();}
});
