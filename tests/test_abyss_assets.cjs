const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),base=path.join(root,'assets/abyss');const provenance=JSON.parse(fs.readFileSync(path.join(base,'provenance.json')));
for(const [name,expected]of Object.entries(provenance.files)){const b=fs.readFileSync(path.join(base,name));assert.equal(b.length,expected.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),expected.sha256);}
const glb=fs.readFileSync(path.join(base,'abyss.glb'));assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(8),glb.length);const meta=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));assert.equal(meta.asset.extras.map,'infinity');assert(meta.meshes.length>1000);assert(meta.images.length>200);
const mini=JSON.parse(fs.readFileSync(path.join(base,'minimap.json')));assert.equal(mini.map,'infinity');assert(mini.callouts.some(c=>c.name.startsWith('A'))&&mini.callouts.some(c=>c.name.startsWith('B')));
const context=vm.createContext({console,URL,Image:class{},performance});vm.runInContext(fs.readFileSync(path.join(root,'vendor/three.min.js'),'utf8'),context);
const source=fs.readFileSync(path.join(root,'ascent-map.js'),'utf8').replace(/^import .*;\n/m,'').replaceAll('export ','').replaceAll('import.meta.url',JSON.stringify('file://'+path.join(root,'ascent-map.js')));
vm.runInContext(source+`;const m=new AscentMapRuntime(null,'abyss');m.floorCandidates=()=>[4,-4];m.collides=p=>Math.abs(p.x)<.5&&p.y>2;globalThis.safe=m.safePoint(0,0,3).toArray();globalThis.sites=['A','B'].map((_,i)=>{const z=MAPS.abyss.sites[i];return m.getPlantSite(new THREE.Vector3((z.minX+z.maxX)/2*MAP_SCALE,0,(z.minZ+z.maxZ)/2*MAP_SCALE));});`,context);
assert(Math.abs(context.safe[1]-6.2)<.001);assert(Math.abs(context.safe[0])>.5);assert.deepEqual(Array.from(context.sites),['A','B']);
console.log('PASS pinned Abyss geometry/textures, two site metadata and safe-point search rejects underground fallback');

const ropes=JSON.parse(fs.readFileSync(path.join(base,'ropes.json')));assert.equal(ropes.map,'infinity');assert.equal(ropes.ropes.length,4);assert(ropes.ropes[0].points.length>=2);
console.log('PASS Abyss source rope metadata');
