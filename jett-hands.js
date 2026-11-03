// Jett first-person hand geometry from pinned open-aim source (Riot character assets). Source and conversion notes: assets/hands/provenance.json.
const T=globalThis.THREE;let pending;const axis=new T.Vector3(0,1,0);
function source(){return pending||=(Promise.all([fetch(new URL('./assets/jett-hands/mesh.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Hand rig '+r.status);return r.json()}),new T.TextureLoader().loadAsync(new URL('./assets/jett-hands/albedo.png',import.meta.url).href)]).then(([data,map])=>{map.flipY=false;map.encoding=T.sRGBEncoding;return{data,map}}).catch(e=>{pending=null;throw e}));}
export async function installJettHands(owner){if(owner.agent!=='jett')return false;const {data,map}=await source();if(owner.root.userData.disposed||owner.agent!=='jett')return false;
 for(const a of owner.arms){const d=data[a.side<0?'l':'r'],g=new T.BufferGeometry();for(const[name,size,key]of[['position',3,'position'],['normal',3,'normal'],['uv',2,'uv'],['skinWeight',4,'skinWeight']])g.setAttribute(name,new T.Float32BufferAttribute(d[key].flat(),size));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(d.skinIndex.flat(),4));g.setIndex(d.index);
 const bones=d.bones.map(b=>{const bone=new T.Bone();bone.name=b.name;new T.Matrix4().fromArray(b.matrix).decompose(bone.position,bone.quaternion,bone.scale);bone.userData.rest=bone.quaternion.clone();return bone});bones.forEach((b,i)=>{if(d.bones[i].parent>=0)bones[d.bones[i].parent].add(b)});
 const material=new T.MeshStandardMaterial({map,roughness:.86,skinning:true,side:T.DoubleSide});const mesh=new T.SkinnedMesh(g,material);mesh.name='jett-skinned-hand';mesh.frustumCulled=false;const stage=new T.Group();stage.name='imported-finger-skeleton';stage.add(bones[0],mesh);stage.position.z=.03;
 const skeleton=new T.Skeleton(bones,d.bones.map(b=>new T.Matrix4().fromArray(b.inverse)));mesh.bind(skeleton,new T.Matrix4());
 for(const child of [...a.hand.children]){child.geometry?.dispose();a.hand.remove(child);}a.hand.add(stage);a.rig={bones,mesh,skeleton,q:new T.Quaternion()};
 }
 owner.skeletalReady=true;return true;
}
export function poseJettHand(a,opening,key){if(!a.rig)return;for(const bone of a.rig.bones){bone.quaternion.copy(bone.userData.rest);if(!/_(Index|Middle|Ring|Pinky|Thumb)[123]$/.test(bone.name))continue;let open=a.hand.userData.openRest?1-opening:opening;if(key==='overdrive')open=bone.name.includes('Index')?1:0;if(key==='melee'&&a.side>0&&bone.name.includes('Index'))open=0;bone.quaternion.slerp(a.rig.q.identity(),open*.85);}}
