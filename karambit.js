import {karambitPose} from './karambit-rules.mjs';
const T=globalThis.THREE;
// Landmarks traced from the user's 512 × 280 Prime//2.0 reference, centered on the ring.
const point=([x,y])=>[(x-448)*.00062,(54-y)*.00062];
function plate(points,material,depth=.008){
 const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const bevel=Math.min(.0012,depth*.3),geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1});geometry.translate(0,0,-depth/2);return new T.Mesh(geometry,material);
}
export function makeKarambit(environment=null){
 const root=new T.Group();root.name='gold-ring-karambit';
 const material=(color,metalness,roughness)=>{const m=new T.MeshStandardMaterial({color,metalness,roughness,envMap:environment,envMapIntensity:.85});m.color.convertSRGBToLinear();return m;};
 const gold=material(0xf0c65c,.75,.24),black=material(0x242428,.3,.48),gripFacet=material(0x424247,.28,.45),silver=material(0xc3c9d3,.56,.28),silverShade=material(0x939da9,.55,.31),white=material(0xf2efe3,.4,.28);
 const ringShape=new T.Shape(),outer=.0322,inner=.0242,sides=14;
 for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,x=Math.cos(a)*outer,y=Math.sin(a)*outer;i?ringShape.lineTo(x,y):ringShape.moveTo(x,y);}const hole=new T.Path();for(let i=sides;i>=0;i--){const a=i/sides*Math.PI*2,x=Math.cos(a)*inner,y=Math.sin(a)*inner;i===sides?hole.moveTo(x,y):hole.lineTo(x,y);}ringShape.holes.push(hole);
 const ringGeo=new T.ExtrudeGeometry(ringShape,{depth:.012,bevelEnabled:true,bevelSize:.0009,bevelThickness:.0009,bevelSegments:1,steps:1});ringGeo.translate(0,0,-.006);const ring=new T.Mesh(ringGeo,gold);ring.name='open-gold-finger-ring';root.add(ring);
 const handle=plate([[410,77],[452,106],[321,207],[271,234],[291,187],[353,128]].map(point),gold,.013);handle.name='gold-handle-frame';root.add(handle);
 for(const side of [-1,1]){
  const inset=plate([[414,84],[441,105],[319,198],[287,219],[304,178],[357,135]].map(point),black,.0015);inset.position.z=side*.008;inset.name='black-faceted-grip';root.add(inset);
  const facet=plate([[414,84],[433,105],[356,164],[319,198],[326,179],[365,130]].map(point),gripFacet,.001);facet.position.z=side*.0095;root.add(facet);
 }
 const hinge=new T.Group();hinge.name='extending-hook-blade';const hingePoint=point([306,158]);hinge.position.set(...hingePoint,0);root.add(hinge);
 function bladePart(pixels,mat,depth,z=0){const m=plate(pixels.map(p=>{const [x,y]=point(p);return[x-hingePoint[0],y-hingePoint[1]]}),mat,depth);m.position.z=z;hinge.add(m);return m;}
 const blade=bladePart([[307,126],[268,145],[224,172],[183,181],[165,192],[113,184],[62,172],[5,149],[18,182],[58,212],[108,239],[162,259],[185,274],[231,256],[270,239],[310,199],[353,154],[366,108]],gold,.008);blade.name='curved-gold-hook';
 for(const side of [-1,1]){
  const face=bladePart([[360,111],[350,152],[306,199],[265,236],[230,254],[185,274],[195,217],[213,178],[250,159],[285,138],[312,146],[339,135]],silver,.0015,side*.0057);face.name='broad-silver-zigzag';
  bladePart([[194,217],[235,202],[256,182],[289,167],[300,195],[264,233],[230,253],[185,274]],silverShade,.001,side*.007);
  bladePart([[6,151],[23,166],[70,182],[115,193],[166,203],[204,196],[197,216],[179,239],[156,247],[107,227],[62,203],[19,181]],white,.0015,side*.0057);
 }
 root.userData.bladeHinge=hinge;root.userData.reference='user-provided-prime2-karambit';updateKarambit(root,{});return root;
}
export function updateKarambit(root,parameters){const pose=karambitPose(parameters);root.position.fromArray(pose.position);root.rotation.set(...pose.rotation);root.userData.bladeHinge.rotation.z=pose.hinge;root.userData.extension=pose.extension;root.userData.inspectSpin=pose.spin;return pose;}
