import {AGENTS,normalizeAgent} from './multiplayer/agents.mjs?v=roles1';
import {FIREARMS,isSidearm} from './multiplayer/firearms.mjs?v=armory1';
import {KARAMBIT_DRAW_SECONDS} from './karambit-rules.mjs';
// Authored first-person hands and detachable magazines. No gameplay collision lives here.
const T=globalThis.THREE;
const up=new T.Vector3(0,1,0),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createViewEnvironment(renderer){
 const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#b9d5e3');g.addColorStop(.42,'#667e90');g.addColorStop(.52,'#303c4b');g.addColorStop(1,'#17202b');x.fillStyle=g;x.fillRect(0,0,512,256);
 for(const [left,width]of[[58,45],[318,70]]){const band=x.createLinearGradient(left,0,left+width,0);band.addColorStop(0,'#637c8e');band.addColorStop(.5,'#d8e4e9');band.addColorStop(1,'#637c8e');x.fillStyle=band;x.fillRect(left,50,width,100);}
 const texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;texture.mapping=T.EquirectangularReflectionMapping;
 const generator=new T.PMREMGenerator(renderer),target=generator.fromEquirectangular(texture);texture.dispose();generator.dispose();return target;
}
function beam(start,end,r1,r2,mat){const d=end.clone().sub(start),m=new T.Mesh(new T.CylinderGeometry(r2,r1,d.length(),10),mat);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,d.normalize());return m;}
function forearmGeometry(){
 const rings=[[-.5,.052],[-.32,.056],[0,.050],[.28,.040],[.5,.033]],sides=12,positions=[],indices=[];
 for(const [y,radius]of rings)for(let i=0;i<=sides;i++){const angle=i/sides*Math.PI*2;positions.push(Math.cos(angle)*radius*1.1,y,Math.sin(angle)*radius*.88);}
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<sides;i++){const a=r*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function ellipsoid(position,scale,material){const m=new T.Mesh(new T.SphereGeometry(1,12,8),material);m.position.copy(position);m.scale.set(...scale);return m;}
// Fingers are baked by material after posing, keeping the number of draw calls small.
function bakeHand(group){
 group.updateMatrixWorld(true);const buckets=new Map();group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);let b=buckets.get(m.material);if(!b)buckets.set(m.material,b=[]);b.push(g);});
 const old=new Set();group.traverse(m=>{if(m.geometry)old.add(m.geometry)});group.clear();old.forEach(g=>g.dispose());
 for(const [material,parts]of buckets){const n=parts.reduce((sum,g)=>sum+g.attributes.position.count,0),p=new Float32Array(n*3),normals=new Float32Array(n*3),uv=new Float32Array(n*2);let offset=0;for(const g of parts){p.set(g.attributes.position.array,offset*3);normals.set(g.attributes.normal.array,offset*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,offset*2);offset+=g.attributes.position.count;g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));group.add(new T.Mesh(g,material));}
}
function makeHand(side,materials,open=false){
 const root=new T.Group();root.name=side<0?'left-articulated-hand':'right-articulated-hand';
 root.add(ellipsoid(new T.Vector3(0,0,.005),[.046,.022,.062],materials.skin));
 root.add(ellipsoid(new T.Vector3(0,.014,.012),[.043,.011,.049],materials.glove));
 const lengths=[.069,.079,.073,.057];
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.023,z=-.042+Math.abs(i-1.4)*.006,l=lengths[i],curl=open?.12:1;
  const points=[new T.Vector3(x,0,z),new T.Vector3(x, -.010*curl,z-l*.47),new T.Vector3(x,-.035*curl,z-l*.72),new T.Vector3(x,-.053*curl,z-l*.47)];
  if(open){points[2].z=z-l*.78;points[3].z=z-l;points.forEach((p,j)=>p.x+=side*(i-1.5)*j*.002);}
  root.add(ellipsoid(points[0],[.011,.012,.012],materials.glove));
  for(let j=0;j<3;j++){const radius=.0105-j*.0012;root.add(beam(points[j],points[j+1],radius,radius*.93,j===0?materials.glove:materials.skin));root.add(ellipsoid(points[j+1],[radius*.93,radius*.93,radius*.93],materials.skin));}
 }
 const thumb=[new T.Vector3(-side*.038,-.002,.025),new T.Vector3(-side*.058,-.017,-.005),new T.Vector3(-side*(open?.067:.040),-.041,-.033)];
 for(let i=0;i<2;i++){root.add(beam(thumb[i],thumb[i+1],.014-i*.002,.012-i*.002,i===0?materials.glove:materials.skin));root.add(ellipsoid(thumb[i+1],[.012,.012,.012],materials.skin));}
 root.add(beam(new T.Vector3(0,0,.045),new T.Vector3(0,0,.105),.032,.031,materials.skin));
 bakeHand(root);return root;
}
const profiles={
 vandal:{right:[.285,-.365,-.34],left:[.203,-.280,-.70],mag:[.25,-.298,-.51]},
 phantom:{right:[.285,-.365,-.34],left:[.203,-.280,-.69],mag:[.25,-.300,-.50]},
 classic:{right:[.285,-.355,-.34],left:[.207,-.385,-.32],mag:[.25,-.396,-.35]},
 operator:{right:[.285,-.365,-.34],left:[.202,-.270,-.79],mag:[.25,-.300,-.55]},
 odin:{right:[.315,-.365,-.34],left:[.16,-.285,-.78],mag:[.25,-.45,-.51]},
 melee:{right:[.31,-.24,-.63],left:[-.17,-.39,-.50],mag:[0,0,0]},
 orb:{right:[.29,-.26,-.68],left:[-.10,-.26,-.68],mag:[0,0,0]},
 bladestorm:{right:[.30,-.30,-.55],left:[-.30,-.30,-.55],mag:[0,0,0]}
};
for(const key of Object.keys(FIREARMS))profiles[key] ||= profiles[isSidearm(key)?'classic':FIREARMS[key].category==='sniper'?'operator':FIREARMS[key].category==='heavy'?'odin':'vandal'];
// Normalized keyframes use eased segments: pauses make removal, insertion and settling legible.
function track(t,frames){
 for(let i=1;i<frames.length;i++){const a=frames[i-1],b=frames[i];if(t<=b[0]){const f=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*f);}}
 return frames[frames.length-1].slice(1);
}
export function weaponMotion(key,{reload=0,draw=1}={}){
 const heavy=key==='odin',pistol=isSidearm(key),melee=key==='melee'||key==='bladestorm';
 const [lift,tilt,pitch]=reload>0?track(reload,[[0,0,0,0],[.16,.025,pistol?-.24:.22,-.06],[.30,.035,heavy?.16:.30,-.09],[.65,.035,heavy?.16:.30,-.09],[.78,.018,.16,-.035],[.84,.008,-.035,.025],[.95,0,0,0],[1,0,0,0]]):[0,0,0];
 const [lower,roll,forward]=track(draw,[[0,1,1,1],[.22,.76,.85,.7],[.70,-.035,-.08,0],[1,0,0,0]]);
 return {position:[lower*.065,-lower*(heavy?.40:melee?.34:.30)+lift,forward*.12],rotation:[pitch+lower*.26,lower*-.12,tilt+roll*(melee?-.42:.26)]};
}
export function weaponDrawDuration(key){return key==='odin'?.72:key==='operator'?.64:isSidearm(key)?.40:key==='melee'?KARAMBIT_DRAW_SECONDS:key==='bladestorm'?.44:.52;}
export class FirstPersonHands{
 constructor(agent,key,environment){
  this.key=key;this.profile=profiles[key]||profiles.vandal;this.root=new T.Group();this.root.name='first-person-hands';this.elapsed=0;
  const sage=agent!=='jett';const skin=new T.MeshStandardMaterial({color:0x9c624a,roughness:.84,metalness:0,envMap:environment,envMapIntensity:.12});
  const glove=new T.MeshStandardMaterial({color:sage?0xa3674d:0x030b10,roughness:.91,envMap:environment,envMapIntensity:.2});
  const sleeve=new T.MeshStandardMaterial({color:sage?0x546761:0x08171b,roughness:.94});const cuff=new T.MeshStandardMaterial({color:sage?0x0e7566:0x21616a,roughness:.65,metalness:.12});
  this.materials={skin,glove,sleeve,cuff};for(const m of Object.values(this.materials))m.color.convertSRGBToLinear();this.arms=[];
  for(const side of [-1,1]){
   const hand=makeHand(side,this.materials,key==='orb'||key==='bladestorm'||key==='melee'&&side<0);hand.userData.side=side;this.root.add(hand);
   const arm=new T.Group();arm.name=side<0?'left-tailored-sleeve':'right-tailored-sleeve';
   const sleeveMesh=new T.Mesh(forearmGeometry(),sleeve);arm.add(sleeveMesh);
   const end=new T.Mesh(new T.CylinderGeometry(.036,.037,.035,12),cuff);arm.add(end);
   const seam=new T.Mesh(new T.TorusGeometry(.035,.0014,4,16),cuff);seam.rotation.x=Math.PI/2;arm.add(seam);this.root.add(arm);
   this.arms.push({side,hand,arm,sleeveMesh,cuff:end,seam});
  }
  this.setAgent(agent);this.update({});
 }
 setAgent(agent){const colors=AGENTS[normalizeAgent(agent)].hands;for(const key of ['skin','glove','sleeve','cuff'])this.materials[key].color.setHex(colors[key]).convertSRGBToLinear();}
 update({reload=0,magazine=null,inspect=0,meleeGrip=null,dt=0}={}){
  this.elapsed+=dt;const p=this.profile;
  for(const a of this.arms){
   let target=new T.Vector3(...(a.side<0?p.left:p.right));let roll=a.side<0?1.12:-1.15;
   if(a.side<0&&reload>0&&magazine){
    const grasp=new T.Vector3(-.045,-.04,.01).applyEuler(magazine.rotation).add(magazine.position);
    const blend=reload<.16?smooth(reload/.16):reload>.78?1-smooth((reload-.78)/.20):1;
    target.lerp(grasp,blend);roll=T.MathUtils.lerp(roll,.65+magazine.rotation.z,blend);
    // After seating, briefly tap the receiver before returning to the support grip.
    const tap=reload>.79&&reload<.96?Math.sin((reload-.79)/.17*Math.PI)**2:0;
    const receiver=new T.Vector3(...p.mag).add(new T.Vector3(-.045,.115,.02));
    target.lerp(receiver,tap*.72);roll=T.MathUtils.lerp(roll,.25,tap*.6);
   }
   if(this.key==='melee'&&a.side>0){if(meleeGrip){target.fromArray(meleeGrip.handPosition);a.hand.rotation.set(...meleeGrip.handRotation);}else a.hand.rotation.set(.35,0,-1.15);}else a.hand.rotation.set(-.08,a.side*.08,roll);
   if(this.key==='orb')a.hand.rotation.set(-.15,a.side*-.15,a.side*-.18);
   if(this.key==='bladestorm')a.hand.rotation.set(-.1,a.side*-.25,a.side*.3);
   a.hand.position.copy(target);
   const wrist=new T.Vector3(0,0,.095).applyEuler(a.hand.rotation).add(target);
   const elbow=new T.Vector3(a.side<0?-.18:.50,-.63,.06),direction=wrist.clone().sub(elbow),length=direction.length();
   a.arm.position.copy(elbow).add(wrist).multiplyScalar(.5);a.arm.quaternion.setFromUnitVectors(up,direction.normalize());a.sleeveMesh.scale.y=Math.max(.01,length);a.cuff.position.y=length*.5-.018;a.seam.position.y=length*.5-.037;
  }
 }
}
export function createMagazine(key,material,steel){
 const root=new T.Group();root.name=key+'-detachable-magazine';root.userData.basePosition=new T.Vector3(...(profiles[key]||profiles.vandal).mag);root.position.copy(root.userData.basePosition);
 if(!['vandal','phantom','classic','operator','odin'].includes(key))return root;
 if(key==='odin')return root; // This weapon's original ammunition box is split from its source mesh.
 let geometry;
 if(key==='vandal'){
  const shape=new T.Shape();[[-.042,0],[.042,0],[.054,-.09],[.093,-.218],[.019,-.247],[-.018,-.125]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();geometry=new T.ExtrudeGeometry(shape,{depth:.048,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1});geometry.translate(0,0,-.024);geometry.rotateY(Math.PI/2);
 }else{geometry=new T.BoxGeometry(key==='classic'?.032:.048,key==='operator'?.105:.18,key==='classic'?.045:.075);geometry.translate(0,key==='operator'?-.0525:-.09,0);}
 geometry.computeBoundingBox();const bounds=geometry.boundingBox,uv=geometry.attributes.uv,positions=geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,.34+(positions.getZ(i)-bounds.min.z)/Math.max(.001,bounds.max.z-bounds.min.z)*.22,(positions.getY(i)-bounds.min.y)/Math.max(.001,bounds.max.y-bounds.min.y));
 const body=new T.Mesh(geometry,material);root.add(body);
 const lip=new T.Mesh(new T.BoxGeometry(.052,.018,.083),steel);lip.position.y=-.009;root.add(lip);
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const rib=new T.Mesh(new T.BoxGeometry(.0018,key==='vandal'?.14:.10,.003),steel);rib.position.set(side*.025,-.09,-.025+i*.025);if(key==='vandal'){rib.rotation.x=-.3;rib.position.z-=.025;}root.add(rib);
 }
 root.visible=key!=='classic';return root;
}
export function updateMagazine(magazine,progress,key){
 if(!magazine)return;const base=magazine.userData.basePosition;magazine.position.copy(base);magazine.rotation.set(0,0,0);
 const active=progress>0;
 // The old magazine exits below frame; the fresh one enters from the belt on a new path.
 const [x,y,z,roll]=active?track(progress,[[0,0,0,0,0],[.17,0,0,0,0],[.40,-.08,-.34,.035,.22],[.48,-.13,-.58,.08,.30],[.52,-.13,-.58,.08,-.18],[.60,-.07,-.32,.04,-.12],[.76,0,-.025,0,-.02],[.80,0,.008,0,0],[.84,0,0,0,0],[1,0,0,0,0]]):[0,0,0,0];
 magazine.position.add(new T.Vector3(x,y,z));magazine.rotation.set(0,0,roll);
 magazine.visible=key==='classic'?active&&progress>.17&&progress<.84:!(progress>.46&&progress<.54);
 magazine.userData.reloadStage=!active?'idle':progress<.17?'reach':progress<.46?'remove':progress<.54?'replace':progress<.80?'insert':progress<.96?'settle':'idle';
}
export function disposeViewmodel(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry&&!o.geometry.userData.sharedWeaponGeometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.clear();}
