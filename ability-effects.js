// Lightweight procedural effects; geometry and shaders are authored for this trainer.
const T=globalThis.THREE;
const vertex=`varying vec3 vP;varying vec3 vN;void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise=`float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
function shader(fragment,extra={}){return new T.ShaderMaterial({uniforms:{time:{value:0},fade:{value:1}},vertexShader:vertex,fragmentShader:`uniform float time;uniform float fade;varying vec3 vP;varying vec3 vN;${noise}\n${fragment}`,transparent:true,depthWrite:false,...extra});}

const paths={
 jettC:'<path d="M34 6c-9-4-22 1-25 11l7-1c-4 6-2 16 5 20l-1-8c4 5 11 7 17 3l-7-3c9-1 14-8 11-16l-5 5c1-5 0-8-2-11Z"/>',
 jettQ:'<path d="m8 29 16-17 16 17-7 1-9-10-9 10Zm0 12 16-17 16 17-7 1-9-10-9 10ZM18 9l6-7 6 7-6-2Z"/>',
 jettE:'<path d="M3 22h24l-5-5 5-5 18 12-18 12-5-5 5-5H3Zm7-12h13l-4 5H7Zm0 23h9l4 5H13Z"/>',
 jettX:'<path d="m22 3 2 28 2-28 3 11-5 24-5-24ZM5 9l14 22-4-2-9-11Zm38 0L29 31l4-2 9-11ZM8 31l11 3-6 3Zm32 0-11 3 6 3ZM20 41l4-4 4 4-4 5Z"/>',
 sageC:'<path d="m3 14 8-3v26l-8-3Zm11-5 9-3v36l-9-3Zm12-3 9 3v30l-9 3Zm12 5 7 3v20l-7 3Z"/>',
 sageQ:'<path fill-rule="evenodd" d="M24 5C13 5 6 13 6 24s8 19 19 19c9 0 16-6 18-14-5 6-12 6-17 2-6-5-4-15 2-18l-5-2 6-5Zm-2 10c-8 3-9 14-1 20-10-1-14-17 1-20Z"/>',
 sageE:'<circle cx="24" cy="21" r="7"/><path d="M22 1h4v9h-4ZM4 18h9v4H4Zm31 0h9v4h-9ZM7 5l8 7-3 3-7-8Zm34 0 2 2-7 8-3-3ZM10 28l14 10 14-10-4 10-10 7-10-7Z"/>',
 sageX:'<path d="M24 12C19 2 7 3 5 12c-3 10 8 18 19 27 11-9 22-17 19-27-2-9-14-10-19 0Z"/><path d="m7 31 9 7-7-2Zm34 0-9 7 7-2ZM20 42h8l-4 5Z"/>'

};
export function abilityIcon(agent,key){const name=(agent==='jett'?'jett':'sage')+key.toUpperCase();return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="currentColor">${paths[name]||paths.jettC}</svg>`;}

export function makeCloudburst(){
 const material=shader(`void main(){vec3 p=normalize(vP);float n=noise(p*5.+vec3(time*.22,0.,time*.17));float band=pow(max(0.,sin(p.y*18.+atan(p.z,p.x)*2.7+n*3.-time*2.)),18.);float wisps=noise(p*19.+vec3(time*.5,-time*.15,0.));vec3 col=mix(vec3(.38,.52,.61),vec3(.78,.87,.90),n*.7+band*.15);col+=band*.07+wisps*.045;gl_FragColor=vec4(col,fade);}`,{side:T.DoubleSide,depthWrite:true});
 const mesh=new T.Mesh(new T.SphereGeometry(3.8,48,32),material);mesh.name='cloudburst-wind-shell';return mesh;
}
export function makeBarrier(){
 const mat=shader(`void main(){float n=noise(vP*2.5);float seam=pow(1.-abs(sin(vP.x*8.+vP.y*3.+n*3.)),18.);float frost=noise(vP*18.);vec3 col=mix(vec3(.10,.46,.47),vec3(.47,.94,.79),smoothstep(-1.8,1.8,vP.y));col+=seam*vec3(.3,.35,.4)+frost*.09;gl_FragColor=vec4(col,fade*.95);}`,{depthWrite:true});
 const wall=new T.Mesh(new T.BoxGeometry(6.8,3.6,1.2),mat);wall.name='sage-four-segment-barrier';
 // Four distinct sections share one collision and health volume.
 for(let i=0;i<4;i++){const cap=new T.Mesh(new T.IcosahedronGeometry(.6,0),new T.MeshStandardMaterial({color:0x9af5d8,emissive:0x0c4945,roughness:.25}));cap.scale.set(1.3,.22,.75);cap.position.set(-2.55+i*1.7,1.78,0);wall.add(cap);if(i<3){const seam=new T.Mesh(new T.BoxGeometry(.055,3.58,1.21),new T.MeshBasicMaterial({color:0x143d43}));seam.position.x=-1.7+i*1.7;wall.add(seam);}}
 return wall;
}
export function makeSlowField(){
 const material=shader(`void main(){vec2 p=vP.xy;float edge=1.-smoothstep(4.4,5.,length(p));vec2 cell=floor(p*3.);float crystal=hash(vec3(cell,0.));float lines=pow(1.-min(fract(p.x*3.),fract(p.y*3.)),14.);float shimmer=pow(max(0.,sin(crystal*22.+time*2.)),12.);vec3 c=mix(vec3(.04,.33,.36),vec3(.22,.84,.76),crystal);gl_FragColor=vec4(c+lines*.25+shimmer*.18,edge*.76*fade);}`,{side:T.DoubleSide});
 const mesh=new T.Mesh(new T.CircleGeometry(5,64),material);mesh.rotation.x=-Math.PI/2;mesh.name='sage-crystal-slow-field';
 let seed=7;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const g=new T.IcosahedronGeometry(.13,0),m=new T.MeshStandardMaterial({color:0x9ff5dd,emissive:0x116b68,roughness:.2,transparent:true,opacity:.85});
 for(let i=0;i<65;i++){const r=Math.sqrt(rand())*4.7,a=rand()*Math.PI*2,c=new T.Mesh(g,m);c.position.set(Math.cos(a)*r,Math.sin(a)*r,.05);c.scale.set(.5+rand(),.6+rand(),.3+rand());c.rotation.set(rand(),rand(),rand());mesh.add(c);}
 return mesh;
}
export function updateEffect(mesh,time,fade=1){mesh.traverse(child=>{const m=child.material;if(m?.uniforms?.time){m.uniforms.time.value=time;m.uniforms.fade.value=fade;}});}
export function disposeEffect(mesh){const geometries=new Set(),materials=new Set();mesh.traverse(c=>{if(c.geometry)geometries.add(c.geometry);if(c.material)materials.add(c.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());mesh.parent?.remove(mesh);}

// Camera-local, brief equip/cast pose. Its silhouette stays below the crosshair.
export class AbilityCastView {
 constructor(camera){
  this.root=new T.Group();this.root.name='ability-cast-hands';camera.add(this.root);this.root.visible=false;this.remaining=0;this.elapsed=0;this.hands=new T.Group();this.root.add(this.hands);
  const skin=shader(`void main(){float light=.68+.32*max(0.,dot(normalize(vN),normalize(vec3(-.4,.7,.6))));gl_FragColor=vec4(vec3(.69,.49,.38)*light,1.);}`,{transparent:false,depthWrite:true}),sleeve=new T.MeshBasicMaterial({color:0x071e20,toneMapped:false});
  for(const side of [-1,1]){const hand=new T.Group();hand.position.set(side*.30,-.31,-.62);hand.rotation.z=side*-.35;const arm=new T.Mesh(new T.CylinderGeometry(.048,.067,.36,12),sleeve);arm.rotation.x=Math.PI/2;arm.position.set(side*.04,-.12,.16);hand.add(arm);const palm=new T.Mesh(new T.SphereGeometry(.065,12,8),skin);palm.scale.set(.8,.45,1.25);hand.add(palm);for(let i=0;i<4;i++){const finger=new T.Mesh(new T.CylinderGeometry(.010,.013,.09,8),skin);finger.rotation.x=.75;finger.rotation.z=side*(i-1)*.12;finger.position.set((i-1.5)*.026,.028,-.047);hand.add(finger);}const thumb=new T.Mesh(new T.SphereGeometry(.025,8,6),skin);thumb.scale.set(1,1.6,1);thumb.position.set(side*-.065,.02,.015);hand.add(thumb);this.hands.add(hand);}
  const orbMat=shader(`void main(){float rim=pow(1.-abs(normalize(vN).z),2.);float n=noise(vP*18.+vec3(time*.35));vec3 c=mix(vec3(.04,.38,.36),vec3(.12,1.,.78),rim*.65+n*.5);gl_FragColor=vec4(c,.65+rim*.32);}`,{side:T.FrontSide});
  this.orb=new T.Group();this.orb.position.set(.10,-.15,-.75);this.root.add(this.orb);
  this.orb.add(new T.Mesh(new T.SphereGeometry(.145,32,24),orbMat));
  const core=new T.Mesh(new T.IcosahedronGeometry(.043,1),new T.MeshBasicMaterial({color:0x71ffe6}));core.scale.set(.7,1.25,.7);this.orb.add(core);
  for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(.151,.0035,6,64),new T.MeshBasicMaterial({color:0x40f4d0,transparent:true,opacity:.18}));ring.rotation.set(i*.9,.4+i*.6,0);this.orb.add(ring);}
  this.wind=new T.Group();this.root.add(this.wind);for(let i=0;i<7;i++){const w=new T.Mesh(new T.TorusGeometry(.43+i*.035,.003,4,28,1.4),new T.MeshBasicMaterial({color:0xc8edf4,transparent:true,opacity:.4,depthTest:false}));w.position.z=-.8-i*.06;w.rotation.z=i*2.4;this.wind.add(w);}
 }
 get active(){return this.remaining>0;}
 play(kind,duration=.85){this.kind=kind;this.duration=duration;this.remaining=duration;this.elapsed=0;this.root.visible=true;this.hands.visible=this.orb.visible=kind==='orb';this.wind.visible=kind==='wind';}
 cancel(){this.remaining=0;this.root.visible=false;}
 update(dt,enabled){if(!enabled)this.cancel();if(!this.active)return;this.elapsed+=dt;this.remaining=Math.max(0,this.remaining-dt);const t=this.elapsed/this.duration;this.root.position.y=-.32*(Math.max(0,1-t*6)+Math.max(0,(t-.7)/.3));this.orb.rotation.y+=dt*.65;updateEffect(this.orb,this.elapsed);this.wind.rotation.z+=dt*1.8;for(const w of this.wind.children)w.material.opacity=.3*Math.sin(Math.PI*t);this.root.visible=this.active;}
}
