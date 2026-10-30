// Permit one bounded simultaneous knife fan, without weakening firearm fire-rate checks.
export function acceptBladeVolley(player,message,now){
 const v=message.volley;if(!v)return false;
 if(player.weapon!=='bladestorm'||typeof v.id!=='string'||!/^[a-f0-9-]{36}$/.test(v.id)||!Number.isInteger(v.count)||v.count<1||v.count>5||!Number.isInteger(v.index)||v.index<0||v.index>=v.count)return false;
 if(v.index===0){
  if(player.volley?.id===v.id||now-player.lastShot<112)return false;
  player.volley={id:v.id,count:v.count,next:1,expires:now+500};return true;
 }
 const pending=player.volley;if(!pending||now>pending.expires||pending.id!==v.id||pending.count!==v.count||pending.next!==v.index)return false;
 pending.next++;return true;
}
