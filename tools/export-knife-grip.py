"""Retarget Phoenix's source tactical-knife idle finger rotations to hand mounts."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
src=Path(sys.argv[1]);d=json.loads((src/'knife.json').read_text());b=(src/'knife.bin').read_bytes();r=d['arms']['skeleton'];clip=d['anims']['armsIdle'];offset,length=d['offsets']['armsIdle.anim'];frame=np.frombuffer(b,'<f4',count=length//4,offset=offset).reshape(clip['frames'],len(clip['bones']),7)[0]
# Conjugating by the existing normalized hand basis rotates quaternion xyz by C.
poses={}
for side,sign in [('l',1),('r',-1)]:
 C=np.array([[0,0,sign],[0,1,0],[-sign,0,0]])
 poses[side]={}
 for row,i in zip(frame,clip['bones']):
  name=r['names'][i]
  if name.startswith(side.upper()+'_') and name!=side.upper()+'_Hand':poses[side][name]=np.r_[C@row[3:6],row[6]].tolist()
Path('assets/phoenix-hands/knife-grip.json').write_text(json.dumps(poses,separators=(',',':')))
Path('assets/phoenix-hands/knife-grip-provenance.json').write_text(json.dumps({'sourceRepository':'https://github.com/unkwsr/open-aim','sourceCommit':'e1e81cf8ea37e5c363d7720c78cb17fedf0edd94','sourceFiles':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'knife.json',src/'knife.bin']},'processing':'First frame of Phoenix tactical-knife armsIdle, per-joint local rotations conjugated into the existing normalized hand basis. Only the right-hand grip is used for the authored Prime-style karambit; this is an adapted grip, not an original Prime animation.'},indent=2)+'\n')
