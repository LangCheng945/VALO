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
   const hooks=`window.__net={state,map:realMap,client:()=>roomSocket,players:remotePlayers,position:yawObject.position,push:pushMyNetworkState,fire:()=>{scene.updateMatrixWorld(true);camera.updateWorldMatrix(true,false);fireWeapon()},pose:(x,y,z)=>{yawObject.position.set(x,y,z);yawObject.rotation.y=0;pitchObject.rotation.x=0;playerVelocity.set(0,0,0);pushMyNetworkState(true)},activate:()=>{state.isLocked=true;state.inBuyMenu=false;document.getElementById('buy-menu-modal').classList.add('hidden');pushMyNetworkState(true)}};`;
   source=source.replace('    </script>\n</body>',hooks+'\n    </script>\n</body>');return route.fulfill({body:source,contentType:'text/html'});
  });
  await page.goto('http://127.0.0.1:8000/index.html'+(i===0?'?map=abyss':''));await page.waitForFunction(()=>window.__net?.map.ready,null,{timeout:150000});
  await page.evaluate(()=>openNetworkMenu());await page.locator('#input-server-url').fill('http://127.0.0.1:8790');await page.locator('#btn-save-server').click();
 }
 const [a,b]=pages;
 await a.getByRole('button',{name:'+ 建立好友房間',exact:true}).click();await a.waitForFunction(()=>__net.client()?.connected).catch(async error=>{console.log('ROOM ERROR',await a.locator('#network-feedback').textContent());throw error;});const code=await a.locator('#input-room-code').inputValue();assert(/^[A-Z2-9]{6}$/.test(code));
 await b.locator('#input-room-code').fill(code);await b.locator('#input-room-code').press('Enter');await b.waitForFunction(()=>window.__net?.map.id==='abyss'&&__net.map.ready&&__net.client()?.connected,null,{timeout:150000});await a.waitForFunction(()=>__net.players.size===1);await b.waitForFunction(()=>__net.players.size===1);
 assert.notEqual(await a.evaluate(()=>__net.client().uid),await b.evaluate(()=>__net.client().uid));assert.notEqual(await a.evaluate(()=>__net.state.team),await b.evaluate(()=>__net.state.team));assert.equal(await b.locator('#map-select').inputValue(),'abyss');console.log('PASS guest automatically changes from Ascent to the host Abyss map');console.log('PASS two isolated browser contexts join via actual lobby UI, with distinct IDs and opposite teams');
 const start=await a.evaluate(()=>__net.position.toArray());await a.evaluate(()=>{__net.position.x+=1;__net.push(true)});await b.waitForFunction(x=>Math.abs([...__net.players.values()][0].targetPos.x-x)<.01,start[0]+1);console.log('PASS remote avatar receives real position updates');
 await a.evaluate(()=>__net.client().send({type:'chat',text:'雙向聊天室測試'}));await b.waitForFunction(()=>document.getElementById('chat-messages').textContent.includes('雙向聊天室測試'));
 // Both clients run real game combat callbacks. Their map geometry remains loaded for raycasts.
 await a.evaluate(()=>{__net.activate();__net.pose(66,12.8667,-12.6667)});await b.evaluate(()=>{__net.activate();__net.pose(66,12.8667,-14.6667)});await a.waitForTimeout(350);
 for(let i=0;i<4;i++){await a.evaluate(()=>__net.fire());await a.waitForTimeout(180);if(await b.evaluate(()=>__net.state.hp===0))break;}
 await b.waitForFunction(()=>__net.state.hp<100,null,{timeout:7000});console.log('PASS actual fireWeapon raycast delivers damage to the second browser',await b.evaluate(()=>({hp:__net.state.hp,shield:__net.state.shield})));
 await b.waitForFunction(()=>__net.state.hp===100,null,{timeout:8000});
 await a.evaluate(()=>{__net.activate();__net.pose(66,12.8667,-14.6667)});await b.evaluate(()=>{__net.activate();__net.pose(66,12.8667,-12.6667)});await b.waitForTimeout(350);
 for(let i=0;i<4;i++){await b.evaluate(()=>__net.fire());await b.waitForTimeout(180);if(await a.evaluate(()=>__net.state.hp===0))break;}
 await a.waitForFunction(()=>__net.state.hp<100,null,{timeout:7000});console.log('PASS server respawn and reverse-direction fireWeapon damage');
 // Force a socket loss: the browser client must reconnect with its resume token.
 const uid=await a.evaluate(()=>__net.client().uid);await a.evaluate(()=>__net.client().socket.close());await a.waitForFunction(uid=>__net.client()?.connected&&__net.client().uid===uid,uid,{timeout:15000});
 assert.equal(await a.evaluate(()=>__net.client().uid),uid);await b.waitForFunction(()=>__net.players.size===1);console.log('PASS automatic reconnect retains identity and restores the avatar');
 await b.evaluate(()=>leaveMultiplayerRoom());await a.waitForFunction(()=>__net.players.size===0);assert.equal(await b.evaluate(()=>__net.state.gameMode),'stationary');assert(!new URL(b.url()).searchParams.has('room'));assert.equal(await b.evaluate(()=>__net.state.hp),100);assert.deepEqual(errors,[]);console.log('PASS clean leave returns to solo, removes stale avatars, and has no uncaught page errors');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
