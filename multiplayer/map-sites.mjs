// Shared with the renderer; coordinates are in source-map units.
export const MAP_SCALE=4/3;
export const MAP_SITES=Object.freeze({
 ascent:[{name:'A',minX:-79,maxX:-54,minZ:-73,maxZ:-48},{name:'B',minX:-87,maxX:-64,minZ:15,maxZ:39}],
 haven:[{name:'A',minX:-105,maxX:-79,minZ:-75,maxZ:-52},{name:'B',minX:-105,maxX:-81,minZ:-31,maxZ:-7},{name:'C',minX:-106,maxX:-77,minZ:14,maxZ:38}],
 summit:[{name:'A',minX:104,maxX:128,minZ:-88,maxZ:-67},{name:'B',minX:3,maxX:28,minZ:-98,maxZ:-75}],
 abyss:[{name:'A',minX:-16,maxX:9,minZ:-58,maxZ:-33},{name:'B',minX:-24,maxX:0,minZ:34,maxZ:55}]
});
export function spikeSite(map,p){return MAP_SITES[map]?.find(s=>p.x/MAP_SCALE>=s.minX&&p.x/MAP_SCALE<=s.maxX&&p.z/MAP_SCALE>=s.minZ&&p.z/MAP_SCALE<=s.maxZ)?.name||null;}
