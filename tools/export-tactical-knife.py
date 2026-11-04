"""Export the full source knife viewmodel rigs and sampled native arm clips."""
import json,sys,hashlib,numpy as np
from pathlib import Path
src=Path(sys.argv[1]);jett=Path(sys.argv[2]);root=Path('assets/tactical-knife');root.mkdir(exist_ok=True);d=json.loads((src/'knife.json').read_text());b=(src/'knife.bin').read_bytes();j=json.loads((jett/'jett.json').read_text());jb=(jett/'jett.bin').read_bytes();r=d['arms']['skeleton'];assert set(r['names']).issubset(j['arms']['skeleton']['names'])
frames=[];clips={};stride=len(r['names'])*7
for name,source in [('idle','armsIdle'),('attack','armsFire'),('walk','armsWalk')]:
 a=d['anims'][source];assert a['bones']==list(range(len(r['names'])));o,l=d['offsets'][source+'.anim'];track=np.frombuffer(b,'<f4',offset=o,count=l//4);assert len(track)==a['frames']*stride;clips[name]={'offset':sum(len(f) for f in frames),'frames':a['frames'],'duration':a['duration'],'source':a['source']};frames.append(track)
np.concatenate(frames).astype('<f4').tofile(root/'poses.bin')
n=d['gun']['verts'];o,l=d['offsets']['gun.mesh'];(root/'mesh.bin').write_bytes(b[o:o+n*32]+b[o+n*40:o+l]);rigs={}
for variant,definition,payload in [('phoenix',d,b),('jett',j,jb)]:
 o,l=definition['offsets']['arms.mesh'];(root/(variant+'.arms.bin')).write_bytes(payload[o:o+l]);rigs[variant]=definition['arms']
meta={'vertices':n,'indices':d['gun']['tris']*3,'stride':stride,'trackNames':r['names'],'rigs':rigs,'clips':clips,'attach':d['attach'],'camera':d['camera'],'toViewQuat':d['toViewQuat']};(root/'manifest.json').write_text(json.dumps(meta,separators=(',',':')))
source_files={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'knife.json',src/'knife.bin',jett/'jett.json',jett/'jett.bin',root/'albedo.png']}
(root/'provenance.json').write_text(json.dumps({'repository':'https://github.com/unkwsr/open-aim','commit':'e1e81cf8ea37e5c363d7720c78cb17fedf0edd94','sourceFiles':{('knife.gun.png' if Path(p).name=='albedo.png' else Path(p).name):sha for p,sha in source_files.items()},'outputHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.iterdir()) if p.is_file() and p.name!='provenance.json'},'processing':'Complete source Phoenix/Jett first-person arm geometry, skin weights, canonical 104-joint bind rigs, original texture mapping, and full sampled knife idle/attack/walk local transforms. Knife attaches to native R_WeaponPoint with source attachment rotation. Source camera/view transform is retained. Draw, inspect and short transition blends remain local adaptations.'},indent=2)+'\n');print(n,'knife vertices;',len(r['names']),'arm joints;',sum(len(f) for f in frames)*4,'animation bytes')
