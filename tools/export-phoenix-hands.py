import json,numpy as np,sys
from pathlib import Path
meta=json.loads(Path(sys.argv[1]).read_text());payload=Path(sys.argv[2]).read_bytes();offset,length=meta['offsets']['arms.mesh'];b=payload[offset:offset+length];r=meta['arms']['skeleton'];n=meta['arms']['verts'];names=r['names'];parents=r['parents']
def matrix(i):
 x,y,z,w=r['q'][i*4:i*4+4];m=np.eye(4);m[:3,:3]=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];m[:3,3]=r['t'][i*3:i*3+3];return m
world={}
for i in range(len(names)):world[i]=(world[parents[i]] if parents[i]>=0 else np.eye(4))@matrix(i)
pos=np.frombuffer(b,'<f4',count=n*3).reshape(-1,3);normal=np.frombuffer(b,'<f4',count=n*3,offset=n*12).reshape(-1,3);uv=np.frombuffer(b,'<f4',count=n*2,offset=n*24).reshape(-1,2);si=np.frombuffer(b,'u1',count=n*4,offset=n*32).reshape(-1,4);sw=np.frombuffer(b,'u1',count=n*4,offset=n*36).reshape(-1,4)/255;idx=np.frombuffer(b,'<u2',count=meta['arms']['tris']*3,offset=n*40).reshape(-1,3);out={}
for side in ['L','R']:
 root=names.index(side+'_Hand');nodes=[]
 def visit(i):
  nodes.append(i)
  for j,p in enumerate(parents):
   if p==i:visit(j)
 visit(root);lookup={j:i for i,j in enumerate(nodes)};valid=np.array([sum(w for j,w in zip(js,ws) if int(j) in lookup)>.55 for js,ws in zip(si,sw)]);tri=idx[np.all(valid[idx],axis=1)];used=np.unique(tri);vmap={int(v):i for i,v in enumerate(used)};C=np.eye(4);sign=1 if side=='L' else -1;C[:3,:3]=np.array([[0,0,sign],[0,1,0],[-sign,0,0]])*.007;M=C@np.linalg.inv(world[root]);p=(M@np.c_[pos[used],np.ones(len(used))].T).T[:,:3];norm=(np.linalg.inv(M[:3,:3]).T@normal[used].T).T;norm/=np.linalg.norm(norm,axis=1)[:,None];bones=[]
 for j in nodes:
  local=np.eye(4) if j==root else C@matrix(j)@np.linalg.inv(C);bind=C@np.linalg.inv(world[root])@world[j]@np.linalg.inv(C);bones.append({'name':names[j],'parent':lookup[parents[j]] if j!=root else -1,'matrix':local.T.ravel().tolist(),'inverse':np.linalg.inv(bind).T.ravel().tolist()})
 out[side.lower()]={'bones':bones,'position':p.ravel().tolist(),'normal':norm.ravel().tolist(),'uv':uv[used].ravel().tolist(),'index':[vmap[int(i)] for i in tri.ravel()],'skinIndex':[[lookup.get(int(i),0) for i in js] for js in si[used]],'skinWeight':sw[used].tolist()};print(side,len(used),len(tri),len(bones))
Path('assets/phoenix-hands/mesh.json').write_text(json.dumps(out,separators=(',',':')))
