import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomBytes} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {RoomRuntime} from './runtime.mjs';
import {MAP_IDS} from '../multiplayer/protocol.mjs';
import {FEATURES} from '../multiplayer/skill-events.mjs';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.glb':'model/gltf-binary','.bin':'application/octet-stream','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.ktx2':'image/ktx2'};
export function lanAddresses(port,protocol='http:',host='0.0.0.0'){const addresses=new Set();if(!['0.0.0.0','::'].includes(host))addresses.add(host.includes(':')?'['+host+']':host);else{addresses.add('127.0.0.1');for(const records of Object.values(os.networkInterfaces()))for(const r of records||[])if(r.family==='IPv4'&&!r.internal)addresses.add(r.address);}return [...addresses].map(ip=>`${protocol}//${ip}:${port}`);}
export async function startLanServer({host='0.0.0.0',port=8787,root=process.cwd(),cert,key,allowedOrigins=[]}={}){
 root=fs.realpathSync(root);if(!fs.existsSync(path.join(root,'index.html')))throw Error('找不到遊戲 index.html；請使用 --root 指定遊戲資料夾');if(Boolean(cert)!==Boolean(key))throw Error('TLS 需要同時提供 --cert 與 --key');
 const protocol=cert?'https:':'http:',rooms=new Map(),stats={transport:'lan',sqlWrites:0,sentBytes:0,receivedBytes:0,sentPackets:0,suppressedSnapshots:0,deltaSnapshots:0},creations=new Map();let closing=false;
 const originAllowed=req=>{const origin=req.headers.origin;if(!origin)return true;return origin===`${protocol}//${req.headers.host}`||allowedOrigins.includes(origin);};
 const json=(res,status,body,req)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(req?.headers.origin&&originAllowed(req)?{'Access-Control-Allow-Origin':req.headers.origin,'Vary':'Origin'}:{})});res.end(JSON.stringify(body));};
 const handler=async(req,res)=>{try{const url=new URL(req.url,`${protocol}//${req.headers.host||'localhost'}`);
  if(url.pathname==='/health'){json(res,200,{ok:true,protocol:1,service:'valo-multiplayer',transport:'lan',maps:MAP_IDS,features:[...FEATURES,'lan','lan-delta-1'],sqlWrites:0},req);return;}
  if(url.pathname==='/lan-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end('window.__lan_hosted=true;');return;}
  if(!originAllowed(req)){json(res,403,{error:'ORIGIN_NOT_ALLOWED'},req);return;}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':req.headers.origin||`${protocol}//${req.headers.host}`,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});res.end();return;}
  if(req.method==='POST'&&url.pathname==='/rooms'){
   if(closing||rooms.size>=100){json(res,503,{error:'SERVER_BUSY'},req);return;}const ip=req.socket.remoteAddress,at=Date.now(),recent=(creations.get(ip)||[]).filter(t=>at-t<60000);if(recent.length>=30){json(res,429,{error:'CREATE_RATE_LIMIT'},req);return;}recent.push(at);creations.set(ip,recent);
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096){json(res,413,{error:'BODY_TOO_LARGE'},req);return;}}let body;try{body=JSON.parse(raw);}catch{json(res,400,{error:'INVALID_JSON'},req);return;}if(!body||typeof body!=='object'||Array.isArray(body)||body.map&&!MAP_IDS.includes(body.map)){json(res,400,{error:'INVALID_MAP'},req);return;}
   const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code;do{code=[...randomBytes(6)].map(b=>chars[b%chars.length]).join('');}while(rooms.has(code));const runtime=new RoomRuntime(code,stats,code=>{rooms.get(code)?.dispose();rooms.delete(code);});rooms.set(code,runtime);const map=body.map||'ascent',mode=body.mode==='practice'?'practice':'rounds',duration=[0,60,90,120,180,300,600].includes(body.duration)?body.duration:300;await runtime.create({map,mode,duration});json(res,201,{code,map,mode,protocol:1,transport:'lan'},req);return;
  }
  if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'METHOD_NOT_ALLOWED'},req);return;}
  const decoded=decodeURIComponent(url.pathname);if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').some(p=>p==='..'||p.startsWith('.'))){json(res,403,{error:'FORBIDDEN'},req);return;}
  const relative=decoded==='/'?'index.html':decoded.slice(1);const ext=path.extname(relative).toLowerCase();if(!mime[ext]||!(!relative.includes('/')||relative.startsWith('assets/')||relative.startsWith('vendor/')||/^multiplayer\/[a-z-]+\.mjs$/.test(relative))||relative==='multiplayer/worker.mjs'){json(res,404,{error:'NOT_FOUND'},req);return;}
  const file=path.resolve(root,relative);let real;try{real=await fs.promises.realpath(file);}catch{json(res,404,{error:'NOT_FOUND'},req);return;}if(!real.startsWith(root+path.sep)){json(res,403,{error:'FORBIDDEN'},req);return;}const stat=await fs.promises.stat(real);if(!stat.isFile()){json(res,404,{error:'NOT_FOUND'},req);return;}
  if(relative==='index.html'){let html=await fs.promises.readFile(real,'utf8');html=html.replace('<head>','<head><script src="/lan-config.js"></script>').replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/g,'');res.writeHead(200,{'Content-Type':mime[ext],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:html);return;}
  const etag='"'+stat.size+'-'+Math.trunc(stat.mtimeMs)+'"';if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}res.writeHead(200,{'Content-Type':mime[ext],'Content-Length':stat.size,'Cache-Control':'public, max-age=0, must-revalidate','ETag':etag});if(req.method==='HEAD')res.end();else fs.createReadStream(real).on('error',()=>res.destroy()).pipe(res);
 }catch(e){if(!res.headersSent)json(res,500,{error:'SERVER_ERROR'});else res.destroy();console.error('LAN HTTP:',e.message);}};
 const server=cert?https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},handler):http.createServer(handler);const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:{threshold:1024,serverNoContextTakeover:true,clientNoContextTakeover:true}});
 server.on('upgrade',(req,socket,head)=>{let pathname;try{pathname=new URL(req.url,'http://lan').pathname;}catch{socket.destroy();return;}const match=pathname.match(/^\/rooms\/([A-Z2-9]{6})$/),runtime=match&&rooms.get(match[1]);if(closing||!originAllowed(req)||!runtime?.room.meta||runtime.room.sockets().length>=10){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}runtime.run(()=>new Promise(resolve=>{if(runtime.room.sockets().length>=10){socket.destroy();resolve();return;}wss.handleUpgrade(req,socket,head,raw=>{const wrapperPromise=runtime.attach(raw,{admitted:true});resolve();wrapperPromise.catch(e=>{console.error(e.message);raw.close(1011,'Admission failed');});});})).catch(()=>socket.destroy());});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});const actualPort=server.address().port;
 return {server,rooms,stats,port:actualPort,urls:lanAddresses(actualPort,protocol,host),async close(){if(closing)return;closing=true;for(const room of rooms.values())room.dispose();await new Promise(resolve=>{const timeout=setTimeout(()=>{for(const raw of wss.clients)raw.terminate();server.closeAllConnections();resolve();},600);server.close(()=>{clearTimeout(timeout);resolve();});});wss.close();rooms.clear();}};
}
