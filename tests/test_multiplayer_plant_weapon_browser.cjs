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
   const hooks=`window.__net={spike:()=>networkSpike,round:()=>roomRound,corpses,explosion:spikeExplosion,move:moveState,ground:()=>{resetMovementInput();yawObject.position.copy(realMap.safePoint(-66,-60,5));playerVelocity.set(0,0,0);canJump=true;pushMyNetworkState(true);return yawObject.position.toArray();},escape:()=>{placePlayerAtSpawn();pushMyNetworkState(true);},state,map:realMap,x:triggerUltimateX,fan:fireBladeVolley,equip:equipWeaponSlot,client:()=>roomSocket,players:remotePlayers,position:yawObject.position,push:pushMyNetworkState,fire:()=>{scene.updateMatrixWorld(true);camera.updateWorldMatrix(true,false);fireWeapon()},pose:(x,y,z)=>{yawObject.position.set(x,y,z);yawObject.rotation.y=0;pitchObject.rotation.x=0;playerVelocity.set(0,0,0);pushMyNetworkState(true)},activate:()=>{state.isLocked=true;state.inBuyMenu=false;document.getElementById('buy-menu-modal').classList.add('hidden');pushMyNetworkState(true)}};`;
   source=source.replace('    </script>\n</body>',hooks+'\n    </script>\n</body>');return route.fulfill({body:source,contentType:'text/html'});
  });
  await context.addInitScript(()=>{localStorage.setItem('valo-multiplayer-server','http://127.0.0.1:8790');window.__multiplayer_preferred_server='http://127.0.0.1:8790';window.__multiplayer_fallback_server='http://127.0.0.1:8790';});
  await page.goto('http://127.0.0.1:8000/index.html');await page.waitForFunction(()=>window.__net?.map.ready,null,{timeout:150000});
  await page.evaluate(()=>openNetworkMenu());await page.locator('#input-server-url').fill(process.env.VALO_TEST_SERVER||'http://127.0.0.1:8830');await page.locator('#btn-save-server').click();
 }
 const [a,b]=pages;
 await a.getByRole('button',{name:'+ 建立好友房間',exact:true}).click();await a.waitForFunction(()=>__net.client()?.connected);const code=await a.locator('#input-room-code').inputValue();await b.locator('#input-room-code').fill(code);await b.locator('#input-room-code').press('Enter');await b.waitForFunction(()=>__net.client()?.connected);await a.waitForFunction(()=>__net.players.size===1);
 for(const p of pages)await p.evaluate(()=>{document.activeElement?.blur();__net.activate();});
 await a.waitForFunction(()=>__net.round()?.phase==='playing'&&__net.spike()?.carrierUid===__net.client().uid);await a.keyboard.press('KeyG');await a.waitForFunction(()=>__net.spike()?.phase==='dropped');await b.waitForFunction(()=>__net.spike()?.phase==='dropped');
 await a.waitForTimeout(1300);await a.keyboard.press('KeyF');await a.waitForFunction(()=>__net.spike()?.carrierUid===__net.client().uid);console.log('PASS real G drops and F picks up the one synchronized Spike');
 await a.evaluate(()=>__net.ground());await b.evaluate(()=>__net.ground());await a.keyboard.down('Digit4');await a.waitForFunction(()=>__net.spike()?.action?.kind==='plant');await a.waitForTimeout(300);await a.keyboard.up('Digit4');await a.waitForFunction(()=>!__net.spike()?.action);assert.equal(await a.evaluate(()=>__net.state.holdingSpike),false);
 await b.evaluate(()=>__net.escape());const aborted=await a.evaluate(()=>{__net.state.lastShotTime=-10000;const before=__net.state.mag;__net.fire();return before-__net.state.mag;});assert.equal(aborted,1);await b.evaluate(()=>__net.ground());
 await a.keyboard.down('Digit4');await a.waitForFunction(()=>__net.spike()?.phase==='planted',null,{timeout:12000});await a.keyboard.up('Digit4');await b.waitForFunction(()=>__net.spike()?.phase==='planted');
 await b.evaluate(()=>__net.escape());await a.waitForFunction(()=>!__net.state.holdingSpike&&!__net.state.spikeAction);const ammo=await a.evaluate(()=>{__net.state.lastShotTime=-10000;const before=__net.state.mag;__net.fire();return before-__net.state.mag;});assert.equal(ammo,1);await b.waitForFunction(()=>__net.state.hp>0);assert.deepEqual(errors,[]);console.log('PASS two real browser clients: cancelled and completed network planting both restore firearm input without selecting another weapon');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
