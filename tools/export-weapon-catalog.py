"""Extract numeric weapon reference literals without executing upstream JavaScript."""
import re,json,pathlib,subprocess,argparse
COMMIT='e1e81cf8ea37e5c363d7720c78cb17fedf0edd94'
parser=argparse.ArgumentParser();parser.add_argument('checkout');args=parser.parse_args()
s=subprocess.check_output(['git','-C',args.checkout,'show',COMMIT+':site/_assets/r20261021-1/next/js/BiMsX6Xn.js'],text=True)
def literal(i):
 while s[i].isspace():i+=1
 if s.startswith('null',i):return None,i+4
 c=s[i]
 if c=='"':v,n=json.JSONDecoder().raw_decode(s[i:]);return v,i+n
 if c in '[{':
  out=[] if c=='[' else {};end=']' if c=='[' else '}';i+=1
  while s[i]!=end:
   if c=='{':
    if s[i]=='"':k,i=literal(i)
    else:m=re.match(r'[A-Za-z_$][\w$]*',s[i:]);assert m;k=m[0];i+=len(k)
    assert s[i]==':';i+=1;v,i=literal(i);out[k]=v
   else:v,i=literal(i);out.append(v)
   if s[i]==',':i+=1
   else:assert s[i]==end
  return out,i+1
 m=re.match(r'-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?',s[i:]);assert m,s[i:i+50];v=m[0];return float(v) if '.' in v or 'e' in v.lower() else int(v),i+len(v)
def var(k):return literal(re.search(r'\b'+re.escape(k)+r'=',s).end())[0]
def num(v):
 if v.isdigit():return int(v)
 return literal(re.search(r'\b'+re.escape(v)+r'=',s).end())[0]
reserves,reloads,ranges=[var(k) for k in ['Gt','Ht','gf']]
prices={'classic':0,'shorty':300,'frenzy':450,'ghost':500,'sheriff':800,'stinger':1100,'spectre':1600,'bucky':850,'judge':1850,'bulldog':2050,'guardian':2250,'phantom':2900,'vandal':2900,'marshal':950,'outlaw':2400,'operator':4700,'ares':1600,'odin':3200}
labels=dict(zip(prices,['制式手槍','短管','狂弒','鬼魅','神射','刺針','惡靈','重砲','判官','鬥牛犬','捍衛者','幻象','暴徒','警長','逃犯','間諜','戰神','奧丁']))
groups={**dict.fromkeys(['classic','shorty','frenzy','ghost','sheriff'],'sidearm'),**dict.fromkeys(['stinger','spectre'],'smg'),**dict.fromkeys(['bucky','judge'],'shotgun'),**dict.fromkeys(['bulldog','guardian','phantom','vandal'],'rifle'),**dict.fromkeys(['marshal','outlaw','operator'],'sniper'),**dict.fromkeys(['ares','odin'],'heavy')}
scopes={'stinger':[1.15],'spectre':[1.15],'bulldog':[1.25],'guardian':[1.5],'phantom':[1.25],'vandal':[1.25],'marshal':[3.5],'outlaw':[2.5],'operator':[2.5,5],'ares':[1.15],'odin':[1.15]}
weapons={}
for key,speed,v in re.findall(r'(\w+):\{label:"[^"]+",pickerLabel:"[^"]+",baseRunSpeedMetersPerSecond:([\d.]+),stability:(\w+)',s):
 m=re.search(r'\b'+v+r'=\{firingRatePerSecond:(\w+),magazineSize:(\w+),reserveAmmo:Gt\.(\w+),reloadSeconds:Ht\.(\w+).*?pelletsPerShot:(\w+)',s)
 if not m or key not in prices:continue
 d=ranges[key][0];weapons[key]={'id':key,'label':labels[key],'name':labels[key]+' '+key.upper(),'category':groups[key],'slot':'sidearm' if groups[key]=='sidearm' else 'primary','cost':prices[key],'headDmg':d['head'],'bodyDmg':d['body'],'fireRate':1000/num(m[1]),'magSize':num(m[2]),'reserve':reserves[key],'reloadTimeMs':reloads[key]*1000,'pellets':num(m[5]),'auto':key in ['frenzy','stinger','spectre','bulldog','phantom','vandal','ares','odin','judge'],'zoomLevels':scopes.get(key,[]),'moveSpeedMult':float(speed)/5.4,'ranges':ranges[key]}
assert len(weapons)==18
root=pathlib.Path(__file__).resolve().parents[1];manifest=json.loads((root/'assets/weapons/manifest.json').read_text())
for key,w in weapons.items():w['modelLength']=manifest[key]['bounds'][0][1]*.009
out=root/'multiplayer/firearms.mjs'
out.write_text('// Reference: pinned open-aim e1e81cf8ea37e5c363d7720c78cb17fedf0edd94, BiMsX6Xn.js.\n// Prices are game configuration; BANDIT/WARDEN remain unverified and are not substituted.\nexport const FIREARMS='+json.dumps(weapons,separators=(',',':'),ensure_ascii=False)+''';\nexport const FIREARM_KEYS=Object.freeze(['classic','shorty','frenzy','ghost','sheriff','stinger','spectre','bucky','judge','bulldog','guardian','phantom','vandal','marshal','outlaw','operator','ares','odin']);\nexport function firearmDamage(key,part='body',worldDistance=0){\n const w=FIREARMS[key];if(!w)return null;const meters=Math.max(0,worldDistance)/(4/3),bands=w.ranges;const band=bands.find(b=>meters<b.endMeters)||bands.at(-1);return band[part]??band.body;\n}\nexport const isSidearm=key=>FIREARMS[key]?.slot==='sidearm';\n''')
(root/'assets/weapons/reference-stats.json').write_text(json.dumps({'sourceRepository':'https://github.com/unkwsr/open-aim','sourceCommit':'e1e81cf8ea37e5c363d7720c78cb17fedf0edd94','sourceFile':'site/_assets/r20261021-1/next/js/BiMsX6Xn.js','extraction':'Closed literal parser; no upstream JavaScript executed. Catalog prices and controls are local game configuration.','armorReference':{'points':25,'pool':50,'absorb':1,'delaySeconds':3,'perSecond':10},'requestedArmor':{'points':25,'pool':25}},indent=2))
print('Extracted',len(weapons),'weapon reference records')
