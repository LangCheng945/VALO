// Local geometry adapter. Asset provenance: assets/weapons/README.md.
const THREE=window.THREE;
const cache=new Map();
let manifestPromise;
export async function loadWeaponModel(key,material) {
 if(!/^[a-z]+$/.test(key))return null;
 if(!cache.has(key))cache.set(key,(async()=>{
  const manifest=await (manifestPromise ||= fetch('./assets/weapons/manifest.json?v=armory1').then(r=>{if(!r.ok)throw Error('Weapon manifest');return r.json()}));
  const m=manifest[key];if(!m)throw Error('Unknown weapon');const response=await fetch(`./assets/weapons/${key}.bin`);if(!response.ok)throw Error(`Weapon ${key}`);
  const b=await response.arrayBuffer();if(b.byteLength!==m.vertices*24+m.indices*4)throw Error('Invalid weapon geometry');
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(b,0,m.vertices*3),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(b,m.vertices*12,m.vertices*3),3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(b,m.vertices*24,m.indices),1));
  const uv=new Float32Array(m.vertices*2),pos=g.attributes.position.array;
  for(let i=0;i<m.vertices;i++){uv[i*2]=(pos[i*3]-m.bounds[0][0])/(m.bounds[0][1]-m.bounds[0][0]);uv[i*2+1]=(pos[i*3+2]-m.bounds[2][0])/(m.bounds[2][1]-m.bounds[2][0]);}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.computeBoundingSphere();g.userData.sharedWeaponGeometry=true;return g;
 })().catch(e=>{cache.delete(key);throw e}));
 const mesh=new THREE.Mesh(await cache.get(key),material);mesh.name=`detailed-${key}`;
 mesh.quaternion.set(-.5,.5,.5,.5);mesh.scale.setScalar(.009);
 mesh.position.set(.25,-.29,-.35);return mesh;
}

// Preserve the pinned source geometry; presentation groups own their cloned buffers.
export function styleWeaponMesh(mesh,key,materials){
 const original=mesh.geometry,p=original.attributes.position,index=original.index,paint=[],steel=[],rubber=[],box=[];original.computeBoundingBox();const bounds=original.boundingBox,length=bounds.max.x-bounds.min.x;
 for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],x=ids.reduce((s,v)=>s+p.getX(v),0)/3,y=ids.reduce((s,v)=>s+p.getY(v),0)/3,z=ids.reduce((s,v)=>s+p.getZ(v),0)/3;
  if(key==='odin'&&x>5.4&&x<32&&Math.abs(y)<15.5&&z<-6.6){box.push(...ids);continue;}
  const grip=x>-10&&x<7&&z<2.5||x<bounds.min.x+length*.012;
  const metal=x>bounds.max.x-length*.035||z>bounds.max.z-1.0;
  (grip?rubber:metal?steel:paint).push(...ids);
 }
 const geometry=original.clone();geometry.userData.sharedWeaponGeometry=false;geometry.setIndex([...paint,...steel,...rubber]);geometry.clearGroups();let start=0;for(const [i,indices]of[paint,steel,rubber].entries()){geometry.addGroup(start,indices.length,i);start+=indices.length;}
 mesh.geometry=geometry;mesh.material=[materials.paint,materials.steel,materials.rubber];
 if(!box.length)return null;
 const g=original.clone();g.userData.sharedWeaponGeometry=false;g.setIndex(box);g.clearGroups();const selectedBounds=new THREE.Box3(),point=new THREE.Vector3();for(const v of box)selectedBounds.expandByPoint(point.fromBufferAttribute(p,v));const center=selectedBounds.getCenter(new THREE.Vector3());g.translate(-center.x,-center.y,-center.z);
 const part=new THREE.Mesh(g,materials.paint);part.name='odin-original-ammunition-box';part.quaternion.copy(mesh.quaternion);part.scale.copy(mesh.scale);
 const root=new THREE.Group();root.name='odin-detachable-magazine';root.position.copy(center).multiplyScalar(mesh.scale.x).applyQuaternion(mesh.quaternion).add(mesh.position);root.userData.basePosition=root.position.clone();root.add(part);return root;
}
