const{chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
const preferred='https://valonow.langcheng.uk',fallback='https://valo.09786593a.workers.dev';
for(const scenario of ['healthy','fallback','manual','other']){
 const ctx=await b.newContext(),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const saved=scenario==='other'?'https://private.example':fallback;
 await p.addInitScript(saved=>localStorage.setItem('valo-multiplayer-server',saved),saved);await p.route('https://**/*',r=>r.abort());await p.route('**/assets/**',r=>r.abort());
 let release;const gate=new Promise(r=>release=r),calls=[];
 for(const server of[preferred,fallback])await p.route(server+'/health',async r=>{calls.push(server);if(scenario==='manual')await gate;const bad=server===preferred&&scenario==='fallback';return r.fulfill({status:bad?404:200,contentType:bad?'text/html':'application/json',headers:{'access-control-allow-origin':'*'},body:bad?'<html>404</html>':JSON.stringify({ok:true,protocol:1,service:'valo-multiplayer'})})});
 await p.goto('http://127.0.0.1:8000/index.html');await p.waitForFunction(()=>typeof window.openNetworkMenu==='function');
 if(scenario==='manual'){
  await p.evaluate(()=>{document.getElementById('input-server-url').value='https://manual.example';document.getElementById('btn-save-server').click()});release();await p.waitForTimeout(150);assert.equal(await p.locator('#input-server-url').inputValue(),'https://manual.example');
 }else{const expected=scenario==='healthy'?preferred:scenario==='fallback'?fallback:saved;await p.waitForFunction(expected=>document.getElementById('input-server-url').value===expected&&(!expected.includes('valonow')||document.getElementById('network-feedback').textContent.includes('已連上')),expected);if(scenario==='other')assert.deepEqual(calls,[]);}
 assert.deepEqual(errors,[]);console.log('PASS discovery UI '+scenario);await ctx.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
