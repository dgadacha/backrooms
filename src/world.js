import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();   // requis pour que les RectAreaLight éclairent correctement
import { scene, MAX_ANISOTROPY } from './renderer.js';
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
// Ambient/hemi TRÈS bas : la lumière doit venir des dalles (RectAreaLight) pour
// un fort contraste lumière/obscurité (RE7/SH). L'ambient n'est qu'un plancher
// anti-noir-total.
const ambient = new THREE.AmbientLight(0xffe8b0, 0.10);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xffe9a0, 0x2a2618, 0.10);
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

// (Lampe torche retirée — la vision nocturne du caméscope [touche C] est le seul
//  moyen de voir dans le noir, façon Outlast.)

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

// Niveau de lumière approximatif à une position (0 sombre → 1 éclairé) : base
// ambient + somme des néons ALLUMÉS proches. Sert à la santé mentale (le noir
// rend fou) et plus tard à l'entité. zoneNeons (PointLight) défini plus bas.
export function getLightLevelAt(pos) {
  let lvl = 0.25;                                   // ambient + hemi
  for (const n of zoneNeons) {
    if ((!n.isPointLight && !n.isRectAreaLight) || n.intensity < 0.05) continue;
    const range = n.distance || 14;               // RectAreaLight n'a pas de .distance
    const d = n.position.distanceTo(pos);
    if (d < range) lvl += Math.min(0.6, n.intensity * 0.12) * (1 - d / range);
  }
  return Math.min(1, lvl);
}

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
// Conteneur du niveau courant — vidé/reconstruit à chaque descente.
const levelGroup = new THREE.Group();
scene.add(levelGroup);
const exitPos = new THREE.Vector3();   // position de la faille (sortie no-clip)
let hasExit = false;
export function getExitPos() { return hasExit ? exitPos : null; }

function buildBackrooms(opts = {}) {
  const level = opts.level || 0;
  const deadProb = Math.min(0.55, 0.22 + level * 0.09);   // + de panneaux grillés en profondeur
  const skipProb = Math.min(0.50, 0.22 + level * 0.07);   // + de lampes éteintes (plus sombre)
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
  // Plafond : grille procédurale RÉGULIÈRE (3×3 dalles carrées). ceiling_tile.png
  // a une grille irrégulière en V (lignes ~160/230/210 px) → désalignait les
  // luminaires sur un axe. Le procédural garantit une grille parfaitement
  // alignée sur les deux axes. (Régénère ceiling_tile bien régulier si tu veux
  // le revenir au photo.)
  const ceilTex = makeTex((g, s) => {
    const n = 3, cell = s / n;
    g.fillStyle = '#c8bd8e'; g.fillRect(0, 0, s, s);            // dalle beige
    for (let i = 0; i < 4200; i++) {                            // grain acoustique
      const v = (Math.random() * 36 - 18) | 0;
      g.fillStyle = `rgba(${150 + v},${140 + v},${104 + v},0.22)`;
      g.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
    for (let i = 0; i < 5; i++) {                               // taches d'humidité
      g.fillStyle = 'rgba(120,104,68,0.10)';
      g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 6 + Math.random() * 16, 0, 7); g.fill();
    }
    const jw = Math.max(2, s * 0.016);                          // joints de grille nets
    g.fillStyle = 'rgba(74,68,46,0.62)';
    for (let k = 0; k <= n; k++) {
      const p = k * cell;
      g.fillRect(p - jw / 2, 0, jw, s);
      g.fillRect(0, p - jw / 2, s, jw);
    }
  }, BR_COLS, 256);

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
  // Plafond : ceiling_tile régénéré RÉGULIER (6×6) → repeat 13 = dalles de 0.7 m.
  // Les centres de cellule tombent sur les intersections de joints, donc un
  // luminaire de 1.4 m (2×2 dalles) s'aligne pile. (Procédural reste en fallback.)
  applyPBR(ceilMat,      'ceiling_tile',     BR_COLS);

  // --- sol (raycast gravité) + plafond ---
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), carpetMat);
  floor.rotation.x = -Math.PI / 2;
  floor.userData._skipOutline = true;
  floor.receiveShadow = true;
  registerFloor(floor);
  levelGroup.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CH;
  ceiling.userData._skipOutline = true;
  levelGroup.add(ceiling);

  // --- helper cloison (mesh + collision AABB) ---
  function wallSeg(cx, cz, w, d, mat = wallMat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, CH, d), mat);
    m.position.set(cx, CH / 2, cz);
    m.receiveShadow = true;
    m.userData._skipOutline = true;
    levelGroup.add(m);
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
  const TILE = BR_CELL / 3;          // 1.4 m = 2×2 dalles du plafond (0.7 m)
  const fixSize = TILE;              // pile 2 dalles → bords sur les joints
  for (let col = 0; col < BR_COLS; col++) {
    for (let row = 0; row < BR_ROWS; row++) {
      const p = cellCenter(col, row);
      const dead = Math.random() < deadProb; // panneaux grillés (+ en profondeur)
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(fixSize, fixSize), dead ? fixtureDead : fixtureLit);
      panel.rotation.x = Math.PI / 2;        // face vers le bas
      panel.position.set(p.x, CH - 0.02, p.z);
      panel.userData._skipOutline = true;
      levelGroup.add(panel);
    }
  }
  for (let col = 1; col < BR_COLS; col += 3) {
    for (let row = 1; row < BR_ROWS; row += 3) {
      if (Math.random() < skipProb) continue;      // cellule sans lampe → zone noire
      const p = cellCenter(col, row);
      const dramatic = Math.random() < 0.35;       // 1/3 grésillent à la SH3
      // RectAreaLight = dalle fluo surfacique : lumière douce qui bave sur murs,
      // sol et plafond (au lieu d'un PointLight omni). C'est ce spill qui fait "AAA".
      const base = dramatic ? 5.0 : (3.0 + Math.random() * 1.8);   // échelle RectAreaLight (legacy)
      const l = new THREE.RectAreaLight(0xffe6a0, base, BR_CELL * 0.58, BR_CELL * 0.58);
      l.position.set(p.x, CH - 0.06, p.z);
      l.lookAt(p.x, 0, p.z);                        // émet vers le bas (le sol)
      l.userData = dramatic
        ? { base, flicker: true, dramaticFlicker: true, phase: Math.random() * 7, dramaticOff: 0, dramaticNext: Math.random() * 4 }
        : { base, flicker: true, phase: Math.random() * 7 };
      levelGroup.add(l);
      zoneNeons.push(l);
      addGlow(p.x, CH - 0.18, p.z, 0xfff4c2, dramatic ? 0.9 : 1.3);
    }
  }

  // --- PORTE de descente : sur une cellule aléatoire hors du spawn ---
  // Iconique Backrooms : une porte entrebâillée, du noir absolu derrière, et
  // une lueur cyan qui fuit par l'entrebâillement (l'au-delà) → repérable de loin.
  // La franchir (E à proximité) = descendre d'un niveau.
  // Côté + position aléatoires SUR le mur d'enceinte (jamais flottante au milieu).
  // Encastrée dans la paroi, s'ouvre vers l'intérieur ; le néant noir masque le mur.
  const inset = 0.32;                              // recul depuis l'axe du mur
  const side = Math.floor(Math.random() * 4);      // 0=N 1=S 2=E 3=O
  let doorX, doorZ, doorRot;
  if (side === 0) {                                // mur nord (z=-BR_HALFZ) → ouvre vers +z
    doorX = cellCenter(1 + Math.floor(Math.random() * (BR_COLS - 2)), 0).x;
    doorZ = -BR_HALFZ + inset; doorRot = 0;
  } else if (side === 1) {                         // mur sud → vers -z
    doorX = cellCenter(1 + Math.floor(Math.random() * (BR_COLS - 2)), 0).x;
    doorZ = BR_HALFZ - inset; doorRot = Math.PI;
  } else if (side === 2) {                         // mur est (x=+BR_HALFX) → vers -x
    doorX = BR_HALFX - inset;
    doorZ = cellCenter(0, 1 + Math.floor(Math.random() * (BR_ROWS - 2))).z; doorRot = -Math.PI / 2;
  } else {                                         // mur ouest → vers +x
    doorX = -BR_HALFX + inset;
    doorZ = cellCenter(0, 1 + Math.floor(Math.random() * (BR_ROWS - 2))).z; doorRot = Math.PI / 2;
  }
  exitPos.set(doorX, EYE, doorZ);
  hasExit = true;

  const door = new THREE.Group();
  door.position.set(doorX, 0, doorZ);
  door.rotation.y = doorRot;

  const DW = 1.0, DH = 2.15, JAMB = 0.11, DDEPTH = 0.16;
  // Cadre bois usé : contraste avec le néant noir ET le mur jaune → lit comme une porte
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.85, metalness: 0.0 });
  const addPart = (geo, x, y, z, mat) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    m.userData._skipOutline = true;
    door.add(m);
  };
  // Encadrement : 2 montants + linteau (boîtes sombres)
  addPart(new THREE.BoxGeometry(JAMB, DH + JAMB, DDEPTH), -(DW / 2 + JAMB / 2), (DH + JAMB) / 2, 0, frameMat);
  addPart(new THREE.BoxGeometry(JAMB, DH + JAMB, DDEPTH),  (DW / 2 + JAMB / 2), (DH + JAMB) / 2, 0, frameMat);
  addPart(new THREE.BoxGeometry(DW + JAMB * 2, JAMB, DDEPTH), 0, DH + JAMB / 2, 0, frameMat);

  // Le néant derrière la porte : plan noir absolu (non éclairé)
  const voidPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(DW, DH),
    new THREE.MeshBasicMaterial({ color: 0x01020a }),
  );
  voidPlane.position.set(0, DH / 2, -0.05);
  voidPlane.userData._skipOutline = true;
  door.add(voidPlane);

  // Battant entrebâillé (charnière côté gauche, crème institutionnel) + poignée
  const hinge = new THREE.Group();
  hinge.position.set(-DW / 2, 0, 0.04);
  hinge.rotation.y = 0.85;                        // entrouvert ~50°
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xc9bd98, roughness: 0.7, metalness: 0.0 });
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(DW, DH - 0.05, 0.05), leafMat);
  leaf.position.set(DW / 2, DH / 2, 0);
  leaf.castShadow = true; leaf.userData._skipOutline = true;
  hinge.add(leaf);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x26262a, roughness: 0.35, metalness: 0.7 }),
  );
  knob.position.set(DW - 0.13, DH / 2, 0.05);
  knob.userData._skipOutline = true;
  hinge.add(knob);
  door.add(hinge);

  levelGroup.add(door);

  // Lueur cyan qui fuit de l'entrebâillement → l'au-delà, repérable de loin
  const doorLight = new THREE.PointLight(0x7fd2ff, 3.8, 9, 2);
  doorLight.position.set(doorX, 1.5, doorZ);
  levelGroup.add(doorLight);
  addGlow(doorX, 1.25, doorZ, 0x8fd8ff, 0.6);     // halo cyan (bloom) → repérable de loin
}

// Vide le niveau courant (meshes + lumières + collisions) avant régénération.
function clearLevel() {
  for (let i = levelGroup.children.length - 1; i >= 0; i--) {
    const c = levelGroup.children[i];
    levelGroup.remove(c);
    c.traverse((o) => {                            // récursif : couvre les Groups (porte)
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) { m.map?.dispose?.(); m.emissiveMap?.dispose?.(); m.dispose?.(); }
    });
  }
  for (const s of glowSprites) scene.remove(s);
  glowSprites.length = 0;
  obstacles.length = 0;
  floorMeshes.length = 0;
  zoneNeons.length = 0;
  _lastObstaclesLen = 0;
  hasExit = false;
}

// Descente : régénère un labyrinthe plus dur (appelé par main.js).
export function regenerateLevel(level = 0) {
  clearLevel();
  buildBackrooms({ level });
  rebuildObstacles();
}

buildBackrooms({ level: 0 });

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
  ambient.intensity = 0.10;
  if (scene.fog) scene.fog.far = BR_FOG_FAR;
  blackoutT = 0;
}
