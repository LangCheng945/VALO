import {createWeaponArmRig,updateTacticalKnife} from './tactical-knife.js?v=fullarms1';
import {updateMechanism} from './gun-mechanisms.js?v=fullarms1';
import {FIREARMS} from './multiplayer/firearms.mjs?v=armory1';
const T=globalThis.THREE,cache=new Map(),exact=new Set(['vandal','phantom','classic','operator','ghost','guardian','sheriff','marshal']);
const directSpace=new Set(['vandal','phantom','classic','operator']);
export function weaponPoseProfile(key){if(exact.has(key))return key;const w=FIREARMS[key];return w?.category==='sniper'||w?.category==='heavy'?'operator':w?.category==='sidearm'?(key==='shorty'?'ghost':'classic'):'phantom';}
async function fetchAsset(profile,ext,json=false){const r=await fetch('./assets/weapon-poses/'+profile+'.'+ext);if(!r.ok)throw Error('Weapon pose '+profile+'.'+ext);return json?r.json():r.arrayBuffer();}
function poseData(profile){if(!cache.has(profile))cache.set(profile,(async()=>{const meta=await fetchAsset(profile,'json',true),[poses,gunReload,magazine,spare]=await Promise.all([fetchAsset(profile,'poses.bin'),fetchAsset(profile,'gun-reload.bin'),meta.magazine?fetchAsset(profile,'magazine.bin'):null,meta.magazineSpare?fetchAsset(profile,'magazineSpare.bin'):null]);return{meta,frames:new Float32Array(poses),gunReload:new Float32Array(gunReload),magazine,spare}})().catch(e=>{cache.delete(profile);throw e}));return cache.get(profile);}
function legacyAdapter(mirror=false){const m=new T.Matrix4().compose(new T.Vector3(.25,-.29,-.35),new T.Quaternion(-.5,.5,.5,.5),new T.Vector3(.009,.009,.009)),g=new T.Group();g.matrix.copy(m).invert();if(mirror)g.matrix.premultiply(new T.Matrix4().makeScale(1,-1,1));g.matrixAutoUpdate=false;return g;}
function sourceMagazine(key,mesh,data,spare=false){const info=data.meta[spare?'magazineSpare':'magazine'],n=info.verts,b=spare?data.spare:data.magazine,g=new T.BufferGeometry();for(const[name,size,at]of[['position',3,0],['normal',3,n*12],['uv',2,n*24]])g.setAttribute(name,new T.Float32BufferAttribute(new Float32Array(b,at,n*size),size));g.setIndex(new T.BufferAttribute(new Uint16Array(b,n*32,info.tris*3).slice(),1));const material=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material).clone();material.skinning=false;material.needsUpdate=true;const part=new T.Mesh(g,material);part.name=key==='vandal'?'source-gaia-magazine':'source-'+key+'-magazine';const root=new T.Group();root.name=key+'-detachable-magazine';root.userData.basePosition=new T.Vector3();root.userData.nativeDriven=true;root.add(part);return root;}
export function createNativeWeaponHands(hands,key,mesh,magazine,flash,{onMagazine=()=>{}}={}){
 const profile=weaponPoseProfile(key),root=createWeaponArmRig(hands,poseData(profile));root.name='native-'+key+'-viewmodel';root.userData.profile=profile;
 root.ready=root.ready.then(ready=>{if(!ready||root.userData.disposed||hands.root.userData.disposed)return false;
  const s=root.userData,{meta}=s.data,bone=s.bones.find(b=>b.name===meta.attach.bone),mount=new T.Group();mount.quaternion.fromArray(meta.attach.q);bone.add(mount);s.mount=mount;s.model=mesh;
  mesh.parent?.remove(mesh);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,directSpace.has(key)?1:-1,1);mount.add(mesh);
  if(mesh.userData.mechanism&&key===profile){const frames=s.data.gunReload.slice();if(!directSpace.has(key))for(let i=0;i<frames.length;i+=7){frames[i+1]*=-1;frames[i+3]*=-1;frames[i+5]*=-1;}mesh.userData.mechanism.meta.reload=meta.gunClips.reload;mesh.userData.mechanism.reloadFrames=frames;}
  if(magazine){
   if(directSpace.has(key)&&key===profile&&meta.magazine&&mesh.userData.mechanism){
    const native=sourceMagazine(key,mesh,s.data),mb=mesh.userData.mechanism.bones.find(b=>b.name==='Magazine_Main');
    if(mb){updateMechanism(mesh,Infinity);mesh.updateWorldMatrix(true,true);const inverse=new T.Matrix4().copy(mesh.matrixWorld).invert().multiply(mb.matrixWorld).invert(),carrier=new T.Group();carrier.matrix.copy(inverse);carrier.matrixAutoUpdate=false;mb.add(carrier);carrier.add(native);onMagazine(native,magazine);s.magazine=native;
    const extraBone=mesh.userData.mechanism.bones.find(b=>b.name==='Magazine_Extra');if(meta.magazineSpare&&extraBone){const extra=sourceMagazine(key,mesh,s.data,true),group=new T.Group();group.matrix.copy(new T.Matrix4().copy(mesh.matrixWorld).invert().multiply(extraBone.matrixWorld).invert());group.matrixAutoUpdate=false;extraBone.add(group);group.add(extra);extra.visible=false;extra.name=key+'-spare-magazine';s.spare=extra;}}else{native.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});}
   }else{const adapter=legacyAdapter(!directSpace.has(key));mount.add(adapter);adapter.add(magazine);s.magazine=magazine;}
  }
  if(flash){const adapter=legacyAdapter(!directSpace.has(key));mount.add(adapter);adapter.add(flash);}
  if(key!==profile){
   mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox,ratio=T.MathUtils.clamp((bounds.max.x-bounds.min.x)*.009/meta.length,.45,1.25);s.lengthRatio=ratio;
   // Translate the complete left branch toward a compatible fore-end length.
   root.updateWorldMatrix(true,true);const left=s.bones.find(b=>b.name==='L_Clavicle'),hand=s.bones.find(b=>b.name==='L_Hand'),local=mount.worldToLocal(hand.getWorldPosition(new T.Vector3())),delta=local.x*(ratio-1),origin=mount.getWorldPosition(new T.Vector3()),world=mount.localToWorld(new T.Vector3(delta,0,0)).sub(origin),point=left.getWorldPosition(new T.Vector3()).add(world);left.parent.worldToLocal(point);s.supportOffset=point.sub(left.position);s.supportBase=s.supportOffset.clone();
  }
  return true;
 }).catch(error=>{console.warn('Native weapon attachment unavailable',error);root.userData.loaded=false;hands.root.visible=true;return false;});return root;
}
export function updateNativeWeaponHands(root,{dt=0,moving=false,reload=0,scoped=false,camera,now=performance.now()}={}){
 if(!root?.userData.loaded)return;
 const s=root.userData;if(s.supportBase){const fade=reload>0?reload<.2?1-reload/.2:reload>.8?(reload-.8)/.2:0:1;s.supportOffset.copy(s.supportBase).multiplyScalar(fade);}
 updateTacticalKnife(root,{dt,moving,reload,scoped,camera,now});if(s.spare){s.magazine.visible=!(reload>.27&&reload<.82);s.spare.visible=reload>.27&&reload<.85;}
}
