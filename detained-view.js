import {FirstPersonHands,disposeViewmodel} from './first-person-view.js?v=surface2';
import {createWeaponArmRig,updateTacticalKnife} from './tactical-knife.js?v=surface2';
let payload;
function source(){return payload||=Promise.all([fetch('./assets/detained/meta.json').then(r=>{if(!r.ok)throw Error('Detained metadata');return r.json()}),fetch('./assets/detained/arms.poses.bin').then(r=>{if(!r.ok)throw Error('Detained animation');return r.arrayBuffer()})]).then(([meta,b])=>({meta,frames:new Float32Array(b)})).catch(e=>{payload=null;throw e});}
export class DetainedView{
 constructor(camera,environment){this.camera=camera;this.environment=environment;this.agent=null;this.root=null;this.phase='idle';}
 cancel(){this.phase='idle';if(this.root)this.root.visible=false;}
 update({agent,detained,enabled,now=performance.now()}){
  if(!enabled){this.cancel();return false;}
  if(agent!==this.agent){if(this.root){this.root.parent?.remove(this.root);disposeViewmodel(this.root);}const hands=new FirstPersonHands(agent,'orb',this.environment);this.root=createWeaponArmRig(hands,source());this.root.add(hands.root);this.root.visible=false;this.camera.add(this.root);this.agent=agent;this.phase='idle';}
  if(detained&&(this.phase==='idle'||this.phase==='outro')){this.phase='intro';this.started=now;}
  if(!detained&&['intro','loop'].includes(this.phase)){this.phase='outro';this.started=now;}
  if(this.phase==='idle'||!this.root.userData.loaded){this.root.visible=false;return false;}
  const clips=this.root.userData.data.meta.clips;let clip=this.phase==='outro'?'detainExit':'detain'+this.phase[0].toUpperCase()+this.phase.slice(1),age=(now-this.started)/1000;
  if(age>=clips[clip].duration){if(this.phase==='outro'){this.cancel();return false;}if(this.phase==='intro'){age-=clips[clip].duration;this.started=now-age*1000;this.phase='loop';clip='detainLoop';}age%=clips[clip].duration;}
  this.root.visible=true;updateTacticalKnife(this.root,{poseClip:clip,poseTime:age,camera:this.camera});return true;
 }
 dispose(){if(this.root){this.root.parent?.remove(this.root);disposeViewmodel(this.root);}this.root=null;this.agent=null;this.cancel();}
}
