import * as THREE from 'three';
import { scene, camera, MAX_ANISOTROPY } from './renderer.js';
import { FOG_FAR, FOG_NEAR, FOG_COLOR, EYE } from './config.js';

// =============================================================================
//  WORLD — BACKROOMS Niveau 0 (fork horreur-exploration de deadmall)
//  Monde unique, 100% Backrooms : grille de cellules cloisonnées au hasard,
//  moquette/papier peint/dalles jaunes, néons grésillants, brume jaune courte.
//  Tout le legacy zombie (BUS DEPOT, TERMINUS, bus/voitures/lampadaires, wall
//  buys, perks, mystery box, Place des Cocotiers, éditeur de map) a été retiré.
//  L'infra réutilisée par les autres modules (collision, lumières, fog, zone
//  stubs, updateWorld) est conservée. enemies.js/weapons.js gardent encore du
//  code horde, recyclé en entité/lampe aux prochaines itérations.
// =============================================================================

// Clés localStorage conservées pour l'UI "import de carte" de main.js
export const MAP_LIST_KEY    = 'horde-maps-list';
export const MAP_ACTIVE_KEY  = 'horde-map-active';

// Map active : 'backrooms'. weapons.js lit ce flag (masque le viewmodel),
// main.js neutralise le gameplay horde dessus.
export const ACTIVE_MAP = 'backrooms';

// --- Backrooms Niveau 0 : brume + grille ---
const BR_FOG_COLOR = 0xa89656;   // jaune-sépia sale (brume + fond)
const BR_FOG_NEAR  = 3;
const BR_FOG_FAR   = 26;
const BR_CELL  = 4.2;            // taille d'une cellule de grille
const BR_COLS  = 13, BR_ROWS = 13;
const BR_HALFX = BR_COLS * BR_CELL / 2;   // demi-largeur arène (~27.3)
const BR_HALFZ = BR_ROWS * BR_CELL / 2;
const BR_CEIL_H = 3.0;           // hauteur plafond (bas = oppressant)

// =============================================================================
//  LUMIÈRES + FOG — ambiance jaune plate (la peur vient du vide, pas du noir)
// =============================================================================
const ambient = new THREE.AmbientLight(0xffe8b0, 0.22);   // base sombre : la lumière vient des néons + lampe torche
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xffe9a0, 0x33301c, 0.18);
scene.add(hemi);
// Lune conservée (exportée pour le menu Graphismes) mais éteinte : éclairage
// plat des Backrooms. mapSize/frustum prêts si on veut réactiver des ombres.
export const moon = new THREE.DirectionalLight(0xc8d4ff, 0);
moon.position.set(22, 42, 14);
moon.castShadow = false;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -30; moon.shadow.camera.right = 30;
moon.shadow.camera.top = 30;   moon.shadow.camera.bottom = -30;
moon.shadow.camera.near = 1;   moon.shadow.camera.far = 120;
moon.shadow.autoUpdate = false;
moon.shadow.needsUpdate = true;
scene.add(moon);

// scene.fog est créé par renderer.js — on le repeint en jaune court ici.
if (scene.fog) {
  scene.fog.color.set(BR_FOG_COLOR);
  scene.fog.near = BR_FOG_NEAR;
  scene.fog.far  = BR_FOG_FAR;
}
scene.background = new THREE.Color(BR_FOG_COLOR);

// =============================================================================
//  LAMPE TORCHE — SpotLight attachée caméra (appoint dans les zones sombres,
//  projette de vraies ombres mouvantes sur les cloisons = ambiance)
// =============================================================================
const flashlight = new THREE.SpotLight(0xfff3d6, 2.4, 24, Math.PI / 6, 0.45, 1.2);
flashlight.position.set(0.18, -0.12, 0.1);     // tenue main droite, léger décalage
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(1024, 1024);
flashlight.shadow.camera.near = 0.2;
flashlight.shadow.camera.far  = 24;
flashlight.shadow.bias = -0.0015;
const flashTarget = new THREE.Object3D();
flashTarget.position.set(0, 0, -10);
camera.add(flashlight);
camera.add(flashTarget);
flashlight.target = flashTarget;

// Defaults fog pour que le menu Graphismes puisse les restaurer
export const fogDefaults = { near: BR_FOG_NEAR, far: BR_FOG_FAR };

// =============================================================================
//  COLLISIONS — AABB + clamp périmètre
// =============================================================================
const obstacles = [];
function addObstacle(minX, maxX, minZ, maxZ) {
  obstacles.push({ minX, maxX, minZ, maxZ });
}
function clamp(v, a, b) { return v<a ? a : v>b ? b : v; }

const bounds = { minX: -BR_HALFX, maxX: BR_HALFX, minZ: -BR_HALFZ, maxZ: BR_HALFZ };

export function resolveCollision(pos, r) {
  // SANITY : si la pos est corrompue (NaN/Infinity), rapatrier au centre.
  if (!isFinite(pos.x) || !isFinite(pos.z) || !isFinite(pos.y)) {
    pos.set(0, EYE, 0);
  }
  pos.x = clamp(pos.x, bounds.minX + r + 0.6, bounds.maxX - r - 0.6);
  pos.z = clamp(pos.z, bounds.minZ + r + 0.6, bounds.maxZ - r - 0.6);
  for (const b of obstacles) {
    const cx = clamp(pos.x, b.minX, b.maxX);
    const cz = clamp(pos.z, b.minZ, b.maxZ);
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx*dx + dz*dz;
    if (d2 < r*r) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = r - d;
        pos.x += dx/d * push; pos.z += dz/d * push;
      } else {
        const l = pos.x - b.minX, ri = b.maxX - pos.x;
        const nz = pos.z - b.minZ, fz = b.maxZ - pos.z;
        const m = Math.min(l, ri, nz, fz);
        if      (m === l)  pos.x = b.minX - r;
        else if (m === ri) pos.x = b.maxX + r;
        else if (m === nz) pos.z = b.minZ - r;
        else               pos.z = b.maxZ + r;
      }
    }
  }
}

// =============================================================================
//  SOLS — raycast de gravité du joueur
// =============================================================================
const floorMeshes = [];
export function getFloorMeshes() { return floorMeshes; }
function registerFloor(mesh) { mesh.userData.isFloor = true; floorMeshes.push(mesh); return mesh; }

// =============================================================================
//  HELPERS — texture procédurale + halo glow
// =============================================================================
function makeTex(draw, rep=1, size=64) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  return t;
}

// Charge public/textures/<name>.png et l'applique sur un MeshStandardMaterial.
// FALLBACK-SAFE : si le PNG est absent (404), le matériau garde sa texture
// procédurale → le jeu marche avant même que les textures soient générées.
// Voir prompt.md pour les prompts Midjourney + les noms de fichiers attendus.
function loadTex(name, repeat, colorSpace, onReady) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const t = new THREE.Texture(img);
    t.colorSpace = colorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = MAX_ANISOTROPY;
    t.needsUpdate = true;
    onReady(t);
  };
  img.onerror = () => { /* garde le fallback procédural */ };
  img.src = `public/textures/${name}.png`;
}
function applyPBR(mat, name, repeat) {
  loadTex(name, repeat, THREE.SRGBColorSpace, (t) => {
    mat.map = t;
    // Option A (prompt.md) : relief léger dérivé de l'albedo (luminance).
    const b = new THREE.Texture(t.image);
    b.colorSpace = THREE.NoColorSpace;
    b.wrapS = b.wrapT = THREE.RepeatWrapping;
    b.repeat.set(repeat, repeat);
    b.anisotropy = MAX_ANISOTROPY;
    b.needsUpdate = true;
    mat.bumpMap = b; mat.bumpScale = 0.04;
    mat.needsUpdate = true;
    // Option B : si tu fournis des maps PBR dédiées, elles priment sur l'auto.
    loadTex(name + '_normal', repeat, THREE.NoColorSpace, (n) => {
      mat.normalMap = n; mat.bumpMap = null; mat.needsUpdate = true;
    });
    loadTex(name + '_rough', repeat, THREE.NoColorSpace, (r) => {
      mat.roughnessMap = r; mat.needsUpdate = true;
    });
  });
}

const zoneNeons = [];                 // lumières qui grésillent (animées par updateWorld)
const glowSprites = [];               // halos sprites pour le pulse
export { glowSprites };
export const interactableSpots = [];  // conservé (vide) pour le menu Graphismes
export const groundDecals = [];       // conservé (vide) pour le menu Graphismes
export const buyStations = [];        // conservé (vide) — plus d'achats en Backrooms
export const lampPositions = [];      // conservé (vide) — plus de lampadaires

const glowTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0,    'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.6,  'rgba(255,255,255,0.12)');
  grd.addColorStop(1,    'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

function addGlow(x, y, z, color, scale = 2.5) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture, color,
    transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
  });
  const spr = new THREE.Sprite(mat);
  spr.position.set(x, y, z);
  spr.scale.set(scale * 0.6, scale * 0.6, scale * 0.6);
  spr.userData = { baseScale: scale * 0.6, basePhase: Math.random() * 7 };
  scene.add(spr);
  glowSprites.push(spr);
  return spr;
}

// =============================================================================
//  HANDLERS injectés par main.js (évite les cycles d'import) — stubs no-op
//  conservés pour ne pas casser setActionHandlers (plus d'achats en Backrooms).
// =============================================================================
const actions = {
  giveWeapon: () => {}, refillAmmo: () => {}, medkit: () => {}, armor: () => {},
  regen: () => {}, nightVision: () => {}, lightUp: () => {},
};
export function setActionHandlers(map) { Object.assign(actions, map); }

// =============================================================================
//  IMPORT JSON externe (UI settings de main.js) — sauvegarde dans localStorage.
//  Dormant en Backrooms (map procédurale), conservé pour ne pas casser l'UI.
// =============================================================================
export function importMapJson(data, displayName) {
  if (!data || typeof data !== 'object') throw new Error('JSON invalide');
  const id = `imported-${Date.now().toString(36)}`;
  const name = displayName || data.name || `Carte importée ${new Date().toLocaleDateString('fr-FR')}`;
  localStorage.setItem(`horde-map-${id}`, JSON.stringify(data));
  let list = [];
  try { const raw = localStorage.getItem(MAP_LIST_KEY); if (raw) list = JSON.parse(raw) || []; } catch {}
  list.push({ id, name, createdAt: Date.now(), modifiedAt: Date.now(), imported: true });
  localStorage.setItem(MAP_LIST_KEY, JSON.stringify(list));
  localStorage.setItem(MAP_ACTIVE_KEY, id);
  return { id, name };
}

// =============================================================================
//  BACKROOMS — NIVEAU 0 procédural (moquette jaune, papier peint, néons)
//  Grille de cellules cloisonnées au hasard → labyrinthe ouvert désorientant.
// =============================================================================
function buildBackrooms() {
  const FW = BR_COLS * BR_CELL;   // largeur/profondeur totales
  const FD = BR_ROWS * BR_CELL;
  const CH = BR_CEIL_H;
  const WT = 0.3;                 // épaisseur des cloisons

  // --- textures procédurales jaunes ---
  const carpetTex = makeTex((g, s) => {
    g.fillStyle = '#b29a3c'; g.fillRect(0, 0, s, s);          // moquette moutarde
    for (let i = 0; i < 220; i++) {                            // grain/taches
      const v = 30 + Math.random() * 50 | 0;
      g.fillStyle = `rgba(${90 + v},${75 + v},30,0.22)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  }, BR_COLS, 64);
  const wallTex = makeTex((g, s) => {
    g.fillStyle = '#c3ab4f'; g.fillRect(0, 0, s, s);          // papier peint jaune
    for (let x = 0; x < s; x += 6) {                          // rayures verticales
      g.fillStyle = 'rgba(150,130,55,0.16)'; g.fillRect(x, 0, 3, s);
    }
    for (let i = 0; i < 7; i++) {                             // taches d'humidité
      g.fillStyle = 'rgba(85,70,30,0.20)';
      g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 9, 0, 7); g.fill();
    }
  }, 1, 64);
  const ceilTex = makeTex((g, s) => {
    g.fillStyle = '#cabd84'; g.fillRect(0, 0, s, s);          // dalles de plafond
    g.strokeStyle = 'rgba(70,60,35,0.55)'; g.lineWidth = 3;
    g.strokeRect(2, 2, s - 4, s - 4);
  }, BR_COLS, 64);

  // Matériaux PBR (MeshStandard) : albedo procédural en fallback, remplacé par
  // tes PNG dès qu'ils sont dans public/textures/ (carpet_yellow / wallpaper_yellow
  // / ceiling_tile — voir prompt.md). wallMatPerim = repeat dense pour les longs
  // murs d'enceinte (sinon le motif s'étire).
  const carpetMat    = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.96, metalness: 0 });
  const wallMat      = new THREE.MeshStandardMaterial({ map: wallTex,   roughness: 0.92, metalness: 0 });
  const wallMatPerim = new THREE.MeshStandardMaterial({ map: wallTex,   roughness: 0.92, metalness: 0 });
  const ceilMat      = new THREE.MeshStandardMaterial({ map: ceilTex,   roughness: 0.95, metalness: 0 });
  applyPBR(carpetMat,    'carpet_yellow',    BR_COLS);
  applyPBR(wallMat,      'wallpaper_yellow', 2);
  applyPBR(wallMatPerim, 'wallpaper_yellow', 12);
  applyPBR(ceilMat,      'ceiling_tile',     BR_COLS);

  // --- sol (raycast gravité) + plafond ---
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), carpetMat);
  floor.rotation.x = -Math.PI / 2;
  floor.userData._skipOutline = true;
  floor.receiveShadow = true;
  registerFloor(floor);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CH;
  ceiling.userData._skipOutline = true;
  scene.add(ceiling);

  // --- helper cloison (mesh + collision AABB) ---
  function wallSeg(cx, cz, w, d, mat = wallMat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, CH, d), mat);
    m.position.set(cx, CH / 2, cz);
    m.receiveShadow = true;
    m.userData._skipOutline = true;
    scene.add(m);
    addObstacle(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);
  }

  // --- mur d'enceinte (4 côtés) — matériau à repeat dense ---
  wallSeg(0, -BR_HALFZ, FW, WT, wallMatPerim);
  wallSeg(0,  BR_HALFZ, FW, WT, wallMatPerim);
  wallSeg(-BR_HALFX, 0, WT, FD, wallMatPerim);
  wallSeg( BR_HALFX, 0, WT, FD, wallMatPerim);

  // --- cloisons internes : segments aléatoires sur les arêtes de la grille,
  //     en gardant un carré 3×3 dégagé autour du spawn central ---
  const sC = Math.floor(BR_COLS / 2), sR = Math.floor(BR_ROWS / 2);
  const safe = (c, r) => Math.abs(c - sC) <= 1 && Math.abs(r - sR) <= 1;
  for (let col = 0; col < BR_COLS - 1; col++) {
    for (let row = 0; row < BR_ROWS; row++) {
      if (safe(col, row) || safe(col + 1, row)) continue;
      if (Math.random() < 0.26) {
        wallSeg(-BR_HALFX + (col + 1) * BR_CELL, -BR_HALFZ + (row + 0.5) * BR_CELL, WT, BR_CELL + WT);
      }
    }
  }
  for (let col = 0; col < BR_COLS; col++) {
    for (let row = 0; row < BR_ROWS - 1; row++) {
      if (safe(col, row) || safe(col, row + 1)) continue;
      if (Math.random() < 0.26) {
        wallSeg(-BR_HALFX + (col + 0.5) * BR_CELL, -BR_HALFZ + (row + 1) * BR_CELL, BR_CELL + WT, WT);
      }
    }
  }

  // --- néons plafond : tubes émissifs (certains grillés) + PointLight inégales,
  //     dont une partie grésille violemment, et des cellules carrément sombres ---
  // Panneaux fluo texturés (light_fixture.png), certains grillés. L'éclairage
  // réel + le grésillement viennent des PointLight ci-dessous.
  const fixtureLit = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xfff0d2, emissiveIntensity: 1.1, roughness: 0.5, metalness: 0,
  });
  const fixtureDead = new THREE.MeshStandardMaterial({ color: 0x4a4636, roughness: 0.85, metalness: 0 });
  loadTex('light_fixture', 1, THREE.SRGBColorSpace, (t) => {
    fixtureLit.map = t; fixtureLit.emissiveMap = t; fixtureLit.needsUpdate = true;
    const t2 = new THREE.Texture(t.image);
    t2.colorSpace = THREE.SRGBColorSpace; t2.needsUpdate = true;
    fixtureDead.map = t2; fixtureDead.needsUpdate = true;
  });
  const cellCenter = (c, r) => ({
    x: -BR_HALFX + (c + 0.5) * BR_CELL,
    z: -BR_HALFZ + (r + 0.5) * BR_CELL,
  });
  // Le plafond ceiling_tile = 3×3 dalles par tuile → 1 dalle = BR_CELL/3 = 1.4 m.
  // Les centres de cellule tombent pile sur des centres de dalle, donc un
  // luminaire de la taille d'une dalle (léger inset pour laisser voir le joint)
  // s'aligne parfaitement sur la grille du plafond.
  const TILE = BR_CELL / 3;
  const fixSize = TILE * 0.94;
  for (let col = 0; col < BR_COLS; col++) {
    for (let row = 0; row < BR_ROWS; row++) {
      const p = cellCenter(col, row);
      const dead = Math.random() < 0.22;    // ~1 panneau sur 5 grillé
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(fixSize, fixSize), dead ? fixtureDead : fixtureLit);
      panel.rotation.x = Math.PI / 2;        // face vers le bas
      panel.position.set(p.x, CH - 0.02, p.z);
      panel.userData._skipOutline = true;
      scene.add(panel);
    }
  }
  for (let col = 1; col < BR_COLS; col += 3) {
    for (let row = 1; row < BR_ROWS; row += 3) {
      if (Math.random() < 0.22) continue;          // cellule sans lampe → zone noire
      const p = cellCenter(col, row);
      const dramatic = Math.random() < 0.35;       // 1/3 grésillent à la SH3
      const base = dramatic ? 1.0 : (0.45 + Math.random() * 0.35);
      const l = new THREE.PointLight(0xffe6a0, base, BR_CELL * 3.2, 1.8);
      l.position.set(p.x, CH - 0.25, p.z);
      l.userData = dramatic
        ? { base, flicker: true, dramaticFlicker: true, phase: Math.random() * 7, dramaticOff: 0, dramaticNext: Math.random() * 4 }
        : { base, flicker: true, phase: Math.random() * 7 };
      scene.add(l);
      zoneNeons.push(l);
      addGlow(p.x, CH - 0.18, p.z, 0xfff4c2, dramatic ? 0.9 : 1.3);
    }
  }

  // --- taches de moisissure / eau au sol (decal_mold.png, fond transparent) ---
  const moldMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false });
  loadTex('decal_mold', 1, THREE.SRGBColorSpace, (t) => { moldMat.map = t; moldMat.needsUpdate = true; });
  for (let i = 0; i < 16; i++) {
    const dx = (Math.random() * 2 - 1) * (BR_HALFX - 2);
    const dz = (Math.random() * 2 - 1) * (BR_HALFZ - 2);
    if (Math.abs(dx) < 3.5 && Math.abs(dz) < 3.5) continue;   // dégage le spawn
    const s = 1.4 + Math.random() * 2.6;
    const d = new THREE.Mesh(new THREE.PlaneGeometry(s, s), moldMat);
    d.rotation.x = -Math.PI / 2;             // face vers le haut (au sol)
    d.rotation.z = Math.random() * Math.PI * 2;
    d.position.set(dx, 0.02, dz);
    d.userData._skipOutline = true;
    scene.add(d);
  }
}
buildBackrooms();

// =============================================================================
//  ZONE (stubs mono-map) + spawns — conservés pour main.js / enemies.js
// =============================================================================
const FAKE_ZONE = {
  id: 'bus_depot',            // clé fonctionnelle inchangée (state.currentZone)
  name: 'NIVEAU 0',
  baseX: 0, baseY: 0, baseZ: 0,
  playerSpawn: new THREE.Vector3(0, EYE, 0),   // centre dégagé du labyrinthe
  playerSpawnYaw: 0,
  minX: bounds.minX, maxX: bounds.maxX,
  minZ: bounds.minZ, maxZ: bounds.maxZ,
  fogColor: FOG_COLOR, fogNear: FOG_NEAR, fogFar: FOG_FAR,
  ambientIntensity: 0.55,
  group: scene,
};

// Plus de spawns horde en Backrooms (l'entité viendra à l'itér. 3).
const zombieSpawns = [];
export function getZombieSpawns() { return zombieSpawns; }

export function getZone(_id) { return FAKE_ZONE; }
export function getCurrentZone() { return FAKE_ZONE; }
export function switchToZone(_id) { return FAKE_ZONE; }

// =============================================================================
//  PASSE FINALE — castShadow / receiveShadow (prêt si la lune est réactivée)
// =============================================================================
function setupShadowsRecursive(root) {
  root.traverse(c => {
    if (!c.isMesh && !c.isSkinnedMesh) return;
    if (c.userData._isOutline) return;
    if (c.material && c.material.isMeshBasicMaterial) return; // néons, sprites
    if (c.userData.isFloor) {
      c.receiveShadow = true; c.castShadow = false;
    } else {
      if (c.geometry) {
        if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
        const sz = c.geometry.boundingBox.getSize(new THREE.Vector3());
        c.castShadow = Math.max(sz.x, sz.y, sz.z) >= 1.0;
      } else c.castShadow = true;
      c.receiveShadow = true;
    }
  });
}
setupShadowsRecursive(scene);

// =============================================================================
//  UPDATE (néons grésillants + pulse glow) + stubs blackout
// =============================================================================
let blackoutT = 0;
export function updateWorld(dt) {
  const t = performance.now() / 1000;
  // néons : flicker subtil (amplitude ±15%, drop rare)
  for (const n of zoneNeons) {
    const u = n.userData;
    if (!u.flicker) continue;
    if (u.dramaticFlicker) {
      // néon grillé : reste éteint X s, revient violemment, stroboscope au ON
      u.dramaticNext -= dt;
      if (u.dramaticOff > 0) {
        u.dramaticOff -= dt;
        n.intensity = u.base * 0.02;
        if (u.dramaticOff <= 0) u.dramaticNext = 2 + Math.random() * 5;
      } else if (u.dramaticNext <= 0) {
        u.dramaticOff = 0.4 + Math.random() * 1.1;
      } else {
        u.phase += dt * (4 + Math.random() * 4);
        const f = Math.sin(u.phase * 11) * Math.sin(u.phase * 17);
        const burst = Math.random() < 0.08 ? 0.15 : (0.6 + 0.6 * f);
        n.intensity = u.base * Math.max(0.1, burst);
      }
      continue;
    }
    u.phase += dt * (3 + Math.random() * 2);
    const f = 0.85 + 0.15 * Math.sin(u.phase * 7) * Math.sin(u.phase * 13);
    n.intensity = u.base * (Math.random() < 0.001 ? 0.5 : f);
  }
  // halos glow : pulse subtil désynchronisé
  for (const spr of glowSprites) {
    const u = spr.userData;
    const pulse = 0.85 + 0.15 * Math.sin(t * 3 + u.basePhase);
    const flick = Math.random() < 0.015 ? 0.4 : 1.0;
    spr.material.opacity = 0.75 * pulse * flick;
    spr.scale.setScalar(u.baseScale * (0.95 + 0.05 * Math.sin(t * 2.4 + u.basePhase)));
  }
  if (blackoutT > 0) { blackoutT -= dt; if (blackoutT <= 0) endBlackout(); }
}

// Stubs blackout conservés pour compat enemies.js / main.js
export function startBlackout(_dur = 14) { /* no-op MVP */ }
export function endBlackout() {
  ambient.intensity = 0.22;
  if (scene.fog) scene.fog.far = BR_FOG_FAR;
  blackoutT = 0;
}
