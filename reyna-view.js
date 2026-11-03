import{REYNA,reynaState,resetReyna,reynaDeath,reynaBusy,reynaDismissed,empressActive,beginDevour,tickDevour,gazeAt}from'./multiplayer/reyna-rules.mjs?v=neon2';
import{disposeEffect}from'./ability-effects.js?v=neon2';
const T=globalThis.THREE;
export class ReynaKit{
 constructor(api){this.api=api;this.eyes=new Map();this.orbs=new Map();this.held=false;this.pendingUntil=0;this.scanAt=0;this.tetherAt=0;
  this.status=document.createElement('div');this.status.id='reyna-status';this.status.style='position:fixed;bottom:166px;left:50%;transform:translateX(-50%);z-index:28;font:600 12px sans-serif;color:#e6b5ff;text-shadow:0 1px 4px #000;pointer-events:none';document.body.append(this.status);
  this.rim=document.createElement('div');this.rim.id='reyna-phase-rim';this.rim.style='position:fixed;inset:0;z-index:20;pointer-events:none;box-shadow:inset 0 0 75px #9444d655;display:none';document.body.append(this.rim);
  this.line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xd381ff,transparent:true,opacity:.6,depthTest:true}));this.line.name='reyna-devour-tether';this.line.visible=false;api.scene.add(this.line);
 }
 get state(){return this.api.state;}get network(){return this.api.network();}now(){return this.network?this.api.now():Date.now();}enabled(){return this.state.agent==='reyna';}
 buff(){return empressActive(this.state,this.now());}phase(){return reynaDismissed(this.state,this.now());}blocked(){return this.held||reynaBusy(this.state,this.now());}movement(){return this.phase()?REYNA.dismissMove:1;}
 reset(){resetReyna(this.state);this.cancel();this.refresh();}cancel(){this.held=false;}
 clear(){this.cancel();for(const id of [...this.eyes.keys()])this.remove(this.eyes,id);for(const id of [...this.orbs.keys()])this.remove(this.orbs,id);this.line.visible=false;this.rim.style.display='none';this.status.textContent='';}
 refresh(){if(!this.enabled())return;const p=this.state,s=reynaState(p);p.cCharges=Math.max(0,2-(s.cUsed||0));p.qCharges=this.buff()?0:Math.max(0,2-(s.soulUsed||0));p.eCharges=this.buff()?1:Math.max(0,2-(s.soulUsed||0));p.xCharges=p.ultUsed?0:1;p.cCooldown=p.qCooldown=p.eCooldown=0;}
 sync(p){this.state.leerUntil=p.leerUntil||0;if(!this.enabled())return;this.state.reyna=p.reyna||{};this.state.ultUsed=!!p.ultUsed;this.pendingUntil=0;this.refresh();}
 send(m){this.pendingUntil=this.now()+500;this.api.send(m);}
 key(code){if(!this.enabled()||!['KeyC','KeyQ','KeyE','KeyX'].includes(code))return false;const p=this.state,now=this.now();if(!p.isLocked||p.inBuyMenu||p.hp<=0||p.roundEnding||p.realm)return true;
  if(this.network&&!this.api.features().includes('reyna-kit-1')){this.api.notice('連線後端尚未更新 Reyna 技能');return true;}
  if(code==='KeyE'&&this.phase()){if(this.network)this.send({type:'reyna_cancel'});else{p.reyna.dismissUntil=now;p.reyna.recoverUntil=now+REYNA.recoveryMs;}return true;}
  if(reynaBusy(p,now)||now<this.pendingUntil)return true;const s=reynaState(p);
  if(code==='KeyC'){if(p.cCharges<=0)return true;const was=this.held;this.api.prepare();this.held=!was;if(this.held)this.api.hold();}
  if(code==='KeyQ'||code==='KeyE'){
   if(code==='KeyQ'&&this.buff()){this.api.notice('女皇期間擊殺或助攻會自動治療');return true;}if(!this.buff()&&(s.soulUsed||0)>=2)return true;
   const orb=this.targetOrb();if(!orb){this.api.notice('需要附近可見的靈魂球');return true;}this.cancel();this.api.prepare();
   if(this.network)this.send({type:code==='KeyQ'?'reyna_devour':'reyna_dismiss',id:orb.id});else{if(!this.buff())s.soulUsed=(s.soulUsed||0)+1;if(code==='KeyQ')beginDevour(p,orb,now);else{s.dismissUntil=now+REYNA.dismissMs;s.recoverUntil=s.dismissUntil+REYNA.recoveryMs;if(!this.buff())s.heal=null;}this.remove(this.orbs,orb.id);}this.api.cast();
  }
  if(code==='KeyX'){if(p.ultUsed)return true;this.cancel();this.api.prepare();if(this.network)this.send({type:'reyna_empress'});else{p.ultUsed=true;s.empressUntil=now+REYNA.empressMs;}this.api.cast();}
  this.refresh();this.api.hud();return true;
 }
 mouseDown(e){if(this.phase()){if(e.button===2)this.key('KeyE');return true;}if(!this.held)return false;if(e.button===2){this.cancel();this.api.cancelCast();return true;}if(e.button!==0)return true;const p=this.api.position(),d=this.api.camera.getWorldDirection(new T.Vector3()),now=this.now();if(this.network)this.send({type:'reyna_leer',dx:d.x,dy:d.y,dz:d.z});else{const s=reynaState(this.state);s.cUsed=(s.cUsed||0)+1;this.receive({type:'reyna_eye',id:crypto.randomUUID(),ownerUid:this.api.uid(),team:this.state.team,x:p.x+d.x*REYNA.eyeRange,y:p.y+d.y*REYNA.eyeRange,z:p.z+d.z*REYNA.eyeRange,createdAt:now,expiresAt:now+REYNA.eyeArmMs+REYNA.eyeMs,hp:REYNA.eyeHp});}this.cancel();this.api.cast();this.refresh();this.api.hud();return true;}
 targetOrb(){const p=this.api.position();return [...this.orbs.values()].filter(o=>o.ownerUid===this.api.uid()&&o.expiresAt>this.now()&&Math.hypot(p.x-o.x,p.y-o.y,p.z-o.z)<=REYNA.soulRange&&this.api.clearLine(p,o)).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0];}
 remove(map,id){const e=map.get(id);if(!e)return;if(map===this.eyes){const index=this.api.shootable.indexOf(e.hit);if(index>=0)this.api.shootable.splice(index,1);}disposeEffect(e.mesh);map.delete(id);}
 receive(e){if(e.type==='reyna_eye_end'){this.remove(this.eyes,e.id);return true;}if(e.type==='reyna_orb_end'){this.remove(this.orbs,e.id);return true;}
  if(e.type==='reyna_eye'){if(this.eyes.has(e.id))return true;const mesh=new T.Group();mesh.name='reyna-leer-eye';mesh.position.set(e.x,e.y,e.z);const hit=new T.Mesh(new T.SphereGeometry(REYNA.eyeRadius,16,12),new T.MeshBasicMaterial({color:0xb54bdd,fog:false,transparent:true,opacity:.9}));hit.userData.reynaEye=e.id;mesh.add(hit);const iris=new T.Mesh(new T.CircleGeometry(.32,24),new T.MeshBasicMaterial({color:0x20112f,fog:false,side:T.DoubleSide}));iris.position.z=.56;iris.scale.x=.5;mesh.add(iris);const ring=new T.Mesh(new T.TorusGeometry(.6,.035,6,32),new T.MeshBasicMaterial({color:0xff9bdf,fog:false}));mesh.add(ring);this.api.scene.add(mesh);this.api.shootable.push(hit);mesh.updateMatrixWorld(true);this.eyes.set(e.id,{...e,mesh,hit});return true;}
  if(e.type==='reyna_orb'){if(e.ownerUid!==this.api.uid()||this.orbs.has(e.id))return true;const mesh=new T.Group();mesh.name='reyna-soul-orb';mesh.position.set(e.x,e.y,e.z);mesh.add(new T.Mesh(new T.IcosahedronGeometry(.24,1),new T.MeshBasicMaterial({color:0xe67cd6})));const ring=new T.Mesh(new T.TorusGeometry(.4,.025,5,20),new T.MeshBasicMaterial({color:0x9b50e4,transparent:true,opacity:.8}));mesh.add(ring);this.api.scene.add(mesh);this.orbs.set(e.id,{...e,mesh});return true;}return false;
 }
 hitObject(mesh,damage){const id=mesh.userData.reynaEye;if(!id)return false;if(this.network)this.api.send({type:'reyna_eye_hit',id});else{const eye=this.eyes.get(id);if(eye){eye.hp-=damage;if(eye.hp<=0)this.remove(this.eyes,id);}}return true;}
 takedown(bot,credited){if(this.network||!this.enabled()||!credited||this.state.hp<=0||bot.team===this.state.team||bot.realm||this.state.realm||bot.isoDuelDeathAt>=this.now()-50)return;const now=this.now(),orb={type:'reyna_orb',id:crypto.randomUUID(),ownerUid:this.api.uid(),x:bot.group.position.x,y:bot.group.position.y+1.2,z:bot.group.position.z,expiresAt:now+REYNA.orbMs};this.receive(orb);if(this.buff()){reynaState(this.state).empressUntil=now+REYNA.empressMs;beginDevour(this.state,orb,now,true);}}
 hideActors(){const now=this.now();for(const rp of this.api.remotes().values())if(reynaDismissed(rp.data,now)&&empressActive(rp.data,now))rp.group.visible=false;}

 update(dt){const now=this.now(),p=this.state;if(this.held&&(!p.isLocked||p.inBuyMenu||p.hp<=0||p.realm||!this.enabled()))this.cancel();
  for(const [id,e]of this.eyes){if(e.expiresAt<=now){this.remove(this.eyes,id);continue;}e.mesh.lookAt(this.api.camera.getWorldPosition(new T.Vector3()));const size=Math.min(1,Math.max(.02,(now-e.createdAt)/REYNA.eyeArmMs));e.mesh.scale.setScalar(size);e.mesh.children[2].rotation.z+=dt*.7;}
  for(const [id,o]of this.orbs){if(o.expiresAt<=now){this.remove(this.orbs,id);continue;}o.mesh.position.y=o.y+Math.sin(now*.004)*.08;o.mesh.rotation.y+=dt;}
  if(now>=this.scanAt){this.scanAt=now+150;const at=this.api.position(),dir=this.api.camera.getWorldDirection(new T.Vector3()),pose={...at,yaw:Math.atan2(-dir.x,-dir.z),pitch:Math.asin(dir.y)};let reported=false;
   for(const eye of this.eyes.values()){if(now<eye.createdAt+REYNA.eyeArmMs)continue;
    if(!reported&&p.hp>0&&!p.realm&&!this.phase()&&eye.team!==p.team&&gazeAt(pose,eye)&&this.api.clearLine(at,eye)){if(this.network)this.api.send({type:'reyna_exposed',id:eye.id});else p.leerUntil=now+350;reported=true;}
    if(!this.network)for(const b of this.api.bots()){if(!b.alive||b.realm||b.team===eye.team)continue;const eyePos={x:b.group.position.x,y:b.group.position.y+2,z:b.group.position.z},yaw=b.group.rotation.y+Math.PI,botPose={...eyePos,yaw,pitch:0};if(gazeAt(botPose,eye)&&this.api.clearLine(eyePos,eye)){b.leerUntil=now+350;if(now>=(b.eyeShotAt||0)){b.eyeShotAt=now+700;eye.hp-=34;this.api.tracer(eyePos,eye);if(eye.hp<=0){this.remove(this.eyes,eye.id);break;}}}}
   }
  }
  const s=p.reyna,h=s?.heal;if(h){const clear=h.automatic||this.api.clearLine(this.api.position(),h);if(clear&&now>=this.tetherAt){this.tetherAt=now+200;if(this.network&&!h.automatic)this.api.send({type:'reyna_tether'});else h.visibleUntil=now+450;}
   if(!this.network){const actor={...p,...this.api.position()};tickDevour(actor,now);p.hp=actor.hp;p.tempHealth=actor.tempHealth;this.api.health();}
  }
  if(!this.network&&p.hp<=0)reynaDeath(p);
  const activeHeal=p.reyna?.heal;this.line.visible=!!activeHeal&&p.hp>0&&!p.realm&&this.api.clearLine(this.api.position(),activeHeal);if(this.line.visible){const pos=this.api.position(),array=this.line.geometry.attributes.position.array;array.set([pos.x,pos.y-.3,pos.z,activeHeal.x,activeHeal.y,activeHeal.z]);this.line.geometry.attributes.position.needsUpdate=true;this.line.geometry.computeBoundingSphere();}
  const phase=this.phase();this.rim.style.display=phase||this.buff()?'block':'none';this.rim.style.boxShadow=phase?'inset 0 0 90px #a350f166':'inset 0 0 50px #ba367d33';

  let text='';if(this.enabled()){if(phase)text='消散 · '+Math.ceil((s.dismissUntil-now)/1000)+' 秒 · E／右鍵結束';else if(this.buff())text='女皇 · '+Math.ceil((s.empressUntil-now)/1000)+' 秒';else if(this.held)text='左鍵：投擲致盲眼 · 右鍵：取消';else if(this.targetOrb())text='Q：吞噬 · E：消散';}if(this.status.textContent!==text)this.status.textContent=text;this.refresh();
 }
}
