import {AgentAvatar} from './agent-avatar.js?v=neon2';
const T=globalThis.THREE;
// Dedicated cosmetic body: never registered as a target or collision object.
export class FirstPersonBody {
 constructor(scene,agent){this.root=new T.Group();this.root.name='first-person-body';scene.add(this.root);this.root.visible=false;this.agent=agent;this.avatar=new AgentAvatar(this.root,agent,{onReady:()=>this.prepare()});this.avatar.setWeapon('melee');}
 prepare(){const s=this.avatar.skin;if(!s)return;const g=s.mesh.geometry,indices=g.index.array,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,names=s.rig.names;
 const allowed=names.map(n=>/^(Pelvis|[LR]_(Hip|Knee|Foot|Toe|Strap))/.test(n));
 const keep=v=>{let weight=0;for(let k=0;k<4;k++)if(allowed[si.array[v*4+k]])weight+=sw.array[v*4+k];return weight>.65;};const cut=[];for(let i=0;i<indices.length;i+=3)if(keep(indices[i])&&keep(indices[i+1])&&keep(indices[i+2]))cut.push(indices[i],indices[i+1],indices[i+2]);g.setIndex(cut);s.mesh.material.side=T.FrontSide;s.outline.visible=false;this.avatar.weaponCarrier.visible=false;this.ready=true;this.triangles=cut.length/3;
 }
 update(dt,{agent,position,yaw,moving,walking,crouching,grounded=true,visible=true}){if(agent!==this.agent){this.agent=agent;this.ready=false;this.avatar.setAgent(agent);}this.root.visible=!!visible&&this.ready;if(!this.root.visible)return;this.root.position.set(position.x+Math.sin(yaw)*.4,position.y-2.2,position.z+Math.cos(yaw)*.4);this.root.rotation.y=yaw;this.avatar.update(grounded?dt:0,{moving:grounded&&moving,walking,crouching,pitch:0});this.avatar.weaponCarrier.visible=false;if(this.avatar.skin)this.avatar.skin.outline.visible=false;}
}
