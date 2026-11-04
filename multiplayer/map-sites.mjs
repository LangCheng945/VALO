// Reconstructed planting regions in source-map metres, not Riot trigger volumes.
// See map-sites-reference.md for the pinned scene/floor/callout evidence.
export const MAP_SCALE=4/3;
export const MAP_SITES=Object.freeze({
 ascent:[{name:'A',minX:-79,maxX:-65,minZ:-71,maxZ:-51,minFloor:4,maxFloor:7.5},{name:'B',minX:-87,maxX:-68,minZ:23,maxZ:40,minFloor:0,maxFloor:3.5}],
 haven:[{name:'A',minX:-104,maxX:-84,minZ:-71,maxZ:-52,minFloor:2,maxFloor:5},{name:'B',minX:-102,maxX:-84,minZ:-29,maxZ:-9,minFloor:2,maxFloor:5},{name:'C',minX:-104,maxX:-89.75,minZ:17,maxZ:37,minFloor:1,maxFloor:4}],
 summit:[{name:'A',minX:104,maxX:122,minZ:-88,maxZ:-67,minFloor:0,maxFloor:3},{name:'B',minX:3,maxX:28,minZ:-97,maxZ:-75,minFloor:0,maxFloor:3}],
 sunset:[{name:'A',minX:34,maxX:48,minZ:-26,maxZ:-10,minFloor:.7,maxFloor:1.6,polygon:[[40,-26],[48,-26],[48,-10],[34,-10],[34,-24],[40,-24]]},{name:'B',minX:-58.1,maxX:-38.1,minZ:-18,maxZ:-4,minFloor:1.7,maxFloor:4.5,polygon:[[-58.1,-18],[-38.1,-18],[-38.1,-4],[-46.1,-4],[-46.1,-10],[-58.1,-10]]}],
 abyss:[{name:'A',minX:-16,maxX:9,minZ:-56,maxZ:-36,minFloor:7,maxFloor:9.5},{name:'B',minX:-20,maxX:1,minZ:34,maxZ:56,minFloor:5,maxFloor:8.5}]
});
// Edge-inclusive polygon support for stepped site footprints.
function insidePolygon(x,z,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [ax,az]=points[j],[bx,bz]=points[i],cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7&&z>=Math.min(az,bz)-1e-7&&z<=Math.max(az,bz)+1e-7)return true;if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;}return inside;}
// Player positions use eye height. Omit y only for plan-view queries (e.g. radar).
export function spikeSite(map,p){
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)||(p.y!==undefined&&!Number.isFinite(p.y)))return null;
 const x=p.x/MAP_SCALE,z=p.z/MAP_SCALE,floor=p.y===undefined?null:(p.y-2.2)/MAP_SCALE;
 return MAP_SITES[map]?.find(s=>x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ&&(!s.polygon||insidePolygon(x,z,s.polygon))&&(floor===null||floor>=s.minFloor&&floor<=s.maxFloor))?.name||null;
}
