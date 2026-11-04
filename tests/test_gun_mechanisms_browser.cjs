const{chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');const{promisify}=require('util'),run=promisify(require('child_process').execFile);
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:.8}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGLProgram/.test(m.text()))errors.push(m.text())});await page.route('https://**/*',async r=>{try{const{stdout}=await run('curl',['--max-time','20','-fsSL',r.request().url()],{encoding:'buffer',maxBuffer:8e6});await r.fulfill({body:stdout,contentType:r.request().url().includes('fonts.googleapis.com')?'text/css':r.request().url().includes('fonts.gstatic.com')?'font/woff2':'text/javascript',headers:{'access-control-allow-origin':'*'}})}catch{await r.abort()}});
await page.route('**/index.html',r=>{let s=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').replace(/renderer\.render\(scene,\s*camera\);/g,'').replace('            updateViewmodelAnimations(dt, isMoving);','').replace('            tickTraining(dt);','');const hook=`window.__fp={state,bots,trainingStep:(b,dt,p)=>stepTrainingStrafe(b,dt,p,{getGroundHeight},eye=>checkPlayerCollision(eye,0)),room:v=>{currentRoomId=v},map:realMap,gun:gunGroup,hands:()=>firstPersonHands,mag:()=>gunMagazineMesh,equip:equipWeaponSlot,update:updateViewmodelAnimations,reload:reloadWeapon,inspect:triggerWeaponInspect,fire:fireWeapon,scope:setScope,activate:()=>{state.isLocked=true;state.inBuyMenu=false;document.getElementById('buy-menu-modal').classList.add('hidden')},motion:weaponMotionRoot,draw:t=>{weaponDrawElapsed=t*weaponDrawDuration(state.weaponKey);updateViewmodelAnimations(0,false)},pose:t=>{weaponDrawElapsed=1;state.isReloading=t>0;state.reloadTimer=t*(WEAPONS[state.weaponKey].reloadTimeMs||1350)/1000;updateViewmodelAnimations(0,false);scene.updateMatrixWorld(true)},render:()=>{scene.updateMatrixWorld(true);realMap.updateCulling(camera);renderer.render(scene,camera)}};`;s=s.replace('    </script>\n</body>',hook+'\n    </script>\n</body>');return r.fulfill({body:s,contentType:'text/html'})});
await page.goto('http://127.0.0.1:8000/index.html');await page.waitForFunction(()=>window.__fp?.map.ready,null,{timeout:150000});await page.evaluate(()=>{toggleBotsInMatch(false);setTrainerDuration('0');__fp.activate();for(const key of ['vandal','phantom','guardian','sheriff','ghost','operator'])setWeaponSkin(key,'base')});
const keys=['classic','operator','phantom','ghost','guardian','sheriff','marshal'];
const report=await page.evaluate(async keys=>{
 const{updateMechanism}=await import('./gun-mechanisms.js?v=fullarms1'),out={};
 for(const key of keys){
  __fp.equip(key);let mesh;for(let i=0;i<200;i++){mesh=__fp.gun.getObjectByName('detailed-'+key);if(mesh)break;await new Promise(r=>setTimeout(r,50));}
  if(!mesh?.isSkinnedMesh)throw Error('Missing gun rig: '+key);
  const pos=mesh.geometry.attributes.position,rig=mesh.userData.mechanism,step=Math.max(1,Math.floor(pos.count/180)),ids=[];for(let i=0;i<pos.count;i+=step)ids.push(i);
  const pose=()=>{mesh.updateMatrixWorld(true);mesh.skeleton.update();return ids.map(i=>mesh.boneTransform(i,new THREE.Vector3().fromBufferAttribute(pos,i)));};
  updateMechanism(mesh,Infinity);const rest=pose();let restError=0;for(let j=0;j<ids.length;j++)restError=Math.max(restError,rest[j].distanceTo(new THREE.Vector3().fromBufferAttribute(pos,ids[j])));
  let motion=0,finite=true;for(const t of [.05,.10,.15,.20,.30,.40,.50]){updateMechanism(mesh,t);for(const [j,p]of pose().entries()){finite&&=p.toArray().every(Number.isFinite);motion=Math.max(motion,p.distanceTo(rest[j]));}}
  updateMechanism(mesh,Infinity);const reset=pose(),resetError=Math.max(...reset.map((p,i)=>p.distanceTo(rest[i])));
  __fp.state.lastShotTime=-10000;const before=__fp.state.mag;__fp.fire();__fp.update(0,false);const accepted=mesh.userData.firedAt>0,ammo=before-__fp.state.mag;
  mesh.userData.firedAt=performance.now()-60;__fp.update(0,false);
  out[key]={vertices:pos.count,bones:rig.bones.length,restError,resetError,motion,finite,accepted,ammo};
 }
 return out;
},keys);
for(const key of keys){const r=report[key];assert(r.finite);assert(r.restError<.001,key+' bind pose deforms the installed mesh');assert(r.resetError<.00001,key+' did not reset');assert(r.motion>.01,key+' has no visible vertex motion');assert(r.motion<30,key+' implausible deformation');assert(r.accepted);assert.equal(r.ammo,1);assert.equal(r.vertices,JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/weapons/manifest.json')))[key].vertices);}
console.log('PASS all seven source rigs: exact rest pose, visible vertex motion, reset and accepted shot/ammo',report);
for(const key of ['phantom','ghost','guardian','sheriff','marshal']){
 await page.evaluate(key=>__fp.equip(key),key);await page.waitForFunction(key=>!!__fp.gun.getObjectByName('detailed-'+key),key);
 await page.evaluate(()=>{__fp.pose(0);__fp.render()});await page.screenshot({path:'/tmp/valo-mechanism-'+key+'.png'});
 if(key==='marshal'){await page.evaluate(()=>__fp.scope(true));assert.equal(await page.evaluate(()=>__fp.gun.visible),false);await page.evaluate(()=>__fp.scope(false));}
}
await page.evaluate(()=>{__fp.equip('vandal')});await page.waitForFunction(()=>!!__fp.gun.getObjectByName('detailed-vandal'));
assert.equal(await page.evaluate(()=>__fp.gun.getObjectByName('detailed-vandal').geometry.attributes.position.count),3856);
assert.equal(await page.evaluate(()=>!!__fp.gun.getObjectByName('detailed-vandal').isSkinnedMesh),true);
await page.evaluate(()=>{__fp.equip('ghost');__fp.equip('sheriff');__fp.equip('marshal');__fp.equip('phantom')});await page.waitForFunction(()=>!!__fp.gun.getObjectByName('detailed-phantom'));await page.evaluate(()=>{__fp.state.mag=1;__fp.reload();__fp.pose(.5);__fp.equip('ghost')});await page.waitForFunction(()=>!!__fp.gun.getObjectByName('detailed-ghost'));assert.equal(await page.evaluate(()=>__fp.state.isReloading),false);await page.evaluate(()=>{__fp.pose(0);__fp.render()});
assert.deepEqual(errors,[]);console.log('PASS source skins/composite parts, Marshal ADS, fixed Gaia, rapid swaps, reload cancellation and shaders');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
