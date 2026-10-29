import{SLOW,bounceVelocity}from'./multiplayer/slow-rules.mjs';
const T=globalThis.THREE;
// Swept microsteps avoid skipping thin walls at low frame rates.
export function stepSlowProjectile(f,dt,colliders){
 const steps=Math.max(1,Math.ceil(Math.min(dt,.1)*120)),h=Math.min(dt,.1)/steps;
 for(let i=0;i<steps;i++){
  f.velocity.y-=SLOW.gravity*h;const movement=f.velocity.clone().multiplyScalar(h),length=movement.length();if(length<1e-8)continue;
  const direction=movement.clone().normalize(),ray=new T.Raycaster(f.mesh.position,direction,0,length+SLOW.radius),hit=ray.intersectObjects(colliders,false)[0];
  if(!hit){f.mesh.position.add(movement);continue;}
  const n=hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();if(n.dot(direction)>0)n.negate();
  f.mesh.position.copy(hit.point).addScaledVector(n,SLOW.radius+.015);
  if(n.y>=.55&&f.velocity.dot(n)<0)return{land:hit.point.clone(),normal:n};
  const reflected=bounceVelocity(f.velocity,n);f.velocity.set(reflected.x,reflected.y,reflected.z);f.bounces=(f.bounces||0)+1;f.lastBounce=hit.point.clone();
 }
 return null;
}
