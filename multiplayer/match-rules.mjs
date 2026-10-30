// Regulation ends at 13; tied 12–12 and later scores require a two-round lead.
export function matchWinner(attack,defend){
 if(![attack,defend].every(n=>Number.isInteger(n)&&n>=0))return null;
 if(Math.max(attack,defend)<13||Math.abs(attack-defend)<2)return null;
 return attack>defend?'attack':'defend';
}
export const isOvertime=(attack,defend)=>attack>=12&&defend>=12;
// Sample once per match, never independently for individual joining players.
export function choosePublicMap(maps,previous=null,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 const pool=maps.filter(id=>id!==previous);const choices=pool.length?pool:maps;
 if(!choices.length)throw Error('No playable maps');
 return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];
}
