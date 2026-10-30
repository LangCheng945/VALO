"""Copy pinned UI images without executing upstream code or modifying their pixels."""
import argparse,hashlib,json,pathlib,re,subprocess
p=argparse.ArgumentParser();p.add_argument('checkout');args=p.parse_args()
commit='e1e81cf8ea37e5c363d7720c78cb17fedf0edd94'
root=pathlib.Path(__file__).resolve().parents[1];target=root/'assets/ui/buy';target.mkdir(parents=True,exist_ok=True)
keys=list(json.loads((root/'assets/weapons/manifest.json').read_text()))+['light','heavy','regen'];files={}
for key in keys:
 assert re.fullmatch('[a-z]+',key)
 source='site/local/equipment-icons/'+key+'.png';data=subprocess.check_output(['git','-C',args.checkout,'show',commit+':'+source]);(target/(key+'.png')).write_bytes(data)
 files[key]={'sourceFile':source,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
(target/'provenance.json').write_text(json.dumps({'sourceRepository':'https://github.com/unkwsr/open-aim','sourceCommit':commit,'processing':'Original PNG bytes copied unchanged. Third-party asset archive, not an official Riot download.','credit':'VALORANT artwork belongs to Riot Games. The source repository MIT license does not cover Riot assets.','scope':'18 firearm images and 3 shield icons; no full original buy UI or Bandit/Warden assets found.','files':files},indent=2))
print('Copied',len(files),'buy-menu images;',sum(f['bytes']for f in files.values()),'bytes')
