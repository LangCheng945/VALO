// Visual-only budgets: never change movement, hit tests or network send frequency.
export const QUALITY_MODES=['auto','performance','quality'];
export class RenderBudget {
 constructor(mode='auto'){this.mode=QUALITY_MODES.includes(mode)?mode:'auto';this.scale=1;this.resetSamples();}
 resetSamples(){this.elapsed=0;this.frames=0;this.slowWindows=0;this.fastWindows=0;}
 setMode(mode){this.mode=QUALITY_MODES.includes(mode)?mode:'auto';this.scale=1;this.resetSamples();}
 ratio(width,height,dpr=1){
  const pixels=Math.max(1,width*height),device=Math.max(.5,Number(dpr)||1);
  if(this.mode==='quality')return Math.min(device,1.5);
  const budget=this.mode==='performance'?921600:1800000;
  return Math.min(device,this.mode==='performance'?1:1.5,Math.sqrt(budget/pixels))*this.scale;
 }
 sample(dt,active=true){
  // Menus, hidden tabs and long suspension gaps must not push quality down.
  if(!active||!Number.isFinite(dt)||dt<=0||dt>1){this.resetSamples();return false;}
  if(this.mode!=='auto')return false;
  this.elapsed+=dt;this.frames++;if(this.elapsed<2)return false;
  const ms=this.elapsed/this.frames*1000;this.elapsed=0;this.frames=0;
  this.slowWindows=ms>23?this.slowWindows+1:0;this.fastWindows=ms<17.5?this.fastWindows+1:0;
  const before=this.scale;
  if(this.slowWindows>=2){this.scale=Math.max(.6,Math.round((this.scale-.1)*10)/10);this.slowWindows=0;this.fastWindows=0;}
  else if(this.fastWindows>=6){this.scale=Math.min(1,Math.round((this.scale+.05)*100)/100);this.fastWindows=0;}
  return this.scale!==before;
 }
}
export class SoundGroundCache {
 constructor(){this.entries=new WeakMap();}
 get(actor,position,dt,query){
  const old=this.entries.get(actor);if(old)old.age+=dt;
  if(!old||old.age>=.12||Math.abs(old.y-position.y)>.4||Math.hypot(old.x-position.x,old.z-position.z)>1){
   const value=query();this.entries.set(actor,{x:position.x,y:position.y,z:position.z,age:0,value});return value;
  }
  return old.value;
 }
}
