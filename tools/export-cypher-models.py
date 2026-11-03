"""Run with Blender: blender -b --python tools/export-cypher-models.py -- CHECKOUT.
Read only pinned static data, never execute upstream scripts.
"""
import bpy,sys,subprocess,tempfile,pathlib,json,hashlib
from mathutils import Vector
COMMIT='0ea103e4b3901597a008b6e6b37ea58a03db0e7f'
checkout=sys.argv[sys.argv.index('--')+1];root=pathlib.Path(__file__).resolve().parents[1];out=root/'assets/abilities';out.mkdir(exist_ok=True)
def read(p):return subprocess.check_output(['git','-C',checkout,'show',COMMIT+':'+p])
inputs={'cypher-hat':'Assets/Assets/Models/Cypher/CypherHat.fbx','cypher-cage-shell':'Assets/Assets/Models/Cypher/smoke.fbx'}
records=[]
with tempfile.TemporaryDirectory() as tmp:
 tmp=pathlib.Path(tmp);texture=read('Assets/Assets/CypherHatTex.png');(tmp/'hat.png').write_bytes(texture)
 for name,source in inputs.items():
  raw=read(source);fbx=tmp/(name+'.fbx');fbx.write_bytes(raw);bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str(fbx),use_anim=False)
  objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[o.matrix_world@v.co for o in objects for v in o.data.vertices];low=Vector(tuple(min(p[k] for p in points)for k in range(3)));high=Vector(tuple(max(p[k] for p in points)for k in range(3)));size=high-low;center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
  scale=Vector((.65/max(size.x,size.y),)*3) if name=='cypher-hat' else Vector((2/size.x,2/size.y,1/size.z))
  for obj in objects:
   matrix=obj.matrix_world.copy()
   for v in obj.data.vertices:v.co=(matrix@v.co-center)*scale
   obj.matrix_world.identity();obj.data.materials.clear()
   mat=bpy.data.materials.new(name+'-surface');mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.85
   if name=='cypher-hat':
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(tmp/'hat.png'));mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);tex.image.pack()
   else:bsdf.inputs['Base Color'].default_value=(.35,.65,.7,1)
   obj.data.materials.append(mat)
  target=out/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_animations=False,export_yup=True)
  records.append({'file':target.name,'sourcePath':source,'sourceSha256':hashlib.sha256(raw).hexdigest(),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'vertices':sum(len(o.data.vertices)for o in objects),'polygons':sum(len(o.data.polygons)for o in objects),'processing':'Normalized units and axes; hat uses upstream UV/albedo, shell gets runtime shader.'})
(out/'STATICARON-LICENSE.txt').write_bytes(read('LICENSE'))
(out/'provenance.json').write_text(json.dumps({'sourceRepository':'https://github.com/staticaron/CypherAgent','sourceCommit':COMMIT,'assetKind':'Community recreation, NOT verified original game extraction.','license':'Repository MIT license, retained in STATICARON-LICENSE.txt; VALORANT design belongs to Riot Games.','hatTextureSource':'Assets/Assets/CypherHatTex.png','hatTextureSha256':hashlib.sha256(texture).hexdigest(),'models':records},indent=2)+'\n')
print('EXPORTED',json.dumps(records))
