// Shared projectile/field constants. Map collisions remain on the throwing client.
export const SLOW=Object.freeze({speed:20,gravity:16,bounce:.65,radius:.16,fieldRadius:5,durationMs:7000,flightMs:5000,maxRange:130,multiplier:.5,bloomMs:400});
export function fieldRadius(field,now=Date.now()){return SLOW.fieldRadius*Math.min(1,Math.max(0,(now-field.createdAt)/SLOW.bloomMs));}
export function slowAt(point,fields,now=Date.now(),feetOffset=2.2){const feet=point.y-feetOffset;return fields.some(f=>now<f.expiresAt&&feet>=f.y-.3&&feet<=f.y+.65&&Math.hypot(point.x-f.x,point.z-f.z)<fieldRadius(f,now))?SLOW.multiplier:1;}
export function bounceVelocity(v,n){const dot=v.x*n.x+v.y*n.y+v.z*n.z;return{x:(v.x-2*dot*n.x)*SLOW.bounce,y:(v.y-2*dot*n.y)*SLOW.bounce,z:(v.z-2*dot*n.z)*SLOW.bounce};}
