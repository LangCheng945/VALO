export const GAME_DURATIONS=Object.freeze([0,60,90,120,180,300,600]);
export const DEFAULT_GAME_DURATION=300;
export const SPIKE_RULES=Object.freeze({plantSeconds:4,defuseSeconds:7,checkpointSeconds:3.5,fuseSeconds:45,defuseRadius:3.3,blastRadius:60,blastDamage:1000,blastVisualSeconds:2});

// Migrate the old one-minute default once, preserving explicitly unlimited practice.
export function savedGameDuration(saved={}){
    if(saved.duration===0)return 0;
    return saved.durationVersion===2&&GAME_DURATIONS.includes(saved.duration)?saved.duration:DEFAULT_GAME_DURATION;
}

// The Spike affects both teams and ignores walls; callers supply body-center positions.
export function withinSpikeBlast(origin,point,radius=SPIKE_RULES.blastRadius){
 if(!origin||!point||!Number.isFinite(radius)||radius<=0)return false;
 if(!['x','y','z'].every(k=>Number.isFinite(origin[k])&&Number.isFinite(point[k])))return false;
 return Math.hypot(point.x-origin.x,point.y-origin.y,point.z-origin.z)<radius;
}
