export const ARMORS=Object.freeze({none:{points:0,cost:0,pool:0,absorb:0},light:{points:25,cost:400,pool:0,absorb:.66},heavy:{points:50,cost:1000,pool:0,absorb:.66},regen:{points:25,cost:650,pool:25,absorb:1}});
// User-requested 25 + 25 reserve, distinct from the pinned reference's 25 + 50.
export const REGEN_DELAY=3000,REGEN_RATE=10;
export function equipArmor(p,type){if(!Object.hasOwn(ARMORS,type))return false;const a=ARMORS[type];Object.assign(p,{armorType:type,shield:a.points,shieldReserve:a.pool,regenReadyAt:0,regenTickAt:0});return true;}
export function markArmorDamage(p,now){if(p.armorType==='regen'){p.regenReadyAt=now+REGEN_DELAY;p.regenTickAt=now;}}
export function tickArmor(p,now){
 if(p.armorType!=='regen'||p.hp<=0||!(p.shieldReserve>0)||p.shield>=25)return false;
 const start=Math.max(p.regenTickAt||now,p.regenReadyAt||now);p.regenTickAt=now;if(now<start)return true;
 const amount=Math.min(25-p.shield,p.shieldReserve,Math.max(0,(now-start)/1000)*REGEN_RATE);p.shield+=amount;p.shieldReserve-=amount;if(Math.abs(p.shield-25)<1e-8)p.shield=25;if(p.shieldReserve<1e-8)p.shieldReserve=0;return p.shield<25&&p.shieldReserve>0;
}
export function armorAbsorb(p,damage){return Math.min(p.shield||0,Math.ceil(damage*(ARMORS[p.armorType]?.absorb??.66)));}
