const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/ui/abilities/provenance.json'),'utf8'));
 assert.equal(manifest.icons.length,112);
 for(const icon of manifest.icons){
  const bytes=fs.readFileSync(path.join(__dirname,'../assets/ui/abilities',icon.file));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),icon.sha256);
 }
 const sage=Object.fromEntries(manifest.icons.filter(i=>i.agent==='sage').map(i=>[i.key,i.name]));
 assert.deepEqual(sage,{q:'Slow Orb',e:'Healing Orb',c:'Barrier Orb',x:'Resurrection'});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:1550}});
  await page.goto('http://127.0.0.1:8000/ability-icons.mjs');
  const result=await page.evaluate(async()=>{
   const {AGENTS}=await import('/multiplayer/agents.mjs');
   const {referencedAbilityIcon:icon}=await import('/ability-icons.mjs');
   document.body.innerHTML='';document.body.style='background:#14252b;color:white;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px';
   const results=[];
   for(const agent of Object.keys(AGENTS)){
    const card=document.createElement('div');card.style='padding:10px;border:1px solid #51636a';card.textContent=AGENTS[agent].name;
    for(const key of ['c','q','e','x']){
     const span=document.createElement('span');span.innerHTML=icon(agent,key);const svg=span.querySelector('svg');svg.style='width:43px;height:43px;margin:5px';
     const url=svg.querySelector('image').getAttribute('href');
     const image=new Image();image.src=url;await image.decode();
     results.push({agent,key,width:image.naturalWidth,model:svg.dataset.agent,url});card.appendChild(span);
    }
    document.body.appendChild(card);
   }
   return results;
  });
  assert.equal(result.length,116);assert(result.every(i=>i.width>0&&new URL(i.url).origin==='http://127.0.0.1:8000'));
  assert(result.filter(i=>i.agent==='phoenix').every(i=>i.model==='sage'&&i.url.includes('/sage-')));
  await page.screenshot({path:'/workspace/valo-original-ability-icons.png',fullPage:true});
  console.log('PASS 112 original PNG hashes, local image decoding, keyboard mapping and Sage identity; gallery rendered');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
