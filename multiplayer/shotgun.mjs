// One bounded pellet sequence per trigger pull; each pellet can damage at most once.
export function acceptPellet(p,m,now,weapon){
 const v=m.pellet;if(!v||weapon.pellets<=1||typeof v.id!=='string'||!/^[a-f0-9-]{36}$/.test(v.id)||v.count!==weapon.pellets||!Number.isInteger(v.index)||v.index<0||v.index>=v.count)return false;
 if(v.index===0){if(p.pelletBatch?.id===v.id||now-p.lastShot<weapon.interval*.8)return false;p.pelletBatch={id:v.id,weapon:p.weapon,next:1,expires:now+300};return true;}
 const b=p.pelletBatch;if(!b||b.id!==v.id||b.weapon!==p.weapon||b.next!==v.index||now>b.expires)return false;b.next++;return true;
}
