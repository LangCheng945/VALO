import {agentModelKey} from './multiplayer/agents.mjs?v=agents28';
import {FIREARMS} from './multiplayer/firearms.mjs?v=armory1';
// Local, pinned character data. Gameplay continues to use the original separate hitboxes.
import {loadWeaponModel} from './weapon-models.js?v=armory1';
import {disposeActor} from './combat-effects.js?v=avatars1';
const T=globalThis.THREE,base=new URL('./assets/agents/',import.meta.url),cache=new Map();let dataPromise;
const json=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Character data '+r.status);return r.json()};
function data(){return dataPromise||=(Promise.all([json(new URL('manifest.json?v=agents28',base)),json(new URL('rig.json',base))]).catch(e=>{dataPromise=null;throw e}));}
const floats=(array,scale)=>Float32Array.from(array,v=>v/scale);
async function source(agent){
 const key=agentModelKey(agent);if(!cache.has(key))cache.set(key,(async()=>{
  const [manifest,rig]=await data(),m=manifest[key],r=await fetch(new URL(m.bin,base));if(!r.ok)throw Error('Character mesh '+r.status);const b=await r.arrayBuffer(),[p,n,u,si,sw,ix,inv]=m.layout;
  if(b.byteLength!==inv+rig.names.length*64)throw Error('Invalid character mesh');
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(floats(new Int16Array(b,p,m.verts*3),10),3));geometry.setAttribute('normal',new T.BufferAttribute(floats(new Int8Array(b,n,m.verts*3),127),3));geometry.setAttribute('uv',new T.BufferAttribute(floats(new Uint16Array(b,u,m.verts*2),65535),2));geometry.setAttribute('skinIndex',new T.BufferAttribute(new Uint8Array(b,si,m.verts*4),4));geometry.setAttribute('skinWeight',new T.BufferAttribute(floats(new Uint8Array(b,sw,m.verts*4),255),4));const indices=new Uint16Array(b,ix,m.tris*3).slice();for(let i=0;i<indices.length;i+=3){const a=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=a;}geometry.setIndex(new T.BufferAttribute(indices,1));
  const loader=new T.TextureLoader(),[albedo,orm]=await Promise.all([loader.loadAsync(new URL(m.albedo,base).href),loader.loadAsync(new URL(m.orm,base).href)]);
  albedo.flipY=orm.flipY=false;albedo.encoding=T.sRGBEncoding;albedo.anisotropy=2;
  return {key,rig,geometry,albedo,orm,inverses:new Float32Array(b,inv,rig.names.length*16)};
 })().catch(e=>{cache.delete(key);throw e}));return cache.get(key);
}
export function preloadAgentAvatars(agents=['jett','phoenix']){return Promise.allSettled([...new Set(agents)].slice(0,4).map(source));}
function pose(skin,motion,time,pitch=0){
 const {rig,bones}=skin,m=rig.motions[motion]||rig.motions['stand:vandal'],p=rig.poses[m.base];
 for(let i=0;i<rig.order.length;i++){const b=bones[rig.order[i]];b.position.fromArray(p.t,i*3);b.quaternion.fromArray(p.q,i*4).normalize();}
 if(m.track){const track=rig.tracks[m.track],frame=(time%m.duration)/m.duration*m.frames,a=Math.floor(frame)%m.frames,c=(a+1)%m.frames,f=frame-Math.floor(frame);
  for(let i=0;i<track.moving.length;i++){const b=bones[rig.order[track.moving[i]]],at=a*track.moving.length+i,ct=c*track.moving.length+i;
   b.position.fromArray(track.t,at*3).lerp(skin.v.fromArray(track.t,ct*3),f);b.quaternion.fromArray(track.q,at*4).slerp(skin.q.fromArray(track.q,ct*4),f).normalize();}
 }
 // Raw character axes are Z-up; a small torso bend follows remote aim pitch.
 bones[6].quaternion.multiply(skin.q.setFromAxisAngle(skin.aimAxis,Math.max(-.8,Math.min(.8,pitch))*.45));
}
export class AgentAvatar {
 constructor(parent,agent,{color=0xff4655,skinTexture=null,onReady=()=>{}}={}){
  this.parent=parent;this.root=new T.Group();this.root.name='character-appearance';parent.add(this.root);this.weaponCarrier=new T.Group();this.root.add(this.weaponCarrier);this.color=color;this.skinTexture=skinTexture;this.onReady=onReady;this.elapsed=0;this.generation=0;this.setAgent(agent);this.setWeapon('vandal');
 }
 setAgent(agent){
  const key=agentModelKey(agent);if(this.key===key)return;this.key=key;const generation=++this.generation;
  this.ready=source(agent).then(s=>{
   if(this.parent.userData.disposed||generation!==this.generation)return false;
   const previousStage=this.skin?.stage;
   const stage=new T.Group();stage.name=key+'-character';stage.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2));stage.scale.set(.0133333,-.0133333,.0133333);stage.position.y=.0267;
   const bones=s.rig.names.map((name,i)=>{const b=new T.Bone();b.name=name;b.position.fromArray(s.rig.bindT,i*3);b.quaternion.fromArray(s.rig.bindQ,i*4).normalize();return b});
   bones.forEach((b,i)=>{const p=s.rig.parents[i];if(p>=0)bones[p].add(b);else stage.add(b)});
   const skeleton=new T.Skeleton(bones,bones.map((_,i)=>new T.Matrix4().fromArray(s.inverses,i*16)));
   const material=new T.MeshStandardMaterial({map:s.albedo,roughnessMap:s.orm,metalnessMap:s.orm,roughness:1,metalness:1,skinning:true,side:T.DoubleSide});
   const mesh=new T.SkinnedMesh(s.geometry.clone(),material);mesh.name=key+'-skinned-body';mesh.frustumCulled=false;stage.add(mesh);mesh.bind(skeleton,new T.Matrix4());
   const outline=new T.SkinnedMesh(mesh.geometry,new T.MeshBasicMaterial({color:this.color,side:T.BackSide,skinning:true}));outline.name='team-outline';outline.material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#ifdef USE_ENVMAP','#if defined(USE_ENVMAP) || defined(USE_SKINNING)').replace('#include <skinning_vertex>','#include <skinning_vertex>\n transformed += normalize(objectNormal) * .45;');};outline.material.customProgramCacheKey=()=> 'agent-rim-v1';outline.frustumCulled=false;stage.add(outline);outline.bind(skeleton,new T.Matrix4());
   this.skin={stage,bones,skeleton,mesh,outline,rig:s.rig,v:new T.Vector3(),q:new T.Quaternion(),aimAxis:new T.Vector3(0,1,0)};this.root.add(stage);bones[s.rig.names.indexOf('R_WeaponPoint')].add(this.weaponCarrier);if(previousStage)disposeActor(previousStage);this.alignGun();pose(this.skin,'stand:vandal',0);stage.updateMatrixWorld(true);skeleton.update();this.onReady();return true;
  }).catch(()=>false);
 }
 setColor(color){this.color=color;this.skin?.outline.material.color.setHex(color);}
 setWeapon(key){
  if(this.weaponKey===key)return;this.weaponKey=key;const id=key;const material=new T.MeshStandardMaterial({color:0x92b8c6,map:this.skinTexture,metalness:.35,roughness:.5});
  if(!FIREARMS[key]){material.dispose();if(this.gun){disposeActor(this.gun);this.gun=null;}return;}
  loadWeaponModel(key,material).then(mesh=>{
   if(this.parent.userData.disposed||this.weaponKey!==id){material.dispose();return;}
   if(this.gun)disposeActor(this.gun);mesh.geometry=mesh.geometry.clone();mesh.geometry.userData.sharedWeaponGeometry=false;mesh.position.set(.16,1.38,-.38);mesh.scale.setScalar(.009);this.gun=mesh;this.weaponCarrier.add(mesh);this.alignGun();
  }).catch(()=>material.dispose());
 }
 alignGun(){if(!this.gun)return;if(this.skin){this.gun.position.set(0,0,0);this.gun.quaternion.set(.5,-.5,.5,.5);this.gun.scale.setScalar(1);}else{this.gun.position.set(.16,1.38,-.38);this.gun.quaternion.set(-.5,.5,.5,.5);this.gun.scale.setScalar(.009);}}
 update(dt,{moving=false,walking=false,crouching=false,pitch=0,dead=false}={}){
  this.elapsed+=dt;if(this.skin&&!dead)pose(this.skin,crouching?(moving?'crouchWalk:vandal':'crouch:vandal'):moving?(walking?'walk:vandal':'run:vandal'):'stand:vandal',this.elapsed,pitch);

 }
}
