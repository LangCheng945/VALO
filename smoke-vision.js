const T=globalThis.THREE;
const colors={jett:0x7d97a9,omen:0x211c38,clove:0x56415f,brimstone:0x655441,brim:0x655441,astra:0x332948,cypher:0x4b5354};
export class SmokeVision {
 constructor(){this.point=new T.Vector3();this.fog=new T.Fog(0x7d97a9,.65,3.6);this.inside=null;}
 view(base,camera,smokes){camera.getWorldPosition(this.point);this.inside=null;for(const s of smokes){const radius=(s.mesh.userData.smokeRadius||3.8)*s.mesh.scale.x;if(s.life>.06&&radius>.1&&this.point.distanceToSquared(s.mesh.position)<(radius*.985)**2){this.inside=s.kind||'jett';this.fog.color.setHex(colors[this.inside]||colors.jett);this.fog.far=['omen','clove','astra'].includes(this.inside)?7:['brim','brimstone'].includes(this.inside)?3.6:5;return this.fog;}}return base;}
}
