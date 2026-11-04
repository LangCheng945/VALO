const clamp=v=>Math.max(0,Math.min(1,v));
// Use one envelope for the visible radius, bot occlusion and inside view.
export function smokePhase(age,remaining){const intro=clamp(age/.2),outro=clamp(remaining/.22);return{scale:(1-(1-intro)**3)*outro,opacity:clamp(remaining/.38)};}
