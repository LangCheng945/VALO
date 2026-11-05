import {attachSourceSmoke,updateSourceEffects} from './source-ability-effects.js?v=sourcefx1';
import {attachSageOrb} from './referenced-props.js?v=props1';
import {referencedAbilityIcon} from './ability-icons.mjs?v=original1';
import {FirstPersonHands} from './first-person-view.js?v=surface2';
// Lightweight procedural effects; geometry and shaders are authored for this trainer.
const T=globalThis.THREE;
const vertex=`varying vec3 vP;varying vec3 vN;void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise=`float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
function shader(fragment,extra={}){return new T.ShaderMaterial({uniforms:{time:{value:0},fade:{value:1}},vertexShader:vertex,fragmentShader:`uniform float time;uniform float fade;varying vec3 vP;varying vec3 vN;${noise}\n${fragment}`,transparent:true,depthWrite:false,...extra});}

// All UI surfaces share the same verified keyboard-to-art mapping.
export const abilityIcon=referencedAbilityIcon;

export function makeCloudburst(){
 const material=shader(`void main(){vec3 p=normalize(vP);float n=noise(p*5.+vec3(time*.22,0.,time*.17));float band=pow(max(0.,sin(p.y*18.+atan(p.z,p.x)*2.7+n*3.-time*2.)),18.);float wisps=noise(p*19.+vec3(time*.5,-time*.15,0.));vec3 col=mix(vec3(.38,.52,.61),vec3(.78,.87,.90),n*.7+band*.15);col+=band*.07+wisps*.045;if(!gl_FrontFacing)col=mix(vec3(.34,.43,.50),col,.32);gl_FragColor=vec4(col,fade);}`,{side:T.DoubleSide,depthWrite:true});
 const mesh=new T.Mesh(new T.SphereGeometry(3.8,48,32),material);mesh.name='cloudburst-wind-shell';mesh.userData.smokeRadius=3.8;attachSourceSmoke(mesh,'jett');return mesh;
}
export function makeBrimSmoke(){
 const material=shader(`void main(){vec3 p=normalize(vP);float n=noise(p*7.+vec3(time*.13,0.,time*.1));vec3 c=mix(vec3(.22,.19,.14),vec3(.53,.44,.30),n);if(!gl_FrontFacing)c=mix(c,vec3(.24,.20,.15),.55);gl_FragColor=vec4(c,fade);}`,{side:T.DoubleSide,depthWrite:true});
 const mesh=new T.Mesh(new T.SphereGeometry(4.5,32,20),material);mesh.userData.smokeRadius=4.5;return mesh;
}
export function makeBarrier(){
 const mat=shader(`uniform float damage;uniform float fortified;void main(){float n=noise(vP*2.5);float vein=pow(1.-abs(sin(vP.x*8.+vP.y*3.+n*3.)),18.);float cracks=pow(1.-abs(sin(vP.x*17.-vP.y*8.+n*5.)),26.);float frost=noise(vP*18.);vec3 col=mix(vec3(.10,.46,.47),vec3(.47,.94,.79),smoothstep(-1.8,1.8,vP.y));col+=vein*vec3(.3,.35,.4)+frost*.09;col=mix(col,col*.25,cracks*damage*.85);col+=vec3(.05,.17,.14)*fortified;gl_FragColor=vec4(col,fade*.95);}`,{depthWrite:true});
 mat.uniforms.damage={value:0};mat.uniforms.fortified={value:0};
 const section=new T.Mesh(new T.BoxGeometry(1.66,3.6,1.2),mat);section.name='sage-barrier-segment';
 const cap=new T.Mesh(new T.IcosahedronGeometry(.6,0),new T.MeshStandardMaterial({color:0x9af5d8,emissive:0x0c4945,roughness:.25}));cap.scale.set(1.3,.22,.75);cap.position.y=1.78;section.add(cap);return section;
}
export function makeBarrierPreview(){
 const root=new T.Group();root.name='sage-barrier-placement-preview';
 for(let i=0;i<4;i++){const mesh=new T.Mesh(new T.BoxGeometry(1.66,3.6,1.2),new T.MeshBasicMaterial({color:0x65ffd0,transparent:true,opacity:.17,depthWrite:false}));mesh.position.set((i-1.5)*1.7,1.8,0);const lines=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:0x65ffd0,transparent:true,opacity:.8,depthWrite:false}));mesh.add(lines);root.add(mesh);}
 return root;
}
export function makeSlowOrb(){
 const root=new T.Group();root.name='sage-thrown-slow-orb';
 const shell=new T.Mesh(new T.SphereGeometry(.16,20,16),shader(`uniform float nativeFade;void main(){float rim=pow(1.-abs(normalize(vN).z),2.);float veins=pow(1.-abs(sin(vP.x*50.+vP.y*35.+noise(vP*20.)*3.)),12.);gl_FragColor=vec4(vec3(.05,.65,.58)+rim*vec3(.25,.35,.3)+veins*.25,.83*nativeFade);}`,{depthWrite:true}));shell.material.uniforms.nativeFade={value:1};root.add(shell);
 const core=new T.Mesh(new T.IcosahedronGeometry(.08,0),new T.MeshBasicMaterial({color:0xabffe2}));core.rotation.z=.4;root.add(core);root.userData.propReady=attachSageOrb(root,.29).then(model=>{if(model){shell.material.depthWrite=false;shell.material.uniforms.nativeFade.value=.25;core.visible=false;}return !!model;});return root;
}
export function makeSlowField(){
 const material=shader(`void main(){vec2 p=vP.xy;float edge=1.-smoothstep(4.35,5.,length(p));vec2 grid=floor(p*2.7),f=fract(p*2.7);float first=10.,second=10.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 cell=vec2(float(x),float(y));vec2 jitter=vec2(hash(vec3(grid+cell,1.)),hash(vec3(grid+cell,3.)));float d=length(cell+jitter-f);if(d<first){second=first;first=d;}else{second=min(second,d);}}}float cracks=1.-smoothstep(.012,.065,second-first);float frost=noise(vec3(p*11.,0.));float glint=pow(max(0.,sin(frost*20.+time*.7)),18.);vec3 c=mix(vec3(.035,.28,.29),vec3(.20,.65,.55),noise(vec3(p*2.,1.)));c+=cracks*vec3(.18,.34,.30)+glint*.045;gl_FragColor=vec4(c,edge*.56*fade);}`,{side:T.DoubleSide});
 const mesh=new T.Mesh(new T.CircleGeometry(5,64),material);mesh.rotation.x=-Math.PI/2;mesh.name='sage-crystal-slow-field';
 let seed=7;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const g=new T.IcosahedronGeometry(.13,0),m=new T.MeshBasicMaterial({color:0x8ee8d4,transparent:true,opacity:.65});
 for(let i=0;i<65;i++){const r=Math.sqrt(rand())*4.7,a=rand()*Math.PI*2,c=new T.Mesh(g,m);c.position.set(Math.cos(a)*r,Math.sin(a)*r,.05);c.scale.set(.5+rand(),.6+rand(),.3+rand());c.rotation.set(rand(),rand(),rand());mesh.add(c);}
 return mesh;
}
export function updateEffect(mesh,time,fade=1){updateSourceEffects(mesh,time);mesh.traverse(child=>{const m=child.material;if(m?.uniforms?.time){m.uniforms.time.value=time;m.uniforms.fade.value=fade;}});}
export function disposeEffect(mesh){const geometries=new Set(),materials=new Set();mesh.traverse(c=>{c.userData.disposed=true;if(c.geometry)geometries.add(c.geometry);if(c.material)for(const m of Array.isArray(c.material)?c.material:[c.material])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());mesh.parent?.remove(mesh);}

// Camera-local, brief equip/cast pose. Its silhouette stays below the crosshair.
export class AbilityCastView {
 constructor(camera){
  this.root=new T.Group();this.root.name='ability-cast-hands';camera.add(this.root);this.root.visible=false;this.remaining=0;this.elapsed=0;this.hands=new T.Group();this.root.add(this.hands);
  this.handsRig=new FirstPersonHands('jett','orb',null);this.root.remove(this.hands);this.hands=this.handsRig.root;this.root.add(this.hands);
  const orbMat=shader(`uniform float nativeFade;uniform float cloveTint;void main(){float rim=pow(1.-abs(normalize(vN).z),2.);float n=noise(vP*18.+vec3(time*.35));vec3 c=mix(vec3(.04,.38,.36),vec3(.12,1.,.78),rim*.65+n*.5);c=mix(c,vec3(.18,.12,.46)*(.55+rim*.55+n*.35),cloveTint);gl_FragColor=vec4(c,(.65+rim*.32)*nativeFade);}`,{side:T.FrontSide});
  this.orb=new T.Group();this.orb.position.set(.10,-.15,-.75);this.root.add(this.orb);
  orbMat.uniforms.nativeFade={value:1};orbMat.uniforms.cloveTint={value:0};this.orb.add(new T.Mesh(new T.SphereGeometry(.145,32,24),orbMat));
  const core=new T.Mesh(new T.IcosahedronGeometry(.043,1),new T.MeshBasicMaterial({color:0x71ffe6}));core.scale.set(.7,1.25,.7);this.orb.add(core);
  for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(.151,.0035,6,64),new T.MeshBasicMaterial({color:0x40f4d0,transparent:true,opacity:.18}));ring.rotation.set(i*.9,.4+i*.6,0);this.orb.add(ring);}
  this.wind=new T.Group();this.root.add(this.wind);for(let i=0;i<7;i++){const w=new T.Mesh(new T.TorusGeometry(.43+i*.035,.003,4,28,1.4),new T.MeshBasicMaterial({color:0xc8edf4,transparent:true,opacity:.4,depthTest:false}));w.position.z=-.8-i*.06;w.rotation.z=i*2.4;this.wind.add(w);}
 }
 setAgent(agent){this.agent=agent;this.handsRig.setAgent(agent);const purple=['clove','iso','omen','reyna'].includes(agent);this.orb.children[0].material.uniforms.cloveTint={value:purple?1:0};this.orb.children[1].material.color.setHex(purple?0xf9b5ff:0x71ffe6);for(const ring of this.orb.children.slice(2))if(ring.material)ring.material.color.setHex(purple?0xc8a1ef:0x40f4d0);if(agent==='phoenix'&&!this.orbPromise)this.orbPromise=attachSageOrb(this.orb,.28).then(model=>{this.referencedOrb=model;this.syncOrb();});this.syncOrb();}
 syncOrb(){const native=this.agent==='phoenix'&&!!this.referencedOrb;if(this.referencedOrb)this.referencedOrb.visible=native;this.orb.children[0].material.uniforms.nativeFade.value=native?.28:1;this.orb.children[1].visible=!native;}
 get active(){return this.held||this.remaining>0;}
 play(kind,duration=.85){this.held=false;this.kind=kind;this.duration=duration;this.remaining=duration;this.elapsed=0;this.root.visible=true;this.hands.visible=this.orb.visible=kind==='orb';this.wind.visible=kind==='wind';}
 holdOrb(){this.play('orb',1);this.held=true;this.root.position.y=0;}
 cancel(){this.held=false;this.remaining=0;this.root.visible=false;}
 update(dt,enabled){this.handsRig.update({dt});if(!enabled)this.cancel();if(!this.active)return;this.elapsed+=dt;if(this.held){this.root.position.y=0;this.orb.rotation.y+=dt*.65;updateEffect(this.orb,this.elapsed);return;}this.remaining=Math.max(0,this.remaining-dt);const t=this.elapsed/this.duration;this.root.position.y=-.32*(Math.max(0,1-t*6)+Math.max(0,(t-.7)/.3));this.orb.rotation.y+=dt*.65;updateEffect(this.orb,this.elapsed);this.wind.rotation.z+=dt*1.8;for(const w of this.wind.children)w.material.opacity=.3*Math.sin(Math.PI*t);this.root.visible=this.active;}
}

export function makeCloveSmoke(){
 const material=shader(`void main(){vec3 p=normalize(vP);float n=noise(p*4.+vec3(time*.14,time*.06,0.));float thread=pow(max(0.,sin(p.y*17.+atan(p.z,p.x)*3.+n*4.-time*.8)),12.);vec3 c=mix(vec3(.20,.10,.31),vec3(.49,.36,.65),n);c+=thread*vec3(.15,.13,.19);gl_FragColor=vec4(c,fade);}`,{side:T.DoubleSide,depthWrite:true});
 const mesh=new T.Mesh(new T.SphereGeometry(4.2,32,20),material);mesh.name='clove-ruse-smoke';mesh.userData.smokeRadius=4.2;return mesh;
}
export function makeMeddleOrb(){
 const root=new T.Group();root.name='clove-meddle-orb';root.add(new T.Mesh(new T.IcosahedronGeometry(.18,2),new T.MeshBasicMaterial({color:0xa28ad8})));const ring=new T.Mesh(new T.TorusGeometry(.22,.018,5,24),new T.MeshBasicMaterial({color:0xffc4ef}));ring.rotation.x=.8;root.add(ring);return root;
}

export function makeCloveRevival(){
 const root=new T.Group();root.name='clove-revival-butterflies';
 for(let i=0;i<3;i++){const material=new T.MeshBasicMaterial({color:i===1?0xf6b8ef:0xa888e0,transparent:true,opacity:.8,depthWrite:false});const ring=new T.Mesh(new T.TorusGeometry(.55+i*.22,.018,5,36),material);ring.rotation.x=Math.PI/2;ring.position.y=.16+i*.55;root.add(ring);const butterfly=new T.Group();butterfly.position.set(Math.cos(i*2.1)*.55,.65+i*.45,Math.sin(i*2.1)*.55);for(const sign of [-1,1]){const wing=new T.Mesh(new T.OctahedronGeometry(.19,0),material);wing.position.x=sign*.14;wing.scale.set(1,.7,.15);wing.rotation.z=sign*.6;butterfly.add(wing);}root.add(butterfly);}
 return root;
}
