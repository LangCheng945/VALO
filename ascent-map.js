import {ROTORS,collisionCutouts} from './multiplayer/map-mechanism-rules.mjs?v=mechanisms1';
import {cutDoorCollision} from './map-collision-cutouts.mjs?v=mechanisms1';
import {loadMapLighting,instanceLightmap,lightmapBatch} from './map-lighting.js?v=sunsetlight1';
import {MAP_SITES,MAP_SCALE,spikeSite} from './multiplayer/map-sites.mjs?v=maps4';
export {MAP_SCALE} from './multiplayer/map-sites.mjs?v=maps4';
import {KTX2Loader} from './vendor/three/loaders/KTX2Loader.js';

const T=globalThis.THREE;
export const MAPS=Object.freeze({
    ascent:{id:'ascent',name:'Ascent',title:'義境空島',bytes:13058488,
        spawns:{attack:[.5,-.6,2,.65],defend:[-97.45,-19.95,3,-1.7]},
        training:[[-12,-8,2],[-21,-27.5,2],[-30,-44.8,4],[-47,-53,4],[-58,19,1]],
        tactical:[[-47.1,-53.22,4],[-66,-60,5],[-58.4,19.8,1],[-72,25,1],[-45.8,-12.2,2]],
        sites:MAP_SITES.ascent},
    haven:{id:'haven',name:'Haven',title:'遺落境地',bytes:11627132,
        spawns:{attack:[-26.43,-17.42,3,1.57],defend:[-127.15,-29.46,3,-1.57]},
        training:[[-45,-24,3],[-57,-33,3],[-69,-62,1],[-80,-1.8,1],[-87,28,2]],
        tactical:[[-92,-64,3],[-90,-16,3],[-90,26,2],[-80,-1.8,1],[-67,-18,1]],
        sites:MAP_SITES.haven},
    summit:{id:'summit',name:'Summit',title:'天樞雲闕',bytes:18167644,separateProjectileCollision:true,ropes:true,ropeGuide:{approach:[.8,.8],exit:[0,.8]},
        spawns:{attack:[59,-7.5,2,0],defend:[61.75,-120.75,4,Math.PI]},
        training:[[61.75,-56.75,2],[86.25,-31.75,2],[86.25,-55,1],[32.25,-51.25,2],[18.5,-65,1]],
        tactical:[[116,-76.75,1],[13.75,-85.5,1],[99.25,-76.75,1],[36.75,-90.75,1],[58.25,-75,1]],
        sites:MAP_SITES.summit},
    abyss:{id:'abyss',name:'Abyss',title:'深窟幽境',bytes:12382948,ropes:true,ropeGuides:{BP_RopeAscender2_3:{approach:[-.8,0],endLift:.4},BP_RopeAscender4:{approach:[0,-.8],endLift:.4},BP_RopeAscender6:{approach:[0,.8],endLift:.4},BP_RopeAscender5_0:{approach:[0,.8],yLift:.4,endLift:.06}},
        spawns:{attack:[49.5,-9.5,8,Math.PI/2],defend:[-52.75,-9.5,10,-Math.PI/2]},
        training:[[34,-32.5,8],[16.5,-38,8],[10.75,17,9],[40.25,36.5,4],[15.25,44.5,4]],
        tactical:[[-2,-43,8],[-24.5,-28,10],[-11.75,44.25,6],[-25,39.25,10],[-6,3.25,8]],
        sites:MAP_SITES.abyss},
    sunset:{id:'sunset',name:'Sunset',title:'日落之城',bytes:13544160,separateProjectileCollision:true,
        spawns:{attack:[4,48,2.02,0],defend:[0,-43.2,3,Math.PI]},
        training:[[28.4,13,0],[22.6,2,1],[38,-18,1],[-56.5,20,0],[-34,2,0]],
        tactical:[[38,-18,1],[-54,-15,3],[-40,-6,2],[28,-23,3],[-12,6,0]],
        bakedLighting:true,bakedFill:.35,bakedGain:1.15,exposure:1.08,sites:MAP_SITES.sunset},
    split:{doubleSidedGround:true,...{"id":"split","name":"Split","title":"\u96d9\u5854\u8ff7\u57ce","bytes":13395780,"separateProjectileCollision":true,"ropes":true,"spawns":{"attack":[0.6,-19.02,3,1.57],"defend":[-89.65,-21.42,5,-1.57]},"training":[[-78.58,-73.45,0.001047],[-24.58,-68.14,3],[-44.93,-62.8,2.000577],[-62.58,-54.35,4],[-45.9,-43.3,5]],"tactical":[[-64.898,-77.123,0.001047],[-66.264,17.198,4.0],[-78.58,-73.45,0.001047],[-24.58,-68.14,3],[-44.93,-62.8,2.000577]]},sites:MAP_SITES.split},
    lotus:{doubleSidedGround:true,...{"id":"lotus","name":"Lotus","title":"\u84ee\u83ef\u53e4\u57ce","bytes":9957832,"separateProjectileCollision":true,"ropes":true,"spawns":{"attack":[7.77,-14.01,2.9975,0],"defend":[15.848629,-95.738629,4.0,3.141592653589793]},"training":[[50.46,-91.8,6.75],[60.93,-95.16,3.000424],[60.502,-81.609,3.000424],[55.57,-85.17,2.020471],[55.57,-61.5,3.000421]],"tactical":[[59.102,-83.009,3.000424],[4.222,-69.097,2.036127],[-46.198,-64.064,3.047305],[50.46,-91.8,6.75],[60.93,-95.16,3.000424]]},sites:MAP_SITES.lotus},
    bind:{doubleSidedGround:true,groundSpawn:true,...{"id":"bind","name":"Bind","title":"\u52ab\u5883\u4e4b\u5730","bytes":11998136,"separateProjectileCollision":true,"spawns":{"attack":[39.9,-65.5,1.023423314,0],"defend":[-10.18,-146.42,1.000959,3.141592653589793]},"training":[[58.74,-75.5,1.012179],[-12.87,-63.66,2],[31.59,-61.13,1.023423],[8.04,-79.83,2.000957],[26.64,-107.48,1.003959]],"tactical":[[24.784,-108.79,1.003959],[-47.714,-116.149,3.060026],[58.74,-75.5,1.012179],[-12.87,-63.66,2],[31.59,-61.13,1.023423]]},sites:MAP_SITES.bind},
    corrode:{doubleSidedGround:true,...{"id":"corrode","name":"Corrode","title":"\u9e7d\u6d77\u53e4\u5821","bytes":17268904,"separateProjectileCollision":true,"spawns":{"attack":[56.75,0.25,3.999491,1.57],"defend":[-59.1,-0.08,5.0,-1.57]},"training":[[-17.666,-44.481,5.0],[-20.74,-57.43,5.0],[-16.5,-17.83,4.0],[-18.926,39.369,4.999996],[-59.1,-0.08,5.0]],"tactical":[[-19.066,-43.081,5.0],[-17.526,39.369,4.999996],[-59.1,-0.08,5.0],[-20.74,-57.43,5.0],[-16.5,-17.83,4.0]]},sites:MAP_SITES.corrode}


});
// MAP_SCALE preserves the existing 2.2-unit eye height.

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


function volumePositions(data,types=['pawn','projectile']) {
    const result=[];
    for(const type of types) {
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

function batchVisuals(meshes,lighting) {
    const buckets=new Map(),mirror=new T.Matrix4().makeScale(-1,1,1);
    for(const mesh of meshes) {
        if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
        const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),center=box.getCenter(new T.Vector3());
        const sign=mesh.matrixWorld.determinant()<0?-1:1;
        const materialKey=Array.isArray(mesh.material)?mesh.material.map(m=>m.uuid).join(','):mesh.material.uuid;
        const lightmap=instanceLightmap(mesh,lighting);const key=[mesh.geometry.uuid,materialKey,lightmap?.a??'none',sign,Math.floor(center.x/32),Math.floor(center.z/32)].join('|');
        if(!buckets.has(key))buckets.set(key,{geometry:mesh.geometry,material:mesh.material,sign,matrices:[],lightmaps:[],box:new T.Box3()});
        const bucket=buckets.get(key);bucket.matrices.push(mesh.matrixWorld.clone());bucket.lightmaps.push(lightmap);bucket.box.union(box);
    }
    const group=new T.Group(),items=[];
    for(const bucket of buckets.values()) {
        const mesh=new T.InstancedMesh(bucket.geometry,bucket.material,bucket.matrices.length);
        // Negative transforms must live on the draw object, not its individual instances.
        if(bucket.sign<0)mesh.scale.x=-1;
        bucket.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,bucket.sign<0?matrix.clone().premultiply(mirror):matrix));
        lightmapBatch(bucket,mesh,lighting);mesh.frustumCulled=false;mesh.userData.worldBox=bucket.box;group.add(mesh);items.push(mesh);
    }
    return {group,items};
}

export class AscentMapRuntime {
    constructor(renderer,mapId='ascent') {
        this.definition=Object.hasOwn(MAPS,mapId)?MAPS[mapId]:null;if(!this.definition)throw Error('Unknown map');this.id=mapId;this.base=new URL(`./assets/${mapId}/`,import.meta.url);
        this.renderer=renderer;this.ready=false;this.root=new T.Group();this.root.name='actual-'+this.id;
        this.scale=MAP_SCALE;this.frustum=new T.Frustum();this.viewMatrix=new T.Matrix4();
        this.raycaster=new T.Raycaster();this.raycaster.firstHitOnly=true;
        this.segment=new T.Line3();this.capsuleBox=new T.Box3();this.trianglePoint=new T.Vector3();this.capsulePoint=new T.Vector3();
        this.minimapImage=new Image();
        this.spawnCache=new Map();this.ropes=[];this.projectileCollisionMesh=null;
    }
    async load(progress=()=>{}) {
        const BASE=this.base,name=this.definition.name;progress(`下載 ${name} 模型…`);
        const ktx=new KTX2Loader().setTranscoderPath(new URL('./vendor/basis/',import.meta.url).href).setWorkerLimit(4).detectSupport(this.renderer);
        const loader=new T.GLTFLoader().setMeshoptDecoder(globalThis.MeshoptDecoder).setKTX2Loader(ktx);
        const readJSON=async name=>{const response=await fetch(new URL(name,BASE));if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);return response.json()};
        const [gltf,collision,minimap,ropeData,lighting]=await Promise.all([
            new Promise((resolve,reject)=>loader.load(new URL(this.id+'.glb',BASE).href,resolve,event=>progress(`下載 ${name} 模型 ${Math.min(100,Math.round(event.loaded/this.definition.bytes*100))}% · 正在解碼貼圖`),reject)),
            readJSON('collision.json'),readJSON('minimap.json'),this.definition.ropes?readJSON('ropes.json'):Promise.resolve(null),this.definition.bakedLighting?loadMapLighting(BASE):Promise.resolve(null)
        ]);
        if(lighting){lighting.fill=this.definition.bakedFill??0;lighting.gain=this.definition.bakedGain??1;}
        progress('建立地圖碰撞與繪圖批次…');
        await new Promise(requestAnimationFrame);
        const original=gltf.scene;original.scale.setScalar(MAP_SCALE);original.updateMatrixWorld(true);
        const meshes=[];original.traverse(object=>{if(object.isMesh)meshes.push(object)});
        const doorNames=this.id==='lotus'?ROTORS.map(d=>d.source):[];const isDynamic=mesh=>{for(let p=mesh;p;p=p.parent)if(doorNames.includes(p.name))return true;return false;};
        this.dynamicDoorModels=new Map();for(const door of this.id==='lotus'?ROTORS:[]){const group=new T.Group();group.position.copy(door.pivot);group.name=door.id;for(const source of meshes.filter(m=>{for(let p=m;p;p=p.parent)if(p.name===door.source)return true;return false;})){const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);geometry.translate(-door.pivot.x,-door.pivot.y,-door.pivot.z);if(source.matrixWorld.determinant()<0&&geometry.index){const index=geometry.index.array;for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];}const mesh=new T.Mesh(geometry,source.material);mesh.name=source.name;mesh.userData.mapMechanism=door.id;group.add(mesh);}this.dynamicDoorModels.set(door.id,group);}
        const visuals=meshes.filter(m=>!isDynamic(m));
        const excluded=new Set(collision.noCollision||[]);
        const physical=visuals.filter(mesh=>!excluded.has(sourceName(mesh))&&!/fog|cloud|lightshaft|skybox|vfx/i.test(sourceName(mesh)));
        // Projectile-only barriers must not become invisible walls for players.
        const splitProjectiles=this.definition.separateProjectileCollision;
        const extra=volumePositions(collision,splitProjectiles?['pawn']:['pawn','projectile']);
        const vertexCount=physical.reduce((sum,mesh)=>sum+(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count),0);
        const positions=new Float32Array(vertexCount*3+extra.length);
        let offset=0;for(const mesh of physical)offset=worldPositions(mesh,positions,offset);
        positions.set(extra,offset);
        const cutPositions=cutDoorCollision(positions,collisionCutouts(this.id));
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(cutPositions,3));
        geometry.boundsTree=new globalThis.MeshBVHLib.MeshBVH(geometry,{maxLeafTris:12});
        this.collisionMesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));
        this.collisionMesh.name=this.id+'-collision';this.collisionMesh.raycast=globalThis.MeshBVHLib.acceleratedRaycast;
        this.collisionMesh.updateMatrixWorld(true);
        const staticRaycast=this.collisionMesh.raycast,map=this;this.collisionMesh.raycast=function(ray,hits){staticRaycast.call(this,ray,hits);for(const mesh of map.dynamicRaycastMeshes||[])if(mesh.visible)mesh.raycast(ray,hits);};
        if(splitProjectiles){
            const projectilePositions=cutDoorCollision(new Float32Array(volumePositions(collision,['projectile'])),collisionCutouts(this.id));
            const projectileGeometry=new T.BufferGeometry();projectileGeometry.setAttribute('position',new T.BufferAttribute(projectilePositions,3));
            projectileGeometry.boundsTree=new globalThis.MeshBVHLib.MeshBVH(projectileGeometry,{maxLeafTris:12});
            this.projectileCollisionMesh=new T.Mesh(projectileGeometry,new T.MeshBasicMaterial({side:T.DoubleSide}));
            this.projectileCollisionMesh.name=this.id+'-projectile-only';
            this.projectileCollisionMesh.raycast=globalThis.MeshBVHLib.acceleratedRaycast;this.projectileCollisionMesh.updateMatrixWorld(true);
        }
        this.lighting=lighting;const batches=batchVisuals(visuals,lighting);this.root.add(batches.group);this.batches=batches.items;
        this.ropes=(ropeData?.ropes||[]).map(source=>{const raw=source.points.map(p=>new T.Vector3(...p).multiplyScalar(MAP_SCALE));const guide=this.definition.ropeGuides?.[source.name]||this.definition.ropeGuide;const points=guide?raw.map(p=>p.clone().add(new T.Vector3(guide.approach[0],guide.yLift||0,guide.approach[1]))):raw;if(guide){points.at(-1).y+=guide.endLift??.06;if(guide.exit)points.push(raw.at(-1).clone().add(new T.Vector3(guide.exit[0],guide.endLift??.06,guide.exit[1])));}const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+points[i].distanceTo(points[i-1]));return {name:source.name,points,cumulative,length:cumulative.at(-1),runSpeed:(source.tuning?.runSpeed||675)/100*MAP_SCALE,walkSpeed:(source.tuning?.walkSpeed||345)/100*MAP_SCALE};});
        this.metadata=minimap;this.minimapImage.src=new URL('minimap.png',BASE).href;
        await this.minimapImage.decode();
        this.info={lightmappedInstances:lighting?.mapped||0,sourceMeshes:meshes.length,batches:this.batches.length,collisionTriangles:positions.length/9,triangles:meshes.reduce((n,m)=>n+(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3,0)};
        this.ready=true;ktx.dispose();progress(name+' 地圖已就緒');
        return this;
    }
    ropePosition(rope,distance){
        const d=Math.max(0,Math.min(rope.length,distance));let i=1;while(i<rope.cumulative.length-1&&rope.cumulative[i]<d)i++;
        const t=(d-rope.cumulative[i-1])/(rope.cumulative[i]-rope.cumulative[i-1]);const p=rope.points[i-1].clone().lerp(rope.points[i],t);p.y+=.54;return p;
    }
    nearestRope(position){
        let nearest=null,best=1.4;const hand=position.clone();hand.y-=.54;
        for(const rope of this.ropes)for(let i=1;i<rope.points.length;i++){const segment=new T.Line3(rope.points[i-1],rope.points[i]),t=segment.closestPointToPointParameter(hand,true),point=segment.at(t,new T.Vector3()),distance=point.distanceTo(hand);if(distance<best){best=distance;nearest={rope,distance:rope.cumulative[i-1]+(rope.cumulative[i]-rope.cumulative[i-1])*t};}}
        return nearest;
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
        if(this.dynamicColliders?.some(c=>c.enabled!==false&&c.collides(position,crouch)))return true;
        if(this.dynamicSolids?.some(box=>!box.isEmpty()&&box.intersectsBox(this.capsuleBox)))return true;
        return this.collisionMesh.geometry.boundsTree.shapecast({
            intersectsBounds:box=>box.intersectsBox(this.capsuleBox),
            intersectsTriangle:triangle=>triangle.closestPointToSegment(this.segment,this.trianglePoint,this.capsulePoint)<radius-.025
        });
    }
    floorCandidates(x,z) {
        const ray=new T.Ray(new T.Vector3(x,100*this.scale,z),new T.Vector3(0,-1,0));
        const hits=this.collisionMesh.geometry.boundsTree.raycast(ray,T.DoubleSide);
        const ys=[];for(const hit of hits)if((this.definition.doubleSidedGround?Math.abs(hit.face.normal.y):hit.face.normal.y)>.5&&!ys.some(y=>Math.abs(y-hit.point.y)<.08))ys.push(hit.point.y);
        return ys;
    }
    safePoint(sourceX,sourceZ,sourceFloor=1) {
        for(const radius of [0,.8,1.6,2.8,4,6]) for(let i=0;i<(radius?8:1);i++) {
            const x=(sourceX+Math.cos(i*Math.PI/4)*radius)*this.scale,z=(sourceZ+Math.sin(i*Math.PI/4)*radius)*this.scale;
            const floors=this.floorCandidates(x,z).filter(y=>Math.abs(y-sourceFloor*this.scale)<.8*this.scale).sort((a,b)=>Math.abs(a-sourceFloor*this.scale)-Math.abs(b-sourceFloor*this.scale));
            for(const floor of floors) {
                const point=new T.Vector3(x,floor+2.2,z);
                if(!this.collides(point))return point;
            }
        }
        throw Error(`找不到安全的地圖位置 (${sourceX}, ${sourceZ})`);
    }
    getSpawn(team='attack') {
        if(!this.spawnCache.has(team)) {
            const [x,z,floor,yaw]=this.definition.spawns[team]||this.definition.spawns.attack;const position=this.safePoint(x,z,floor);if(this.definition.groundSpawn)position.y=this.getGroundHeight(position)+2.2;
            this.spawnCache.set(team,{position,yaw});
        }
        const spawn=this.spawnCache.get(team);return {position:spawn.position.clone(),yaw:spawn.yaw};
    }
    getBotSpawns(tactical=false) {
        const sources=tactical?this.definition.tactical:this.definition.training;
        return sources.map(([x,z,y])=>{const p=this.safePoint(x,z,y);return{x:p.x,y:p.y-2.2,z:p.z,patrol:1.2}});
    }
    getPlantSite(position) {
        return spikeSite(this.id,position);
    }
    toRadar(x,z,size=176) {
        const t=this.metadata.transform;
        return {x:(x/this.scale*t.scaleU+t.offsetU)*size,y:(z/this.scale*t.scaleV+t.offsetV)*size};
    }
}
