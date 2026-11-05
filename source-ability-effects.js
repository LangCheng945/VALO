// Source meshes, masks and emitter curves from pinned open-aim assets.
// Three.js adapter: gameplay and network events remain owned by the existing kits.
const T=globalThis.THREE,base=new URL('./assets/abilities/open-aim/',import.meta.url),cache=new Map(),textures=new Map();
const eyeVertex='varying vec3 eyeNormal;void main(){eyeNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',eyeFragment='varying vec3 eyeNormal;void main(){vec3 n=normalize(eyeNormal);float d=length(vec2(n.z*2.7,n.y));float pupil=1.-smoothstep(.2,.29,d);float iris=1.-smoothstep(.72,.9,d);vec3 c=mix(vec3(.21,.035,.24),vec3(.85,.19,.60),iris);c=mix(c,vec3(.035,.006,.075),pupil);c+=vec3(.14,.025,.13)*pow(1.-abs(n.x),3.);gl_FragColor=vec4(c,1.);}';
const colors={sky:0xb8f686,rey:0xde69db,vys:0xffdbe9,brc:0xffbf69};
function json(name){if(!cache.has(name))cache.set(name,fetch(new URL(name,base)).then(r=>{if(!r.ok)throw Error(name+': '+r.status);return r.json()}).catch(e=>{cache.delete(name);throw e}));return cache.get(name);}
function texture(name){if(!textures.has(name)){let resolve,reject;const ready=new Promise((a,b)=>{resolve=a;reject=b}),map=new T.TextureLoader().load(new URL(name,base).href,resolve,undefined,reject);map.userData ||= {};map.userData.ready=ready;ready.catch(()=>textures.delete(name));textures.set(name,map);}return textures.get(name);}
function geometry(m){const g=new T.BufferGeometry();const p=[];for(let i=0;i<m.pos.length;i+=3)p.push(m.pos[i],m.pos[i+2],-m.pos[i+1]);g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(m.uv?.length)g.setAttribute('uv',new T.Float32BufferAttribute(m.uv,2));g.setIndex(m.idx);g.computeVertexNormals();return g;}
function sample(c,t=0,random=.5,fallback=[1]){if(!c)return fallback;if(c.c)return c.c;if(c.r)return c.r[0].map((v,i)=>v+(c.r[1][i]-v)*random);if(c.k){const [start,end]=c.x||[0,1],at=T.MathUtils.clamp((t-start)/Math.max(.00001,end-start),0,1)*(c.k.length-1),a=Math.floor(at),b=Math.min(a+1,c.k.length-1),f=at-a;return c.k[a].map((v,i)=>v+(c.k[b][i]-v)*f);}return fallback;}
function live(parent){return !parent.userData.disposed;}
function mark(root,fn){root.userData.sourceTick=fn;root.userData.sourceEffects=true;}
function maskFor(config,files){for(const name of config?.textures||[]){const match=files.find(f=>f.startsWith('flashfx.tex.'+name+'.'));if(match)return texture(match);}return null;}
const textureFiles=json('texture-index.json');
export function attachSourceFlash(parent,agent,phase,{size=1,replace=false}={}){
 const root=new T.Group();root.name='source-'+agent+'-'+phase;root.userData.sourceAsset=true;parent.add(root);
 root.userData.ready=Promise.all([json('flashfx.'+agent+'.json'),json('materials.json'),textureFiles]).then(async([data,mats,files])=>{
  if(!live(parent)||!live(root))return false;const system=data.systems[phase];if(!system)return false;
  const fallback=[...parent.children].filter(c=>c!==root&&!c.userData.sourceAsset);let seed=17;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};const particles=[];
  for(const emitter of system.emitters){const count=Math.min(6,Math.max(1,Math.ceil((emitter.bursts||[]).reduce((s,b)=>s+b[0],0)),Math.ceil((emitter.spawnRate||0)*.35)));
   for(let i=0;i<count&&particles.length<24;i++){
    const random=rand(),life=sample(emitter.life,0,random,[.5])[0],isMesh=!!data.meshes[emitter.mesh],g=isMesh?geometry(data.meshes[emitter.mesh]):new T.PlaneGeometry(1,1),map=maskFor(mats[emitter.mat],files),opaque=['skyHawk','vysRose','core'].includes(emitter.mat),material=emitter.mat==='core'?new T.ShaderMaterial({vertexShader:eyeVertex,fragmentShader:eyeFragment,side:T.DoubleSide}):new T.MeshBasicMaterial({map,color:opaque?0xffffff:colors[agent],side:T.DoubleSide,transparent:!opaque,alphaTest:opaque?.05:0,depthWrite:opaque,blending:opaque?T.NormalBlending:T.AdditiveBlending});
    const mesh=new T.Mesh(g,material);mesh.name=emitter.mesh||emitter.mat;root.add(mesh);
    const direction=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize(),speed=sample(emitter.velocity,0,random,[0,0,0]);particles.push({mesh,emitter,random,life,delay:(emitter.delay||0)+(i/count)*Math.min(.15,life||0),direction,speed:new T.Vector3(speed[0]||0,speed[2]||0,-(speed[1]||0)),isMesh,opaque});
   }
  }
  await Promise.all(particles.map(p=>p.mesh.material.map?.userData.ready));if(!live(parent)||!live(root))return false;root.scale.setScalar(size);root.userData.emitterCount=system.emitters.length;root.userData.particleCount=particles.length;
  if(replace&&particles.length)for(const c of fallback)c.visible=false;
  const start={value:null};mark(root,(time,camera)=>{
   if(start.value===null)start.value=time;const elapsed=Math.max(0,time-start.value);
   for(const p of particles){const e=p.emitter,age=elapsed-p.delay,loop=(e.loops===0||phase==='proj'||phase==='aura'),duration=p.life||1,t=p.life?loop?((Math.max(0,age)%duration)/duration):Math.min(1,Math.max(0,age)/duration):0;p.mesh.visible=age>=0&&(p.life===0||loop||age<duration);if(!p.mesh.visible)continue;
    const s=sample(e.size,0,p.random,[35,35,35]),sl=sample(e.sizeLife,t,p.random,[1,1,1]);p.mesh.scale.set(Math.max(.001,s[0]*sl[0]*.01),Math.max(.001,(s[1]||s[0])*(sl[1]??sl[0])*.01),Math.max(.001,(s[2]||s[0])*(sl[2]??sl[0])*.01));
    if(p.isMesh)p.mesh.scale.multiplyScalar(1);p.mesh.position.copy(p.direction).multiplyScalar(p.life?Math.min(age,duration)*.55:0).addScaledVector(p.speed,Math.max(0,age)*.01);
    const a=sample(e.alpha,0,p.random,[1])[0]*sample(e.alphaLife,t,p.random,[1])[0];p.mesh.material.opacity=T.MathUtils.clamp(a,0,p.opaque?1:agent==='rey'&&phase==='proj'?.23:.8);
    if(camera&&!p.isMesh){p.mesh.quaternion.copy(camera.quaternion);const world=root.getWorldQuaternion(new T.Quaternion()).invert();p.mesh.quaternion.premultiply(world);}else if(e.spin)p.mesh.rotation.z=elapsed*.7;
   }
  });root.userData.sourceTick(0,null);return true;
 }).catch(e=>{console.warn('Source ability unavailable',agent,phase,e.message);return false});return root;
}
export function attachSourceProp(parent,agent,{size=1,replace=true}={}){
 const phase={sky:'hawk',vys:'rose',rey:'proj'}[agent],root=attachSourceFlash(parent,agent,phase,{size:1,replace});
 root.userData.ready=root.userData.ready.then(ok=>{if(!ok)return false;root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),extent=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());root.worldToLocal(center);const scale=size/Math.max(extent.x,extent.y,extent.z,.001);for(const child of root.children)child.position.sub(center);root.scale.setScalar(scale);root.userData.propScale=scale;
  // These are source static meshes, not fabricated skeletal wing/VAT clips.
  if(agent==='sky')root.rotation.y=Math.PI/2;if(agent==='rey')root.rotation.y=-Math.PI/2;return true;});return root;
}
export function updateSourceEffects(root,time,camera=null){root.traverse(c=>c.userData.sourceTick?.(time,camera));}
export function attachSourceSmoke(mesh,agent,team='enemy'){
 mesh.userData.sourceReady=json('smoke-'+agent+'.json').then(async data=>{
  if(!live(mesh))return false;const key=agent==='jett'?'SphereSolid_Hi_SM':'Wraith_Dome',g=geometry(data.meshes[key]);g.computeBoundingBox();const box=g.boundingBox,center=box.getCenter(new T.Vector3()),radius=Math.max(box.max.x-box.min.x,box.max.y-box.min.y,box.max.z-box.min.z)*.5,target=mesh.userData.smokeRadius;g.translate(-center.x,-center.y,-center.z);g.scale(target/radius,target/radius,target/radius);
  const pick=term=>data.images.find(im=>im.path.includes(term))?.file||data.images[0].file;
  const mask=texture(pick(agent==='jett'?'BlurAngle':'Wraith_Dome_Masks')),noise=texture(pick(agent==='jett'?'Noise':'Wraith_4Xtile_wblur'));await Promise.all([mask.userData.ready,noise.userData.ready]);if(!live(mesh)){g.dispose();return false;}mask.wrapS=mask.wrapT=noise.wrapS=noise.wrapT=T.RepeatWrapping;
  const material=new T.ShaderMaterial({uniforms:{time:{value:0},fade:{value:1},mask:{value:mask},flow:{value:noise},tint:{value:new T.Color(agent==='jett'?0x94b8c9:team==='ally'?0x453660:0x563856)}},side:T.DoubleSide,depthWrite:true,transparent:true,vertexShader:'varying vec2 vUv;varying vec3 vP;void main(){vUv=uv;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;uniform float fade;uniform sampler2D mask;uniform sampler2D flow;uniform vec3 tint;varying vec2 vUv;varying vec3 vP;void main(){vec3 n=normalize(vP);vec2 uv=vec2(atan(n.z,n.x)/6.2831853+.5,asin(clamp(n.y,-1.,1.))/3.1415927+.5);vec4 f=texture2D(flow,uv*2.+vec2(time*.018,-time*.027));vec4 m=(texture2D(mask,uv+vec2(time*.012,.003))+texture2D(mask,uv+vec2(time*.012,-.003)))*.5;float bands=sin(n.y*21.+atan(n.z,n.x)*2.+f.g*5.-time*.7)*.5+.5;vec3 c=tint*(.78+.2*m.r+.15*f.g)+vec3(.065)*bands*(.4+m.g*.6);if(!gl_FrontFacing)c*=.65;gl_FragColor=vec4(c,fade);}'});
  mesh.geometry.dispose();mesh.material.dispose();mesh.geometry=g;mesh.material=material;mesh.userData.sourceSmoke=agent;mesh.userData.sourceTeam=team;return true;
 }).catch(e=>{console.warn('Source smoke unavailable',agent,e.message);return false});return mesh;
}

const bursts=[];
function disposeBurst(root){root.traverse(c=>{c.userData.disposed=true;c.geometry?.dispose();c.material?.dispose();});root.parent?.remove(root);}
export function spawnSourceBurst(scene,position,agent,phase,size=.6){const root=new T.Group();root.position.copy(position);scene.add(root);const record={root,started:null};bursts.push(record);while(bursts.length>8)disposeBurst(bursts.shift().root);attachSourceFlash(root,agent,phase,{size});return root;}
export function updateSourceBursts(time,camera){for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.started??=time;updateSourceEffects(b.root,time-b.started,camera);if(time-b.started>1.2){disposeBurst(b.root);bursts.splice(i,1);}}}
export function clearSourceBursts(){for(const b of bursts)disposeBurst(b.root);bursts.length=0;}
