import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_IDS,spawn} from '../multiplayer/protocol.mjs';
import {MAP_SITES,spikeSite,MAP_SCALE} from '../multiplayer/map-sites.mjs';
import {choosePublicMap} from '../multiplayer/match-rules.mjs';
test('all nine maps participate in public rotation with valid team spawns',()=>{assert.equal(MAP_IDS.length,9);for(const map of MAP_IDS){for(const team of ['attack','defend'])assert(Object.values(spawn(team,map)).every(Number.isFinite));assert.notDeepEqual(spawn('attack',map),spawn('defend',map));}const seen=new Set();for(let i=0;i<MAP_IDS.length;i++){const next=choosePublicMap(MAP_IDS,null,()=>i/MAP_IDS.length);assert(MAP_IDS.includes(next));seen.add(next);}assert.equal(seen.size,9);});
test('new source site footprints reject rooftops and surrounding approaches',()=>{for(const map of ['split','lotus','bind','corrode'])for(const site of MAP_SITES[map]){assert(site.polygon.length>=4);const y=(site.minFloor+site.maxFloor)/2*MAP_SCALE+2.2,point=site.polygon[0];assert.equal(spikeSite(map,{x:point[0]*MAP_SCALE,z:point[1]*MAP_SCALE,y}),site.name);assert.equal(spikeSite(map,{x:point[0]*MAP_SCALE,z:point[1]*MAP_SCALE,y:y+25}),null);assert.equal(spikeSite(map,{x:(site.maxX+2)*MAP_SCALE,z:(site.maxZ+2)*MAP_SCALE,y}),null);}});

test('visible Split B and Lotus B floors exclude the hidden collision levels',()=>{for(const [map,x,z,floor,hidden]of [['split',-66.264,17.198,4,0],['lotus',4.222,-69.097,2.03,-1.97]]){const p={x:x*MAP_SCALE,z:z*MAP_SCALE,y:floor*MAP_SCALE+2.2};assert.equal(spikeSite(map,p),'B');assert.equal(spikeSite(map,{...p,y:hidden*MAP_SCALE+2.2}),null);}});
