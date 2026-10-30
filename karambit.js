import {karambitPose} from './karambit-rules.mjs';
const T=globalThis.THREE;
function plate(points,material,depth=.022){
 const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.0025,bevelThickness:.0025,bevelSegments:1,steps:1});geometry.translate(0,0,-depth/2);return new T.Mesh(geometry,material);
}
export function makeKarambit(environment=null){
 const root=new T.Group();root.name='gold-ring-karambit';
 const gold=new T.MeshStandardMaterial({color:0xe5b448,metalness:.86,roughness:.23,envMap:environment,envMapIntensity:.9});gold.color.convertSRGBToLinear();
 const black=new T.MeshStandardMaterial({color:0x23252a,metalness:.4,roughness:.46,envMap:environment,envMapIntensity:.4});black.color.convertSRGBToLinear();
 const silver=new T.MeshStandardMaterial({color:0xc8d0d9,metalness:.86,roughness:.22,envMap:environment,envMapIntensity:.85});silver.color.convertSRGBToLinear();
 const white=new T.MeshStandardMaterial({color:0xf0ece0,metalness:.72,roughness:.2,envMap:environment,envMapIntensity:.8});white.color.convertSRGBToLinear();
 const ringShape=new T.Shape(),outer=.061,inner=.044,sides=14;
 for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,x=Math.cos(a)*outer,y=Math.sin(a)*outer;i?ringShape.lineTo(x,y):ringShape.moveTo(x,y);}const hole=new T.Path();for(let i=sides;i>=0;i--){const a=i/sides*Math.PI*2,x=Math.cos(a)*inner,y=Math.sin(a)*inner;i===sides?hole.moveTo(x,y):hole.lineTo(x,y);}ringShape.holes.push(hole);
 const ringGeo=new T.ExtrudeGeometry(ringShape,{depth:.024,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1});ringGeo.translate(0,0,-.012);const ring=new T.Mesh(ringGeo,gold);ring.name='open-gold-finger-ring';root.add(ring);
 const handle=plate([[-.047,-.023],[.029,-.048],[-.082,-.197],[-.151,-.238],[-.183,-.185],[-.092,-.122]],gold,.026);handle.name='gold-handle-frame';root.add(handle);
 for(const side of [-1,1]){
  const inset=plate([[-.042,-.044],[.009,-.057],[-.095,-.187],[-.146,-.215],[-.16,-.185],[-.078,-.124]],black,.003);inset.position.z=side*.016;inset.name='black-faceted-grip';root.add(inset);
  const facet=plate([[-.042,-.045],[-.012,-.054],[-.075,-.144],[-.118,-.18],[-.078,-.12]],black,.002);facet.position.z=side*.02;root.add(facet);
 }
 const hinge=new T.Group();hinge.name='extending-hook-blade';hinge.position.set(-.13,-.182,0);root.add(hinge);
 function bladePart(points,mat,depth,z=0){const m=plate(points.map(([x,y])=>[x+.13,y+.182]),mat,depth);m.position.z=z;hinge.add(m);return m;}
 const blade=bladePart([[-.117,-.152],[-.195,-.198],[-.245,-.255],[-.315,-.265],[-.438,-.213],[-.50,-.166],[-.484,-.222],[-.405,-.27],[-.28,-.327],[-.19,-.30],[-.125,-.235]],gold,.019);blade.name='curved-gold-hook';
 for(const side of [-1,1]){
  bladePart([[-.124,-.163],[-.203,-.214],[-.219,-.259],[-.28,-.313],[-.267,-.252],[-.166,-.187]],silver,.002,side*.013);
  bladePart([[-.241,-.27],[-.314,-.275],[-.44,-.219],[-.492,-.175],[-.477,-.213],[-.397,-.252],[-.281,-.302]],white,.002,side*.011);
 }
 root.userData.bladeHinge=hinge;root.scale.setScalar(.62);updateKarambit(root,{});return root;
}
export function updateKarambit(root,parameters){const pose=karambitPose(parameters);root.position.fromArray(pose.position);root.rotation.set(...pose.rotation);root.userData.bladeHinge.rotation.z=pose.hinge;root.userData.extension=pose.extension;root.userData.inspectSpin=pose.spin;return pose;}
