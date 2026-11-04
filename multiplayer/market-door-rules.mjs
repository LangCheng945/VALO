// Source Sunset gameplay primitive ABombsite_0_KingdomDoorRollUp, instance 35.
const S=4/3;
export const MARKET_DOOR=Object.freeze({id:'sunset-market',hp:400,duration:1600,bounds:{minX:-14.08746*S,maxX:-13.92268*S,minY:1.94976*S,maxY:6.16664*S,minZ:-10.09964*S,maxZ:-5.91129*S},buttons:[{x:-15*S,y:3.5*S,z:-10.8*S},{x:-13*S,y:3.5*S,z:-10.8*S}],range:3.8});
export function newMarketDoor(now=0){return{open:true,from:1,hp:MARKET_DOOR.hp,changedAt:now,revision:0};}
export function doorOpenness(d,now){if(d.hp<=0)return 1;const t=Math.max(0,Math.min(1,(now-d.changedAt)/MARKET_DOOR.duration));return d.from+((d.open?1:0)-d.from)*t;}
export function panelBounds(d,now){const b=MARKET_DOOR.bounds,open=doorOpenness(d,now);return{...b,minY:b.minY+(b.maxY-b.minY)*open};}
export function inDoorway(p,padding=.45){const b=MARKET_DOOR.bounds;return p.x>=b.minX-padding&&p.x<=b.maxX+padding&&p.z>=b.minZ-padding&&p.z<=b.maxZ+padding&&p.y>=b.minY-.1&&p.y-2.2<=b.maxY;}
export function nearDoorButton(p){return MARKET_DOOR.buttons.some(b=>Math.hypot(p.x-b.x,p.y-b.y,p.z-b.z)<=MARKET_DOOR.range);}
export function doorRay(d,start,end,now){if(d.hp<=0||doorOpenness(d,now)>.995)return null;const b=panelBounds(d,now);for(const key of ['minX','minY','minZ'])b[key]-=.025;for(const key of ['maxX','maxY','maxZ'])b[key]+=.025;let lo=0,hi=1;for(const [axis,min,max]of [['x',b.minX,b.maxX],['y',b.minY,b.maxY],['z',b.minZ,b.maxZ]]){const delta=end[axis]-start[axis];if(Math.abs(delta)<1e-8){if(start[axis]<min||start[axis]>max)return null;continue;}let a=(min-start[axis])/delta,c=(max-start[axis])/delta;if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi+1e-4)return null;}return lo>=0&&lo<=1.0001?Math.min(1,lo):null;}
