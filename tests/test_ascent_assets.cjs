const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'assets/ascent/provenance.json')));
for(const [name,expected] of Object.entries(provenance.files)) {
    const data=fs.readFileSync(path.join(root,'assets/ascent',name));
    assert.equal(data.length,expected.bytes,name);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'),expected.sha256,name);
}
const glb=fs.readFileSync(path.join(root,'assets/ascent/ascent.glb'));
assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
const metadata=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
assert.equal(metadata.asset.extras.map,'ascent');assert(metadata.meshes.length>1000);assert(metadata.images.length>300);
const context=vm.createContext({console,URL,Image:class {},performance});
vm.runInContext(fs.readFileSync(path.join(root,'vendor/three.min.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'vendor/mesh-bvh.js'),'utf8'),context);
const runtime=fs.readFileSync(path.join(root,'ascent-map.js'),'utf8').replace(/^import .*;\n/m,'').replaceAll('export ','').replaceAll('import.meta.url',JSON.stringify('file://'+path.join(root,'ascent-map.js')));
vm.runInContext(runtime+';globalThis.Runtime=AscentMapRuntime;',context);
vm.runInContext(`
const map=new Runtime(null);
const floor=new THREE.BoxGeometry(20,.4,20).translate(0,-.2,0).toNonIndexed();
const wall=new THREE.BoxGeometry(.2,3,4).translate(1,1.5,0).toNonIndexed();
const ceiling=new THREE.BoxGeometry(2,.2,2).translate(0,2,0).toNonIndexed();
const step=new THREE.BoxGeometry(1.5,.3,2).translate(-2,.15,0).toNonIndexed();
const arrays=[floor,wall,ceiling,step].map(g=>g.attributes.position.array);
const merged=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){merged.set(a,offset);offset+=a.length;}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(merged,3));geometry.boundsTree=new MeshBVHLib.MeshBVH(geometry);
map.collisionMesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));map.collisionMesh.raycast=MeshBVHLib.acceleratedRaycast;map.collisionMesh.updateMatrixWorld(true);
globalThis.physics={floor:map.getGroundHeight(new THREE.Vector3(0,2.2,0)),standingBlocked:map.collides(new THREE.Vector3(0,2.2,0),0),crouchingBlocked:map.collides(new THREE.Vector3(0,2.2,0),1),wallBlocked:map.collides(new THREE.Vector3(1,2.2,0),0),step:map.getGroundHeight(new THREE.Vector3(-2,2.2,0))};
`,context);
assert(Math.abs(context.physics.floor)<.001);assert.equal(context.physics.standingBlocked,true);assert.equal(context.physics.crouchingBlocked,false);assert.equal(context.physics.wallBlocked,true);assert(Math.abs(context.physics.step-.3)<.001);
console.log('PASS pinned Ascent GLB/textures, file integrity, BVH floor/wall/step collision and crouch clearance');
