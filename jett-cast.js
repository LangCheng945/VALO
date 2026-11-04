import {FirstPersonHands,disposeViewmodel} from './first-person-view.js?v=surface2';
import {createWeaponArmRig,updateTacticalKnife} from './tactical-knife.js?v=surface2';
let data;
function source(){return data||=Promise.all([fetch('./assets/collection/jett-smoke/meta.json').then(r=>{if(!r.ok)throw Error('Jett cast');return r.json()}),fetch('./assets/collection/jett-smoke/arms.poses.bin').then(r=>{if(!r.ok)throw Error('Jett cast');return r.arrayBuffer()})]).then(([meta,b])=>({meta,frames:new Float32Array(b)})).catch(e=>{data=null;throw e});}
export class JettSmokeCast{
 constructor(camera,environment){this.hands=new FirstPersonHands('jett','orb',environment);this.root=createWeaponArmRig(this.hands,source());this.root.add(this.hands.root);this.root.visible=false;camera.add(this.root);this.camera=camera;this.started=-Infinity;this.loaded=false;this.root.ready.then(ok=>{this.loaded=ok});}
 play(now=performance.now()){this.started=now;return this.loaded;}
 cancel(){this.started=-Infinity;this.root.visible=false;}
 get age(){return(performance.now()-this.started)/1000;}
 get active(){return this.loaded&&this.age<.75;}
 update(enabled){if(!enabled||!this.active){this.root.visible=false;if(!enabled)this.cancel();return false;}const age=this.age,name=age<.15?'intro':age<.25?'loop':'outro',time=name==='intro'?age:name==='loop'?age-.15:age-.25;this.root.visible=true;updateTacticalKnife(this.root,{poseClip:name,poseTime:time,camera:this.camera});return true;}
 dispose(){this.cancel();this.root.parent?.remove(this.root);disposeViewmodel(this.root);}
}
