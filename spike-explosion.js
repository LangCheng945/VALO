const T=globalThis.THREE;

// One reusable effect: no particles, dynamic lights or per-frame mesh allocation.
export class SpikeExplosion {
 constructor({radius=60,duration=2}={}){
  this.radius=radius;this.duration=duration;this.age=duration;this.root=new T.Group();this.root.name='spike-detonation';this.root.visible=false;
  this.shell=new T.Mesh(new T.SphereGeometry(1,24,12),new T.MeshBasicMaterial({color:0x291f48,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));this.root.add(this.shell);
  this.core=new T.Mesh(new T.SphereGeometry(1,16,8),new T.MeshBasicMaterial({color:0x070a18,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));this.root.add(this.core);
  this.rings=[];
  for(let i=0;i<2;i++){const ring=new T.Mesh(new T.TorusGeometry(1,.008,4,48),new T.MeshBasicMaterial({color:i?0x6e7dff:0xc5e7ff,transparent:true,opacity:0,depthWrite:false}));ring.rotation.set(Math.PI/2,i*.7,i*.4);this.rings.push(ring);this.root.add(ring);}
 }
 start(position){this.root.position.copy(position);this.age=0;this.root.visible=true;this.update(0);}
 reset(){this.age=this.duration;this.root.visible=false;}
 update(dt){
  if(!this.root.visible)return;
  this.age+=Math.max(0,dt);if(this.age>=this.duration){this.reset();return;}
  const grow=1-Math.pow(1-Math.min(1,this.age/.7),3),radius=Math.max(.25,this.radius*grow),fade=Math.min(1,(this.duration-this.age)/.9);
  this.shell.scale.setScalar(radius);this.shell.material.opacity=.48*fade;
  this.core.scale.setScalar(radius*.88);this.core.material.opacity=.65*fade;
  this.rings.forEach((ring,i)=>{ring.scale.setScalar(radius*(1-i*.1));ring.material.opacity=.8*fade;});
 }
}
