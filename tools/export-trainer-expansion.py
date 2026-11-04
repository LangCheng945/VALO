"""Rebuild normalized trainer/audio catalogs from the pinned local source bytes.
Usage: python tools/export-trainer-expansion.py
Source paths and byte hashes: assets/trainer-expansion/provenance.json.
"""
from pathlib import Path
import hashlib,json
root=Path('assets/trainer-expansion');provenance=json.loads((root/'provenance.json').read_text());audio={}
for f in provenance['files']:
 p=root/f['local'];assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'],p
for p in sorted((root/'audio').rglob('*')):
 if p.is_file():
  key={'attack1':'attack','attack2-rightclick':'heavy','attack1-recovery':'recovery'}.get(p.stem,p.stem);audio.setdefault(p.parent.name,{})[key]=str(p.relative_to(root/'audio'))
for group in ['prime-axe','silkleaf-fan']:audio[group]['heavy']=audio[group].get('attack3',audio[group].get('attack2'))
(root/'audio.json').write_text(json.dumps(audio,indent=2)+'\n');drills=[]
for p in sorted((root/'scenarios').glob('*.json')):
 wrapper=json.loads(p.read_text());d=json.loads(wrapper['scene']['doc']);hard=any(b['kind']=='shooter' for a in d['actors'] for b in a['behaviors']);route='A 小道' if '-a-short-' in p.name else 'A 管道' if '-a-tube-' in p.name else 'B 大道'
 drills.append({'id':p.stem.replace('-preaim',''),'label':route+' · '+('困難' if hard else '簡單'),'preaim':True,'map':'sunset','mode':'stationary','duration':d['rules']['duration'],'weapon':'vandal','player':d['playerSpawn'],'points':[s['position'] for s in d['spawners'] if s.get('maxAlive',1)>0],'source':p.name,'count':d['rules']['spawnerPick']['count'],'shootBack':hard,'reaction':[.25,.4] if hard else None})
(root/'sunset-drills.json').write_text(json.dumps(drills,indent=2)+'\n');provenance['processing']='Source audio and scenario bytes retained; source spawner pools/player poses, 90-second duration, target counts and easy/hard shooter distinction normalized to local training. Source actor looks, area-spawner sampling and temporary workshop boundary blocks are not reproduced.'
provenance['generatedFiles']={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in ['audio.json','sunset-drills.json']};(root/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n');print('Verified',len(provenance['files']),'source files; rebuilt audio catalog and six drills')
