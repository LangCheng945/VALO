// Authored kunai: faceted silver blade, cyan bevel, dark grip and open pommel ring.
const T=globalThis.THREE;
export function makeBladeStorm(count=5){
 const root=new T.Group();root.name='jett-blade-storm';
 const steel=new T.MeshStandardMaterial({color:0xcbdce5,metalness:.8,roughness:.24}),edge=new T.MeshStandardMaterial({color:0x66d8e9,emissive:0x16859b,emissiveIntensity:.3,metalness:.65,roughness:.25}),grip=new T.MeshStandardMaterial({color:0x162a38,metalness:.3,roughness:.58});
 const shape=new T.Shape();[[0,.235],[.031,.025],[.022,-.025],[0,-.05],[-.022,-.025],[-.031,.025]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const bladeGeo=new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:true,bevelThickness:.003,bevelSize:.0025,bevelSegments:1,steps:1});bladeGeo.translate(0,0,-.0045);
 const ridgeGeo=new T.BufferGeometry();ridgeGeo.setAttribute('position',new T.Float32BufferAttribute([0,.235,.006,-.026,.025,.006,0,.012,.016,0,.235,.006,0,.012,.016,.026,.025,.006],3));ridgeGeo.computeVertexNormals();
 const handleGeo=new T.CylinderGeometry(.012,.014,.095,8),ringGeo=new T.TorusGeometry(.024,.006,6,20);
 const slots=[[-.39,-.22,-.69,-.42],[.39,-.22,-.69,.42],[-.26,-.30,-.60,-.23],[.26,-.30,-.60,.23],[.09,-.38,-.55,.12]];
 for(let i=0;i<Math.min(5,Math.max(0,count));i++){
  const [x,y,z,roll]=slots[i],knife=new T.Group();knife.name='jett-kunai-'+i;knife.userData.restY=y;knife.userData.restRoll=roll;
  knife.add(new T.Mesh(bladeGeo,steel),new T.Mesh(ridgeGeo,edge));const handle=new T.Mesh(handleGeo,grip);handle.position.y=-.093;knife.add(handle);const ring=new T.Mesh(ringGeo,steel);ring.position.y=-.166;knife.add(ring);
  knife.position.set(x,y,z);knife.rotation.set(-.12,0,roll);root.add(knife);
 }
 // Empty pools have no meshes retaining these resources.
 if(!root.children.length){for(const g of [bladeGeo,ridgeGeo,handleGeo,ringGeo])g.dispose();for(const m of [steel,edge,grip])m.dispose();}
 return root;
}
export function updateBladeStorm(root,time){root?.children.forEach((knife,i)=>{knife.position.y=knife.userData.restY+Math.sin(time*2.6+i*.8)*.006;knife.rotation.z=knife.userData.restRoll+Math.sin(time*1.7+i)*.018;});}
