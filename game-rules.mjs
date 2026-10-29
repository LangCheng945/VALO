export const GAME_DURATIONS=Object.freeze([0,60,90,120,180,300,600]);
export const DEFAULT_GAME_DURATION=300;
export const SPIKE_RULES=Object.freeze({plantSeconds:4,defuseSeconds:7,checkpointSeconds:3.5,fuseSeconds:45,defuseRadius:3.3});

// Migrate the old one-minute default once, preserving explicitly unlimited practice.
export function savedGameDuration(saved={}){
    if(saved.duration===0)return 0;
    return saved.durationVersion===2&&GAME_DURATIONS.includes(saved.duration)?saved.duration:DEFAULT_GAME_DURATION;
}
