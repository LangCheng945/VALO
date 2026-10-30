"""Extract data literals and original assets from a pinned local open-aim checkout; never execute upstream JS."""
import argparse,base64,hashlib,json,pathlib,re,struct,subprocess
COMMIT='e1e81cf8ea37e5c363d7720c78cb17fedf0edd94'
JS='site/_assets/r20261021-1/next/js/CnrSARj_.js'
p=argparse.ArgumentParser();p.add_argument('checkout');a=p.parse_args()
def read(name):return subprocess.check_output(['git','-C',a.checkout,'show',COMMIT+':'+name])
s=read(JS).decode()
# Accept data literals only, with a closed grammar. Reject expressions or executable code.
def literal(i):
 while s[i].isspace():i+=1
 c=s[i]
 if c=='"':
  value,n=json.JSONDecoder().raw_decode(s[i:]);return value,i+n
 if c in '[{':
  out=[] if c=='[' else {};end=']' if c=='[' else '}';i+=1
  while s[i]!=end:
   if c=='{':
    if s[i]=='"':key,i=literal(i)
    else:m=re.match(r'[A-Za-z_$][\w$]*',s[i:]);assert m;key=m[0];i+=len(key)
    assert s[i]==':';i+=1;value,i=literal(i);out[key]=value
   else:value,i=literal(i);out.append(value)
   if s[i]==',':i+=1
   else:assert s[i]==end
  return out,i+1
 m=re.match(r'-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?',s[i:]);assert m,repr(s[i:i+60]);return json.loads(('0'+m[0]) if m[0].startswith('.') else ('-0'+m[0][1:]) if m[0].startswith('-.') else m[0]),i+len(m[0])
def var(name):
 m=re.search(r'\b'+name+r'=',s);assert m;return literal(m.end())[0]
def shorts(v):b=base64.b64decode(v);return list(struct.unpack('<'+'h'*(len(b)//2),b))
names,bind,order,poses,tracks,motions,agents=[var(k) for k in ['Zw','vw','PD','MC','go','TQ','fD']]
# Keep only rifle upper-body poses and the locomotion tracks actually used by this client.
selected=['stand:vandal','crouch:vandal','walk:vandal','run:vandal','crouchWalk:vandal']
data={'names':names,'parents':bind['parents'],'bindT':shorts(bind['t']),'bindQ':[v/32767 for v in shorts(bind['q'])],'order':order,'poses':{},'tracks':{},'motions':{k:motions[k] for k in selected}}
for k in {motions[m]['base'] for m in selected}:data['poses'][k]={'t':shorts(poses[k]['t']),'q':[v/32767 for v in shorts(poses[k]['q'])]}
for k in {motions[m]['track'] for m in selected if 'track' in motions[m]}:data['tracks'][k]={'moving':tracks[k]['moving'],'t':shorts(tracks[k]['t']),'q':[v/32767 for v in shorts(tracks[k]['q'])]}
root=pathlib.Path(__file__).resolve().parents[1]/'assets/agents';root.mkdir(exist_ok=True)
(root/'rig.json').write_text(json.dumps(data,separators=(',',':')))
manifest={}
for key in ['jett','sage']:
 d=agents[key];manifest[key]={k:d[k] for k in ['verts','tris','layout']}
 for kind in ['bin','albedo','orm']:
  value=read('site/aim-agents/'+d[kind]);name=key+('.bin' if kind=='bin' else '.'+kind+'.jpg');(root/name).write_bytes(value)
  manifest[key][kind]=name
manifest['rig']='rig.json';(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
files={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in sorted(root.iterdir())if p.name!='provenance.json'}
(root/'provenance.json').write_text(json.dumps({'sourceRepository':'https://github.com/unkwsr/open-aim','sourceCommit':COMMIT,'sourceMetadata':JS,'sourcePath':'site/aim-agents','credit':'ishoutu aim trainer; VALORANT character assets belong to Riot Games. The repository MIT license does not cover character assets.','processing':'Original packed meshes and textures; selected rig and locomotion data decoded from literals. No upstream executable JavaScript is included.','files':files},indent=2))
print({k:(manifest[k]['verts'],manifest[k]['tris'])for k in ['jett','sage']});print('asset bytes',sum(p.stat().st_size for p in root.iterdir()))
