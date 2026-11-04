import json,sys,numpy as np,hashlib
from pathlib import Path
meta=Path(sys.argv[1]);payload=Path(sys.argv[2]);d=json.loads(meta.read_text());b=payload.read_bytes();r=d['arms']['skeleton'];rows=[];clips={};n=len(r['names'])
for alias,name in [('intro','smokeIntro'),('loop','smokeLoop'),('outro','smokeOutro')]:
 a=d['anims'][name];o,l=d['offsets'][name+'.anim'];f=np.frombuffer(b,'<f4',offset=o,count=l//4).reshape(a['frames'],len(a['bones']),7);out=np.ones((a['frames'],n,10),dtype='<f4');out[:,:,:3]=np.array(r['t']).reshape(-1,3);out[:,:,3:7]=np.array(r['q']).reshape(-1,4)
 for j,i in enumerate(a['bones']):out[:,i,:7]=f[:,j]
 clips[alias]={'offset':sum(v.size for v in rows),'frames':a['frames'],'duration':a['duration']};rows.append(out)
clips['idle']={**clips['intro'],'frames':1,'duration':.1};dest=Path('assets/collection/jett-smoke');dest.mkdir(exist_ok=True);np.concatenate([v.ravel() for v in rows]).tofile(dest/'arms.poses.bin');(dest/'meta.json').write_text(json.dumps({'channelSize':10,'stride':n*10,'trackNames':r['names'],'clips':clips,'camera':[0,0,167.38],'toViewQuat':[-.5,.5,.5,.5],'attach':{'bone':'R_WeaponPoint','q':[.5,.5,.5,-.5]}},separators=(',',':')))
(dest/'provenance.json').write_text(json.dumps({'repository':'https://github.com/unkwsr/open-aim','commit':'e1e81cf8ea37e5c363d7720c78cb17fedf0edd94','sources':{meta.name:hashlib.sha256(meta.read_bytes()).hexdigest(),payload.name:hashlib.sha256(b).hexdigest()},'processing':'Native Jett Cloudburst intro, loop and outro arm tracks; game smoke trajectory and charges stay authoritative.'},indent=2))
