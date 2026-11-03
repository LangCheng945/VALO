import{SPIKE_RULES}from'./game-rules.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)+Math.abs(a.y-b.y)*2;
export class FollowTrail{
 constructor(limit=160){this.limit=limit;this.points=[];this.nextId=1;}
 clear(){this.points=[];this.nextId++;}
 record(p){const last=this.points.at(-1);if(last&&dist(p,last)<1.1)return;this.points.push({x:p.x,y:p.y,z:p.z,id:this.nextId++});if(this.points.length>this.limit)this.points.shift();}
 goal(bot,player){const p=bot.group.position;if(!this.points.length||dist(p,player)<4)return{x:player.x,y:player.y,z:player.z};let i=this.points.findIndex(v=>v.id===bot.followTrailId);if(i<0){let best=Infinity;this.points.forEach((v,index)=>{const d=dist(p,v);if(d<best){best=d;i=index;}});}while(i<this.points.length-1&&dist(p,this.points[i])<2.7)i++;bot.followTrailId=this.points[i].id;return this.points[Math.min(i+1,this.points.length-1)];}
}
export class BotDefuseController{
 constructor(){this.reset();}
 reset(checkpoint=0){this.index=null;this.elapsed=checkpoint*SPIKE_RULES.defuseSeconds;}
 update(dt,{active,planted,checkpoint=0,actors=[],spike,timeLeft=0,playerDefusing=false,canReach=()=>true}){
  const result={index:null,progress:checkpoint,checkpoint,complete:false};if(!active||!planted||playerDefusing||!spike){this.reset(checkpoint);return result;}
  const eligible=actors.filter(a=>{if(!a.alive||a.team!=='defend'||a.realm||a.combatVisible&&a.retakeRole!=='defuse'&&timeLeft>9)return false;const p=a.group?.position||a.position;return Math.hypot(p.x-spike.x,p.y+2.2-spike.y,p.z-spike.z)<SPIKE_RULES.defuseRadius&&canReach(a);});
  let actor=eligible.find(a=>a.index===this.index);if(!actor)actor=eligible.sort((a,b)=>dist(a.group?.position||a.position,spike)-dist(b.group?.position||b.position,spike))[0];
  if(!actor){this.reset(checkpoint);return result;}if(actor.index!==this.index){this.index=actor.index;this.elapsed=checkpoint*SPIKE_RULES.defuseSeconds;}
  const left=SPIKE_RULES.defuseSeconds-this.elapsed;this.elapsed=Math.min(SPIKE_RULES.defuseSeconds,this.elapsed+Math.max(0,dt));result.index=this.index;result.progress=this.elapsed/SPIKE_RULES.defuseSeconds;result.checkpoint=result.progress>=.5?.5:checkpoint;result.complete=left<=dt+1e-8&&left<timeLeft;return result;
 }
}
// A planted Spike is a global defender objective. Keep the current defuser if
// alive; everyone else rotates to nearby cover instead of abandoning the site.
export function retakeOrders(actors,spike,{defuserIndex=null,canStand=()=>true}={}){
 const defenders=actors.filter(a=>a.alive&&a.team==='defend'&&!a.realm).sort((a,b)=>dist(a.group?.position||a.position,spike)-dist(b.group?.position||b.position,spike)||a.index-b.index);
 const defuser=defenders.find(a=>a.index===defuserIndex)||defenders[0];
 return defenders.map((a,i)=>{let goal={x:spike.x,y:spike.y,z:spike.z};if(a!==defuser){const angle=i*2.39996,radius=3.2+(i%2)*.8,candidate={x:spike.x+Math.cos(angle)*radius,y:spike.y,z:spike.z+Math.sin(angle)*radius};if(canStand(candidate))goal=candidate;}return{index:a.index,role:a===defuser?'defuse':'cover',goal};});
}
