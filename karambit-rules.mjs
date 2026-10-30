const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t);};
export const KARAMBIT_DRAW_SECONDS=.68,KARAMBIT_INSPECT_SECONDS=2.2;
export function karambitPose({draw=1,inspect=0}={}){
 const extend=ease((draw-.12)/.65),show=Math.sin(clamp(inspect)*Math.PI),spin=ease((inspect-.12)/.7)*Math.PI*4;
 return {extension:extend,hinge:extend===1?0:(1-extend)*-2.25,spin,
  position:[.35-show*.065,-.27+show*.045,-.65],
  rotation:[-.18+show*.12,show*.32,-.55+spin+(1-extend)*.55],
  handPosition:[.37-show*.065,-.25+show*.045,-.615],handRotation:[.35,0,-1.15+Math.sin(spin)*.12]};
}
