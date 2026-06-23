import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyLowPoly, forceNearestFilter, applyOutlinesRecursive } from './renderer.js';
import { makeZombie, whenZombieReady, getZombieAnimations } from './enemies.js';
import { pistolGroup, shotgunGroup, smgGroup, batGroup, axeGroup } from './weapons.js';

// =============================================================================
//  Scène galerie 3D — affichage des modèles isolés pour inspection
// =============================================================================
const galleryScene = new THREE.Scene();
galleryScene.background = new THREE.Color(0x14161c);

// caméra dédiée
const galleryCamera = new THREE.PerspectiveCamera(40, 16/9, 0.05, 100);

// éclairage studio (3 points : key / fill / rim)
galleryScene.add(new THREE.AmbientLight(0x808090, 0.45));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(4, 6, 4);
galleryScene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.5);
fillLight.position.set(-4, 3, 2);
galleryScene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xff9966, 0.4);
rimLight.position.set(0, 4, -4);
galleryScene.add(rimLight);

// sol studio (disque sombre)
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4, 32),
  new THREE.MeshLambertMaterial({ color: 0x1a1c22, flatShading: true })
);
floor.rotation.x = -Math.PI/2;
galleryScene.add(floor);

// halo de lumière au sol
const haloGeo = new THREE.RingGeometry(0.3, 3.5, 32);
const halo = new THREE.Mesh(
  haloGeo,
  new THREE.MeshBasicMaterial({ color: 0x2a3040, transparent: true, opacity: 0.4 })
);
halo.rotation.x = -Math.PI/2;
halo.position.y = 0.01;
galleryScene.add(halo);

// =============================================================================
//  Loader générique pour preview GLB (bus, car, etc.) — applyLowPoly + scale
//  pour cadrer dans la vue, ancrage au sol. Le GLB est chargé async ; on
//  retourne un Group placeholder qu'on remplit dès que prêt.
// =============================================================================
const glbLoader = new GLTFLoader();
const glbCache = {}; // path → gltf.scene déjà préparé

function prepGlbForPreview(scene, targetSize) {
  // applyLowPoly + clone des materials (par cohérence DA + isolation par instance)
  scene.traverse(c => {
    if (c.isMesh || c.isSkinnedMesh) {
      c.frustumCulled = false;
      if (Array.isArray(c.material)) {
        c.material = c.material.map(m => applyLowPoly(m.clone()));
      } else if (c.material) {
        c.material = applyLowPoly(c.material.clone());
      }
      if (c.geometry) {
        c.geometry.computeBoundingBox();
        c.geometry.computeBoundingSphere();
      }
    }
  });
  // NEAREST sur les textures (cohérence DA PS1)
  forceNearestFilter(scene);
  // Calcul du scale AVANT d'appliquer les outlines, pour pouvoir
  // compenser l'épaisseur (l'extrusion vertex shader se fait en object
  // space, donc on divise par le scale pour rester constant en world).
  scene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(scene);
  const sz = rawBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(sz.x, sz.y, sz.z);
  const previewScale = maxDim > 0.001 ? targetSize / maxDim : 1;
  // Outlines cartoon — épaisseur compensée par 1/scale, minSize 0.3 pour
  // filtrer les petites pièces internes (cohérent avec world.js bus).
  const WORLD_OUTLINE = 0.03;
  applyOutlinesRecursive(scene, WORLD_OUTLINE / previewScale, 0x080612, 0.3);
  if (previewScale !== 1) {
    scene.scale.setScalar(previewScale);
    scene.updateMatrixWorld(true);
  }
  // ancrer au sol
  const finalBox = new THREE.Box3().setFromObject(scene);
  scene.position.y = -finalBox.min.y;
  return scene;
}

function makeGlbPreview(path, targetSize = 3.0) {
  const placeholder = new THREE.Group();
  placeholder.userData.glbPath = path;
  if (glbCache[path]) {
    placeholder.add(glbCache[path].clone(true));
    return placeholder;
  }
  glbLoader.load(path, (gltf) => {
    const prepped = prepGlbForPreview(gltf.scene, targetSize);
    glbCache[path] = prepped;
    // si on est toujours sur ce modèle dans la galerie, l'attache
    if (currentInfo?.glb === path && placeholder.parent) {
      placeholder.add(prepped.clone(true));
    }
  }, undefined, (err) => {
    console.error(`[gallery] failed to load ${path}:`, err);
  });
  return placeholder;
}

// =============================================================================
//  Clone d'un viewmodel (les groupes weapons sont attachés à camera, donc on
//  doit cloner pour les afficher dans la galerie)
// =============================================================================
function clonedViewmodel(group) {
  const clone = group.clone(true);
  clone.traverse(m => m.visible = true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  // élève l'arme à une hauteur de présentation (1.2m)
  clone.position.y = 1.2;
  return clone;
}

// =============================================================================
//  Catalogue dynamique
//  - Procéduraux (kind 'proc') : toujours présents (existent en code)
//  - GLB (kind 'glb') : probés via fetch HEAD au démarrage, n'apparaissent
//    dans la liste que si le fichier répond 2xx. Le chargement réel se fait
//    paresseusement à la sélection.
// =============================================================================
const KNOWN_MODELS = [
  // === procéduraux (viewmodels d'armes) ===
  { id: 'pistol',  label: 'PISTOL',        dist: 1.4, focus: 1.2, kind: 'proc',
    factory: () => clonedViewmodel(pistolGroup) },
  { id: 'shotgun', label: 'PUMP SHOTGUN',  dist: 2.0, focus: 1.2, kind: 'proc',
    factory: () => clonedViewmodel(shotgunGroup) },
  { id: 'smg',     label: 'SMG',           dist: 1.7, focus: 1.2, kind: 'proc',
    factory: () => clonedViewmodel(smgGroup) },
  { id: 'bat',     label: 'BAT',           dist: 1.8, focus: 1.2, kind: 'proc',
    factory: () => clonedViewmodel(batGroup) },
  { id: 'axe',     label: 'AXE',           dist: 2.0, focus: 1.2, kind: 'proc',
    factory: () => clonedViewmodel(axeGroup) },

  // === GLB (présents dans /models/ uniquement) ===
  // frontYaw : rotation de base pour que la vue "AVANT" montre vraiment
  // l'avant du modèle. Les boutons AVANT/PROFIL/ARRIÈRE/DESSUS ajoutent
  // π/2, π, etc. par-dessus. Si la vue est inversée (avant ↔ arrière), il
  // suffit d'ajouter π à frontYaw.
  { id: 'zombie',  label: 'ZOMBIE',        dist: 4.0, focus: 1.0, kind: 'glb',
    glb: '/models/zombie.glb',
    frontYaw: 0,
    factory: () => makeZombie() },          // chargé via enemies.js
  { id: 'bus',     label: 'BUS',           dist: 14.0, focus: 1.5, kind: 'glb',
    glb: '/models/bus.glb',
    frontYaw: Math.PI/2,                    // bus aligné sur axe X (sens opposé)
    factory: () => makeGlbPreview('/models/bus.glb', 6.0) },
  { id: 'car',     label: 'ABANDONED CAR', dist: 8.0, focus: 0.9, kind: 'glb',
    glb: '/models/car.glb',
    frontYaw: Math.PI/2,                    // aligné comme le bus
    factory: () => makeGlbPreview('/models/car.glb', 3.5) },
  { id: 'mystery_box',  label: 'MYSTERY BOX',  dist: 3.0, focus: 0.7, kind: 'glb',
    glb: '/models/mystery_box.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/mystery_box.glb', 1.4) },
  { id: 'perk_regen',   label: 'PERK REGEN',   dist: 3.5, focus: 1.0, kind: 'glb',
    glb: '/models/perk_machine_regen.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/perk_machine_regen.glb', 2.0) },
  { id: 'street_lamp',  label: 'STREET LAMP',  dist: 6.0, focus: 2.5, kind: 'glb',
    glb: '/models/street_lamp.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/street_lamp.glb', 5.0) },
  { id: 'shotgun_fps',  label: 'SHOTGUN FPS',  dist: 1.5, focus: 0.4, kind: 'glb',
    glb: '/models/shotgun_fps.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/shotgun_fps.glb', 0.7) },
  { id: 'dumpster',     label: 'DUMPSTER',     dist: 4.5, focus: 0.7, kind: 'glb',
    glb: '/models/dumpster.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/dumpster.glb', 1.8) },
  { id: 'bus_shelter',  label: 'BUS SHELTER',  dist: 7.0, focus: 1.3, kind: 'glb',
    glb: '/models/bus_shelter.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/bus_shelter.glb', 3.0) },
  { id: 'trash_bag_pile', label: 'TRASH BAG PILE', dist: 3.5, focus: 0.5, kind: 'glb',
    glb: '/models/trash_bag_pile.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/trash_bag_pile.glb', 1.4) },
  { id: 'pallet_stack', label: 'PALLET STACK', dist: 3.5, focus: 0.5, kind: 'glb',
    glb: '/models/pallet_stack.glb',
    frontYaw: 0,
    factory: () => makeGlbPreview('/models/pallet_stack.glb', 1.1) },
];

// Liste effective construite dynamiquement
const modelDefs = KNOWN_MODELS.filter(m => m.kind === 'proc');

// Notifie main.js quand la liste change (pour rebuild la sidebar)
let modelListListener = null;
export function setModelListListener(cb) { modelListListener = cb; }
function notifyModelList() { if (modelListListener) modelListListener(); }

// Probe HEAD pour chaque GLB → ajoute à la liste si le fichier répond
KNOWN_MODELS.filter(m => m.kind === 'glb').forEach(m => {
  fetch(m.glb, { method: 'HEAD' })
    .then(r => {
      if (r.ok) {
        modelDefs.push(m);
        console.log(`[gallery] ${m.id} disponible (${m.glb})`);
        notifyModelList();
      } else {
        console.log(`[gallery] ${m.id} absent — ${m.glb} a renvoyé ${r.status}`);
      }
    })
    .catch(err => console.log(`[gallery] ${m.id} probe failed:`, err.message));
});

// =============================================================================
//  État de présentation
// =============================================================================
let currentModel = null;
let currentInfo = null;
let currentBaseScale = 1;          // scale natif du modèle au moment du show
let currentModelClips = [];        // AnimationClip dispo pour le modèle courant
let yaw = 0;
let autoRotate = true;

// callback main.js → on lui dit quand la liste des anims change
let animListListener = null;
export function setAnimListListener(cb) { animListListener = cb; }
function notifyAnimList() {
  if (!animListListener) return;
  // Affiche les vrais noms d'animation du GLB. Si le metadata est buggué,
  // c'est à corriger côté source 3D (renommer dans Blender avant export).
  const names = currentModelClips.map(c => c.name || '(unnamed)');
  animListListener(names);
}

function placeCameraOrbit(info) {
  galleryCamera.position.set(0, info.focus + 0.8, info.dist);
  galleryCamera.lookAt(0, info.focus, 0);
}

export function getModelList() {
  return modelDefs.map(m => ({ id: m.id, label: m.label }));
}

export function showModel(id) {
  if (currentModel) {
    galleryScene.remove(currentModel);
    currentModel = null;
  }
  const def = modelDefs.find(m => m.id === id);
  if (!def) return;
  currentInfo = def;
  const built = def.factory();
  if (!built) {
    // ressource pas encore chargée (cas du zombie GLB asynchrone) — réessaie au load
    if (id === 'zombie') {
      whenZombieReady(() => {
        if (currentInfo?.id === 'zombie' && !currentModel) showModel('zombie');
      });
    }
    return;
  }
  currentModel = built;
  currentModel.position.y = 0;
  galleryScene.add(currentModel);
  // yaw initial = frontYaw du modèle (AVANT par défaut)
  yaw = def.frontYaw || 0;
  currentModel.rotation.y = yaw;
  autoRotate = true;
  currentBaseScale = currentModel.scale.x || 1;
  placeCameraOrbit(def);
  // reset slider de taille à 1.0
  const slider = document.getElementById('gallery-scale');
  const sliderVal = document.getElementById('gallery-scale-value');
  if (slider) slider.value = '1';
  if (sliderVal) sliderVal.textContent = `1.00× (${currentBaseScale.toFixed(3)})`;
  // récupère les animations dispo pour ce modèle
  currentModelClips = (id === 'zombie') ? getZombieAnimations() : [];
  notifyAnimList();
}

// Joue une animation par INDEX array sur le modèle courant (LoopRepeat).
// On passe par index (pas par nom) car Meshy nomme parfois les clips de
// façon incohérente avec leur contenu réel — l'index est la seule référence
// fiable.
export function playCurrentAnimation(clipIndex) {
  if (!currentModel?.userData?.mixer) return;
  const mixer = currentModel.userData.mixer;
  const idx = typeof clipIndex === 'number' ? clipIndex : parseInt(clipIndex, 10);
  const clip = currentModelClips[idx];
  if (!clip) return;
  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat);
  action.clampWhenFinished = false;
  action.play();
}

// Modifie le scale du modèle courant (multiplicateur du scale natif)
export function setScaleMultiplier(mult) {
  if (!currentModel) return;
  const newScale = currentBaseScale * mult;
  currentModel.scale.setScalar(newScale);
  return newScale;
}

export function getCurrentBaseScale() { return currentBaseScale; }

export function setView(view) {
  if (!currentModel || !currentInfo) return;
  autoRotate = false;
  const baseYaw = currentInfo.frontYaw || 0;
  switch (view) {
    case 'front': yaw = baseYaw;             break;
    case 'side':  yaw = baseYaw + Math.PI/2; break;
    case 'back':  yaw = baseYaw + Math.PI;   break;
    case 'top':
      galleryCamera.position.set(0, currentInfo.focus + currentInfo.dist, 0.001);
      galleryCamera.lookAt(0, currentInfo.focus, 0);
      currentModel.rotation.y = yaw;
      return;
  }
  placeCameraOrbit(currentInfo);
  currentModel.rotation.y = yaw;
}

export function toggleAutoRotate() {
  autoRotate = !autoRotate;
  return autoRotate;
}

export function updateGallery(dt) {
  if (autoRotate && currentModel) {
    yaw += dt * 0.4;
    currentModel.rotation.y = yaw;
  }
  // joue l'animation rigée (zombie GLB) si présente
  if (currentModel?.userData?.mixer) {
    currentModel.userData.mixer.update(dt);
  }
}

export function getGalleryScene()  { return galleryScene; }
export function getGalleryCamera() { return galleryCamera; }
