// World depth stays precise; camera-local models use a small near plane and their own depth buffer.
const VIEW=1;
export class FirstPersonPass {
 constructor(...cameras){this.cameras=cameras;}
 tag(node){if(!node.visible)return;if(node.isLight)node.layers.enable(VIEW);else node.layers.set(VIEW);for(const child of node.children)this.tag(child);}
 render(renderer,scene,camera){
  for(const owner of this.cameras)for(const root of owner.children)this.tag(root);
  scene.traverse(object=>{if(object.isLight)object.layers.enable(VIEW);});
  const mask=camera.layers.mask,near=camera.near,background=scene.background,clear=renderer.autoClear,auto=scene.autoUpdate,shadows=renderer.shadowMap.autoUpdate,infoReset=renderer.info.autoReset,hidden=[];
  try{
   camera.layers.set(0);renderer.render(scene,camera);
   if(!this.cameras.includes(camera)||!camera.children.some(child=>child.visible&&!child.isLight))return;
   for(const owner of this.cameras)if(owner!==camera){hidden.push([owner,owner.visible]);owner.visible=false;}
   camera.layers.set(VIEW);camera.near=.012;camera.updateProjectionMatrix();scene.background=null;scene.autoUpdate=false;renderer.autoClear=false;renderer.shadowMap.autoUpdate=false;renderer.info.autoReset=false;renderer.clearDepth();renderer.render(scene,camera);
  }finally{for(const [owner,visible]of hidden)owner.visible=visible;camera.layers.mask=mask;camera.near=near;camera.updateProjectionMatrix();scene.background=background;scene.autoUpdate=auto;renderer.autoClear=clear;renderer.shadowMap.autoUpdate=shadows;renderer.info.autoReset=infoReset;}
 }
}
