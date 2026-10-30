// Shared, lazy navigation over the actual map collision mesh. Searches are spread
// across frames; movement still checks the complete swept capsule and floor.
const T=globalThis.THREE;
const CELL=.8,DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)+Math.abs(a.y-b.y)*2;
class Heap{
 constructor(){this.a=[];}
 push(v){const a=this.a;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,r=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=v.f)break;a[i]=a[c];i=c;}a[i]=v;}return r;}
}
export class BotNavigation{
 constructor(map){this.map=map;this.cells=new Map();this.jobs=new Map();this.clock=0;}
 reset(){this.jobs.clear();}
 node(ix,iz,y){
  const key=ix+','+iz;
  if(!this.cells.has(key)){
   const x=ix*CELL,z=iz*CELL;
   this.cells.set(key,this.map.floorCandidates(x,z).filter(f=>f>-90).map(f=>this.map.getGroundHeight(new T.Vector3(x,f+2.2,z))).filter((f,i,all)=>f>-90&&all.indexOf(f)===i&&!this.map.collides(new T.Vector3(x,f+2.2,z))).map(f=>({x,y:f,z,ix,iz,key:key+','+f.toFixed(2)})));
  }
  return this.cells.get(key).filter(n=>Math.abs(n.y-y)<=.55).sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0];
 }
 nearest(p){
  const ix=Math.round(p.x/CELL),iz=Math.round(p.z/CELL);let best=null,score=Infinity;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
   const n=this.node(ix+dx,iz+dz,p.y);if(n&&distance(n,p)<score&&this.step(p,n)){best=n;score=distance(n,p);}
  }return best;
 }
 step(from,to,extra=()=>false){
  const length=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.max(1,Math.ceil(length/.28));let y=from.y;
  for(let i=1;i<=steps;i++){
   const eye=new T.Vector3(from.x+(to.x-from.x)*i/steps,y+2.2,from.z+(to.z-from.z)*i/steps);
   const floor=this.map.getGroundHeight(eye);if(floor-y>.5||floor-y<-.7)return false;
   eye.y=floor+2.2;if(this.map.collides(eye)||extra(eye))return false;y=floor;
  }
  return Math.abs(y-to.y)<.55;
 }
 request(bot,goal){
  if(this.jobs.has(bot)||this.clock<(bot.navRetryAt||0))return;
  const start=this.nearest(bot.group.position),end=this.nearest(goal);bot.navRetryAt=this.clock+.7;
  if(!start||!end)return;
  const heap=new Heap(),record={node:start,g:0,f:distance(start,end),parent:null};heap.push(record);
  this.jobs.set(bot,{heap,seen:new Map([[start.key,record]]),end,best:record,count:0,goal:goal.clone(),extra:bot.navExtra||(()=>false)});
 }
 finish(bot,job,record){
  const path=[];while(record){path.unshift(new T.Vector3(record.node.x,record.node.y,record.node.z));record=record.parent;}
  bot.navPath=path;bot.navGoal=job.goal;this.jobs.delete(bot);
 }
 tick(dt){
  this.clock+=dt;const until=performance.now()+2.5;let budget=20;
  while(budget-->0&&this.jobs.size&&performance.now()<until){
   const [bot,j]=this.jobs.entries().next().value;this.jobs.delete(bot);
   if(!bot.alive)continue;this.jobs.set(bot,j);
   let r=j.heap.pop();while(r&&r.closed)r=j.heap.pop();
   if(!r||j.count++>=4000){this.finish(bot,j,j.best);continue;}r.closed=true;
   if(distance(r.node,j.end)<distance(j.best.node,j.end))j.best=r;
   if(r.node.key===j.end.key){this.finish(bot,j,r);continue;}
   for(const [dx,dz]of DIRS){
    const n=this.node(r.node.ix+dx,r.node.iz+dz,r.node.y);if(!n||!this.step(r.node,n,j.extra))continue;
    const g=r.g+distance(r.node,n),old=j.seen.get(n.key);if(old&&g>=old.g)continue;
    const v={node:n,g,f:g+distance(n,j.end)*1.12,parent:r};j.seen.set(n.key,v);j.heap.push(v);
   }
  }
 }
 move(bot,goal,dt,extra=()=>false,multiplier=1){
  bot.navExtra=extra;const p=bot.group.position;if(distance(p,goal)<1.6)return false;
  let target=goal;
  // Nearby clear corridors need no path search. Cache this test for 250 ms.
  if(this.clock>=(bot.directAt||0)){bot.directAt=this.clock+.25;bot.directGoal=goal.clone();bot.directClear=distance(p,goal)<9&&this.step(p,goal,extra);}
  if(!bot.directClear||distance(bot.directGoal,goal)>2){
   if(!bot.navPath?.length||!bot.navGoal||distance(bot.navGoal,goal)>4)this.request(bot,goal);
   while(bot.navPath?.length&&Math.hypot(p.x-bot.navPath[0].x,p.z-bot.navPath[0].z)<.04&&Math.abs(p.y-bot.navPath[0].y)<.75)bot.navPath.shift();
   target=bot.navPath?.[0];if(!target)return false;
  }
  const dir=new T.Vector3(target.x-p.x,0,target.z-p.z),length=dir.length();if(length<.01)return false;dir.divideScalar(length);
  const next=p.clone().addScaledVector(dir,Math.min(length,bot.speed*Math.min(dt,.06)*multiplier));
  const eye=next.clone();eye.y+=2.2;next.y=this.map.getGroundHeight(eye);
  if(this.step(p,next,extra)){p.copy(next);bot.roamDirection=dir;bot.blockedFor=0;return true;}
  bot.blockedFor=(bot.blockedFor||0)+dt;bot.directClear=false;
  if(bot.blockedFor>.25){bot.navPath=[];this.jobs.delete(bot);bot.navRetryAt=0;this.request(bot,goal);bot.blockedFor=0;}
  return false;
 }
}
// Random walks keep each spawn connected to its authored safe anchor, rather
// than accepting an isolated rooftop merely because a downward ray hit it.
export function randomBotSpawn(map,anchor,occupied=[],random=Math.random){
 const nav=new BotNavigation(map),start=new T.Vector3(anchor.x,anchor.y||0,anchor.z);let p=start.clone(),best=p.clone();
 for(let i=0;i<26;i++){
  const angle=random()*Math.PI*2,n=p.clone().add(new T.Vector3(Math.cos(angle)*1.05,0,Math.sin(angle)*1.05));
  const eye=n.clone();eye.y+=2.2;n.y=map.getGroundHeight(eye);
  if(n.distanceTo(start)>7||!nav.step(p,n))continue;p=n;
  if(occupied.every(o=>Math.hypot(o.x-p.x,o.z-p.z)>1.4))best=p.clone();
 }
 return {...anchor,x:best.x,y:best.y,z:best.z};
}
