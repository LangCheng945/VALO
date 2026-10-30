// Run the real Worker (npm run dev --prefix multiplayer) and static game server on 8000 first.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const {promisify}=require('util'),run=promisify(require('child_process').execFile);
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const contexts=[];try{
 const errors=[];const pages=[];
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:1000,height:700}});contexts.push(context);/* Allow this CI browser to reach the loopback Worker; production uses public HTTPS/WSS. */await context.grantPermissions(['local-network-access'],{origin:'http://127.0.0.1:8000'});const page=await context.newPage();pages.push(page);page.on('pageerror',error=>{errors.push(error.message);console.log('PAGEERROR',error.message)});
  await page.route('https://**/*',async route=>{try{const{stdout}=await run('curl',['-fsSL',route.request().url()],{encoding:'buffer',maxBuffer:8e6});await route.fulfill({body:stdout,contentType:route.request().url().includes('fonts.googleapis.com')?'text/css':route.request().url().includes('fonts.gstatic.com')?'font/woff2':'text/javascript',headers:{'access-control-allow-origin':'*'}})}catch{await route.abort()}});
  await page.route('**/index.html*',route=>{
   let source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
   // Keep actual map geometry, collision, raycasts, and game callbacks; omit GPU drawing in CI.
   source=source.replace(/renderer\.render\(scene,\s*camera\);/g,'');
   const hooks=`window.__net={state,map:realMap,x:triggerUltimateX,fan:fireBladeVolley,equip:equipWeaponSlot,client:()=>roomSocket,players:remotePlayers,position:yawObject.position,push:pushMyNetworkState,fire:()=>{scene.updateMatrixWorld(true);camera.updateWorldMatrix(true,false);fireWeapon()},pose:(x,y,z)=>{yawObject.position.set(x,y,z);yawObject.rotation.y=0;pitchObject.rotation.x=0;playerVelocity.set(0,0,0);pushMyNetworkState(true)},activate:()=>{state.isLocked=true;state.inBuyMenu=false;document.getElementById('buy-menu-modal').classList.add('hidden');pushMyNetworkState(true)}};`;
   source=source.replace('    </script>\n</body>',hooks+'\n    </script>\n</body>');return route.fulfill({body:source,contentType:'text/html'});
  });
  await context.addInitScript(()=>{localStorage.setItem('valo-multiplayer-server','http://127.0.0.1:8790');window.__multiplayer_preferred_server='http://127.0.0.1:8790';window.__multiplayer_fallback_server='http://127.0.0.1:8790';});
  await page.goto('http://127.0.0.1:8000/index.html');await page.waitForFunction(()=>window.__net?.map.ready,null,{timeout:150000});
  await page.evaluate(()=>openNetworkMenu());await page.locator('#input-server-url').fill('http://127.0.0.1:8790');await page.locator('#btn-save-server').click();
 }
 const [a,b]=pages;
 await b.evaluate(()=>{selectAgent('phoenix');__net.state.playerName='Sage隊員';document.getElementById('input-player-name').value='Sage隊員';});
 await a.getByRole('button',{name:'+ 建立好友房間',exact:true}).click();await a.waitForFunction(()=>__net.client()?.connected);const code=await a.locator('#input-room-code').inputValue();
 await b.locator('#input-room-code').fill(code);await b.locator('#input-room-code').press('Enter');await b.waitForFunction(()=>__net.client()?.connected);await a.waitForFunction(()=>__net.players.size===1);
 const identities=await Promise.all(pages.map(p=>p.evaluate(()=>({uid:__net.client().uid,team:__net.state.team,agent:__net.state.agent,name:__net.state.playerName}))));
 assert.equal(await a.locator('#map-select').isEnabled(),true);assert.equal(await b.locator('#map-select').isEnabled(),false);
 console.log('PASS only host can select the room map');
 await a.locator('#map-select').selectOption('haven');
 await Promise.all(pages.map(p=>p.waitForURL('**/index.html?map=haven&room='+code,{timeout:20000})));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>window.__net?.map.ready&&__net.client()?.connected&&__net.players.size===1,null,{timeout:150000})));
 for(let i=0;i<2;i++){const after=await pages[i].evaluate(()=>({uid:__net.client().uid,team:__net.state.team,agent:__net.state.agent,name:__net.state.playerName,hp:__net.state.hp,x:__net.position.x}));assert.equal(after.uid,identities[i].uid);assert.equal(after.team,identities[i].team);assert.equal(after.agent,identities[i].agent);assert.equal(after.name,identities[i].name);assert.equal(after.hp,100);assert(after.x<-30);assert.equal(await pages[i].locator('#input-room-code').inputValue(),code);}
 assert.equal(await a.locator('#map-select').isEnabled(),true);assert.equal(await b.locator('#map-select').isEnabled(),false);
 console.log('PASS host selection reloads BOTH real browser contexts into Haven, preserves room/IDs/teams, and spawns inside Haven');
 await a.evaluate(()=>__net.client().send({type:'chat',text:'換圖後聊天室'}));await b.waitForFunction(()=>document.getElementById('chat-messages').textContent.includes('換圖後聊天室'));
 await a.evaluate(()=>leaveMultiplayerRoom());await b.waitForFunction(()=>!document.getElementById('map-select').disabled);
 assert.equal(await a.evaluate(()=>new URL(location.href).searchParams.has('room')),false);assert.deepEqual(errors,[]);
 console.log('PASS communication survives the map change and leaving transfers host controls to the remaining member, with no page errors');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
