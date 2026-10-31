import {cp, mkdir, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const target=fileURLToPath(new URL('../public/game/',import.meta.url));
const files=['index.html','ascent-map.js','weapon-models.js','first-person-view.js','ability-effects.js','clove-view.js','multiplayer/clove-rules.mjs','spike-model.js','spike-explosion.js','combat-effects.js','bot-navigation.js','spray.js','game-rules.mjs','shop-economy.mjs','movement-audio.mjs','shop.css','multiplayer-client.mjs','multiplayer-config.js','server-discovery.mjs','play-session.mjs','runtime-performance.mjs','karambit.js','karambit-rules.mjs','blade-storm.js','blade-storm-rules.mjs','agent-avatar.js','agent-preview.js','spectator-view.js','spectator-rules.mjs','multiplayer/agents.mjs','multiplayer/firearms.mjs','multiplayer/armor.mjs','multiplayer/map-sites.mjs','multiplayer/match-rules.mjs','multiplayer/barrier-rules.mjs','multiplayer/slow-rules.mjs','ice-audio.js','slow-projectile.js','firebase-config.js','assets','vendor'];
await mkdir(target,{recursive:true});
let sourceAvailable=true;
try {await access(path.join(root,'ascent-map.js'));}catch(e){if(e.code!=='ENOENT')throw e;sourceAvailable=false;}
if(sourceAvailable) for(const file of files) await cp(path.join(root,file),path.join(target,file),{recursive:true});
for(const file of ['index.html','ascent-map.js','weapon-models.js','first-person-view.js','ability-effects.js','clove-view.js','multiplayer/clove-rules.mjs','spike-model.js','spike-explosion.js','combat-effects.js','bot-navigation.js','spray.js','game-rules.mjs','assets/ascent/ascent.glb','assets/weapons/manifest.json','vendor/three.min.js'])await access(path.join(target,file));
console.log('Game assets ready');
