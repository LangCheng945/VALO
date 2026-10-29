// Shared dimensions, timing and rotated collision math for the client and Worker.
export const BARRIER=Object.freeze({segments:4,width:1.7,height:3.6,depth:1.2,initialHP:400,maxHP:800,fortifyMs:3300,lifetimeMs:40000,range:10});
export function segmentPosition(w,index){const offset=(index-1.5)*BARRIER.width;return{x:w.x+Math.cos(w.yaw)*offset,y:w.y,z:w.z-Math.sin(w.yaw)*offset};}
export function insideSegment(w,index,p,padding=0){const c=segmentPosition(w,index),dx=p.x-c.x,dz=p.z-c.z;return Math.abs(Math.cos(w.yaw)*dx-Math.sin(w.yaw)*dz)<=BARRIER.width/2+padding&&Math.abs(Math.sin(w.yaw)*dx+Math.cos(w.yaw)*dz)<=BARRIER.depth/2+padding&&p.y>=w.y-padding&&p.y<=w.y+BARRIER.height+padding;}
export function advanceBarrier(w,now){if(now>=w.createdAt+BARRIER.lifetimeMs){w.hp.fill(0);return;}if(!w.fortified&&now>=w.createdAt+BARRIER.fortifyMs){w.fortified=true;w.hp=w.hp.map(hp=>hp>0?BARRIER.maxHP:0);}}
export function distanceToSegmentXZ(w,index,p){const c=segmentPosition(w,index),dx=p.x-c.x,dz=p.z-c.z,lx=Math.cos(w.yaw)*dx-Math.sin(w.yaw)*dz,lz=Math.sin(w.yaw)*dx+Math.cos(w.yaw)*dz;return Math.hypot(Math.max(0,Math.abs(lx)-BARRIER.width/2),Math.max(0,Math.abs(lz)-BARRIER.depth/2));}
