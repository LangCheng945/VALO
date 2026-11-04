export const SCALE=4/3,EYE=2.2,ROTOR_MS=10000,RECEIVER_MS=350,RECEIVER_HOLD_MS=3000;
const point=(x,y,z)=>({x:x*SCALE,y:y*SCALE,z:z*SCALE});
export const ROTORS=Object.freeze([
 {id:'lotus-a',source:'Prop_0_JamDoorA#6600',pivot:point(52.0378027,2.99996002,-55.7500049),base:0,width:6.12*SCALE,height:4.04*SCALE,thickness:1.06*SCALE,buttons:[point(49.1495166,4.22941406,-58.7441992),point(54.9491846,4.22548096,-52.5135107)]},
 {id:'lotus-c',source:'Prop_0_JamDoorA#6598',pivot:point(-16.5,1.5,-48.0000049),base:Math.PI/2,width:6.12*SCALE,height:4.04*SCALE,thickness:1.06*SCALE,buttons:[point(-15.4244922,2.73654785,-52.1431836),point(-17.6188135,2.74038086,-43.0026367)]}
]);
export const RECEIVERS=Object.freeze([
 {id:'bind-a-exit',x:50.405*SCALE,z:-76.415*SCALE,floor:1.002*SCALE,width:4.8*SCALE,height:3.45*SCALE,thickness:.19*SCALE,inside:1},
 {id:'bind-b-exit',x:-24.595*SCALE,z:-89.013*SCALE,floor:5*SCALE,width:4.8*SCALE,height:3.45*SCALE,thickness:.19*SCALE,inside:1}
]);
export const PORTALS=Object.freeze([
 {id:'bind-a-to-b',x:4.62*SCALE,z:-94.52*SCALE,floor:2*SCALE,width:4.8*SCALE,height:3.45*SCALE,receiver:'bind-b-exit',destination:{x:-23.095*SCALE,y:5.039683*SCALE+EYE,z:-89.013*SCALE}},
 {id:'bind-b-to-a',x:-73.42*SCALE,z:-90.46*SCALE,floor:3*SCALE,width:4.8*SCALE,height:3.45*SCALE,receiver:'bind-a-exit',destination:{x:51.905*SCALE,y:1.01218*SCALE+EYE,z:-76.415*SCALE}}
]);
export function definitions(map){return map==='lotus'?ROTORS:map==='bind'?RECEIVERS:[];}
export function newMechanisms(map,now=0,revision=0){return{map,revision,doors:Object.fromEntries(definitions(map).map(d=>[d.id,map==='lotus'?{from:0,changedAt:0,revision:0}:{open:false,from:0,changedAt:now,closesAt:0,revision:0}]))};}
export function rotorAngle(d,now){return d.from+(d.changedAt?Math.PI*Math.max(0,Math.min(1,(now-d.changedAt)/ROTOR_MS)):0);}
export function rotorBusy(d,now){return!!d.changedAt&&now-d.changedAt<ROTOR_MS;}
export function openness(d,now){const t=Math.max(0,Math.min(1,(now-d.changedAt)/RECEIVER_MS));return d.from+((d.open?1:0)-d.from)*t;}
export function nearSwitch(p,door){return door.buttons.some(b=>Math.hypot(p.x-b.x,p.y-b.y,p.z-b.z)<=3.8);}
export function insideReceiver(p,d,range=5*SCALE){return p.x>=d.x-.25&&p.x<=d.x+range&&Math.abs(p.z-d.z)<=d.width/2+.6&&p.y-EYE>=d.floor-.6&&p.y-EYE<d.floor+1.2;}
export function inReceiverThreshold(p,d){return Math.abs(p.x-d.x)<.9&&Math.abs(p.z-d.z)<d.width/2+.6&&p.y>d.floor&&p.y-EYE<d.floor+d.height;}
export function canUsePortal(p,portal,now){const feet=p.y-EYE;return now-(p.lastMapTeleport||0)>=1000&&p.x>=portal.x-.4&&p.x<=portal.x+1.4*SCALE&&Math.abs(p.z-portal.z)<portal.width/2-.25&&feet>=portal.floor-.65&&feet<=portal.floor+portal.height-EYE-.1;}
export function rotorLocal(p,door,angle){const a=door.base+angle,c=Math.cos(a),s=Math.sin(a),x=p.x-door.pivot.x,z=p.z-door.pivot.z;return{x:c*x-s*z,z:s*x+c*z};}
export function rotorWorld(x,z,door,angle){const a=door.base+angle,c=Math.cos(a),s=Math.sin(a);return{x:door.pivot.x+c*x+s*z,z:door.pivot.z-s*x+c*z};}
export function rotorContact(p,door,angle,crouch=0,radius=.42){const feet=p.y-EYE;if(feet+.04>=door.pivot.y+door.height||p.y+.28-crouch*.75<door.pivot.y)return false;const q=rotorLocal(p,door,angle),dx=Math.max(0,Math.abs(q.x)-door.width/2),dz=Math.max(0,Math.abs(q.z)-door.thickness/2);return dx*dx+dz*dz<(radius-.02)**2;}
export function receiverBoxes(door,state,now){const open=openness(state,now),half=door.width/2;return[-1,1].map(sign=>({minX:door.x-door.thickness/2,maxX:door.x+door.thickness/2,minY:door.floor,maxY:door.floor+door.height,minZ:door.z+sign*(half/2+open*half)-half/2,maxZ:door.z+sign*(half/2+open*half)+half/2}));}
export function segmentBox(a,b,box){let lo=0,hi=1;for(const k of ['X','Y','Z']){const key=k.toLowerCase(),delta=b[key]-a[key],min=box['min'+k]-.02,max=box['max'+k]+.02;if(Math.abs(delta)<1e-8){if(a[key]<min||a[key]>max)return null;continue;}let x=(min-a[key])/delta,y=(max-a[key])/delta;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return null;}return lo>=0&&lo<=1?lo:null;}
export function mechanismRay(map,state,a,b,now){const hits=[];if(map==='lotus')for(const d of ROTORS){const angle=rotorAngle(state.doors[d.id],now),pa=rotorLocal(a,d,angle),pb=rotorLocal(b,d,angle),t=segmentBox({x:pa.x,y:a.y,z:pa.z},{x:pb.x,y:b.y,z:pb.z},{minX:-d.width/2,maxX:d.width/2,minZ:-d.thickness/2,maxZ:d.thickness/2,minY:d.pivot.y,maxY:d.pivot.y+d.height});if(t!==null)hits.push({id:d.id,t});}else if(map==='bind')for(const d of RECEIVERS)for(const box of receiverBoxes(d,state.doors[d.id],now)){const t=segmentBox(a,b,box);if(t!==null)hits.push({id:d.id,t});}return hits.sort((a,b)=>a.t-b.t)[0]||null;}
export function collisionCutouts(map){return(map==='lotus'?ROTORS.map(d=>({minX:d.pivot.x-(d.base?d.thickness/2+.35:d.width/2+.03),maxX:d.pivot.x+(d.base?d.thickness/2+.35:d.width/2+.03),minZ:d.pivot.z-(d.base?d.width/2+.03:d.thickness/2+.35),maxZ:d.pivot.z+(d.base?d.width/2+.03:d.thickness/2+.35),minY:d.pivot.y+.025,maxY:d.pivot.y+d.height-.03})):map==='bind'?RECEIVERS.map(d=>({minX:d.x-1.2,maxX:d.x+1.2,minZ:d.z-d.width/2,maxZ:d.z+d.width/2,minY:d.floor+.025,maxY:d.floor+d.height})):[]);}
