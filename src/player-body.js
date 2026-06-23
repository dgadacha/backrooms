import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera } from './renderer.js';
import { loadingManager } from './loading.js';
import { EYE } from './config.js';
import { State, game } from './state.js';
import { isMoving, isSprinting } from './player.js';

// =============================================================================
//  FIRST-PERSON BODY — corps visible du joueur (bras / torse / jambes).
//  Un rig suit la POSITION + le YAW de la caméra mais PAS le pitch : quand on
//  baisse les yeux, on voit son propre corps ; quand on court, il tangue (bob).
//  La caméra reste à hauteur d'œil (EYE) ; le rig est calé au sol sous elle, un
//  poil en arrière pour sortir la tête du champ. Charge public/models/player.glb
//  (fallback : placeholder procédural sans tête, caméra placée au niveau du cou).
// =============================================================================

// --- Réglages (à ajuster selon ton GLB) ---
const TARGET_HEIGHT = 1.8;        // hauteur du corps en mètres
const BACK_OFFSET   = -0.22;      // <0 = vers l'avant : corps visible quand on baisse les yeux
const MODEL_FACING  = Math.PI;    // orientation du GLB (par défaut il regarde +Z → on le retourne)
const HEAD_RE       = /head|skull|face|hair|eye|teeth|tongue|brow|jaw/i; // meshes "tête" à masquer
const BOB_FREQ_WALK = 7.2;
const BOB_FREQ_RUN  = 10.5;
const BOB_AMP       = 0.05;
const SWAY_AMP      = 0.035;

let rig = null;          // suit le joueur (yaw only)
let model = null;        // wrapper dont on bouge la position pour le bob
let bobPhase = 0;
let bobAmp = 0;          // amplitude lissée (évite les à-coups départ/arrêt)
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

export function initPlayerBody() {
  rig = new THREE.Group();
  rig.visible = false;
  scene.add(rig);

  const loader = new GLTFLoader(loadingManager);
  loader.load(
    'public/models/player.glb',
    (g) => setModel(prepGLB(g.scene)),
    undefined,
    () => setModel(buildPlaceholder()),   // 404 → corps procédural
  );
}

// Enveloppe le corps dans un wrapper : on bouge le wrapper pour le bob, le
// modèle interne garde son calage pieds-au-sol.
function setModel(inner) {
  const wrap = new THREE.Group();
  wrap.add(inner);
  if (model) rig.remove(model);
  model = wrap;
  rig.add(model);
}

function prepGLB(root) {
  const box = new THREE.Box3().setFromObject(root);
  const h = (box.max.y - box.min.y) || 1;
  root.scale.setScalar(TARGET_HEIGHT / h);
  root.rotation.y = MODEL_FACING;
  root.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(root);
  root.position.y -= b2.min.y;             // pieds à y=0
  root.traverse((c) => {
    if (c.isMesh || c.isSkinnedMesh) {
      c.frustumCulled = false;             // sinon culling foireux quand à moitié derrière la caméra
      c.castShadow = true;                 // ton ombre projetée au sol → immersif
      c.receiveShadow = true;
      c.geometry?.computeBoundingBox?.();
      c.geometry?.computeBoundingSphere?.();
      if (HEAD_RE.test(c.name)) c.visible = false;   // masque la tête (asset multi-mesh)
    }
  });
  return root;
}

// Corps low-poly SANS TÊTE (la caméra est au niveau du cou). Provisoire jusqu'au GLB.
function buildPlaceholder() {
  const g = new THREE.Group();
  const suit  = new THREE.MeshStandardMaterial({ color: 0xe3c521, roughness: 0.55 });  // combinaison hazmat jaune
  const glove = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 });   // gants (contraste)
  const boot  = new THREE.MeshStandardMaterial({ color: 0x202127, roughness: 0.85 });  // bottes
  const mk = (w, h, d, x, y, z, mat, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.x = rx;
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  };
  // Avant du corps = -Z (sens du regard). Torse fuselé SANS pont d'épaules (sinon
  // il bouche la vue vers le bas). Avant-bras inclinés vers l'avant = bien visibles.
  mk(0.36, 0.46, 0.20, 0,     1.04, 0,     suit);         // torse (abaissé → ne bouche pas la vue)
  mk(0.40, 0.20, 0.23, 0,     0.80, 0,     suit);         // bassin
  mk(0.13, 0.40, 0.15, -0.26, 1.06, 0,     suit);         // bras G (manche)
  mk(0.13, 0.40, 0.15,  0.26, 1.06, 0,     suit);         // bras D (manche)
  mk(0.12, 0.46, 0.14, -0.25, 0.98, -0.34, suit, -1.0);   // avant-bras G (tendu vers l'avant)
  mk(0.12, 0.46, 0.14,  0.25, 0.98, -0.34, suit, -1.0);   // avant-bras D
  mk(0.13, 0.14, 0.15, -0.25, 0.82, -0.56, glove);        // gant G
  mk(0.13, 0.14, 0.15,  0.25, 0.82, -0.56, glove);        // gant D
  mk(0.17, 0.80, 0.20, -0.11, 0.40, 0,     suit);         // jambe G
  mk(0.17, 0.80, 0.20,  0.11, 0.40, 0,     suit);         // jambe D
  mk(0.16, 0.13, 0.31, -0.11, 0.06, -0.08, boot);         // botte G
  mk(0.16, 0.13, 0.31,  0.11, 0.06, -0.08, boot);         // botte D
  return g;
}

export function updatePlayerBody(dt) {
  if (!rig || !model) return;
  rig.visible = (game.state === State.PLAY);
  if (!rig.visible) return;

  // Yaw caméra (sans le pitch) → le corps reste droit, ne bascule pas.
  _e.setFromQuaternion(camera.quaternion, 'YXZ');
  const yaw = _e.y;

  // "Derrière la caméra" = (sin yaw, cos yaw) puisque l'avant caméra est (-sin, -cos).
  rig.position.set(
    camera.position.x + Math.sin(yaw) * BACK_OFFSET,
    camera.position.y - EYE,            // origine du rig au sol
    camera.position.z + Math.cos(yaw) * BACK_OFFSET,
  );
  rig.rotation.y = yaw;

  // Bob/sway : avance la phase en mouvement, lisse l'amplitude.
  const moving = isMoving();
  const freq = isSprinting() ? BOB_FREQ_RUN : BOB_FREQ_WALK;
  if (moving) bobPhase += dt * freq;
  const targetAmp = moving ? (isSprinting() ? BOB_AMP * 1.6 : BOB_AMP) : 0;
  bobAmp += (targetAmp - bobAmp) * Math.min(1, dt * 6);
  model.position.y = -Math.abs(Math.sin(bobPhase)) * bobAmp;      // dip à chaque pas
  model.position.x = Math.sin(bobPhase * 0.5) * SWAY_AMP * (bobAmp / BOB_AMP);
}
