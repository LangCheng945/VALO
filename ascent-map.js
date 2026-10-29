import {KTX2Loader} from './vendor/three/loaders/KTX2Loader.js';

const T=globalThis.THREE;
const BASE=new URL('./assets/ascent/',import.meta.url);
export const MAP_SCALE=4/3; // Preserve the existing game's 2.2-unit eye height.

function worldPositions(mesh,target,offset) {
    const geometry=mesh.geometry,position=geometry.attributes.position,index=geometry.index;
    const matrix=mesh.matrixWorld,point=new T.Vector3();
    const count=index?index.count:position.count,reverse=matrix.determinant()<0;
    for(let i=0;i<count;i+=3) for(const corner of reverse?[0,2,1]:[0,1,2]) {
        const j=index?index.getX(i+corner):i+corner;
        point.fromBufferAttribute(position,j).applyMatrix4(matrix);
        target[offset++]=point.x;target[offset++]=point.y;target[offset++]=point.z;
    }
    return offset;
}

function volumePositions(data) {
    const result=[];
    for(const type of ['pawn','projectile']) {
        const set=data.sets[type];if(!set)continue;
        for(let i=0;i<set.count;i++) {
            const primitive=data.prims[set.prim[i]],m=set.m.slice(i*12,i*12+12);
            const determinant=m[0]*(m[5]*m[10]-m[6]*m[9])-m[1]*(m[4]*m[10]-m[6]*m[8])+m[2]*(m[4]*m[9]-m[5]*m[8]);
            for(let j=0;j<primitive.idx.length;j+=3) for(const corner of determinant<0?[0,2,1]:[0,1,2]) {
                const v=primitive.idx[j+corner]*3,x=primitive.pos[v],y=primitive.pos[v+1],z=primitive.pos[v+2];
                result.push((m[0]*x+m[1]*y+m[2]*z+m[3])*MAP_SCALE,
                    (m[4]*x+m[5]*y+m[6]*z+m[7])*MAP_SCALE,
                    (m[8]*x+m[9]*y+m[10]*z+m[11])*MAP_SCALE);
            }
        }
    }
    return result;
}

function sourceName(mesh) {
    for(let node=mesh;node;node=node.parent) if(node.name.includes('#')) return node.name.split('#')[0];
    return mesh.name;
}

function batchVisuals(meshes) {
    const buckets=new Map(),mirror=new T.Matrix4().makeScale(-1,1,1);
    for(const mesh of meshes) {
        if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
        const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),center=box.getCenter(new T.Vector3());
        const sign=mesh.matrixWorld.determinant()<0?-1:1;
        const materialKey=Array.isArray(mesh.material)?mesh.material.map(m=>m.uuid).join(','):mesh.material.uuid;
        const key=[mesh.geometry.uuid,materialKey,sign,Math.floor(center.x/32),Math.floor(center.z/32)].join('|');
        if(!buckets.has(key))buckets.set(key,{geometry:mesh.geometry,material:mesh.material,sign,matrices:[],box:new T.Box3()});
        const bucket=buckets.get(key);bucket.matrices.push(mesh.matrixWorld.clone());bucket.box.union(box);
    }
    const group=new T.Group(),items=[];
    for(const bucket of buckets.values()) {
        const mesh=new T.InstancedMesh(bucket.geometry,bucket.material,bucket.matrices.length);
        // Negative transforms must live on the draw object, not its individual instances.
        if(bucket.sign<0)mesh.scale.x=-1;
        bucket.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,bucket.sign<0?matrix.clone().premultiply(mirror):matrix));
        mesh.frustumCulled=false;mesh.userData.worldBox=bucket.box;group.add(mesh);items.push(mesh);
    }
    return {group,items};
}

export class AscentMapRuntime {
    constructor(renderer) {
        this.renderer=renderer;this.ready=false;this.root=new T.Group();this.root.name='actual-ascent';
        this.scale=MAP_SCALE;this.frustum=new T.Frustum();this.viewMatrix=new T.Matrix4();
        this.raycaster=new T.Raycaster();this.raycaster.firstHitOnly=true;
        this.segment=new T.Line3();this.capsuleBox=new T.Box3();this.trianglePoint=new T.Vector3();this.capsulePoint=new T.Vector3();
        this.minimapImage=new Image();
        this.spawnCache=new Map();
    }
    async load(progress=()=>{}) {
        progress('下載 Ascent 模型…');
        const ktx=new KTX2Loader().setTranscoderPath(new URL('./vendor/basis/',import.meta.url).href).setWorkerLimit(4).detectSupport(this.renderer);
        const loader=new T.GLTFLoader().setMeshoptDecoder(globalThis.MeshoptDecoder).setKTX2Loader(ktx);
        const readJSON=async name=>{const response=await fetch(new URL(name,BASE));if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);return response.json()};
        const [gltf,collision,minimap]=await Promise.all([
            new Promise((resolve,reject)=>loader.load(new URL('ascent.glb',BASE).href,resolve,event=>progress(`下載 Ascent 模型 ${Math.min(100,Math.round(event.loaded/13058488*100))}% · 正在解碼貼圖`),reject)),
            readJSON('collision.json'),readJSON('minimap.json')
        ]);
        progress('建立地圖碰撞與繪圖批次…');
        await new Promise(requestAnimationFrame);
        const original=gltf.scene;original.scale.setScalar(MAP_SCALE);original.updateMatrixWorld(true);
        const meshes=[];original.traverse(object=>{if(object.isMesh)meshes.push(object)});
        const excluded=new Set(collision.noCollision||[]);
        const physical=meshes.filter(mesh=>!excluded.has(sourceName(mesh))&&!/fog|cloud|lightshaft|skybox|vfx/i.test(sourceName(mesh)));
        const extra=volumePositions(collision);
        const vertexCount=physical.reduce((sum,mesh)=>sum+(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count),0);
        const positions=new Float32Array(vertexCount*3+extra.length);
        let offset=0;for(const mesh of physical)offset=worldPositions(mesh,positions,offset);
        positions.set(extra,offset);
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
        geometry.boundsTree=new globalThis.MeshBVHLib.MeshBVH(geometry,{maxLeafTris:12});
        this.collisionMesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));
        this.collisionMesh.name='ascent-collision';this.collisionMesh.raycast=globalThis.MeshBVHLib.acceleratedRaycast;
        this.collisionMesh.updateMatrixWorld(true);
        const batches=batchVisuals(meshes);this.root.add(batches.group);this.batches=batches.items;
        this.metadata=minimap;this.minimapImage.src=new URL('minimap.png',BASE).href;
        await this.minimapImage.decode();
        this.info={sourceMeshes:meshes.length,batches:this.batches.length,collisionTriangles:positions.length/9,triangles:meshes.reduce((n,m)=>n+(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3,0)};
        this.ready=true;ktx.dispose();progress('Ascent 地圖已就緒');
        return this;
    }
    updateCulling(camera) {
        if(!this.ready)return;
        camera.updateWorldMatrix(true,false);this.viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.viewMatrix);
        for(const mesh of this.batches)mesh.visible=this.frustum.intersectsBox(mesh.userData.worldBox);
    }
    getGroundHeight(position) {
        const feet=position.y-2.2,originY=feet+.51;
        let highest=-100;
        for(const [dx,dz] of [[0,0],[.44,0],[-.44,0],[0,.44],[0,-.44]]) {
            this.raycaster.set(new T.Vector3(position.x+dx,originY,position.z+dz),new T.Vector3(0,-1,0));
            this.raycaster.near=0;this.raycaster.far=160;
            const hit=this.raycaster.intersectObject(this.collisionMesh,false)[0];
            if(hit && Math.abs(hit.face.normal.y)>.45)highest=Math.max(highest,hit.point.y);
        }
        return highest;
    }
    collides(position,crouch=0) {
        const radius=.42,feet=position.y-2.2;
        this.segment.start.set(position.x,feet+radius+.025,position.z);
        this.segment.end.set(position.x,position.y+.28-crouch*.75-radius,position.z);
        this.capsuleBox.makeEmpty().expandByPoint(this.segment.start).expandByPoint(this.segment.end).expandByScalar(radius);
        return this.collisionMesh.geometry.boundsTree.shapecast({
            intersectsBounds:box=>box.intersectsBox(this.capsuleBox),
            intersectsTriangle:triangle=>triangle.closestPointToSegment(this.segment,this.trianglePoint,this.capsulePoint)<radius-.025
        });
    }
    floorCandidates(x,z) {
        const ray=new T.Ray(new T.Vector3(x,100*this.scale,z),new T.Vector3(0,-1,0));
        const hits=this.collisionMesh.geometry.boundsTree.raycast(ray,T.DoubleSide);
        const ys=[];for(const hit of hits)if(hit.face.normal.y>.5&&!ys.some(y=>Math.abs(y-hit.point.y)<.08))ys.push(hit.point.y);
        return ys;
    }
    safePoint(sourceX,sourceZ,sourceFloor=1) {
        for(const radius of [0,.8,1.6,2.8,4]) for(let i=0;i<(radius?8:1);i++) {
            const x=(sourceX+Math.cos(i*Math.PI/4)*radius)*this.scale,z=(sourceZ+Math.sin(i*Math.PI/4)*radius)*this.scale;
            const floors=this.floorCandidates(x,z).filter(y=>Math.abs(y-sourceFloor*this.scale)<7*this.scale).sort((a,b)=>Math.abs(a-sourceFloor*this.scale)-Math.abs(b-sourceFloor*this.scale));
            for(const floor of floors) {
                const point=new T.Vector3(x,floor+2.2,z);
                if(!this.collides(point))return point;
            }
        }
        throw Error(`找不到安全的地圖位置 (${sourceX}, ${sourceZ})`);
    }
    getSpawn(team='attack') {
        if(!this.spawnCache.has(team)) {
            const position=team==='attack'?this.safePoint(.5,-.6,2):this.safePoint(-97.45,-19.95,3);
            this.spawnCache.set(team,{position,yaw:team==='attack'?.65:-1.7});
        }
        const spawn=this.spawnCache.get(team);return {position:spawn.position.clone(),yaw:spawn.yaw};
    }
    getBotSpawns(tactical=false) {
        const sources=tactical?[[-47.1,-53.22,4],[-66,-60,5],[-58.4,19.8,1],[-72,25,1],[-45.8,-12.2,1]]
            :[[-12,-8,2],[-21,-27.5,2],[-30,-44.8,4],[-47,-53,4],[-58,19,1]];
        return sources.map(([x,z,y])=>{const p=this.safePoint(x,z,y);return{x:p.x,y:p.y-2.2,z:p.z,patrol:1.2}});
    }
    getPlantSite(position) {
        const x=position.x/this.scale,z=position.z/this.scale;
        if(x>-79&&x<-54&&z>-73&&z<-48)return 'A';
        if(x>-87&&x<-64&&z>15&&z<39)return 'B';
        return null;
    }
    toRadar(x,z,size=176) {
        const t=this.metadata.transform;
        return {x:(x/this.scale*t.scaleU+t.offsetU)*size,y:(z/this.scale*t.scaleV+t.offsetV)*size};
    }
}
