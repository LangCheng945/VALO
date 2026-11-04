// Phoenix first-person hand geometry from pinned open-aim source (Riot character assets). Source and conversion notes: assets/phoenix-hands/provenance.json.
const T=globalThis.THREE;const pending=new Map();const axis=new T.Vector3(1,0,0);
function source(variant){if(!pending.has(variant)){const folder=variant==='jett'?'jett-hands':'phoenix-hands';pending.set(variant,Promise.all([fetch(new URL('./assets/'+folder+'/mesh.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Hand rig '+r.status);return r.json()}),new T.TextureLoader().loadAsync(new URL('./assets/'+folder+'/albedo.png',import.meta.url).href),fetch(new URL('./assets/phoenix-hands/knife-grip.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Knife grip '+r.status);return r.json()}),fetch(new URL('./assets/'+folder+'/forearms.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Forearms '+r.status);return r.json()})]).then(([data,map,grip,forearms])=>{map.flipY=false;map.encoding=T.sRGBEncoding;return{data,map,grip,forearms}}).catch(e=>{pending.delete(variant);throw e}));}return pending.get(variant);}
export async function installPhoenixHands(owner){const variant=owner.agent==='jett'?'jett':'phoenix';const {data,map,grip,forearms}=await source(variant);if(owner.root.userData.disposed||variant!==(owner.agent==='jett'?'jett':'phoenix'))return false;
 for(const a of owner.arms){const d=data[a.side<0?'l':'r'],g=new T.BufferGeometry();for(const[name,size,key]of[['position',3,'position'],['normal',3,'normal'],['uv',2,'uv'],['skinWeight',4,'skinWeight']])g.setAttribute(name,new T.Float32BufferAttribute(d[key].flat(),size));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(d.skinIndex.flat(),4));g.setIndex(d.index);
 const bones=d.bones.map(b=>{const bone=new T.Bone();bone.name=b.name;new T.Matrix4().fromArray(b.matrix).decompose(bone.position,bone.quaternion,bone.scale);bone.userData.rest=bone.quaternion.clone();const pose=grip[a.side<0?'l':'r'][b.name];if(pose)bone.userData.knifeRest=new T.Quaternion().fromArray(pose).normalize();return bone});bones.forEach((b,i)=>{if(d.bones[i].parent>=0)bones[d.bones[i].parent].add(b)});
 const material=new T.MeshStandardMaterial({map,roughness:.86,skinning:true,side:T.DoubleSide});const mesh=new T.SkinnedMesh(g,material);mesh.name=variant+'-skinned-hand';mesh.frustumCulled=false;const stage=new T.Group();stage.name='imported-finger-skeleton';stage.add(bones[0],mesh);stage.position.z=.03;
 const skeleton=new T.Skeleton(bones,d.bones.map(b=>new T.Matrix4().fromArray(b.inverse)));mesh.bind(skeleton,new T.Matrix4());
 for(const child of [...a.hand.children]){child.geometry?.dispose();a.hand.remove(child);}a.hand.add(stage);a.rig={bones,mesh,skeleton,q:new T.Quaternion()};
 const sleeveData=forearms[a.side<0?'l':'r'],sleeveGeometry=new T.BufferGeometry();for(const[name,size]of[['position',3],['normal',3],['uv',2]])sleeveGeometry.setAttribute(name,new T.Float32BufferAttribute(sleeveData[name],size));sleeveGeometry.setIndex(sleeveData.index);for(const child of [...a.arm.children]){child.geometry?.dispose();a.arm.remove(child);}a.sleeveMesh=new T.Mesh(sleeveGeometry,new T.MeshStandardMaterial({map,roughness:.9}));a.sleeveMesh.name=variant+'-source-forearm';a.arm.add(a.sleeveMesh);a.nativeSleeve=true;a.sleeveAxis=new T.Vector3();a.sleeveCross=new T.Vector3();a.sleeveBasis=new T.Matrix4();
 }
 owner.skeletalReady=true;return true;
}
export function posePhoenixHand(a,opening,key){if(!a.rig)return;for(const bone of a.rig.bones){bone.quaternion.copy(key==='melee'&&a.side>0?(bone.userData.knifeRest||bone.userData.rest):bone.userData.rest);if(key==='melee'&&a.side>0){if(/_(Middle|Ring|Pinky)[0-3]$|_Thumb[1-3]$/.test(bone.name))bone.quaternion.slerp(bone.userData.rest,opening*(bone.name.includes('Thumb')?.4:.85));continue;}if(!/_(Index|Middle|Ring|Pinky|Thumb)[123]$/.test(bone.name))continue;let open=a.hand.userData.openRest?1-opening:opening;if(key==='overdrive')open=bone.name.includes('Index')?1:0;if(key==='melee'&&a.side>0&&bone.name.includes('Index'))open=0;const finger=bone.name.match(/_(Index|Middle|Ring|Pinky|Thumb)([123])$/);const curl=finger[1]==='Thumb'?.1:Number(finger[2])===3?.25:.4;bone.quaternion.multiply(a.rig.q.setFromAxisAngle(axis,a.side*curl));bone.quaternion.slerp(a.rig.q.identity(),open*.85);}}

// Fit the actual index-finger joint to the ring instead of positioning the
// wrist independently. The knife spins around this shared pivot on inspect.
export function fitKarambitHand(a,grip){
 if(!a.rig||!grip)return false;
 const s=a.rig;s.gripFit ||= {inverse:new T.Matrix4(),local:new T.Matrix4(),world:new T.Matrix4(),anchor:new T.Vector3(),axis:new T.Vector3(),along:new T.Vector3(),cross:new T.Vector3(),tmp:new T.Vector3(),q:new T.Quaternion(),knife:new T.Quaternion(),euler:new T.Euler()};
 const f=s.gripFit,find=name=>s.bones.find(b=>b.name==='R_'+name);
 a.hand.updateWorldMatrix(true,true);f.inverse.copy(a.hand.matrixWorld).invert();
 const at=(name,out)=>out.setFromMatrixPosition(find(name).matrixWorld).applyMatrix4(f.inverse);
 at('Index2',f.anchor);at('Index3',f.axis).sub(f.anchor).normalize();
 at('Middle1',f.along);f.along.add(at('Ring1',f.tmp)).add(at('Pinky1',f.tmp)).multiplyScalar(1/3).sub(f.anchor);
 f.along.addScaledVector(f.axis,-f.along.dot(f.axis)).normalize();f.cross.crossVectors(f.along,f.axis).normalize();f.local.makeBasis(f.cross,f.along,f.axis);f.q.setFromRotationMatrix(f.local).invert();
 f.knife.setFromEuler(f.euler.set(...(grip.gripRotation||grip.rotation)));
 f.axis.set(0,0,1).applyQuaternion(f.knife);f.along.set(-.66,-.75,0).normalize().applyQuaternion(f.knife);f.cross.crossVectors(f.along,f.axis).normalize();f.world.makeBasis(f.cross,f.along,f.axis);
 a.hand.quaternion.setFromRotationMatrix(f.world).multiply(f.q);a.target.fromArray(grip.position).sub(f.tmp.copy(f.anchor).applyQuaternion(a.hand.quaternion));
 return true;
}
