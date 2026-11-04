// Complete source arm rigs: the weapon and wrist share the native attachment bone.
const T=globalThis.THREE;let payload;const armCache=new Map();
async function fetchData(path,json=false){const r=await fetch('./assets/tactical-knife/'+path);if(!r.ok)throw Error('Knife asset '+path);return json?r.json():r.arrayBuffer();}
function source(){return payload||=Promise.all([fetchData('manifest.json',true),fetchData('mesh.bin'),fetchData('poses.bin'),new T.TextureLoader().loadAsync('./assets/tactical-knife/albedo.png')]).then(([meta,bytes,poses,map])=>{const n=meta.vertices,g=new T.BufferGeometry();for(const [name,size,offset]of[['position',3,0],['normal',3,n*12],['uv',2,n*24]])g.setAttribute(name,new T.Float32BufferAttribute(new Float32Array(bytes,offset,n*size),size));g.setIndex(new T.BufferAttribute(new Uint16Array(bytes,n*32,meta.indices).slice(),1));g.userData.sharedWeaponGeometry=true;map.flipY=false;map.encoding=T.sRGBEncoding;return{meta,geometry:g,frames:new Float32Array(poses),map}}).catch(e=>{payload=null;throw e});}
function armGeometry(variant,info){if(!armCache.has(variant))armCache.set(variant,fetchData(variant+'.arms.bin').then(bytes=>{const n=info.verts,g=new T.BufferGeometry();for(const [name,size,offset]of[['position',3,0],['normal',3,n*12],['uv',2,n*24]])g.setAttribute(name,new T.Float32BufferAttribute(new Float32Array(bytes,offset,n*size),size));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint8Array(bytes,n*32,n*4),4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(Float32Array.from(new Uint8Array(bytes,n*36,n*4),v=>v/255),4));g.setIndex(new T.BufferAttribute(new Uint16Array(bytes,n*40,info.tris*3).slice(),1));g.userData.sharedWeaponGeometry=true;return g}).catch(e=>{armCache.delete(variant);throw e}));return armCache.get(variant);}
export function createTacticalKnife(hands){
 const root=new T.Group(),variant=hands.agent==='jett'?'jett':'phoenix';root.name='source-tactical-knife';root.userData.time=0;
 root.ready=Promise.all([source(),hands.ready]).then(async([data])=>{
  const info=data.meta.rigs[variant],geometry=await armGeometry(variant,info);if(root.userData.disposed||hands.root.userData.disposed||!hands.skeletalReady)return false;
  const r=info.skeleton,bones=r.names.map((name,i)=>{const b=new T.Bone();b.name=name;b.position.fromArray(r.t,i*3);b.quaternion.fromArray(r.q,i*4).normalize();return b});bones.forEach((b,i)=>{if(r.parents[i]>=0)bones[r.parents[i]].add(b)});
  const map=hands.arms[0].rig.mesh.material.map,arms=new T.SkinnedMesh(geometry,new T.MeshStandardMaterial({map,roughness:.86,skinning:true,side:T.DoubleSide}));arms.name=variant+'-native-knife-arms';arms.frustumCulled=false;for(let i=0;i<bones.length;i++)if(r.parents[i]<0)arms.add(bones[i]);arms.updateMatrixWorld(true);arms.bind(new T.Skeleton(bones),new T.Matrix4());
  const stage=new T.Group();stage.quaternion.fromArray(data.meta.toViewQuat);stage.scale.setScalar(.007);stage.position.fromArray(data.meta.camera).applyQuaternion(stage.quaternion).multiplyScalar(-.007);stage.add(arms);root.add(stage);
  const model=new T.Mesh(data.geometry,new T.MeshStandardMaterial({map:data.map,roughness:.7,metalness:.25}));model.name='source-tactical-knife-mesh';model.quaternion.fromArray(data.meta.attach.q);bones[r.names.indexOf(data.meta.attach.bone)].add(model);
  hands.root.visible=false;Object.assign(root.userData,{data,bones,tracks:bones.map(b=>data.meta.trackNames.indexOf(b.name)),arms,model,loaded:true,qa:new T.Quaternion(),qb:new T.Quaternion(),from:new Float32Array(bones.length*7)});updateTacticalKnife(root,{now:performance.now()});return true;
 }).catch(e=>{console.warn('Tactical knife unavailable',e);return false});return root;
}
export function updateTacticalKnife(root,{dt=0,moving=false,now=performance.now(),camera=null}={}){
 if(!root?.userData.loaded)return;
 const s=root.userData,{meta,frames}=s.data;s.time+=dt;
 if(s.firedAt!==s.lastFire){for(let i=0;i<s.bones.length;i++){s.bones[i].position.toArray(s.from,i*7);s.bones[i].quaternion.toArray(s.from,i*7+3);}s.lastFire=s.firedAt;}
 const elapsed=s.firedAt===undefined?Infinity:(now-s.firedAt)/1000,attack=elapsed>=0&&elapsed<meta.clips.attack.duration;
 const name=attack?'attack':moving?'walk':'idle',clip=meta.clips[name],time=attack?elapsed:s.time%clip.duration;
 const f=Math.max(0,Math.min(clip.frames-1,time/clip.duration*(clip.frames-1))),a=Math.floor(f),b=Math.min(a+1,clip.frames-1),t=f-a;
 for(let i=0;i<s.bones.length;i++){
  const track=s.tracks[i];if(track<0)continue;const bone=s.bones[i],start=clip.offset+a*meta.stride+track*7,end=clip.offset+b*meta.stride+track*7;
  bone.position.set(T.MathUtils.lerp(frames[start],frames[end],t),T.MathUtils.lerp(frames[start+1],frames[end+1],t),T.MathUtils.lerp(frames[start+2],frames[end+2],t));bone.quaternion.fromArray(frames,start+3).normalize().slerp(s.qb.fromArray(frames,end+3).normalize(),t);
  if(attack&&elapsed<.06){const w=Math.max(0,elapsed/.06);bone.position.multiplyScalar(w);bone.position.x+=s.from[i*7]*(1-w);bone.position.y+=s.from[i*7+1]*(1-w);bone.position.z+=s.from[i*7+2]*(1-w);bone.quaternion.copy(s.qa.fromArray(s.from,i*7+3).slerp(bone.quaternion,w));}
  if(attack&&clip.duration-elapsed<.1){const w=1-(clip.duration-elapsed)/.1,at=meta.clips.idle.offset+track*7;bone.position.x=T.MathUtils.lerp(bone.position.x,frames[at],w);bone.position.y=T.MathUtils.lerp(bone.position.y,frames[at+1],w);bone.position.z=T.MathUtils.lerp(bone.position.z,frames[at+2],w);bone.quaternion.slerp(s.qb.fromArray(frames,at+3).normalize(),w);}
 }
 if(camera){
  s.guard ||= {shoulder:new T.Vector3(),elbow:new T.Vector3(),view:new T.Vector3(),delta:new T.Vector3()};const g=s.guard;s.arms.updateWorldMatrix(true,true);
  for(const side of ['L','R'])for(const [joint,child]of [['Clavicle','Shoulder'],['Shoulder','Elbow']]){const shoulder=s.bones.find(b=>b.name===side+'_'+joint),elbow=s.bones.find(b=>b.name===side+'_'+child);shoulder.getWorldPosition(g.shoulder);g.view.copy(g.shoulder);camera.worldToLocal(g.view);if(g.view.z>=.025)continue;
   elbow.getWorldPosition(g.elbow);g.delta.set(0,0,.025-g.view.z).transformDirection(camera.matrixWorld).multiplyScalar(.025-g.view.z);g.shoulder.add(g.delta);shoulder.parent.worldToLocal(g.shoulder);shoulder.position.copy(g.shoulder);shoulder.updateWorldMatrix(true,true);elbow.parent.worldToLocal(g.elbow);elbow.position.copy(g.elbow);
  }
 }
 s.clip=name;
}
