import path from 'node:path';
import fs from 'node:fs';
import {startLanServer} from './server.mjs';
const options={};
for(let i=2;i<process.argv.length;i++){const flag=process.argv[i];if(flag==='--help'){console.log('ValoNow LAN: --host 0.0.0.0 --port 8787 --root <game folder> [--cert server.pem --key server-key.pem] [--allow-origin URL]');process.exit(0);}const name={'--host':'host','--port':'port','--root':'root','--cert':'cert','--key':'key','--allow-origin':'allowedOrigins'}[flag];if(!name||!process.argv[i+1])throw Error('Unknown or missing argument: '+flag);const value=process.argv[++i];if(name==='allowedOrigins')(options[name]||=[]).push(value);else options[name]=name==='port'?Number(value):value;}
if(options.port!==undefined&&(!Number.isInteger(options.port)||options.port<0||options.port>65535))throw Error('Port must be 0–65535');
const bundled=path.join(path.dirname(process.execPath),'game');options.root ||= process.env.VALONOW_ROOT||(fs.existsSync(path.join(bundled,'index.html'))?bundled:process.cwd());
async function main(){try{const app=await startLanServer(options);console.log('\nValoNow LAN Server · 記憶體同步 · 不使用 Cloudflare SQL\n');for(const url of app.urls)console.log('開啟遊戲：'+url+'/?network=lan');console.log('\n同學使用房主的區域網路 IP 網址，選擇 LAN，輸入同一房號。\n監聽 '+(options.host||'0.0.0.0')+':'+app.port+'；Ctrl+C 關閉。\n若學校封鎖裝置互連，請聯絡管理員；程式不會修改防火牆。');let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await app.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);}catch(error){console.error('無法啟動 LAN Server：'+error.message);process.exitCode=1;}

}
main();
