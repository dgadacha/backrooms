// =============================================================================
//  PROPS CATALOG — types instanciables + chargement des GLB partagés avec HORDE
// =============================================================================
//  Les GLB sont lus depuis ../public/models/ (le même dossier que HORDE).
//  Chaque type a :
//   - glb : chemin du fichier
//   - targetSize : largeur monde cible (pour auto-scale au load)
//   - sizeAxis : 'x', 'y' ou 'maxXZ' — axe servant à mesurer targetSize
//   - label/icon : pour la palette UI
//   - anchorBottom : true = ancre le bas au sol (Y = 0)
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const PROP_CATALOG = {
  street_lamp: {
    label: 'Lampadaire',
    icon: '🏮',
    glb: '../public/models/street_lamp.glb',
    targetSize: 5.0, sizeAxis: 'y',
    anchorBottom: true,
  },
  dumpster: {
    label: 'Dumpster',
    icon: '🗑',
    glb: '../public/models/dumpster.glb',
    targetSize: 1.8, sizeAxis: 'maxXZ',
    anchorBottom: true,
  },
  bus_shelter: {
    label: 'Abri bus',
    icon: '🚏',
    glb: '../public/models/bus_shelter.glb',
    targetSize: 3.0, sizeAxis: 'maxXZ',
    anchorBottom: true,
  },
  pallet_stack: {
    label: 'Palettes',
    icon: '📦',
    glb: '../public/models/pallet_stack.glb',
    targetSize: 1.1, sizeAxis: 'maxXZ',
    anchorBottom: true,
  },
  trash_bag_pile: {
    label: 'Sacs poubelle',
    icon: '🛍',
    glb: '../public/models/trash_bag_pile.glb',
    targetSize: 1.4, sizeAxis: 'maxXZ',
    anchorBottom: true,
  },
  mystery_box: {
    label: 'Mystery box',
    icon: '?',
    glb: '../public/models/mystery_box.glb',
    targetSize: 1.4, sizeAxis: 'maxXZ',
    anchorBottom: true,
  },
  perk_machine: {
    label: 'Perk machine',
    icon: '🧪',
    glb: '../public/models/perk_machine_regen.glb',
    targetSize: 2.0, sizeAxis: 'y',
    anchorBottom: true,
  },
  bus: {
    label: 'Bus',
    icon: '🚌',
    glb: '../public/models/bus.glb',
    targetSize: 11.0, sizeAxis: 'maxXZ',
    anchorBottom: true,
  },
  car: {
    label: 'Voiture',
    icon: '🚗',
    glb: '../public/models/car.glb',
    targetSize: 4.5, sizeAxis: 'maxXZ',
    anchorBottom: true,
  },
  wall: {
    label: 'Mur',
    icon: '▦',
    procedural: true, // pas de GLB, généré
    anchorBottom: true,
  },
  player_spawn: {
    label: 'Spawn joueur',
    icon: '➤',
    procedural: true,
    marker: true,        // markers = sortis du tableau props à l'export
    singleton: true,     // un seul autorisé
    anchorBottom: true,
  },
  zombie_spawn: {
    label: 'Spawn zombie',
    icon: '☠',
    procedural: true,
    marker: true,
    anchorBottom: true,
  },
};

// =============================================================================
//  LOAD GLB TEMPLATES — caches partagés pour le spawn rapide
// =============================================================================
const loader = new GLTFLoader();
const templates = new Map(); // type → { template, scale, yOffset }

export function preloadAllTemplates(onProgress) {
  const types = Object.keys(PROP_CATALOG).filter(t => !PROP_CATALOG[t].procedural);
  let loaded = 0;
  const total = types.length;
  const promises = types.map(type => {
    return loadTemplate(type).then(() => {
      loaded++;
      onProgress?.(loaded, total, type);
    }).catch(err => {
      console.warn(`[props] ${type} load failed:`, err);
      loaded++;
      onProgress?.(loaded, total, type);
    });
  });
  return Promise.all(promises);
}

export function loadTemplate(type) {
  if (templates.has(type)) return Promise.resolve(templates.get(type));
  const def = PROP_CATALOG[type];
  if (!def || def.procedural) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    loader.load(def.glb, (gltf) => {
      const template = gltf.scene;
      // mesure bbox + scale
      const box = new THREE.Box3().setFromObject(template);
      const size = box.getSize(new THREE.Vector3());
      let measure;
      if (def.sizeAxis === 'y') measure = size.y;
      else if (def.sizeAxis === 'maxXZ') measure = Math.max(size.x, size.z);
      else measure = size.x;
      const scale = def.targetSize / Math.max(0.001, measure);
      template.scale.setScalar(scale);
      template.updateMatrixWorld(true);
      // y offset pour ancrage au sol
      const finalBox = new THREE.Box3().setFromObject(template);
      const yOffset = def.anchorBottom ? -finalBox.min.y : 0;
      // shadows + clone material (immutable)
      template.traverse(c => {
        if (c.isMesh) {
          c.frustumCulled = true;
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      const data = { template, scale, yOffset };
      templates.set(type, data);
      resolve(data);
    }, undefined, reject);
  });
}

// =============================================================================
//  SPAWN PROP — instancie un prop dans la scène
// =============================================================================
export function spawnProp(type, scene, opts = {}) {
  const def = PROP_CATALOG[type];
  if (!def) return null;

  let obj;
  if (def.procedural) {
    if (type === 'wall') {
      obj = createWall(opts.wallParams || {});
    } else if (type === 'player_spawn') {
      obj = createPlayerSpawnMarker();
    } else if (type === 'zombie_spawn') {
      obj = createZombieSpawnMarker();
    }
  } else {
    const data = templates.get(type);
    if (!data) {
      console.warn(`[spawnProp] template not loaded for ${type}`);
      return null;
    }
    obj = data.template.clone(true);
    obj.position.y = data.yOffset;
  }
  if (!obj) return null;

  // wrap dans un Group pour transformation indépendante
  const wrapper = new THREE.Group();
  wrapper.add(obj);
  wrapper.position.set(opts.x ?? 0, 0, opts.z ?? 0);
  wrapper.rotation.y = opts.ry ?? 0;
  if (opts.scale) wrapper.scale.setScalar(opts.scale);
  wrapper.userData.editable = {
    id: opts.id || generateId(type),
    type,
    defaultPos: { x: wrapper.position.x, z: wrapper.position.z },
    defaultRot: wrapper.rotation.y,
  };
  scene.add(wrapper);
  return wrapper;
}

// Catalog des textures disponibles pour les murs
export const WALL_TEXTURES = {
  none:           { label: 'Aucune (uni)', path: null,                                         repeat: 1 },
  wall_depot:     { label: 'Mur dépôt',    path: '../public/textures/wall_depot.png',          repeat: 0.5 },
  wall_brick:     { label: 'Briques',       path: '../public/textures/wall_fence_brick.png',    repeat: 0.5 },
  metal:          { label: 'Tôle ondulée',  path: '../public/textures/metal_corrugated.png',    repeat: 0.5 },
  plank:          { label: 'Planches',      path: '../public/textures/plank_wood.png',          repeat: 0.5 },
};

const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

function getTexture(key) {
  const def = WALL_TEXTURES[key];
  if (!def || !def.path) return null;
  if (textureCache.has(key)) return textureCache.get(key);
  const tex = textureLoader.load(def.path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

function createWall(params = {}) {
  const w = params.w ?? 4;
  const h = params.h ?? 4.5;
  const d = params.d ?? 0.4;
  const textureKey = params.texture || 'wall_depot';
  const mat = new THREE.MeshLambertMaterial({ color: 0x88847a });
  const tex = getTexture(textureKey);
  if (tex) {
    const rep = WALL_TEXTURES[textureKey]?.repeat ?? 0.5;
    tex.repeat.set(w * rep, h * rep);
    mat.map = tex;
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  // Stocke les paramètres pour pouvoir les réafficher dans l'inspecteur
  m.userData._wallParams = { w, h, d, texture: textureKey };
  return m;
}

// Met à jour un mur existant (geometry + texture) sans le recréer
export function updateWall(wrapper, params) {
  // wrapper = Group<editable>, son enfant 0 est le Mesh BoxGeometry
  const mesh = wrapper.children.find(c => c.isMesh);
  if (!mesh) return;
  const cur = mesh.userData._wallParams || { w: 4, h: 4.5, d: 0.4, texture: 'wall_depot' };
  const w = params.w ?? cur.w;
  const h = params.h ?? cur.h;
  const d = params.d ?? cur.d;
  const textureKey = params.texture ?? cur.texture;
  // Nouvelle geometry si dimensions changent
  if (w !== cur.w || h !== cur.h || d !== cur.d) {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(w, h, d);
    mesh.position.y = h / 2;
  }
  // Nouvelle texture si change
  if (textureKey !== cur.texture || w !== cur.w || h !== cur.h) {
    const tex = getTexture(textureKey);
    mesh.material.map = tex;
    if (tex) {
      const rep = WALL_TEXTURES[textureKey]?.repeat ?? 0.5;
      tex.repeat.set(w * rep, h * rep);
    }
    mesh.material.needsUpdate = true;
  }
  mesh.userData._wallParams = { w, h, d, texture: textureKey };
}

export function getWallParams(wrapper) {
  const mesh = wrapper.children.find(c => c.isMesh);
  return mesh?.userData._wallParams || { w: 4, h: 4.5, d: 0.4, texture: 'wall_depot' };
}

// =============================================================================
//  MARKERS — spawn joueur + spawn zombie (visibles dans l'éditeur seulement)
// =============================================================================
function createPlayerSpawnMarker() {
  const grp = new THREE.Group();
  // Corps : cône bleu translucide pointant en haut
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.8, 12),
    new THREE.MeshLambertMaterial({ color: 0x5fb4e0, transparent: true, opacity: 0.7 })
  );
  cone.position.y = 0.9;
  grp.add(cone);
  // Disque au sol
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 24),
    new THREE.MeshBasicMaterial({ color: 0x5fb4e0, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.02;
  grp.add(disk);
  // Flèche au sol : indique la direction de regard (axe +Z par défaut = ry=0)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.9);
  arrowShape.lineTo(0.35, 0);
  arrowShape.lineTo(0.12, 0);
  arrowShape.lineTo(0.12, -0.5);
  arrowShape.lineTo(-0.12, -0.5);
  arrowShape.lineTo(-0.12, 0);
  arrowShape.lineTo(-0.35, 0);
  arrowShape.lineTo(0, 0.9);
  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(arrowShape),
    new THREE.MeshBasicMaterial({ color: 0x5fb4e0, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  );
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.y = 0.05;
  grp.add(arrow);
  grp.userData._isMarker = true;
  return grp;
}

function createZombieSpawnMarker() {
  const grp = new THREE.Group();
  // Pilier rouge translucide
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8),
    new THREE.MeshLambertMaterial({ color: 0xff3030, transparent: true, opacity: 0.65 })
  );
  pillar.position.y = 0.8;
  grp.add(pillar);
  // Disque rouge au sol
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  );
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.03;
  grp.add(disk);
  // Anneau plus marqué
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  grp.add(ring);
  grp.userData._isMarker = true;
  return grp;
}

let idCounter = 0;
function generateId(type) {
  return `${type}_${Date.now().toString(36)}_${idCounter++}`;
}

// =============================================================================
//  DEFAULT MAP — positions par défaut (copies de world.js HORDE)
// =============================================================================
export const DEFAULT_MAP = {
  version: 3,
  props: [
    // 8 lampadaires (4 coins + 4 mi-murs)
    { type: 'street_lamp', x: -19, z: -19, ry: 0, scale: 1 },
    { type: 'street_lamp', x:  19, z: -19, ry: 0, scale: 1 },
    { type: 'street_lamp', x: -19, z:  19, ry: 0, scale: 1 },
    { type: 'street_lamp', x:  19, z:  19, ry: 0, scale: 1 },
    { type: 'street_lamp', x:   0, z: -21, ry: 0, scale: 1 },
    { type: 'street_lamp', x:   0, z:  21, ry: 0, scale: 1 },
    { type: 'street_lamp', x: -21, z:   0, ry: 0, scale: 1 },
    { type: 'street_lamp', x:  21, z:   0, ry: 0, scale: 1 },
    // mystery box
    { type: 'mystery_box', x: 16, z: -15, ry: 0, scale: 1 },
    // perk machine REGEN
    { type: 'perk_machine', x: 5, z: 3.5, ry: Math.PI, scale: 1 },
    // dumpsters
    { type: 'dumpster', x: -18, z: -8, ry: Math.PI/2, scale: 1 },
    { type: 'dumpster', x:  18, z:  4, ry: -Math.PI/2, scale: 1 },
    // abri bus
    { type: 'bus_shelter', x: -12, z: 18, ry: Math.PI, scale: 1 },
    // palettes
    { type: 'pallet_stack', x: -19, z: 12, ry: 0.3, scale: 1 },
    { type: 'pallet_stack', x:  11, z: -13, ry: -0.5, scale: 1 },
    { type: 'pallet_stack', x:  -2, z: -16, ry: Math.PI/2, scale: 1 },
    { type: 'pallet_stack', x:   8, z:  14, ry: -0.8, scale: 1 },
    { type: 'pallet_stack', x:  17, z:  -3, ry: 0.4, scale: 1 },
    // sacs poubelle
    { type: 'trash_bag_pile', x:  -7, z:  16, ry: 0, scale: 1 },
    { type: 'trash_bag_pile', x:  13, z:  10, ry: 0, scale: 1 },
    { type: 'trash_bag_pile', x:  -4, z:  19, ry: 0, scale: 1 },
    { type: 'trash_bag_pile', x: -15, z:  -2, ry: 0, scale: 1 },
    { type: 'trash_bag_pile', x:   6, z:  -1, ry: 0, scale: 1 },
    { type: 'trash_bag_pile', x:  15, z:  17, ry: 0, scale: 1 },
    // bus (3 instances)
    { type: 'bus', x: -10, z: -18, ry: 0, scale: 1 },
    { type: 'bus', x:  10, z: -18, ry: Math.PI, scale: 1 },
    { type: 'bus', x: -15, z:  15, ry: Math.PI/2, scale: 1 },
    // cars (2 instances)
    { type: 'car', x: 14, z: -12, ry: 0.4, scale: 1 },
    { type: 'car', x: -8, z:  10, ry: -1.2, scale: 1 },
  ],
};
