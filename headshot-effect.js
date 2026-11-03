// Adapted from open-aim app/headshot-effects.js at e1e81cf8; MIT license in vendor/open-aim/LICENSE.txt.
// Executed inside the game's renderer module, where the Three.js aliases are available.
// Canvas textures are prepared once; the frame loop visits only live impact particles.
export function headshotRenderer(scene, liveCamera) {
 const T=globalThis.THREE,is=T.PlaneGeometry,ze=T.Vector3,Mr=T.CanvasTexture,os=T.MeshBasicMaterial,Ko=T.AdditiveBlending,mt=T.Mesh,ve=.001;const camera={position:new ze(),quaternion:new T.Quaternion()};
  const geometry = new is(1, 1), active = [], owned = [];
  const away = new ze(), right = new ze(), up = new ze();
  function texture(draw, width = 128, height = 128) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const map = new Mr(canvas); owned.push(map); return map;
  }
  const star = texture(ctx => {
    ctx.translate(64, 64); ctx.fillStyle = '#fff9d3'; ctx.beginPath();
    for (let j = 0; j < 16; j++) {
      const angle = j * Math.PI / 8, radius = j % 2 ? 9 : j % 4 ? 39 : 62;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    } ctx.closePath(); ctx.fill();
  });
  const streak = texture(ctx => {
    const glow = ctx.createLinearGradient(0, 0, 0, 128);
    glow.addColorStop(0, '#fffde3'); glow.addColorStop(.22, '#fff0a0'); glow.addColorStop(1, 'rgba(255,98,35,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(75, 46); ctx.lineTo(64, 128); ctx.lineTo(59, 48); ctx.fill();
  });
  // A ten-frame upward burst: white/yellow contact flash, red crown, then wisps.
  const plume = texture((ctx, width, height) => {
    for (let frame = 0; frame < 10; frame++) {
      ctx.save(); ctx.translate(frame * 128, 0);
      const age = frame / 9, tip = 168 - 130 * Math.min(1, age * 2.8);
      ctx.globalAlpha = 1 - age * age;
      const color = ctx.createLinearGradient(64, tip, 64, 242);
      color.addColorStop(0, '#f32d66'); color.addColorStop(.45, '#ff593c'); color.addColorStop(.85, '#ffd589'); color.addColorStop(1, '#fffce1');
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(64, 244);
      ctx.bezierCurveTo(48, 203, 42, 174, 32, tip + 51);
      ctx.lineTo(49, tip + 64); ctx.lineTo(43, tip + 18); ctx.lineTo(60, tip + 31);
      ctx.bezierCurveTo(48, tip + 4, 78, tip - 5, 85, tip + 12);
      ctx.lineTo(100, tip + 16); ctx.lineTo(82, tip + 39); ctx.lineTo(86, tip + 74);
      ctx.lineTo(103, tip + 55); ctx.bezierCurveTo(86, 177, 74, 218, 64, 244); ctx.fill();
      ctx.fillStyle = '#fff7c5'; ctx.beginPath(); ctx.moveTo(64, 246); ctx.lineTo(52, 188); ctx.lineTo(63, 205); ctx.lineTo(70, 164); ctx.lineTo(74, 215); ctx.lineTo(87, 192); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }, 1280, 256);
  function emit(map, point, tick, options) {
    if (active.length >= 96) {
      const old = active.shift(); scene.remove(old.mesh); old.mesh.material.dispose(); old.map?.dispose();
    }
    const material = new os({map, transparent:true, depthWrite:false, depthTest:true, blending:Ko, toneMapped:false, color:options.color ?? 0xffffff});
    const mesh = new mt(geometry, material);mesh.name='source-headshot'; mesh.renderOrder = 12; scene.add(mesh);
    active.push({mesh, point:{...point}, tick, ...options});
  }
  return {
    warmUp() { return [new mt(geometry, new os({map:star, transparent:true, depthWrite:false, blending:Ko}))]; },
    spawn(point, zone, tick) {
      if (zone !== 'head') return;
      emit(star, point, tick, {life:.23, width:.46, height:.46, color:0xffedb5, type:'flash'});
      const map = plume.clone(); map.repeat.set(.1, 1); map.needsUpdate = true;
      emit(map, point, tick, {map, life:.55, width:.76, height:1.32, type:'plume'});
      const count = 9;
      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2 + tick * .37;
        emit(streak, point, tick, {life:.34, width:.058, height:.36,
          vx:Math.cos(angle)*1.7, vy:Math.sin(angle)*1.9+.35,
          angle, color:0xffe6b5, type:'spark'});
      }
    },
    update(tick) {
      liveCamera.getWorldPosition(camera.position);liveCamera.getWorldQuaternion(camera.quaternion);
      if (!active.length) return;
      right.set(1,0,0).applyQuaternion(camera.quaternion);
      up.set(0,1,0).applyQuaternion(camera.quaternion);
      for (let j = active.length - 1; j >= 0; j--) {
        const item = active[j], age = (tick - item.tick) * ve, progress = Math.max(0, age / item.life);
        if (progress >= 1) { scene.remove(item.mesh); item.mesh.material.dispose(); item.map?.dispose(); active.splice(j,1); continue; }
        const mesh = item.mesh;
        away.set(camera.position.x-item.point.x,camera.position.y-item.point.y,camera.position.z-item.point.z).normalize().multiplyScalar(.025);
        mesh.position.set(item.point.x+away.x,item.point.y+away.y,item.point.z+away.z);
        mesh.quaternion.copy(camera.quaternion);
        if (item.type === 'plume') {
          item.map.offset.x = Math.min(9, Math.floor(progress*10)) / 10;
          mesh.position.y += item.height*.42;
        } else if (item.type === 'spark') {
          mesh.position.addScaledVector(right,item.vx*age).addScaledVector(up,item.vy*age-age*age*2);
          mesh.rotateZ(item.angle-Math.PI/2);
        }
        const scale = item.type === 'flash' ? .8 + progress*.65 : 1;
        mesh.scale.set(item.width*scale,item.height*scale,1);
        mesh.material.opacity = item.type === 'plume' ? 1 : (1-progress)**1.5;
      }
    },
    clear() { for (const item of active) { scene.remove(item.mesh); item.mesh.material.dispose(); item.map?.dispose(); } active.length=0; },
    dispose() { this.clear(); geometry.dispose(); for (const map of owned) map.dispose(); }
  };
}
