"""Extract textured Phoenix forearm sleeves in normalized elbow/wrist space."""
import json,sys,numpy as np
from pathlib import Path
src=Path(sys.argv[1]);d=json.loads((src/'classic.json').read_text());buf=(src/'classic.bin').read_bytes();o,l=d['offsets']['arms.mesh'];b=buf[o:o+l];r=d['arms']['skeleton'];n=d['arms']['verts'];names=r['names'];parents=r['parents']
def matrix(i):
 x,y,z,w=r['q'][i*4:i*4+4];m=np.eye(4);m[:3,:3]=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];m[:3,3]=r['t'][i*3:i*3+3];return m
world={}
for i in range(len(names)):world[i]=(world[parents[i]] if parents[i]>=0 else np.eye(4))@matrix(i)
pos=np.frombuffer(b,'<f4',count=n*3).reshape(-1,3);norm=np.frombuffer(b,'<f4',count=n*3,offset=n*12).reshape(-1,3);uv=np.frombuffer(b,'<f4',count=n*2,offset=n*24).reshape(-1,2);si=np.frombuffer(b,'u1',count=n*4,offset=n*32).reshape(-1,4);sw=np.frombuffer(b,'u1',count=n*4,offset=n*36).reshape(-1,4)/255;tri=np.frombuffer(b,'<u2',count=d['arms']['tris']*3,offset=n*40).reshape(-1,3);out={}
def descendants(root):
 result={root}
 for i in range(root+1,len(names)):
  if parents[i] in result:result.add(i)
 return result
for side,sign in [('L',1),('R',-1)]:
 elbow=names.index(side+'_Elbow');wrist=names.index(side+'_Hand');start=world[elbow][:3,3];end=world[wrist][:3,3];Y=end-start;length=np.linalg.norm(Y);Y/=length
 C=np.array([[0,0,sign],[0,1,0],[-sign,0,0]]);X=world[wrist][:3,:3]@C.T@np.array([1,0,0]);X-=Y*np.dot(X,Y);X/=np.linalg.norm(X);Z=np.cross(X,Y);basis=np.array([X,Y,Z]).T;local=(pos-start)@basis;t=local[:,1]/length
 arms=descendants(elbow)-descendants(wrist);mass=np.array([sum(w for i,w in zip(ii,ww) if i in arms) for ii,ww in zip(si,sw)]);hand_nodes=descendants(wrist);hand_mass=np.array([sum(w for i,w in zip(ii,ww) if i in hand_nodes) for ii,ww in zip(si,sw)]);valid=(t>-.15)&(t<1.12);faces=tri[np.all(valid[tri],axis=1)&~np.all((hand_mass>.55)[tri],axis=1)&np.any((mass>.05)[tri],axis=1)];used=np.unique(faces);lookup={int(v):i for i,v in enumerate(used)};vertices=local[used].copy();vertices[:,[0,2]]*=.007;vertices[:,1]=vertices[:,1]/length-.5;normals=norm[used]@basis;normals[:,1]*=length*.007;normals/=np.linalg.norm(normals,axis=1)[:,None]
 out[side.lower()]={'position':vertices.ravel().tolist(),'normal':normals.ravel().tolist(),'uv':uv[used].ravel().tolist(),'index':[lookup[int(i)] for i in faces.ravel()]};print(side,len(used),len(faces),'source length',length*.007,'end range',t[used].min(),t[used].max())
Path('assets/phoenix-hands/forearms.json').write_text(json.dumps(out,separators=(',',':')))
