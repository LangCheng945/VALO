// Compatibility entry: character-specific resources share the guarded hand loader.
import {installPhoenixHands,posePhoenixHand} from './phoenix-hands.js?v=agent2';
export function installJettHands(owner){return owner.agent==='jett'?installPhoenixHands(owner):Promise.resolve(false);}
export const poseJettHand=posePhoenixHand;
