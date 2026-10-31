import {AgentAvatar} from './agent-avatar.js?v=agents28';
import {disposeActor} from './combat-effects.js?v=avatars1';
const T=globalThis.THREE;
// A separate small preview scene. It only runs while the character picker is open;
// the gameplay renderer already pauses while the buy menu is visible.
export class AgentPreview{
 constructor(host,{skinTexture=null}={}){
  this.host=host;this.skinTexture=skinTexture;this.running=false;this.generation=0;this.yaw=-.18;this.frame=0;this.last=0;this.textures=[];this.onResize=()=>this.resize();
 }
 init(){
  if(this.renderer)return true;
  try{
   this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(35,1,.1,50);this.camera.position.set(.15,1.3,-5);this.camera.lookAt(0,1.25,0);
   this.renderer=new T.WebGLRenderer({alpha:true,antialias:true});this.renderer.outputEncoding=T.sRGBEncoding;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
   this.renderer.setClearColor(0x000000,0);this.renderer.domElement.setAttribute('aria-label','角色 3D 預覽，可拖曳旋轉');this.host.prepend(this.renderer.domElement);
   this.scene.add(new T.HemisphereLight(0xe5f4ff,0x49505f,1.65));const key=new T.DirectionalLight(0xffffff,1.8);key.position.set(-3,5,-4);this.scene.add(key);const rim=new T.DirectionalLight(0x83d7ff,1.2);rim.position.set(2,3,3);this.scene.add(rim);
   const floor=new T.Mesh(new T.CircleGeometry(2.8,64),new T.MeshStandardMaterial({color:0x6a8999,roughness:.6,metalness:.2,transparent:true,opacity:.45}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;this.scene.add(floor);
   const ring=new T.Mesh(new T.RingGeometry(1.78,1.8,64),new T.MeshBasicMaterial({color:0xc3e3ef,transparent:true,opacity:.45,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.018;this.scene.add(ring);
   const canvas=this.renderer.domElement;let pointer=null,lastX=0;
   canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;pointer=event.pointerId;lastX=event.clientX;canvas.setPointerCapture(pointer);});
   canvas.addEventListener('pointermove',event=>{if(event.pointerId!==pointer)return;this.yaw+=(event.clientX-lastX)*.012;lastX=event.clientX;});
   const release=event=>{if(event.pointerId===pointer){if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
   this.observer=new ResizeObserver(this.onResize);this.observer.observe(this.host);this.resize();return true;
  }catch{this.host.dataset.ready='false';return false;}
 }
 resize(){if(!this.renderer)return;const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35,Math.sqrt(1000000/(width*height))));this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.position.z=this.camera.aspect<.65?-6:-5;this.camera.lookAt(0,1.25,0);this.camera.updateProjectionMatrix();}
 async show(agent){
  this.running=true;if(!this.init())return false;this.resize();this.start();
  if(this.agent===agent&&this.appearance?.skin){this.host.dataset.ready='true';return true;}
  this.agent=agent;const generation=++this.generation;this.host.dataset.ready='false';this.yaw=-.18;
  for(const texture of this.textures)texture.dispose();this.textures=[];if(this.group)disposeActor(this.group);this.group=new T.Group();this.scene.add(this.group);this.appearance=new AgentAvatar(this.group,agent,{color:0xc4edff,skinTexture:this.skinTexture});
  const ready=await this.appearance.ready;if(generation!==this.generation)return false;
  if(ready){
   // Keep preview GPU textures independent from gameplay and dispose them when
   // browsing away, rather than retaining every visited role in this renderer.
   const material=this.appearance.skin.mesh.material,copies=new Map();
   for(const key of ['map','roughnessMap','metalnessMap'])if(material[key]){const original=material[key];if(!copies.has(original)){const copy=original.clone();copy.needsUpdate=true;copies.set(original,copy);this.textures.push(copy);}material[key]=copies.get(original);}material.needsUpdate=true;
  }
  this.host.dataset.ready=String(ready===true);return ready===true;
 }
 start(){
  if(this.frame)return;
  const tick=now=>{this.frame=0;if(!this.running)return;this.frame=requestAnimationFrame(tick);if(document.hidden||now-this.last<1000/30)return;const dt=Math.min(.1,(now-this.last)/1000);this.last=now;
   if(this.group){this.group.rotation.y=this.yaw+Math.sin(now*.0004)*.018;this.appearance?.update(dt,{moving:false});}this.renderer.render(this.scene,this.camera);
  };this.frame=requestAnimationFrame(tick);
 }
 stop(){this.running=false;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}
}
