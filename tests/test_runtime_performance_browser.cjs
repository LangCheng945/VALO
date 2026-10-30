const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const {promisify}=require('util'),run=promisify(require('child_process').execFile),baseline=!!process.env.PERF_BASELINE;
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:2}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',async r=>{try{const {stdout}=await run('curl',['-fsSL',r.request().url()],{encoding:'buffer',maxBuffer:8e6});await r.fulfill({body:stdout,contentType:r.request().url().includes('fonts.googleapis.com')?'text/css':r.request().url().includes('fonts.gstatic.com')?'font/woff2':'text/javascript',headers:{'access-control-allow-origin':'*'}})}catch{await r.abort()}});
 await page.route('**/index.html',r=>{
  let source=baseline?require('child_process').execFileSync('git',['show',(process.env.PERF_BASELINE_REF||'cd58c79')+':index.html'],{cwd:path.join(__dirname,'..'),encoding:'utf8'}):fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  source=source.replace(/renderer\.render\(scene,\s*camera\);/g,'').replace('            updateBotsAndVFX(dt);','');
  const hooks=`window.__perf={state,map:realMap,renderer,players:remotePlayers,receive:receivePlayerSnapshot,vfx:updateBotsAndVFX,pos:yawObject.position,budget:typeof renderBudget==='undefined'?null:renderBudget,render:()=>{scene.updateMatrixWorld(true);realMap.updateCulling(camera);renderer.render(scene,camera)}};`;
  return r.fulfill({body:source.replace('    </script>\n</body>',hooks+'\n    </script>\n</body>'),contentType:'text/html'});
 });
 await page.goto('http://127.0.0.1:8000/index.html');await page.waitForFunction(()=>window.__perf?.map.ready,null,{timeout:150000});
 const initialPixels=await page.evaluate(()=>__perf.renderer.domElement.width*__perf.renderer.domElement.height);
 const mutations=await page.evaluate(()=>{
  toggleBotsInMatch(false);const h=__perf,p={uid:'profile-peer',name:'Peer',team:'defend',agent:'jett',hp:100,shield:50,kills:0,deaths:0,weapon:'vandal',x:h.pos.x+3,y:h.pos.y,z:h.pos.z,yaw:0};h.receive([p]);
  const ids=['lobby-players-bar','enemy-roster-strip','ally-roster-strip','sb-list-attack','sb-list-defend','hud-hp','hud-shield'],observer=new MutationObserver(()=>{});
  ids.forEach(id=>observer.observe(document.getElementById(id),{subtree:true,childList:true,attributes:true,characterData:true}));
  for(let i=0;i<100;i++)h.receive([{...p,x:p.x+i*.001}]);const count=observer.takeRecords().length;observer.disconnect();return count;
 });
 if(!baseline)assert.equal(mutations,0);
 // A real health/death, identity or team change must still repaint the cached UI.
 await page.evaluate(()=>{const p=[...__perf.players.values()][0].data;__perf.receive([{...p,name:'Changed',hp:0,team:'attack'}])});
 assert((await page.locator('#lobby-players-bar').textContent()).includes('Changed'));
 assert((await page.locator('#sb-list-attack').textContent()).includes('DEAD'));
 assert((await page.locator('#ally-roster-strip').textContent()).includes('CH'));
 const groundCalls=await page.evaluate(()=>{
  const h=__perf,p=[...h.players.values()][0].data;h.receive([{...p,hp:100}]);h.state.isLocked=true;h.state.inBuyMenu=false;
  const original=h.map.getGroundHeight;let count=0;h.map.getGroundHeight=function(...args){count++;return original.apply(this,args)};
  for(let i=0;i<120;i++)h.vfx(1/60);h.map.getGroundHeight=original;h.state.isLocked=false;h.state.inBuyMenu=true;return count;
 });
 if(!baseline)assert(groundCalls<=16,groundCalls);
 console.log(JSON.stringify({baseline,initialPixels,mutationsFor100PositionSnapshots:mutations,groundQueriesFor120Frames:groundCalls}));
 if(!baseline){
  await page.locator('#render-quality').selectOption('performance');const low=await page.evaluate(()=>__perf.renderer.domElement.width*__perf.renderer.domElement.height);assert(low<=923000);
  await page.evaluate(()=>{__perf.state.inBuyMenu=false;document.getElementById('buy-menu-modal').classList.add('hidden');__perf.render()});await page.screenshot({path:'/tmp/valo-performance-mode.png'});
  await page.locator('#render-quality').evaluate(el=>{el.value='quality';el.dispatchEvent(new Event('change'))});assert.equal(await page.evaluate(()=>__perf.renderer.getPixelRatio()),1.5);
  await page.setViewportSize({width:1000,height:700});await page.waitForFunction(()=>__perf.renderer.domElement.width===1500);assert.equal(await page.evaluate(()=>__perf.renderer.domElement.width),1500);
  await page.reload();await page.waitForFunction(()=>window.__perf);assert.equal(await page.locator('#render-quality').inputValue(),'quality');
  console.log('PASS pixel budgets, live mode switching, resize, persistence and UI changes');
 }
 assert.deepEqual(errors,[]);console.log('PASS no uncaught browser errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
