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
   const hooks=`window.__net={receive:receiveRoomRound,round:()=>roomRound,state,map:realMap,x:triggerUltimateX,fan:fireBladeVolley,equip:equipWeaponSlot,client:()=>roomSocket,players:remotePlayers,position:yawObject.position,push:pushMyNetworkState,fire:()=>{scene.updateMatrixWorld(true);camera.updateWorldMatrix(true,false);fireWeapon()},pose:(x,y,z)=>{yawObject.position.set(x,y,z);yawObject.rotation.y=0;pitchObject.rotation.x=0;playerVelocity.set(0,0,0);pushMyNetworkState(true)},activate:()=>{state.isLocked=true;state.inBuyMenu=false;document.getElementById('buy-menu-modal').classList.add('hidden');pushMyNetworkState(true)}};`;
   source=source.replace('    </script>\n</body>',hooks+'\n    </script>\n</body>');return route.fulfill({body:source,contentType:'text/html'});
  });
  await context.addInitScript(()=>{localStorage.setItem('valo-multiplayer-server','http://127.0.0.1:8790');window.__multiplayer_preferred_server='http://127.0.0.1:8790';window.__multiplayer_fallback_server='http://127.0.0.1:8790';});
  await page.goto('http://127.0.0.1:8000/index.html'+(i?'?map=haven':''));await page.waitForFunction(()=>window.__net?.map.ready,null,{timeout:150000});
  await page.evaluate(()=>openNetworkMenu());await page.locator('#input-server-url').fill('http://127.0.0.1:8790');await page.locator('#btn-save-server').click();
 }
 const [a,b]=pages;
 await a.evaluate(()=>joinQuickPublicLobby());await a.waitForFunction(()=>window.__net?.client()?.connected,null,{timeout:150000});
 await b.evaluate(()=>joinQuickPublicLobby());await b.waitForFunction(()=>window.__net?.client()?.connected,null,{timeout:150000});
 await Promise.all(pages.map(p=>p.waitForFunction(()=>__net.players.size===1,null,{timeout:150000})));
 const maps=await Promise.all(pages.map(p=>p.evaluate(()=>new URL(location.href).searchParams.get('map')||'ascent')));assert.equal(maps[0],maps[1]);
 for(const p of pages){assert.equal(await p.locator('#map-select').isEnabled(),false);assert.equal(await p.locator('#input-room-code').inputValue(),'PUBLIC');assert.equal(await p.evaluate(()=>__net.round().winTarget),13);}
 console.log('PASS public joins from Ascent and Haven reach the SAME server-selected map with round rules and disabled manual map selection');
 const result=await a.evaluate(()=>{
  const old=__net.round(),now=Date.now();__net.receive({...old,phase:'playing',scoreAttack:12,scoreDefend:12,serverNow:now});const overtime=document.getElementById('round-phase-label').textContent;
  __net.receive({...old,phase:'finished',matchWinner:'attack',scoreAttack:14,scoreDefend:12,nextAt:now+12000,serverNow:now});
  const read={overtime,ending:__net.state.roundEnding,visible:!document.getElementById('match-result-panel').classList.contains('hidden'),score:document.getElementById('match-result-text').textContent,countdown:document.getElementById('match-result-help').textContent,timer:document.getElementById('round-timer').textContent,rematch:!document.getElementById('btn-rematch').classList.contains('hidden')};__net.receive(old);return read;
 });
 assert(result.overtime.includes('OVERTIME'));assert(result.ending);assert(result.visible);assert(result.score.includes('14 : 12'));assert(result.countdown.includes('隨機'));assert.equal(result.timer,'結束');assert.equal(result.rematch,false);assert.deepEqual(errors,[]);
 console.log('PASS actual round UI shows overtime, final score and public random-map countdown; match end blocks local play and has no page errors');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
