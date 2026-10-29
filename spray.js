const T=globalThis.THREE,textures=new Map();
function sprayTexture(design){
 if(textures.has(design))return textures.get(design);
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
 const color=design==='sage'?'#5ef2c3':design==='jett'?'#b1edff':'#ffbe54';
 x.translate(256,256);x.rotate(-.12);x.lineJoin='round';
 x.fillStyle='#0a1c26';x.beginPath();x.moveTo(-198,-66);x.lineTo(-90,-174);x.lineTo(184,-110);x.lineTo(207,58);x.lineTo(69,174);x.lineTo(-200,95);x.closePath();x.fill();
 x.strokeStyle=color;x.lineWidth=14;x.stroke();
 x.strokeStyle='#f4fff7';x.lineWidth=7;for(let i=0;i<5;i++){x.beginPath();x.moveTo(-180+i*70,125);x.lineTo(-150+i*70,95);x.stroke();}
 x.fillStyle=color;
 if(design==='sage'){x.beginPath();x.moveTo(0,60);x.bezierCurveTo(-180,-55,-52,-163,0,-62);x.bezierCurveTo(52,-163,180,-55,0,60);x.fill();x.fillStyle='#f4fff7';x.beginPath();x.moveTo(0,-49);x.lineTo(13,-20);x.lineTo(42,-9);x.lineTo(13,4);x.lineTo(0,33);x.lineTo(-13,4);x.lineTo(-42,-9);x.lineTo(-13,-20);x.fill();}
 else if(design==='jett'){for(let i=0;i<3;i++){x.beginPath();x.moveTo(-100+i*25,45-i*57);x.lineTo(0,-35-i*57);x.lineTo(100-i*25,45-i*57);x.lineTo(0,-i*57);x.closePath();x.fill();}}
 else{x.font='900 150px sans-serif';x.textAlign='center';x.fillText('GG',0,30);}
 x.font='900 39px sans-serif';x.textAlign='center';x.fillStyle='#fff';x.fillText(design==='sage'?'SAGE':design==='jett'?'JETT':'GOOD GAME',0,100);
 // Deterministic flecks and drips leave a painted edge rather than a rectangular card.
 for(let i=0;i<45;i++){const a=i*2.399963,r=202+(i%7)*5;x.globalAlpha=.3+(i%4)*.15;x.fillStyle=i%2?color:'#111d29';x.beginPath();x.arc(Math.cos(a)*r,Math.sin(a)*r*.65,1+i%4,0,Math.PI*2);x.fill();}
 x.globalAlpha=1;x.strokeStyle=color;x.lineWidth=5;for(const [a,b]of[[-156,161],[-121,143],[134,167]]){x.beginPath();x.moveTo(a,107);x.lineTo(a,b);x.stroke();}
 const texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;textures.set(design,texture);return texture;
}
export function makeSpray(event){
 const material=new T.MeshBasicMaterial({map:sprayTexture(event.design),transparent:true,alphaTest:.04,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,toneMapped:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(1.35,1.35),material),normal=new T.Vector3(event.nx,event.ny,event.nz).normalize();
 mesh.name='surface-spray';mesh.position.set(event.x,event.y,event.z).addScaledVector(normal,.018);
 mesh.up.set(0,Math.abs(normal.y)>.8?0:1,Math.abs(normal.y)>.8?-1:0);mesh.lookAt(mesh.position.clone().add(normal));if(Math.abs(normal.y)>.8)mesh.rotateZ(event.yaw||0);
 return mesh;
}
export function removeSpray(mesh){mesh.parent?.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
export function sprayHiss(ctx){if(!ctx)return;const n=Math.ceil(ctx.sampleRate*.22),b=ctx.createBuffer(1,n,ctx.sampleRate),data=b.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=b;filter.type='highpass';filter.frequency.value=1600;gain.gain.value=.08;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
