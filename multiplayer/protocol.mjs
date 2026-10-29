export const VERSION=1;
export const MAP_IDS=Object.freeze(['ascent','haven','summit']);
export const WEAPONS={vandal:{head:160,body:40,interval:102},phantom:{head:140,body:39,interval:90},odin:{head:95,body:38,interval:65},operator:{head:255,body:150,interval:1100},classic:{head:78,body:26,interval:155},melee:{head:75,body:75,interval:420},bladestorm:{head:150,body:50,interval:140}};
export const isWeapon=key=>typeof key==='string'&&Object.hasOwn(WEAPONS,key);
const ascentSpawn=team=>team==='attack'?{x:.6667,y:4.8667,z:-.8,yaw:.65}:{x:-129.9333,y:6.2,z:-26.6,yaw:-1.7};
const havenSpawn=team=>(team==='attack'?{x:-35.24,y:6.2,z:-23.2267,yaw:1.57}:{x:-169.5333,y:6.2,z:-39.28,yaw:-1.57});
export const spawn=(team,map='ascent')=>map==='summit'?(team==='attack'?{x:78.6667,y:4.8667,z:-10,yaw:0}:{x:82.3333,y:7.5333,z:-161,yaw:Math.PI}):map==='haven'?havenSpawn(team):ascentSpawn(team);
export const cleanText=(value,max=24)=>String(value??'').replace(/[<>"'&\u0000-\u001f]/g,'').trim().slice(0,max);
export const finite=(value,min=-500,max=500)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
export function validPose(p){return p&&finite(p.x)&&finite(p.y,-80,150)&&finite(p.z)&&finite(p.yaw,-1000,1000);}
export function applyDamage(player,damage){const absorbed=Math.min(player.shield,Math.ceil(damage*.66));return {shield:player.shield-absorbed,hp:Math.max(0,player.hp-(damage-absorbed))};}
export function validEndpoint(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}
