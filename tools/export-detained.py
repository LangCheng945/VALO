"""Convert pinned Killjoy detained tracks using the same canonical arm codec."""
import ast,sys,json,numpy as np
from pathlib import Path
source=Path(sys.argv[1]);tree=ast.parse(Path('tools/export-collection.py').read_text());namespace={'np':np};exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)],type_ignores=[]),'codec','exec'),namespace)
d=json.loads((source/'odin.json').read_text());ed=json.loads((source/'killjoy.detain.json').read_text());binary=(source/'killjoy.detain.bin').read_bytes();r=d['arms']['skeleton'];meta={'camera':d['camera'],'toViewQuat':d['toViewQuat'],'trackNames':r['names'],'stride':len(r['names'])*10,'channelSize':10,'clips':{}};rows=[]
for key,a in ed['anims'].items():
 v=namespace['decode'](a,binary,ed['offsets'],key,r,ed);meta['clips'][key]={'offset':sum(x.size for x in rows),'duration':a['duration'],'frames':len(v)};rows.append(v)
meta['clips']['idle']=meta['clips']['detainLoop'];out=Path('assets/detained');out.mkdir(exist_ok=True);(out/'meta.json').write_text(json.dumps(meta,separators=(',',':')));np.concatenate([v.ravel() for v in rows]).astype('<f4').tofile(out/'arms.poses.bin')
