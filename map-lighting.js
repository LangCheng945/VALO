// Pinned UE irradiance + L1 SH atlases. Instance transforms stay on the GPU.
const T=globalThis.THREE;
export async function loadMapLighting(base){
 const read=async file=>{const r=await fetch(new URL(file,base));if(!r.ok)throw Error('Map lighting '+file);return r.json()},[meta,lights]=await Promise.all([read('lightmaps.json'),read('lights.json')]),loader=new T.TextureLoader(),atlases={};
 for(const [id,a]of Object.entries(meta.atlases)){const [irr,sh]=await Promise.all([loader.loadAsync(new URL(a.avif?.irr?.replace(/^juliett\./,'')||a.irr,base).href),loader.loadAsync(new URL(a.avif?.sh?.replace(/^juliett\./,'')||a.sh,base).href)]);for(const t of [irr,sh]){t.flipY=false;t.generateMipmaps=false;t.minFilter=t.magFilter=T.LinearFilter;t.encoding=T.LinearEncoding;}atlases[id]={irr,sh};}
 return{meta,lights,atlases,materials:new Map(),mapped:0};
}
export function instanceLightmap(mesh,lighting){if(!lighting)return null;for(let p=mesh;p;p=p.parent){const id=/#(\d+)/.exec(p.name)?.[1],entry=id===undefined?null:lighting.meta.inst[id];if(entry&&mesh.geometry.attributes.uv2)return entry;}return null;}
function bakedMaterial(original,lighting,atlas){const key=original.uuid+':'+atlas;if(lighting.materials.has(key))return lighting.materials.get(key);const m=original.clone(),maps=lighting.atlases[atlas];m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,{nativeIrr:{value:maps.irr},nativeSH:{value:maps.sh},nativeK:{value:lighting.meta.K},nativeRange:{value:lighting.meta.shRange}});
 shader.vertexShader='attribute vec4 nativeLightUV;\nattribute vec2 nativeBaseUV;\nvarying vec2 vNativeLightUV;\nvarying vec3 vNativeWorldNormal;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNativeLightUV=nativeBaseUV*nativeLightUV.xy+nativeLightUV.zw;\nvec3 nativeN=normal;\n#ifdef USE_INSTANCING\nnativeN/=vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz));\nnativeN=mat3(instanceMatrix)*nativeN;\n#endif\nvNativeWorldNormal=normalize(mat3(modelMatrix)*nativeN);');
 shader.fragmentShader='uniform sampler2D nativeIrr;\nuniform sampler2D nativeSH;\nuniform float nativeK;\nuniform float nativeRange;\nvarying vec2 vNativeLightUV;\nvarying vec3 vNativeWorldNormal;\n'+shader.fragmentShader;
 // Atlas RGB is encoded sRGB; SH is signed linear data. Replace hemisphere GI,
 // retaining direct lights, material normals, roughness, and dynamic muzzle light.
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',`#include <lights_fragment_maps>
 vec3 nativeRGB=texture2D(nativeIrr,vNativeLightUV).rgb;
 vec3 nativeLinear=mix(nativeRGB/12.92,pow((nativeRGB+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),nativeRGB));
 vec3 nativeCoeff=(texture2D(nativeSH,vNativeLightUV).rgb*2.0-1.0)*nativeRange;
 vec3 nativeNormal=normalize(vNativeWorldNormal);
 float nativeSHGain=max(0.0,(dot(nativeCoeff,nativeNormal.yzx)+0.28209479)/0.28209479);
 irradiance=nativeLinear*nativeK*nativeSHGain;
 `);};m.customProgramCacheKey=()=> 'valo-baked-sh-1';m.userData.nativeLightmap=true;lighting.materials.set(key,m);return m;}
export function lightmapBatch(bucket,mesh,lighting){if(!bucket.lightmaps?.[0])return;const entries=bucket.lightmaps,uv=new Float32Array(entries.length*4);entries.forEach((e,i)=>{uv.set([...e.cs,...e.cb],i*4)});mesh.geometry=new T.BufferGeometry();for(const [name,attribute]of Object.entries(bucket.geometry.attributes))mesh.geometry.setAttribute(name,attribute);mesh.geometry.setIndex(bucket.geometry.index);mesh.geometry.groups=bucket.geometry.groups.map(g=>({...g}));mesh.geometry.boundingBox=bucket.geometry.boundingBox;mesh.geometry.boundingSphere=bucket.geometry.boundingSphere;mesh.geometry.setAttribute('nativeBaseUV',mesh.geometry.attributes.uv2);mesh.geometry.setAttribute('nativeLightUV',new T.InstancedBufferAttribute(uv,4));mesh.material=Array.isArray(bucket.material)?bucket.material.map(m=>bakedMaterial(m,lighting,entries[0].a)):bakedMaterial(bucket.material,lighting,entries[0].a);lighting.mapped+=entries.length;}
export function applySourceSun(lighting,sun){const source=lighting?.lights.lights.find(l=>l.kind==='directional'&&l.visible&&l.affectsWorld&&!/test/i.test(l.layer));if(!source)return false;const [pitch,yaw]=source.rot.map(T.MathUtils.degToRad),forward=new T.Vector3(Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch),-Math.cos(pitch)*Math.cos(yaw));sun.position.copy(forward).multiplyScalar(-60);sun.color.setRGB(...source.color.map(v=>v/255));sun.intensity=Math.min(1.2,source.intensity/8);return true;}
