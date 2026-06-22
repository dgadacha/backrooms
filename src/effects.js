import * as THREE from 'three';
import { scene } from './renderer.js';

const particles = [];
const tracers = [];
const bloodPools = [];

const BLOOD_LIFE = 90;
const BLOOD_MAX = 40;

// Geometries / materials partagés pour les particules de sang (perf)
const splatGeoSmall = new THREE.SphereGeometry(0.05, 4, 3);
const splatGeoMed   = new THREE.SphereGeometry(0.08, 4, 3);
const splatGeoBig   = new THREE.SphereGeometry(0.13, 5, 3);
const bloodColors = [0x9a0014, 0x7a000d, 0xb40020, 0x6a0008, 0x880014];

// Sang explosif : petites particules + 4 grosses gouttes volantes
export function burst(pos, color, n=15, spd=5) {
  // petites gouttelettes — projection sphérique
  for (let i = 0; i < n; i++) {
    const c = bloodColors[Math.floor(Math.random() * bloodColors.length)];
    const geo = Math.random() < 0.6 ? splatGeoSmall : splatGeoMed;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c }));
    m.position.copy(pos);
    // direction aléatoire dans l'hémisphère haut
    const yaw = Math.random() * Math.PI * 2;
    const pitch = Math.random() * Math.PI / 2;
    const sp = spd * (0.6 + Math.random() * 0.6);
    const v = new THREE.Vector3(
      Math.cos(yaw) * Math.cos(pitch) * sp,
      Math.sin(pitch) * sp * 1.4,
      Math.sin(yaw) * Math.cos(pitch) * sp,
    );
    m.userData = { v, life: 0.6 + Math.random()*0.4 };
    scene.add(m);
    particles.push(m);
  }
  // 4 grosses gouttes qui éclaboussent loin (effet "splatter" dramatique)
  for (let i = 0; i < 4; i++) {
    const c = bloodColors[Math.floor(Math.random() * bloodColors.length)];
    const m = new THREE.Mesh(splatGeoBig, new THREE.MeshBasicMaterial({ color: c }));
    m.position.copy(pos);
    const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
    const sp = spd * 1.6;
    const v = new THREE.Vector3(
      Math.cos(angle) * sp,
      sp * (0.6 + Math.random() * 0.4),
      Math.sin(angle) * sp,
    );
    m.userData = { v, life: 0.9 };
    scene.add(m);
    particles.push(m);
  }
}

export function spawnTracer(from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo,
    new THREE.LineBasicMaterial({ color:0xffe08a, transparent:true, opacity:0.9 }));
  scene.add(line);
  tracers.push({ line, life: 0.06 });
}

// flaque de sang procédurale au sol — gradient organique multi-couleurs + gouttes
export function bloodPool(pos) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;   // résolution plus haute pour un rendu propre
  const g = c.getContext('2d');
  // ~30 taches en gradient radial (centre sombre, bords fade)
  for (let i = 0; i < 30; i++) {
    const cx = 32 + Math.random()*64, cy = 32 + Math.random()*64;
    const r = 5 + Math.random() * 30;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,   `rgba(${110 + Math.random()*40},0,${Math.random()*20},${0.75 + Math.random()*0.25})`);
    grad.addColorStop(0.5, `rgba(${85  + Math.random()*25},${5 + Math.random()*15},${5},0.55)`);
    grad.addColorStop(1,   'rgba(60,5,5,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  }
  // 5-6 éclaboussures allongées (gouttes qui s'étirent depuis le centre)
  const dripCount = 5 + Math.floor(Math.random() * 2);
  for (let i = 0; i < dripCount; i++) {
    const angle = (i / dripCount) * Math.PI * 2 + Math.random() * 0.6;
    const cx = 64 + Math.cos(angle) * 20;
    const cy = 64 + Math.sin(angle) * 20;
    const len = 18 + Math.random() * 28;
    g.save();
    g.translate(cx, cy);
    g.rotate(angle);
    const dropGrad = g.createLinearGradient(0, 0, len, 0);
    dropGrad.addColorStop(0,   'rgba(115,5,15,0.9)');
    dropGrad.addColorStop(0.7, 'rgba(95,10,15,0.4)');
    dropGrad.addColorStop(1,   'rgba(80,10,15,0)');
    g.fillStyle = dropGrad;
    g.beginPath();
    g.ellipse(len/2, 0, len/2, 3 + Math.random()*4, 0, 0, Math.PI*2);
    g.fill();
    g.restore();
  }
  // micro-éclaboussures qui dépassent du contour principal
  for (let i = 0; i < 12; i++) {
    g.fillStyle = `rgba(${100 + Math.random()*40},5,5,${0.4 + Math.random()*0.3})`;
    g.beginPath();
    g.arc(Math.random()*128, Math.random()*128, 1 + Math.random()*3, 0, 7);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;     // lisse maintenant qu'on a une résolution propre
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const size = 2.8 + Math.random() * 0.6;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.rotation.z = Math.random() * Math.PI * 2;   // orientation aléatoire
  mesh.position.set(pos.x, pos.y + 0.02, pos.z);
  scene.add(mesh);
  bloodPools.push({ mesh, life: BLOOD_LIFE });

  while (bloodPools.length > BLOOD_MAX) {
    const old = bloodPools.shift();
    old.mesh.removeFromParent();
  }
}

export function updateEffects(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.life -= dt;
    tr.line.material.opacity = Math.max(0, tr.life / 0.06);
    if (tr.life <= 0) { scene.remove(tr.line); tracers.splice(i, 1); }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt;
    p.userData.v.y -= 9.8 * dt;
    p.position.addScaledVector(p.userData.v, dt);
    if (p.position.y < 0.05) { p.position.y = 0.05; p.userData.v.set(0,0,0); }
    if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
  }
  for (let i = bloodPools.length - 1; i >= 0; i--) {
    const bp = bloodPools[i];
    bp.life -= dt;
    if (bp.life < 3) bp.mesh.material.opacity = Math.max(0, bp.life / 3);
    if (bp.life <= 0) { bp.mesh.removeFromParent(); bloodPools.splice(i, 1); }
  }
}

export function clearEffects() {
  for (const p of particles)  p.removeFromParent();
  for (const t of tracers)    t.line.removeFromParent();
  for (const bp of bloodPools) bp.mesh.removeFromParent();
  particles.length = 0; tracers.length = 0; bloodPools.length = 0;
}
