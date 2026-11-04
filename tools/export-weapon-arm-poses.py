"""Export canonical full-arm weapon tracks; game assets remain source-pinned."""
import json,sys,hashlib,numpy as np
from pathlib import Path
src=Path(sys.argv[1]);dest=Path('assets/weapon-poses');dest.mkdir(exist_ok=True);provenance={}
for key in ['vandal','classic','phantom','operator','ghost','guardian','sheriff','marshal']:
 d=json.loads((src/(key+'.json')).read_text());b=(src/(key+'.bin')).read_bytes();r=d['arms']['skeleton'];stride=len(r['names'])*7;tracks=[];clips={}
 for name,source in [('idle','armsIdle'),('attack','armsFire'),('walk','armsWalk'),('reload','armsReload'),('ads','armsAds')]:
  a=d['anims'][source];assert a['bones']==list(range(len(r['names'])));o,l=d['offsets'][source+'.anim'];v=np.frombuffer(b,'<f4',offset=o,count=l//4);assert len(v)==a['frames']*stride;clips[name]={'offset':sum(len(t) for t in tracks),'frames':a['frames'],'duration':a['duration'],'source':a['source']};tracks.append(v)
 np.concatenate(tracks).astype('<f4').tofile(dest/(key+'.poses.bin'))
 if key=='vandal':
  n=d['gun']['verts'];off=d['offsets']['gun.mesh'][0];out=Path('assets/mechanisms');(out/'vandal.weights.bin').write_bytes(b[off+n*32:off+n*40]);o,l=d['offsets']['gunFire.anim'];(out/'vandal.fire.bin').write_bytes(b[o:o+l]);(out/'vandal.json').write_text(json.dumps({'rig':d['gun']['skeleton'],'fire':d['anims']['gunFire']},separators=(',',':')))
 n=d['gun']['verts'];g=np.frombuffer(b,'<f4',offset=d['offsets']['gun.mesh'][0],count=n*3).reshape(-1,3)
 meta={'stride':stride,'trackNames':r['names'],'clips':clips,'camera':d['camera'],'toViewQuat':d['toViewQuat'],'attach':d['attach'],'length':float(g[:,0].max()-g[:,0].min())*.009,'gunRig':d['gun']['skeleton'],'gunClips':{}}
 for name,source in [('fire','gunFire'),('reload','gunReload')]:
  if source not in d['anims']:continue
  o,l=d['offsets'][source+'.anim'];(dest/(key+'.gun-'+name+'.bin')).write_bytes(b[o:o+l]);meta['gunClips'][name]=d['anims'][source]
 for part in ['magazine','magazineSpare']:
  if part in d:
   m=d[part];o,l=d['offsets'][part+'.mesh'];n=m['verts'];(dest/(key+'.'+part+'.bin')).write_bytes(b[o:o+n*32]+b[o+n*40:o+l]);meta[part]=m
 (dest/(key+'.json')).write_text(json.dumps(meta,separators=(',',':')))
 provenance[key]={'json':hashlib.sha256((src/(key+'.json')).read_bytes()).hexdigest(),'binary':hashlib.sha256(b).hexdigest()};print(key,sum(len(t) for t in tracks)*4,'arm bytes')
(dest/'provenance.json').write_text(json.dumps({'repository':'https://github.com/unkwsr/open-aim','commit':'e1e81cf8ea37e5c363d7720c78cb17fedf0edd94','sources':provenance,'paths':['site/aim-viewmodel','app/mods/aim-viewmodel (Gaia Vandal)'],'processing':'Complete sampled canonical weapon arm tracks, source gun tracks and optional magazine geometry. Game timing selects normalized reload progress. Other weapon types may use compatible shared pose profiles; these are adaptations rather than separate source animation sets.'},indent=2)+'\n')

# Keep the checked-in provenance reproducible after regenerating payloads.
p=dest/'provenance.json';record=json.loads(p.read_text());record['outputHashes']={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(dest.iterdir()) if f.is_file() and f.name!='provenance.json'};p.write_text(json.dumps(record,indent=2)+'\n')
