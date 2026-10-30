export const BLADE_CAPACITY=5,BLADE_KILL_BONUS=3;
export const bladeRefill=count=>Math.min(BLADE_CAPACITY,Math.max(0,count)+BLADE_KILL_BONUS);
// A center knife plus an even fan; each is an independent, blocked-by-cover ray.
export function bladeFan(count){const offsets=[[0,0],[-.045,.012],[.045,.012],[-.085,-.018],[.085,-.018]];return offsets.slice(0,Math.min(BLADE_CAPACITY,Math.max(0,count)));}
