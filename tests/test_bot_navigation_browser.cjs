const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');const {promisify}=require('util'),run=promisify(require('child_process').execFile);
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});
await page.route('https://**/*',async r=>{try{const {stdout}=await run('curl',['-fsSL',r.request().url()],{encoding:'buffer',maxBuffer:8e6});await r.fulfill({body:stdout,contentType:r.request().url().includes('fonts.googleapis.com')?'text/css':r.request().url().includes('fonts.gstatic.com')?'font/woff2':'text/javascript',headers:{'access-control-allow-origin':'*'}})}catch{await r.abort()}});
await page.route('**/index.html?*',r=>{let s=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').replace(/renderer\.render\(scene,\s*camera\);/g,'');s=s.replace('    </script>\n</body>',`window.__bot={state,map:realMap,bots,scene,renderer,pos:yawObject.position,spawn:spawnBots,update:updateBotsAndVFX,get nav(){return botNavigation},kill:handleBotKilled,navType:BotNavigation,random:randomBotSpawn,render:()=>{const ally=bots.find(b=>b.team===state.team),target=ally.group.position.clone();yawObject.position.copy(target).add(new THREE.Vector3(0,2,6));yawObject.rotation.y=0;pitchObject.rotation.x=-.08;scene.updateMatrixWorld(true);realMap.updateCulling(camera);renderer.setPixelRatio(.8);renderer.render(scene,camera);return renderer.domElement.toDataURL()}};\n    </script>\n</body>`);return r.fulfill({body:s,contentType:'text/html'})});
for(const map of (process.env.MAPS||'ascent,haven,summit,abyss').split(',')){
 await page.goto('http://127.0.0.1:8000/index.html?map='+map);await page.waitForFunction(()=>window.__bot?.map.ready,null,{timeout:150000});
 const spawned=await page.evaluate(async()=>{const h=__bot;h.renderer.setPixelRatio(.3);h.state.gameMode='tactical';h.spawn();await Promise.all(h.bots.map(b=>b.appearance.ready));const first=h.bots.map(b=>b.group.position.toArray());h.spawn();await Promise.all(h.bots.map(b=>b.appearance.ready));return{count:h.bots.length,agents:h.bots.map(b=>b.agent),valid:h.bots.every(b=>!h.map.collides(b.group.position.clone().add(new THREE.Vector3(0,2.2,0)))&&Math.abs(h.map.getGroundHeight(b.group.position.clone().add(new THREE.Vector3(0,2.2,0)))-b.group.position.y)<.1),random:h.bots.some((b,i)=>b.group.position.distanceTo(new THREE.Vector3(...first[i]))>.5),skins:h.bots.every(b=>!!b.appearance.skin)}});
 const sites=await page.evaluate(()=>__bot.map.definition.sites.map(site=>{
  const m=__bot.map;let supported=null;
  for(let x=site.minX+1;x<site.maxX&&!supported;x+=2)for(let z=site.minZ+1;z<site.maxZ&&!supported;z+=2){
   for(const floor of m.floorCandidates(x*m.scale,z*m.scale)){
    const eye=new THREE.Vector3(x*m.scale,floor+2.2,z*m.scale);
    if(!m.collides(eye)&&Math.abs(m.getGroundHeight(eye)-floor)<.2&&m.getPlantSite(eye)===site.name){supported=eye.toArray();break;}
   }
  }
  const upper=new THREE.Vector3((site.minX+site.maxX)/2*m.scale,(site.maxFloor+1)*m.scale+2.2,(site.minZ+site.maxZ)/2*m.scale);
  return{name:site.name,supported,upperRejected:m.getPlantSite(upper)===null};
 }));assert(sites.every(s=>s.supported&&s.upperRejected),JSON.stringify(sites));console.log('PASS '+map+' each plant region has supported walkable ground and rejects the overlapping upper floor',sites);
 assert.equal(spawned.count,9);assert(spawned.valid);assert(spawned.random);assert(spawned.skins);assert(spawned.agents.every(a=>['jett','phoenix'].includes(a)));console.log('PASS '+map+' random connected safe spawns and native agent models',spawned);
 // Follow an authored reachable training anchor through the real collision map.
 const route=await page.evaluate(async()=>{const h=__bot,nav=new h.navType(h.map),start=h.map.getSpawn('attack').position;start.y-=2.2;let pair;
  const anchor=h.map.getBotSpawns(false)[0];pair={start,end:new THREE.Vector3(anchor.x,anchor.y,anchor.z)};
  if(!pair)return {skip:true};const bot={group:{position:pair.start.clone()},alive:true,speed:5};nav.request(bot,pair.end);
  for(let i=0;i<7000&&nav.jobs.size;i++){nav.tick(.016);if(i%30===0)await new Promise(r=>setTimeout(r,0));}
  const count=bot.navPath?.length||0;let invalid=0;
  for(let i=0;i<7000&&bot.group.position.distanceTo(pair.end)>1.8;i++){nav.tick(.025);nav.move(bot,pair.end,.025);if(h.map.collides(bot.group.position.clone().add(new THREE.Vector3(0,2.2,0))))invalid++;if(i%100===0)await new Promise(r=>setTimeout(r,0));}
  return{start:pair.start.toArray(),end:pair.end.toArray(),remaining:bot.group.position.distanceTo(pair.end),count,invalid,cells:nav.cells.size,position:bot.group.position.toArray(),jobs:nav.jobs.size};});
 assert(!route.skip,'expected an obstacle test case');assert(route.count>2);assert.equal(route.invalid,0);assert(route.remaining<2,JSON.stringify(route));console.log('PASS '+map+' capsule-safe route from spawn toward a training position',route);
 if(map==='ascent'){
  fs.writeFileSync('/tmp/valo-allied-agent.png',Buffer.from((await page.evaluate(()=>__bot.render())).split(',')[1],'base64'));

  const support=await page.evaluate(async()=>{const h=__bot;h.state.roundEnding=false;h.state.hp=100;h.state.inBuyMenu=false;h.state.isLocked=true;h.state.gameMode='tactical';
   const ally=h.bots.find(b=>b.team===h.state.team),enemy=h.bots.find(b=>b.team!==h.state.team),p=ally.group.position.clone();let q;
   for(let i=0;i<16;i++){q=p.clone().add(new THREE.Vector3(Math.cos(i*Math.PI/8)*5,0,Math.sin(i*Math.PI/8)*5));q.y=h.map.getGroundHeight(q.clone().add(new THREE.Vector3(0,2.2,0)));if(h.nav.step(p,q))break;}
   h.pos.copy(q).add(new THREE.Vector3(0,2.2,0));h.bots.forEach(b=>{if(b!==ally&&b!==enemy)b.alive=false});enemy.group.position.copy(p).add(new THREE.Vector3(0,0,70));const before=ally.group.position.distanceTo(q);
   for(let i=0;i<80;i++){h.update(.025);if(i%20===0)await new Promise(r=>setTimeout(r,0));}const after=ally.group.position.distanceTo(q);
   ally.group.position.copy(p);enemy.group.position.copy(q);ally.combatVisible=false;ally.sightTime=0;h.scene.updateMatrixWorld(true);
   for(let i=0;i<170&&enemy.alive;i++){h.update(.025);if(i%30===0)await new Promise(r=>setTimeout(r,0));}
   h.state.isLocked=false;return{before,after,enemyHP:enemy.hp,allyHP:ally.hp};});
  assert(support.after<support.before-1);assert(support.enemyHP<100);console.log('PASS allied tactical bot follows the player and damages opponents',support);
 }
}
assert.deepEqual(errors,[]);console.log('PASS no uncaught browser errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
