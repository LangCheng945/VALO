import {FIREARMS} from './firearms.mjs';
// Current slot names are pinned from the community API and Riot agent pages.
// Numbers below are browser-trainer tuning, not claims of current competitive balance.
const skill=(name,kind,charges=1,extra={})=>({name,kind,charges,...extra});
export const BATCH_KITS={
 'phoenix-original':{color:0xff8b38,c:skill('Blaze','firewall'),q:skill('Hot Hands','molly'),e:skill('Curveball','flash',2,{killsReset:2}),x:skill('Run it Back','rewind')},
 chamber:{color:0xe2bd5b,c:skill('Trademark','slowtrap'),q:skill('Headhunter','headhunter',8),e:skill('Rendezvous','teleanchor'),x:skill('Tour De Force','tour')},
 deadlock:{color:0xbce7d3,c:skill('Barrier Mesh','mesh'),q:skill('Sonic Sensor','sensor',2),e:skill('GravNet','net'),x:skill('Annihilation','cocoon')},
 gekko:{color:0xaff06f,c:skill('Mosh Pit','mosh'),q:skill('Wingman','wingman'),e:skill('Dizzy','dizzy'),x:skill('Thrash','thrash')},
 harbor:{color:0x54d5d4,c:skill('Storm Surge','surge'),q:skill('High Tide','waterwall'),e:skill('Cove','cove'),x:skill('Reckoning','tidalwave')},
 kayo:{color:0x8d9bff,c:skill('FRAG/ment','fragment'),q:skill('FLASH/drive','flash',2),e:skill('ZERO/point','knife'),x:skill('NULL/cmd','nullcmd')},
 miks:{color:0xf287c4,c:skill('M-pulse','mpulse',2),q:skill('Harmonize','harmonize'),e:skill('Waveform','smokes',2),x:skill('Bassquake','basswave')},
 tejo:{color:0xf3b966,c:skill('Stealth Drone','drone'),q:skill('Special Delivery','stunade',2),e:skill('Guided Salvo','salvo',2),x:skill('Armageddon','armageddon')},
 veto:{color:0x8ce2a1,c:skill('Crosscut','crosscut',2),q:skill('Chokehold','chokehold'),e:skill('Interceptor','interceptor'),x:skill('Evolution','evolution')},
 waylay:{color:0xf9e08a,c:skill('Saturate','hinder'),q:skill('Lightspeed','dash'),e:skill('Refract','refract',1,{killsReset:2}),x:skill('Convergent Paths','lightwave')},
 yoru:{color:0x719aff,c:skill('Fakeout','clone',2),q:skill('Blindside','bounceflash',2),e:skill('Gatecrash','gate',1,{killsReset:2}),x:skill('Dimensional Drift','drift')}
};
export const batchAgent=p=>!!BATCH_KITS[p?.agent];
export function batchState(p){const s=p.agentBatch||={agent:p.agent,used:{},ready:{},weapon:null,lastKills:p.kills||0};if(s.weapon&&s.guns)s.guns[s.weapon.kind]=s.weapon;return s;}
export function resetBatch(p,{preserveDebuffs=false}={}){p.agentBatch=null;if(!preserveDebuffs){for(const k of ['batchSuppressedUntil','batchSlowUntil','batchHinderUntil','batchRevealUntil','batchDeafUntil'])p[k]=0;p.batchNet=null;p.batchTether=null;p.batchCocoon=null;}}
export const batchUntargetable=(p,n)=>!!p&&(p.agentBatch?.driftUntil>n||p.agentBatch?.returnAt>n||!!p.batchCocoon);
export const batchAbilityImmune=(p,n)=>!!p&&(p.agent==='veto'&&p.agentBatch?.evolutionUntil>n||p.agent==='reyna'&&p.reyna?.dismissUntil>n||p.agent==='clove'&&p.clove?.escapeUntil>n||batchUntargetable(p,n));
export const batchSuppressed=(p,n)=>!batchAbilityImmune(p,n)&&(p.batchSuppressedUntil||0)>n;
export const batchImmobile=(p,n)=>!!p&&(p.agentBatch?.controlId||p.agentBatch?.downedUntil>n||p.batchCocoon||p.agentBatch?.returnAt>n);
export const batchAttackBlocked=(p,n)=>batchImmobile(p,n)||p.agentBatch?.driftUntil>n;
export const batchFireRate=(p,n)=>p.batchHinderUntil>n?.65:p.agentBatch?.stimUntil>n?1.15:1;
export function batchMoveRate(p,n){if(batchImmobile(p,n))return 0;return(p.batchNet||p.batchTether||p.batchHinderUntil>n||p.batchSlowUntil>n?.5:1)*(p.agentBatch?.hasteUntil>n?1.2:1);}
export function purgeBatchDebuffs(p,n){if(p.agent==='veto'&&p.agentBatch?.evolutionUntil>n){for(const k of ['batchSuppressedUntil','batchSlowUntil','batchHinderUntil','batchRevealUntil','breachFlashUntil','skyeFlashUntil','breachConcussUntil','neonConcussUntil','vyseJammedUntil','vyseSlowedUntil','cypherConcussUntil','detainedUntil','nearsightUntil','leerUntil','deafenedUntil','vulnerableUntil'])p[k]=0;p.batchNet=p.batchTether=null;p.cypherAnchor=p.fadeTether=null;if(p.decayAmount>0){p.hp=Math.min(100,p.hp+p.decayAmount);p.decayAmount=0;p.decayUntil=0;}}}
export function batchCharges(p,key,n){const d=BATCH_KITS[p.agent]?.[key];if(!d)return 0;const s=batchState(p);if(s.ready[key]>n)return 0;if(s.ready[key]&&s.ready[key]<=n)return d.charges;if(key==='x')return p.ultUsed?0:1;if(d.kind==='headhunter')return s.guns?.headhunter?.ammo??d.charges;return Math.max(0,d.charges-(s.used[key]||0));}
export const batchPoint=(f,n)=>{const t=Math.max(0,n-(f.segmentAt||f.createdAt))/1000;return{x:f.x+(f.vx||0)*t,y:f.y+(f.vy||0)*t-(f.gravity??14)*t*t/2,z:f.z+(f.vz||0)*t};};
export const batchDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export const batchInside=(p,e,r=e.radius||4,height=4)=>!p.realm&&Math.hypot(p.x-e.x,p.z-e.z)<=r&&Math.abs(p.y-1.2-e.y)<height;
export function batchSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,den=dx*dx+dy*dy+dz*dz,t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/den)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t,p.z-a.z-dz*t);}
export function batchWallHit(a,b,e,pad=0){const x=b.x-a.x,z=b.z-a.z;let best=null;for(let i=1;i<(e.path||[]).length;i++){const c=e.path[i-1],d=e.path[i],sx=d.x-c.x,sz=d.z-c.z,den=x*sz-z*sx;if(Math.abs(den)<1e-8)continue;const t=((c.x-a.x)*sz-(c.z-a.z)*sx)/den,u=((c.x-a.x)*z-(c.z-a.z)*x)/den;if(t<0||t>1||u<0||u>1)continue;const y=a.y+(b.y-a.y)*t,floor=c.y+(d.y-c.y)*u;if(y<floor-pad||y>floor+(e.height||4)+pad)continue;if(!best||t<best.t)best={t,x:a.x+x*t,y,z:a.z+z*t};}return best;}
export function batchBlocksVision(a,b,effects,n){return effects.some(e=>e.expiresAt>n&&(e.vision&&e.path?!!batchWallHit(a,b,e):e.vision&&e.radius?batchSegmentDistance(e,a,b)<e.radius:false));}
export function batchCollision(p,effects,n,previous=null){return effects.some(e=>e.solid&&e.expiresAt>n&&(e.path||[]).some((b,i)=>i>0&&p.y+.2>b.y&&p.y-2.2<b.y+(e.height||4)&&batchSegmentDistance({...p,y:b.y},e.path[i-1],b)<.5&&!(previous&&batchSegmentDistance({...previous,y:b.y},e.path[i-1],b)<.5)));}
export function batchShotBlock(a,b,effects,n){let best=null;for(const e of effects){if(e.expiresAt<=n||!e.bulletShield||e.hp<=0)continue;let hit=e.path?batchWallHit(a,b,e):null;if(e.radius){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,ox=a.x-e.x,oy=a.y-e.y,oz=a.z-e.z,A=dx*dx+dy*dy+dz*dz,B=2*(ox*dx+oy*dy+oz*dz),C=ox*ox+oy*oy+oz*oz-e.radius*e.radius,D=B*B-4*A*C;if(A&&D>=0){const t=(-B-Math.sqrt(D))/(2*A);if(t>=0&&t<=1)hit={t,x:a.x+dx*t,y:a.y+dy*t,z:a.z+dz*t};}}if(hit&&(!best||hit.t<best.t))best={...hit,id:e.id};}return best;}
export function interceptBatchLethal(p,n,source={}){if(p.hp>0)return null;const s=p.agentBatch;if(p.agent==='phoenix-original'&&s?.rewind?.until>n){const mark=s.rewind;s.rewind=null;p.hp=100;p.shield=mark.shield;Object.assign(p,{x:mark.x,y:mark.y,z:mark.z,yaw:mark.yaw});return{type:'rewind',position:mark};}if(p.agent==='kayo'&&s?.nullUntil>n&&!s.downUsed){s.downUsed=true;s.downedUntil=n+15000;s.downSource=source;p.hp=100;p.shield=0;return{type:'downed'};}return null;}
export function batchStatus(p,kind,n,ms=3000){if(batchAbilityImmune(p,n))return;const fields={slow:'batchSlowUntil',hinder:'batchHinderUntil',suppress:'batchSuppressedUntil',concuss:'breachConcussUntil',near:'nearsightUntil',deaf:'deafenedUntil',detain:'detainedUntil',reveal:'batchRevealUntil',flash:'breachFlashUntil'};const field=fields[kind];if(field)p[field]=Math.max(p[field]||0,n+ms);}
export function isFreshAbility(m){return m.type==='batch_cast'||m.type==='batch_shot'||/^(heal|wall|revive|slow_launch|smoke_launch)$/.test(m.type)||/^(clove_(smokes|meddle|pickup|revive)|iso_(wall|undercut|focus|ultimate)|omen_(smoke|paranoia|step|ultimate)|brim_(smokes|incendiary|stim|ultimate)|reyna_(leer|devour|dismiss|ultimate)|sova_(launch|drone|ultimate|beam)|killjoy_(place|throw|activate)|cypher_(place|throw|ultimate)|neon_(wall|bolt|run|slide|ultimate|beam)|breach_(charge|fault|flash|aftershock|ultimate)|viper_(wall|throw|pit)|raze_(throw|bot|ult)|astra_(place|activate|divide)|recon_(throw|spawn|heal|ultimate)|vyse_(throw|shear|garden|place|pop))$/.test(m.type);}
// Local help is shared by selection, HUD and the buy panel.
const help={
 'phoenix-original':['左鍵確認火牆，阻擋視線；自己的火焰可治療自己。','左鍵投擲燃燒球，落地形成傷害區；可自補。','左鍵丟出短引信閃光；會影響隊友，兩次擊殺補充。','立即標記位置；時間結束或遭到致命傷時返回。'],
 chamber:['左鍵放置可破壞陷阱，偵測到敵人後展開緩速。','Q 裝備專屬手槍，8 發；右鍵開鏡，可切回再取出。','左鍵放置傳送錨；範圍內再按 E 返回，之後冷卻。','X 裝備 5 發狙擊槍；右鍵開鏡，擊殺留下緩速區。'],
 deadlock:['投擲屏障，落地形成四道阻擋人物的屏障；可射擊端點破壞。','放置音波感測器，偵測跑步或射擊後震盪附近角色。','投擲重力網，限制移動並強制蹲下；按 F 移除。','捕捉前方首位敵人並拖回；隊友射破繭可救人。'],
 gekko:['投擲 Mosh，延遲後造成區域傷害；F 撿回殘球。','左鍵放出 Wingman 震盪敵人；右鍵瞄準據點／Spike 裝拆包。','投出 Dizzy，依視線短暫致盲；結束後 F 撿回。','WASD 控制 Thrash，左鍵撲擊拘束附近角色；可回收一次。'],
 harbor:['投擲水流區域，使命中角色緩速、近視。','向前展開遮蔽視線的水牆，可彎曲引導。','在地圖標點、右鍵確認煙霧；再按 E 啟動可被打破的護盾。','向前推進水幕，造成近視與緩速；再按 X 停止移動。'],
 kayo:['投擲破片手榴彈，在落點反覆爆炸。','左鍵長拋、右鍵短拋閃光；也會閃到隊友。','投擲可被破壞的壓制刀，落點脈衝封鎖技能。','立即啟動壓制脈衝與射速強化；致命傷會先倒地，隊友靠近 F 重啟。'],
 miks:['右鍵切換治療／震盪，再以左鍵投擲。','左鍵瞄準隊友共享加速，右鍵自用；連線雙方存活時擊殺刷新。','在地圖選最多兩個煙點，右鍵確認。','左鍵向前釋放音波，擊退敵人並緩速、失聰。'],
 tejo:['放出偵察機，WASD 操作、左鍵引爆；依視線揭露與壓制。','左鍵投擲震盪彈，右鍵先彈跳一次。','在地圖選最多兩個轟炸點，右鍵發射。','在地圖依序選起點、終點，右鍵確認連續轟炸。'],
 veto:['左鍵部署最多兩個傳送點；瞄準按 F 傳送。','投擲束縛陷阱，使敵人減損、失聰並被牽制；可擊毀解除。','部署攔截器，再按 E 開關；攔截視線內可破壞的技能物件。','立即強化移動、射速和生命恢復，免疫技能傷害及負面效果；仍會被子彈傷害。'],
 waylay:['投擲光球，落點造成遲緩效果。','左鍵連續兩次衝刺；首段可向上，右鍵只衝一次。','立即留下標記，再按 E 返回；返回過程無法受傷或攻擊。','向前施放光浪，強化自身速度並遲緩敵人。'],
 yoru:['左鍵放出分身；右鍵放置標記後 F 啟動，被敵人打破時閃光。','投擲光球，彈跳後才會引爆閃光。','左鍵放出移動傳送點，右鍵留在原地；E 傳送、瞄準 F 假傳。','左鍵進入隱形無敵狀態，無法開槍；仍可 E 傳送，再按 X 結束。']
};
for(const [agent,lines]of Object.entries(help))['c','q','e','x'].forEach((key,i)=>BATCH_KITS[agent][key].description=lines[i]);
for(const [agent,seconds]of Object.entries({deadlock:40,harbor:40,kayo:40,miks:40,tejo:40,veto:30}))BATCH_KITS[agent].e.cooldown=seconds*1000;
