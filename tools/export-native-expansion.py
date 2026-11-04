"""Export nine pinned native gun rigs, parts, equip and arm/gun animations.

Usage: python tools/export-native-expansion.py SOURCE_DIRECTORY
SOURCE_DIRECTORY contains the nine .json/.bin pairs, optional .equip pairs,
and their referenced textures from open-aim commit 807f557.
"""
import ast,hashlib,json,sys
from pathlib import Path
import numpy as np
from PIL import Image
source=Path(sys.argv[1]);output=Path('assets/native-weapons');output.mkdir(exist_ok=True)
# One codec for skin and baseline rigs; parse only its pure helper definitions.
tree=ast.parse(Path('tools/export-collection.py').read_text());codec={'np':np}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)],type_ignores=[]),'animation-codec','exec'),codec)
keys=['ares','bucky','bulldog','judge','odin','outlaw','shorty','spectre','stinger'];catalog=[];hashes={};textures=set()
for key in keys:
 d=json.loads((source/(key+'.json')).read_text());binary=(source/(key+'.bin')).read_bytes();root=output/key;root.mkdir(exist_ok=True)
 meta={k:d[k]for k in ['camera','toViewQuat','attach','skinMaterials','scopeMaterials','viewOffsetCm']if k in d};meta.update(id=key,weapon=key,label=key.upper(),channelSize=10,trackNames=d['arms']['skeleton']['names'],stride=len(d['arms']['skeleton']['names'])*10,clips={},gunClips={},parts={},captured=False,gunRig=d['gun']['skeleton']);tracks={'arms':[],'gun':[]}
 def add(kind,name,a,data,offsets,track,scales):
  rig=d[kind]['skeleton'];v=codec['decode'](a,data,offsets,track,rig,scales);rows=tracks[kind];meta['clips'if kind=='arms'else'gunClips'][name]={'offset':sum(x.size for x in rows),'frames':len(v),'duration':a['duration']/max(.01,a.get('rate',1)),'source':a.get('source',''),'channelSize':10};rows.append(v)
 aliases={'Idle':'idle','Fire':'attack','Walk':'walk','Reload':'reload','Ads':'ads','Equip':'equip','Inspect':'inspect'}
 for name,a in d['anims'].items():
  kind=a['rig'];suffix=name[len(kind):]
  if suffix in aliases:add(kind,aliases[suffix],a,binary,d['offsets'],name,d)
 equip=source/(key+'.equip.json')
 if equip.exists():
  ed=json.loads(equip.read_text());eb=equip.with_suffix('.bin').read_bytes()
  for kind in tracks:
   if kind in ed:add(kind,'equip',ed[kind],eb,ed['offsets'],kind,ed)
 parts=['gun','scope','scopeGlass','silencer','magazine','magazineSpare']+[f'bullets.{i}'for i in range(len(d.get('bullets',{}).get('parts',[])))]
 for name in parts:
  if name+'.mesh'not in d['offsets']:continue
  info=dict({**d['bullets']['parts'][int(name.split('.')[1])],'texture':d['bullets']['texture']}if name.startswith('bullets.')else d[name]);info.setdefault('texture',d['gun'].get('texture'));o,length=d['offsets'][name+'.mesh'];assert info['verts']*40+info['tris']*6==length;(root/(name+'.bin')).write_bytes(binary[o:o+length]);meta['parts'][name]=info
 for kind,rows in tracks.items():
  if rows:np.concatenate([v.ravel()for v in rows]).astype('<f4').tofile(root/('arms.poses.bin'if kind=='arms'else'gun.poses.bin'))
 (root/'meta.json').write_text(json.dumps(meta,separators=(',',':')));catalog.append({'id':key,'weapon':key,'label':key.upper(),'clips':list(meta['clips'])});hashes[key]=hashlib.sha256(binary).hexdigest()
 def referenced(v):
  if isinstance(v,str)and v.endswith(('.png','.jpg','.avif')):textures.add(v)
  elif isinstance(v,dict):
   for x in v.values():referenced(x)
  elif isinstance(v,list):
   for x in v:referenced(x)
 referenced(meta);print(key,list(meta['clips']))
tex=output/'textures';tex.mkdir(exist_ok=True)
for name in textures:
 image=Image.open(source/name);image.thumbnail((2048,2048),Image.Resampling.LANCZOS);image.save(tex/name)
(output/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n');(output/'provenance.json').write_text(json.dumps({'repository':'https://github.com/unkwsr/open-aim','commit':'807f55721e64ca457d763c64a4a1de7b11e5f3eb','sourcePath':'app/mods/aim-viewmodel','sourceBinaryHashes':hashes,'processing':'Original weighted gun geometry, attachment, parts, materials and matching full TRS arms/gun clips; equip montages decoded with shared skin codec; textures bounded to 2048px. Game designs/assets belong to Riot Games.'},indent=2)+'\n')
