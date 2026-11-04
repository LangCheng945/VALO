import shutil
import json,sys
from pathlib import Path
for key in ['classic','operator']:
 d=json.loads(Path(sys.argv[1],key+'.json').read_text());b=Path(sys.argv[1],key+'.bin').read_bytes();n=d['gun']['verts'];a=d['anims']['gunFire'];offset,length=d['offsets']['gunFire.anim'];root=Path('assets/mechanisms');root.mkdir(parents=True,exist_ok=True);(root/(key+'.weights.bin')).write_bytes(b[n*32:n*40]);(root/(key+'.fire.bin')).write_bytes(b[offset:offset+length]);(root/(key+'.json')).write_text(json.dumps({'rig':d['gun']['skeleton'],'fire':a},separators=(',',':')))
 if key=='operator':
  part=d['scope'];o,l=d['offsets']['scope.mesh'];v=part['verts'];(root/'operator.scope.bin').write_bytes(b[o:o+v*32]+b[o+v*40:o+l]);(root/'operator.scope.json').write_text(json.dumps(part))

shutil.copyfile(Path(sys.argv[1],"operator.scope.png"),Path("assets/mechanisms/operator.scope.png"))
