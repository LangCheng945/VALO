"""Convert pinned skin models and animation data without executing upstream JS."""
import json,sys,hashlib,shutil,numpy as np
from pathlib import Path
from PIL import Image
src=Path(sys.argv[1]);dest=Path('assets/collection');dest.mkdir(exist_ok=True);tex=dest/'textures';tex.mkdir(exist_ok=True)
items=[('rgx-vandal-yellow','vandal','RGX 黃'),('gaia-vandal-orange','vandal','Gaia 橙'),('gaia-vandal-white','vandal','Gaia 白'),('blastx-phantom','phantom','BlastX'),('prime-guardian','guardian','Prime 紫金'),('singularity-sheriff','sheriff','Singularity 奇點'),('smite-ghost','ghost','Smite 神罰'),('araxys-operator','operator','Araxys'),('rogue-operator','operator','Rogue'),('blackmarket-butterfly','melee','黑市蝴蝶刀'),('orange-butterfly','melee','橙色蝴蝶刀'),('damascus-karambit','melee','大馬士革爪刀'),('prime-axe','melee','Prime 紫金斧'),('prime-axe-crowbar','melee','撬棍'),('silkleaf-fan','melee','Silkleaf 扇子')]
def names(meta,rig):return [rig['names'][i] if isinstance(i,int) else i for i in meta['bones']]
def decode(a,b,offsets,key,rig,scales):
 o,l=offsets[key+'.anim'];n=len(a['bones']);f=a['frames'];base=np.ones((f,len(rig['names']),10),dtype='<f4');base[:,:,:7]=0;base[:,:,6]=1;base[:,:,:3]=np.array(rig['t']).reshape(-1,3);base[:,:,3:7]=np.array(rig['q']).reshape(-1,4)
 if a.get('format')=='trs32' or l==f*n*40:values=np.frombuffer(b,'<f4',offset=o,count=l//4).reshape(f,n,10)
 elif l==f*n*28:
  values=np.ones((f,n,10),dtype='<f4');values[:,:,:7]=np.frombuffer(b,'<f4',offset=o,count=l//4).reshape(f,n,7)
 else:
  assert l==f*n*14,(key,l,f,n);values=np.ones((f,n,10),dtype='<f4');values[:,:,:7]=np.frombuffer(b,'<i2',offset=o,count=l//2).reshape(f,n,7);values[:,:,:3]/=scales.get('tScale',100);values[:,:,3:7]/=scales.get('qScale',32767)
 for j,name in enumerate(names(a,rig)):
  if name in rig['names']:base[:,rig['names'].index(name)]=values[:,j]
 hold=a.get('hold',[])
 if hold:
  ho,hl=offsets[key+'.hold'];v=np.frombuffer(b,'<f4',offset=ho,count=hl//4).reshape(len(hold),7)
  for j,name in enumerate(hold):
   if name in rig['names']:base[:,rig['names'].index(name),:7]=v[j]
 # Preserve native nonlinear montage time mapping by resampling its timeline.
 if a.get('timeMap'):
  duration=a['duration'];count=max(2,round(duration*60)+1);out=[];mapping=np.array(a['timeMap']);sample=a.get('sampleDuration',duration)
  for t in np.linspace(0,duration,count):
   frame=np.interp(t,mapping[:,0],mapping[:,1])/sample*(f-1);lo=int(np.floor(frame));hi=min(f-1,lo+1);alpha=frame-lo;v=base[lo]*(1-alpha)+base[hi]*alpha;qa=base[lo,:,3:7];qb=base[hi,:,3:7].copy();qb[np.sum(qa*qb,axis=1)<0]*=-1;v[:,3:7]=qa*(1-alpha)+qb*alpha;v[:,3:7]/=np.maximum(1e-8,np.linalg.norm(v[:,3:7],axis=1))[:,None];out.append(v)
  base=np.array(out,dtype='<f4')
 return base
catalog=[];hashes={}
for id,weapon,label in items:
 root=dest/id;root.mkdir(exist_ok=True);d=json.loads((src/(id+'.json')).read_text());b=(src/(id+'.bin')).read_bytes();meta={k:d[k] for k in ['camera','toViewQuat','attach','skinMaterials','scopeMaterials','skin','viewOffsetCm'] if k in d};meta.update({'id':id,'weapon':weapon,'label':label,'channelSize':10,'trackNames':d['arms']['skeleton']['names'],'stride':len(d['arms']['skeleton']['names'])*10,'clips':{},'gunClips':{},'parts':{},'captured':id=='damascus-karambit'})
 armrows=[];gunrows=[]
 def add(kind,name,a,payload,offsets,key,scales):
  rig=d['arms' if kind=='arms' else 'gun']['skeleton'];v=decode(a,payload,offsets,key,rig,scales);rows=armrows if kind=='arms' else gunrows;spec={'offset':sum(x.size for x in rows),'frames':len(v),'duration':a['duration']/max(.01,a.get('rate',1)),'source':a.get('source',''),'bones':list(range(len(rig['names']))),'channelSize':10};rows.append(v);meta['clips' if kind=='arms' else 'gunClips'][name]=spec
 alias={'Idle':'idle','Fire':'attack','Walk':'walk','Reload':'reload','Ads':'ads','Equip':'equip','Inspect':'inspect','Heavy':'heavy','Attack1':'attack','Attack2':'attack2'}
 for name,a in d['anims'].items():
  prefix='arms' if a['rig']=='arms' else 'gun';suffix=name[len(prefix):]
  if suffix in alias:add(a['rig'],alias[suffix],a,b,d['offsets'],name,d)
 motion_id={'orange-butterfly':'blackmarket-butterfly','prime-axe-crowbar':'prime-axe'}.get(id,id)
 extra=src/(motion_id+'.motions.json')
 if extra.exists():
  ed=json.loads(extra.read_text());eb=extra.with_suffix('.bin').read_bytes()
  for name,a in ed['montages'].items():
   use='attack' if name=='attack1' else name;add('arms',use,a,eb,ed['offsets'],name,ed)
   if a.get('gun'):add('gun',use,a['gun'],eb,ed['offsets'],name+'.gun',ed)
 equip_id=('blackmarket-butterfly' if id=='orange-butterfly' else id) if (src/(('blackmarket-butterfly' if id=='orange-butterfly' else id)+'.equip.json')).exists() else {'vandal':'viewmodel','phantom':'phantom','operator':'operator'}.get(weapon,id)
 extra=src/(equip_id+'.equip.json')
 if extra.exists():
  ed=json.loads(extra.read_text());eb=extra.with_suffix('.bin').read_bytes()
  for kind in ['arms','gun']:
   if kind in ed:add(kind,'equip',ed[kind],eb,ed['offsets'],kind,ed)
 for part in ['gun','scope','scopeGlass','silencer','magazine','magazineSpare']:
  if part not in d or part+'.mesh' not in d['offsets']:continue
  info=d[part];o,l=d['offsets'][part+'.mesh'];n=info['verts'];length=n*40+info['tris']*6;assert length<=l,(id,part,length,l);(root/(part+'.bin')).write_bytes(b[o:o+length]);meta['parts'][part]=info
 if meta['captured']:
  o,l=d['offsets']['arms.mesh'];(root/'arms.bin').write_bytes(b[o:o+l]);meta['arms']=d['arms']
 np.concatenate([v.ravel() for v in armrows]).astype('<f4').tofile(root/'arms.poses.bin')
 if gunrows:np.concatenate([v.ravel() for v in gunrows]).astype('<f4').tofile(root/'gun.poses.bin')
 meta['gunRig']=d['gun']['skeleton'];(root/'meta.json').write_text(json.dumps(meta,separators=(',',':')));catalog.append({'id':id,'weapon':weapon,'label':label,'clips':list(meta['clips'])})
 hashes[id]=hashlib.sha256((src/(id+'.bin')).read_bytes()).hexdigest();print(id,list(meta['clips']),len(d['gun']['skeleton']['names']))
# Keep source textures at a bounded upload resolution; never alter installed assets.
for p in src.iterdir():
 if p.suffix.lower() not in ['.png','.jpg','.jpeg','.avif'] or p.name=='arms.png':continue
 image=Image.open(p);image.thumbnail((2048,2048),Image.Resampling.LANCZOS);image.save(tex/p.name)
(dest/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n');(dest/'provenance.json').write_text(json.dumps({'repository':'https://github.com/unkwsr/open-aim','commit':'807f55721e64ca457d763c64a4a1de7b11e5f3eb','sourcePath':'app/mods/aim-viewmodel','sourceBinaryHashes':hashes,'sourceFiles':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(src.iterdir()) if p.is_file()},'processing':'Original skin geometry/UV/rig/material descriptors; full TRS tracks, equip and montage conversion, nonlinear time-map resampling. Source texture resolution is bounded at 2048px. Game designs/assets belong to Riot Games; repository licensing does not grant game-asset rights.'},indent=2)+'\n')
