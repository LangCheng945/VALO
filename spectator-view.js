import {FirstPersonHands,createMagazine,disposeViewmodel} from './first-person-view.js?v=motion1';
import {loadWeaponModel,styleWeaponMesh} from './weapon-models.js?v=hands1';
import {pickSpectatorTarget} from './spectator-rules.mjs';
const T=globalThis.THREE;
export class SpectatorView {
 constructor(scene,{skinTexture,environment}={}){
  this.camera=new T.PerspectiveCamera(75,innerWidth/innerHeight,.1,260);this.camera.rotation.order='YXZ';scene.add(this.camera);
  this.weaponRoot=new T.Group();this.weaponRoot.position.z=-.14;this.camera.add(this.weaponRoot);this.skinTexture=skinTexture;this.environment=environment;
  this.uid=null;this.candidates=[];this.generation=0;this.kick=0;this.hidden=null;this.active=false;
 }
 restoreHidden(){if(this.hidden){if(!this.hidden.userData.disposed)this.hidden.visible=true;this.hidden=null;}}
 stop(){this.restoreHidden();this.uid=null;this.active=false;this.weaponRoot.visible=false;this.modelKey=null;this.generation++;disposeViewmodel(this.weaponRoot);this.hands=null;}
 cycle(direction){this.uid=pickSpectatorTarget(this.candidates,this.uid,direction);this.snap=true;}
 shot(uid){if(this.active&&uid===this.uid)this.kick=.065;}
 resize(width,height){this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
 buildWeapon(agent,key){
  const modelKey=agent+':'+key;if(this.modelKey===modelKey)return;this.modelKey=modelKey;const generation=++this.generation;disposeViewmodel(this.weaponRoot);this.hands=new FirstPersonHands(agent,key,this.environment);this.weaponRoot.add(this.hands.root);
  if(!['vandal','phantom','classic','operator','odin'].includes(key))return;
  const paint=new T.MeshStandardMaterial({color:0xffffff,map:this.skinTexture,emissive:0x60bfff,emissiveMap:this.skinTexture,emissiveIntensity:.055,metalness:.48,roughness:.39,envMap:this.environment,envMapIntensity:.65});
  loadWeaponModel(key,paint).then(mesh=>{
   if(generation!==this.generation){paint.dispose();return;}
   const steel=new T.MeshStandardMaterial({color:0x657986,metalness:.78,roughness:.29,envMap:this.environment}),rubber=new T.MeshStandardMaterial({color:0x02060b,roughness:.9});
   const box=styleWeaponMesh(mesh,key,{paint,steel,rubber});this.weaponRoot.add(mesh);const magazine=box||createMagazine(key,paint,steel);this.weaponRoot.add(magazine);
  }).catch(()=>paint.dispose());
 }
 update(dt,candidates,enabled){
  this.restoreHidden();this.candidates=candidates;
  if(!enabled){if(this.active||this.uid)this.stop();return null;}
  const next=pickSpectatorTarget(candidates,this.uid);if(next!==this.uid){this.uid=next;this.snap=true;}
  const target=candidates.find(p=>p.uid===this.uid);this.active=!!target;this.weaponRoot.visible=this.active;
  if(!target)return null;
  const actor=target.actor,pos=actor.group.position,eye=target.crouching?.75:0;
  const blend=this.snap?1:1-Math.exp(-dt*18);this.camera.position.lerp(new T.Vector3(pos.x,pos.y+2.2-eye,pos.z),blend);
  const yawDelta=Math.atan2(Math.sin(target.yaw-this.camera.rotation.y),Math.cos(target.yaw-this.camera.rotation.y));this.camera.rotation.y+=yawDelta*blend;this.camera.rotation.x+=(target.pitch-this.camera.rotation.x)*blend;this.snap=false;
  actor.group.visible=false;this.hidden=actor.group;
  this.buildWeapon(target.agent,target.weapon);this.kick*=Math.exp(-dt*16);this.weaponRoot.rotation.x=this.kick;this.weaponRoot.position.z=-.14+this.kick*.6;this.hands?.update({dt});return target;
 }
}
