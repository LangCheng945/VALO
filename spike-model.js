const T=globalThis.THREE;

function box(w,h,d,material,x=0,y=0,z=0){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);return mesh;}

// Triangulated armor petals, shaped around the folding central column.
function armorPetal(materials){
    const vertices=[[-.31,0,.23],[.31,0,.23],[.42,.15,.47],[0,.24,.59],[-.42,.15,.47],[0,-.22,.39]],
        faces=[[0,1,3],[1,2,3],[0,3,4],[0,5,1],[1,5,2],[2,5,3],[3,5,4],[4,5,0]],positions=[];
    for(const face of faces)for(const i of face)positions.push(...vertices[i]);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();
    faces.forEach((_,i)=>g.addGroup(i*3,3,i%materials.length));return new T.Mesh(g,materials);
}

export class SpikeModel {
    constructor(){
        this.root=new T.Group();this.root.name='spike-folding-device';this.open=0;this.time=0;
        const metal=new T.MeshStandardMaterial({color:0x737d82,metalness:.65,roughness:.42}),
            pale=new T.MeshStandardMaterial({color:0xa2a9aa,metalness:.6,roughness:.4}),
            dark=new T.MeshStandardMaterial({color:0x192126,metalness:.6,roughness:.5}),
            graphite=new T.MeshStandardMaterial({color:0x343d44,metalness:.7,roughness:.4});
        this.energy=new T.MeshBasicMaterial({color:0x55e5b4});
        this.indicator=new T.MeshBasicMaterial({color:0x55e5b4});
        const foot=new T.Mesh(new T.CylinderGeometry(.44,.49,.14,8),dark);foot.position.y=.16;this.root.add(foot);
        this.column=new T.Group();this.column.name='spike-expanding-column';this.column.position.y=.24;this.root.add(this.column);
        this.column.add(box(.55,1.02,.55,dark,0,.51,0));
        for(let i=0;i<4;i++){
            const side=new T.Group();side.rotation.y=i*Math.PI/2;
            side.add(box(.13,.87,.018,this.energy,0,.51,.285));
            side.add(box(.085,.78,.035,metal,-.19,.49,.30),box(.085,.78,.035,metal,.19,.49,.30));
            // Layered chamfers frame the narrow orange slit.
            const panel=box(.16,.9,.05,pale,-.13,.51,.30);panel.rotation.z=-.075;side.add(panel);
            const panelR=box(.16,.9,.05,metal,.13,.51,.30);panelR.rotation.z=.075;side.add(panelR);
            for(const y of [.25,.74])side.add(box(.11,.12,.08,graphite,.30,y,.32));
            this.column.add(side);
            const lower=armorPetal([graphite,dark,metal]);lower.rotation.y=i*Math.PI/2;lower.position.y=.30;this.root.add(lower);
        }
        this.crown=new T.Group();this.crown.name='spike-deploying-crown';this.root.add(this.crown);
        const collar=new T.Mesh(new T.CylinderGeometry(.43,.48,.10,8),dark);this.crown.add(collar);
        for(let i=0;i<4;i++){
            const upper=armorPetal([pale,metal,graphite]);upper.rotation.y=i*Math.PI/2;upper.rotation.z=Math.PI;upper.position.y=.04;this.crown.add(upper);
            const led=box(.11,.035,.06,this.indicator,0,.10,.51);led.rotation.y=i*Math.PI/2;led.position.set(Math.sin(i*Math.PI/2)*.51,.10,Math.cos(i*Math.PI/2)*.51);this.crown.add(led);
        }
        this.core=new T.Group();this.core.name='spike-retracting-core';this.crown.add(this.core);
        const core=new T.Mesh(new T.CylinderGeometry(.19,.19,.34,8),this.energy);core.position.y=.23;this.core.add(core);
        for(let i=0;i<8;i++){const strut=box(.035,.34,.035,graphite,Math.sin(i*Math.PI/4)*.205,.23,Math.cos(i*Math.PI/4)*.205);this.core.add(strut);}
        const rim=new T.Mesh(new T.CylinderGeometry(.31,.33,.07,8),metal);rim.position.y=.43;this.core.add(rim);
        const inset=new T.Mesh(new T.CylinderGeometry(.25,.25,.025,8),dark);inset.position.y=.48;this.core.add(inset);
        const ring=new T.Mesh(new T.TorusGeometry(.275,.025,4,8),pale);ring.rotation.x=Math.PI/2;ring.position.y=.50;this.core.add(ring);
        this.update(0);
    }
    update(dt,{deployed=false,progress=0,remaining=45}={}){
        this.time+=dt;const target=deployed?1:Math.max(0,Math.min(1,progress));this.open+=(target-this.open)*(1-Math.exp(-dt*9));
        this.column.scale.y=.08+.92*this.open;this.crown.position.y=.43+.87*this.open;
        // The upper charge visibly sinks into its collar as defusing advances.
        this.core.position.y=deployed?-.28*Math.max(0,Math.min(1,progress)):-.28*(1-this.open);
        this.energy.color.setHex(deployed?0xffa414:0x55e5b4);this.indicator.color.setHex(deployed?0xff4b25:0x55e5b4);
        const speed=remaining<10?16:remaining<20?9:5;
        this.energy.color.multiplyScalar(deployed ? .78+.22*Math.max(0,Math.sin(this.time*speed)) : 1);
    }
}
