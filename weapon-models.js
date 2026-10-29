// Local geometry adapter. Asset provenance: assets/weapons/README.md.
const THREE=window.THREE;
const cache=new Map();
let manifest;
export async function loadWeaponModel(key,material) {
 if(!['vandal','phantom','classic','operator','odin'].includes(key))return null;
 if(!cache.has(key))cache.set(key,(async()=>{
  manifest ||= await fetch('./assets/weapons/manifest.json').then(r=>{if(!r.ok)throw Error('Weapon manifest');return r.json()});
  const m=manifest[key];const response=await fetch(`./assets/weapons/${key}.bin`);if(!response.ok)throw Error(`Weapon ${key}`);
  const b=await response.arrayBuffer();if(b.byteLength!==m.vertices*24+m.indices*4)throw Error('Invalid weapon geometry');
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(b,0,m.vertices*3),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(b,m.vertices*12,m.vertices*3),3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(b,m.vertices*24,m.indices),1));
  const uv=new Float32Array(m.vertices*2),pos=g.attributes.position.array;
  for(let i=0;i<m.vertices;i++){uv[i*2]=(pos[i*3]-m.bounds[0][0])/(m.bounds[0][1]-m.bounds[0][0]);uv[i*2+1]=(pos[i*3+2]-m.bounds[2][0])/(m.bounds[2][1]-m.bounds[2][0]);}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.computeBoundingSphere();return g;
 })().catch(e=>{cache.delete(key);throw e}));
 const mesh=new THREE.Mesh(await cache.get(key),material);mesh.name=`detailed-${key}`;
 mesh.quaternion.set(-.5,.5,.5,.5);mesh.scale.setScalar(.009);
 mesh.position.set(.25,-.29,-.35);return mesh;
}
