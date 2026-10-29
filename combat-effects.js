const T=globalThis.THREE;

export function soulMarker(ally=true){
 const root=new T.Group();root.name='fallen-agent-marker';
 const color=ally?0x79f4d0:0xff6169;
 const disk=new T.Mesh(new T.CylinderGeometry(.46,.52,.065,12),new T.MeshStandardMaterial({color:0x18252b,metalness:.7,roughness:.4}));disk.position.y=.08;root.add(disk);
 const ring=new T.Mesh(new T.TorusGeometry(.40,.025,5,24),new T.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.y=.13;root.add(ring);
 const soul=new T.Mesh(new T.OctahedronGeometry(.15,0),new T.MeshBasicMaterial({color,transparent:true,opacity:.75}));soul.position.y=.35;root.add(soul);
 return root;
}
export function resurrectionEffect(){
 const root=new T.Group();root.name='sage-resurrection';
 const beam=new T.Mesh(new T.CylinderGeometry(.28,.62,2.6,16,1,true),new T.MeshBasicMaterial({color:0x69f7d8,side:T.DoubleSide,transparent:true,opacity:.16,depthWrite:false}));beam.position.y=1.3;root.add(beam);
 for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(.55,.018,4,32),new T.MeshBasicMaterial({color:0xa5ffe8,transparent:true,opacity:.6,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.3+i*.6;root.add(ring);}
 return root;
}
export function disposeCombatEffect(root){if(!root)return;root.parent?.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}

// Random local steering with floor/ledge and capsule checks at every step.
export function moveRoamingBot(bot,dt,map){
 bot.roamTime=(bot.roamTime||0)-dt;
 if(bot.roamTime<=0){
  const home=Math.hypot(bot.group.position.x-bot.baseX,bot.group.position.z-bot.baseZ)>24;
  const angle=home?Math.atan2(bot.baseZ-bot.group.position.z,bot.baseX-bot.group.position.x)+(Math.random()-.5):Math.random()*Math.PI*2;
  bot.roamDirection=new T.Vector3(Math.cos(angle),0,Math.sin(angle));bot.roamTime=1.2+Math.random()*2.5;
 }
 const next=bot.group.position.clone().addScaledVector(bot.roamDirection,bot.speed*dt),eye=next.clone();eye.y+=2.2;
 if(map.ready){const floor=map.getGroundHeight(eye);if(floor-bot.group.position.y>.5||floor-bot.group.position.y<-.75){bot.roamTime=0;return false;}eye.y=floor+2.2;if(map.collides(eye)){bot.roamTime=0;return false;}next.y=floor;}
 bot.group.position.copy(next);return true;
}

export function disposeActor(root){
 root.parent?.remove(root);const geometries=new Set(),materials=new Set();
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
