"""Recover original weapon UVs; source payload directory is downloaded from pinned open-aim."""
import json,sys,hashlib,shutil
from pathlib import Path
import numpy as np
from PIL import Image
src=Path(sys.argv[1]);dest=Path('assets/weapons');manifest=json.loads((dest/'manifest.json').read_text());provenance={}
for key,m in manifest.items():
 if key in ['vandal','phantom','classic','operator']:continue
 meta=json.loads((src/(key+'.json')).read_text());binary=(src/(key+'.bin')).read_bytes();parts=meta['parts'];textures=list(dict.fromkeys(p.get('texture') for p in parts));maximum=meta.get('uvMax',2)
 positions=np.concatenate([np.frombuffer(binary,'<i2',count=p['verts']*3,offset=p['pos']).reshape(-1,3)/meta['posScale'] for p in parts]);existing=np.fromfile(dest/(key+'.bin'),'<f4',count=m['vertices']*3).reshape(-1,3)
 assert positions.shape==existing.shape and np.max(abs(positions-existing))<.001,key
 uv=[]
 for p in parts:
  values=np.frombuffer(binary,'<u2',count=p['verts']*2,offset=p['uv']).astype('float32').reshape(-1,2)/65535*maximum
  if len(textures)>1:values[:,0]=(values[:,0]/maximum+textures.index(p.get('texture')))/len(textures);values[:,1]/=maximum
  uv.append(values)
 np.concatenate(uv).astype('<f4').tofile(dest/(key+'.uv.bin'))
 if len(textures)==1 and textures[0]:shutil.copy(src/textures[0],dest/(key+'.original.png'))
 else:
  # Repeat each source tile across its complete UV range before packing slots.
  repeats=int(np.ceil(maximum));size=512;atlas=Image.new('RGB',(size*repeats*len(textures),size*repeats))
  for slot,name in enumerate(textures):
   image=Image.open(src/name).convert('RGB').resize((size,size),Image.Resampling.LANCZOS) if name else Image.new('RGB',(size,size),(40,60,65))
   for x in range(repeats):
    for y in range(repeats):atlas.paste(image,((slot*repeats+x)*size,y*size))
  atlas.save(dest/(key+'.original.png'),optimize=True)
 provenance[key]={'sourceMesh':key+'.bin','textures':textures,'sourceSha256':hashlib.sha256(binary).hexdigest(),'slots':len(textures)};print(key,len(positions),len(textures))
(dest/'original-skins-provenance.json').write_text(json.dumps({'sourceRepository':'https://github.com/unkwsr/open-aim','sourceCommit':'e1e81cf8ea37e5c363d7720c78cb17fedf0edd94','sourcePaths':['site/aim-weapons','site/aim-viewmodel'],'processing':'Original UVs retained; multi-texture weapons use repeated source tiles packed into slots. Atlas tiles resized to 512px. Null-texture lens parts receive a neutral dark swatch. Geometry unchanged.','weapons':provenance},indent=2)+'\n')
