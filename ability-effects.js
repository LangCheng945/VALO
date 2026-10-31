import {FirstPersonHands} from './first-person-view.js?v=agents28';
// Lightweight procedural effects; geometry and shaders are authored for this trainer.
const T=globalThis.THREE;
const vertex=`varying vec3 vP;varying vec3 vN;void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise=`float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
function shader(fragment,extra={}){return new T.ShaderMaterial({uniforms:{time:{value:0},fade:{value:1}},vertexShader:vertex,fragmentShader:`uniform float time;uniform float fade;varying vec3 vP;varying vec3 vN;${noise}\n${fragment}`,transparent:true,depthWrite:false,...extra});}

// Traced as clean silhouettes from the user's Sage / Jett reference sheets.
// C / Q / E / X follow the existing bindings. Sticker borders are omitted for HUD legibility.
const paths={
    sageC: `<path d="M3 22H22V40L12 33L22 48V79H3V59L12 65L3 50ZM28 22H47V79H28V61L34 66L28 50ZM53 22H59L63 37L68 22H72V79H53V58L60 64L53 48ZM78 22H97V42L89 37L97 52V79H78V61L86 67L78 52Z"/>`,
    sageQ: `<circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" stroke-width="7"/>
        <path d="M48 20L57 25L58 45L64 33L61 17C79 22 89 41 81 61L72 53L67 39L67 61L56 55L43 68L63 71L53 81C35 83 20 72 17 59L28 63L43 51L34 51L18 55C15 42 22 28 35 21L43 25L36 40L47 33Z"/>`,
    sageX: `<circle cx="50" cy="55" r="18"/><circle cx="50" cy="12" r="3.5"/><circle cx="60" cy="26" r="5"/><circle cx="39" cy="28" r="2"/>
        <path d="M12 21L36 40L29 49L19 40L31 58L25 67L17 59L29 76L50 89L71 76L83 59L75 67L69 58L81 40L71 49L64 40L88 21L87 39L78 52L86 48L80 66L71 75L78 72L70 84L50 99L30 84L22 72L29 75L20 66L14 48L22 52L13 39Z"/>`,
    sageE: `<path fill-rule="evenodd" d="M50 23C38 7 24 8 14 16C1 26 3 43 15 55L50 91L85 55C97 43 99 26 86 16C76 8 62 7 50 23ZM50 38C46 48 43 52 32 55C43 57 46 62 50 73C54 62 57 57 68 55C57 52 54 48 50 38Z"/>`,
    jettC: `<path fill-rule="evenodd" d="M51 2C51 12 62 14 72 21C87 31 95 48 90 65C86 83 68 87 52 98C52 88 43 88 31 81C11 71 7 53 13 36C19 19 38 15 51 2ZM54 31C70 40 72 54 62 65C54 74 43 77 34 71C48 75 59 65 57 54C56 44 50 40 42 37C55 40 56 52 47 57C39 62 28 55 29 46C30 33 43 27 54 31Z"/>`,
    jettQ: `<path d="M13 32L50 3L87 32V52L50 21L13 52ZM17 61L50 34L83 61V77L50 51L17 77ZM36 83L50 66L64 83V98L50 85L36 98Z"/>`,
    jettE: `<path d="M30 10H46C58 10 64 16 71 23L97 50L71 77C64 84 58 90 46 90H30L37 79H24L18 72H47C54 72 57 68 60 64H7L2 56H62L70 50L62 44H2L7 36H60C57 32 54 28 47 28H18L24 21H37Z"/>`,
    jettX: `<path d="M50 3C44 18 40 33 41 52L46 58H54L59 52C60 33 56 18 50 3ZM45 75H55L54 96H46Z"/>
        <circle cx="50" cy="66" r="9" fill="none" stroke="currentColor" stroke-width="5"/>
        <g transform="rotate(-22 25 67)"><path d="M25 16C19 29 17 40 18 55L22 59H28L32 55C33 40 31 29 25 16ZM21 75H29L28 92H22Z"/><circle cx="25" cy="67" r="7" fill="none" stroke="currentColor" stroke-width="4.5"/></g>
        <g transform="rotate(22 75 67)"><path d="M75 16C69 29 67 40 68 55L72 59H78L82 55C83 40 81 29 75 16ZM71 75H79L78 92H72Z"/><circle cx="75" cy="67" r="7" fill="none" stroke="currentColor" stroke-width="4.5"/></g>`
};
export function abilityIcon(agent,key){
    if(!['jett','phoenix'].includes(agent))return '';
    const character=agent==='jett'?'jett':'sage';
    const name=character+key.toUpperCase();
    return `<svg viewBox="0 0 100 100" data-agent="${character}" aria-hidden="true" focusable="false" fill="currentColor">${paths[name]||paths.jettC}</svg>`;
}

export function makeCloudburst(){
 const material=shader(`void main(){vec3 p=normalize(vP);float n=noise(p*5.+vec3(time*.22,0.,time*.17));float band=pow(max(0.,sin(p.y*18.+atan(p.z,p.x)*2.7+n*3.-time*2.)),18.);float wisps=noise(p*19.+vec3(time*.5,-time*.15,0.));vec3 col=mix(vec3(.38,.52,.61),vec3(.78,.87,.90),n*.7+band*.15);col+=band*.07+wisps*.045;gl_FragColor=vec4(col,fade);}`,{side:T.DoubleSide,depthWrite:true});
 const mesh=new T.Mesh(new T.SphereGeometry(3.8,48,32),material);mesh.name='cloudburst-wind-shell';return mesh;
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
 const shell=new T.Mesh(new T.SphereGeometry(.16,20,16),shader(`void main(){float rim=pow(1.-abs(normalize(vN).z),2.);float veins=pow(1.-abs(sin(vP.x*50.+vP.y*35.+noise(vP*20.)*3.)),12.);gl_FragColor=vec4(vec3(.05,.65,.58)+rim*vec3(.25,.35,.3)+veins*.25,.83);}`,{depthWrite:true}));root.add(shell);
 const core=new T.Mesh(new T.IcosahedronGeometry(.08,0),new T.MeshBasicMaterial({color:0xabffe2}));core.rotation.z=.4;root.add(core);return root;
}
export function makeSlowField(){
 const material=shader(`void main(){vec2 p=vP.xy;float edge=1.-smoothstep(4.35,5.,length(p));vec2 grid=floor(p*2.7),f=fract(p*2.7);float first=10.,second=10.;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 cell=vec2(float(x),float(y));vec2 jitter=vec2(hash(vec3(grid+cell,1.)),hash(vec3(grid+cell,3.)));float d=length(cell+jitter-f);if(d<first){second=first;first=d;}else{second=min(second,d);}}}float cracks=1.-smoothstep(.012,.065,second-first);float frost=noise(vec3(p*11.,0.));float glint=pow(max(0.,sin(frost*20.+time*.7)),18.);vec3 c=mix(vec3(.035,.28,.29),vec3(.20,.65,.55),noise(vec3(p*2.,1.)));c+=cracks*vec3(.18,.34,.30)+glint*.045;gl_FragColor=vec4(c,edge*.56*fade);}`,{side:T.DoubleSide});
 const mesh=new T.Mesh(new T.CircleGeometry(5,64),material);mesh.rotation.x=-Math.PI/2;mesh.name='sage-crystal-slow-field';
 let seed=7;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const g=new T.IcosahedronGeometry(.13,0),m=new T.MeshBasicMaterial({color:0x8ee8d4,transparent:true,opacity:.65});
 for(let i=0;i<65;i++){const r=Math.sqrt(rand())*4.7,a=rand()*Math.PI*2,c=new T.Mesh(g,m);c.position.set(Math.cos(a)*r,Math.sin(a)*r,.05);c.scale.set(.5+rand(),.6+rand(),.3+rand());c.rotation.set(rand(),rand(),rand());mesh.add(c);}
 return mesh;
}
export function updateEffect(mesh,time,fade=1){mesh.traverse(child=>{const m=child.material;if(m?.uniforms?.time){m.uniforms.time.value=time;m.uniforms.fade.value=fade;}});}
export function disposeEffect(mesh){const geometries=new Set(),materials=new Set();mesh.traverse(c=>{if(c.geometry)geometries.add(c.geometry);if(c.material)materials.add(c.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());mesh.parent?.remove(mesh);}

// Camera-local, brief equip/cast pose. Its silhouette stays below the crosshair.
export class AbilityCastView {
 constructor(camera){
  this.root=new T.Group();this.root.name='ability-cast-hands';camera.add(this.root);this.root.visible=false;this.remaining=0;this.elapsed=0;this.hands=new T.Group();this.root.add(this.hands);
  this.handsRig=new FirstPersonHands('jett','orb',null);this.root.remove(this.hands);this.hands=this.handsRig.root;this.root.add(this.hands);
  const orbMat=shader(`void main(){float rim=pow(1.-abs(normalize(vN).z),2.);float n=noise(vP*18.+vec3(time*.35));vec3 c=mix(vec3(.04,.38,.36),vec3(.12,1.,.78),rim*.65+n*.5);gl_FragColor=vec4(c,.65+rim*.32);}`,{side:T.FrontSide});
  this.orb=new T.Group();this.orb.position.set(.10,-.15,-.75);this.root.add(this.orb);
  this.orb.add(new T.Mesh(new T.SphereGeometry(.145,32,24),orbMat));
  const core=new T.Mesh(new T.IcosahedronGeometry(.043,1),new T.MeshBasicMaterial({color:0x71ffe6}));core.scale.set(.7,1.25,.7);this.orb.add(core);
  for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(.151,.0035,6,64),new T.MeshBasicMaterial({color:0x40f4d0,transparent:true,opacity:.18}));ring.rotation.set(i*.9,.4+i*.6,0);this.orb.add(ring);}
  this.wind=new T.Group();this.root.add(this.wind);for(let i=0;i<7;i++){const w=new T.Mesh(new T.TorusGeometry(.43+i*.035,.003,4,28,1.4),new T.MeshBasicMaterial({color:0xc8edf4,transparent:true,opacity:.4,depthTest:false}));w.position.z=-.8-i*.06;w.rotation.z=i*2.4;this.wind.add(w);}
 }
 setAgent(agent){this.handsRig.setAgent(agent);}
 get active(){return this.held||this.remaining>0;}
 play(kind,duration=.85){this.held=false;this.kind=kind;this.duration=duration;this.remaining=duration;this.elapsed=0;this.root.visible=true;this.hands.visible=this.orb.visible=kind==='orb';this.wind.visible=kind==='wind';}
 holdOrb(){this.play('orb',1);this.held=true;this.root.position.y=0;}
 cancel(){this.held=false;this.remaining=0;this.root.visible=false;}
 update(dt,enabled){this.handsRig.update({dt});if(!enabled)this.cancel();if(!this.active)return;this.elapsed+=dt;if(this.held){this.root.position.y=0;this.orb.rotation.y+=dt*.65;updateEffect(this.orb,this.elapsed);return;}this.remaining=Math.max(0,this.remaining-dt);const t=this.elapsed/this.duration;this.root.position.y=-.32*(Math.max(0,1-t*6)+Math.max(0,(t-.7)/.3));this.orb.rotation.y+=dt*.65;updateEffect(this.orb,this.elapsed);this.wind.rotation.z+=dt*1.8;for(const w of this.wind.children)w.material.opacity=.3*Math.sin(Math.PI*t);this.root.visible=this.active;}
}
