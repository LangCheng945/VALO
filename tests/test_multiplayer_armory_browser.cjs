const {confirmAgentIfNeeded}=require('./browser-entry.cjs');
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
 await a.getByRole('button',{name:'+ 建立好友房間',exact:true}).click();await a.waitForFunction(()=>__net.client()?.connected);const code=await a.locator('#input-room-code').inputValue();await b.locator('#input-room-code').fill(code);await b.locator('#input-room-code').press('Enter');await b.waitForFunction(()=>__net.client()?.connected);await a.waitForFunction(()=>__net.players.size===1);
 for(const p of pages)await p.evaluate(()=>{document.activeElement?.blur();setMenuView('buy');});
 await a.locator('#shield-card-regen').click();await a.waitForFunction(()=>__net.state.armorType==='regen'&&__net.state.shieldReserve===25);
 await b.locator('#wpn-card-ghost').click();await b.waitForFunction(()=>__net.state.secondaryWeaponKey==='ghost');assert.equal(await b.evaluate(()=>__net.state.primaryWeaponKey),'vandal');
 await a.locator('#btn-start-combat').click();await confirmAgentIfNeeded(a);await b.locator('#btn-start-combat').click();await confirmAgentIfNeeded(b);for(const p of pages)await p.evaluate(()=>{document.activeElement?.blur();__net.activate();});
 await a.evaluate(()=>__net.pose(.6667,4.8667,-2.8));await b.evaluate(()=>__net.pose(.6667,4.8667,-.8));await b.waitForTimeout(400);await a.waitForFunction(()=>[...__net.players.values()][0].appearance.gun?.name==='detailed-ghost');await b.evaluate(()=>__net.fire());await a.waitForFunction(()=>__net.state.hp<100&&__net.state.hp>0&&__net.state.shield===0);
 const hp=await a.evaluate(()=>__net.state.hp);await a.evaluate(()=>{__net.state.shield=50;__net.state.shieldReserve=999;__net.push(true);});await a.waitForFunction(()=>__net.state.shield<25&&__net.state.shieldReserve<=25);
 await a.waitForFunction(()=>__net.state.shield===25&&__net.state.shieldReserve===0,null,{timeout:10000});assert.equal(await a.evaluate(()=>__net.state.hp),hp);await b.waitForFunction(()=>[...__net.players.values()][0].data.shield===25&&[...__net.players.values()][0].data.shieldReserve===0);assert.deepEqual(errors,[]);
 console.log('PASS real buy buttons equip server regen armor and Ghost sidearm without replacing the rifle');console.log('PASS actual Ghost raycast damages the other client, remote model is Ghost, fabricated shield/reserve are rejected, server regen spends exactly 25 and never heals HP');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
