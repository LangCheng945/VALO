export function spectatorCandidates(players,{uid,team}={}){
 return players.filter(p=>p.uid!==uid&&p.team===team&&p.hp>0&&p.active!==false);
}
export function pickSpectatorTarget(candidates,current,direction=0){
 if(!candidates.length)return null;const i=candidates.findIndex(p=>p.uid===current);
 return candidates[((i<0?0:i)+direction%candidates.length+candidates.length)%candidates.length].uid;
}
