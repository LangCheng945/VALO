import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);globalThis.THREE=require('../vendor/three.min.js');globalThis.Image=class{};
vm.runInThisContext(fs.readFileSync(new URL('../vendor/mesh-bvh.js',import.meta.url),'utf8'));
Object.assign(globalThis,await import('../multiplayer/map-sites.mjs'));
vm.runInThisContext(fs.readFileSync(new URL('../ascent-map.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../ascent-map.js',import.meta.url).href))+'\nglobalThis.__AscentMapRuntime=AscentMapRuntime;');
const AscentMapRuntime=globalThis.__AscentMapRuntime;
const T=globalThis.THREE;
function floorMap(){const map=new AscentMapRuntime(null,'lotus'),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-100,4,-100,100,4,-100,0,4,100,-100,2.69,-100,100,2.69,-100,0,2.69,100],3));g.boundsTree=new MeshBVHLib.MeshBVH(g);map.collisionMesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));map.collisionMesh.raycast=MeshBVHLib.acceleratedRaycast;map.collisionMesh.updateMatrixWorld(true);return map;}
test('a large floor face cannot pass through the capsule axis unnoticed',()=>{const m=floorMap();assert(m.collides(new T.Vector3(0,4.89,0)));assert(!m.collides(new T.Vector3(0,6.2,0)));});
test('spawn rejects the hidden lower proxy and embedded actors recover onto the rendered floor',()=>{const m=floorMap(),p=m.safePoint(0,0,2.02);assert(Math.abs(p.y-6.2)<.001);const stuck=new T.Vector3(0,4.89,0);assert(m.recoverPosition(stuck));assert(Math.abs(stuck.y-6.2)<.001);assert(!m.recoverPosition(stuck));});
