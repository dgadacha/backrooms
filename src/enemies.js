import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { loadingManager } from './loading.js';
import { scene, camera, applyLowPoly, forceNearestFilter, applyOutlinesRecursive } from './renderer.js';
import { REWARD_HIT, REWARD_BODY, REWARD_HEAD_BONUS } from './config.js';
import { State, game, player, wave } from './state.js';
import { burst, bloodPool } from './effects.js';
import { sfx } from './audio.js';
import { toast, updateHUD, dmgFlash, banner, popupScore, showRoundStart } from './hud.js';
import { applyCameraShake, damagePlayer } from './player.js';
import { resolveCollision, getZombieSpawns, getCurrentZone, startBlackout } from './world.js';

// =============================================================================
//  Chargement asynchrone du modèle GLB (rigué + 3 animations)
// =============================================================================
let zombieTemplate = null;
let zombieAnimations = null;
let zombieHeight = 1.8;       // calibré après load via bounding box
let zombieHeadY  = 1.5;       // seuil Y du headshot (relatif au pivot du clone)
let zombieBottomOffset = 0;   // décalage pour ancrer le bas du modèle au sol

const onZombieLoaded = [];
export function isZombieReady() { return zombieTemplate !== null; }
export function whenZombieReady(cb) {
  if (zombieTemplate) cb();
  else onZombieLoaded.push(cb);
}
// Liste des clips d'animation du modèle zombie (pour la galerie)
export function getZombieAnimations() { return zombieAnimations || []; }

// Box3 calculée à partir des seuls Mesh/SkinnedMesh visibles (ignore les bones du squelette
// qui peuvent dépasser le modèle et fausser une Box3.setFromObject classique)
function meshOnlyBoundingBox(root) {
  const box = new THREE.Box3();
  let any = false;
  root.updateMatrixWorld(true);
  root.traverse(child => {
    if ((child.isMesh || child.isSkinnedMesh) && child.geometry) {
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      const cb = child.geometry.boundingBox.clone();
      cb.applyMatrix4(child.matrixWorld);
      if (!any) { box.copy(cb); any = true; }
      else box.union(cb);
    }
  });
  return box;
}

const ZOMBIE_TARGET_HEIGHT_M = 1.8;
// scale du modèle Meshy. Mets ici la valeur trouvée via le slider de la galerie.
// null = scale auto (souvent incorrect avec les SkinnedMesh à cause du bind matrix)
const ZOMBIE_MANUAL_SCALE = 1;

// =============================================================================
//  MAPPING ANIMATIONS PAR INDEX (override des noms foireux Meshy)
//
//  Quand Meshy exporte le GLB, les NOMS des clips ne correspondent pas
//  toujours au CONTENU réel (bug connu Meshy v3+). Pour éviter de devoir
//  redonner mes regex à chaque export, on hardcode le mapping par INDEX.
//
//  Pour ce trouver : ouvre la galerie, sélectionne ZOMBIE, teste chaque
//  index dans le dropdown ANIM (format "N — name"), et note ce qui joue
//  vraiment. Mets à jour les indices ici.
//
//  Mets null pour revenir à l'auto-mapping par regex sur les noms (pour
//  un futur modèle correctement nommé).
// =============================================================================
// Mapping désactivé — on laisse l'auto-mapping par regex sur les vrais noms
// d'animation du GLB faire son travail. Si tu re-importes un GLB Meshy avec
// les noms shufflés, remet un objet { walk, run, dead, attacks: [...] } ici.
const ZOMBIE_ANIM_INDEX_MAP = null;

// Vitesse "naturelle" de l'animation walk (en m/s). Le timeScale du clip
// est calculé comme `u.speed / WALK_REF_SPEED` puis clampé pour éviter à
// la fois la cadence robotique (timeScale trop haut) et le foot-sliding
// flagrant (timeScale trop bas). On préfère un léger foot-slide au sprint
// plutôt qu'une animation frénétique qui paraît saccadée.
const WALK_REF_SPEED   = 1.6;
const WALK_TIMESCALE_MIN = 0.80; // anim ne devient jamais trop molle
const WALK_TIMESCALE_MAX = 1.25; // anim ne devient jamais frénétique

const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load(
  'public/models/zombie.glb',
  (gltf) => {
    zombieTemplate = gltf.scene;
    zombieAnimations = gltf.animations;
    // Comptage des triangles (debug perf)
    let _zTris = 0;
    zombieTemplate.traverse(c => {
      if ((c.isMesh || c.isSkinnedMesh) && c.geometry) {
        const idx = c.geometry.index;
        _zTris += idx ? idx.count / 3 : c.geometry.attributes.position.count / 3;
      }
    });
    console.log(`[zombie GLB] triangles: ${Math.round(_zTris).toLocaleString()} (×N par vague)`);

    // mesure de la hauteur réelle à partir des MESHES visibles (pas les bones)
    const rawBox = meshOnlyBoundingBox(zombieTemplate);
    const rawHeight = rawBox.max.y - rawBox.min.y;
    console.log('[zombie GLB] raw mesh box', { min: rawBox.min, max: rawBox.max, height: rawHeight });

    let scale;
    if (ZOMBIE_MANUAL_SCALE !== null) {
      scale = ZOMBIE_MANUAL_SCALE;
      console.log('[zombie GLB] using MANUAL scale:', scale);
    } else {
      scale = ZOMBIE_TARGET_HEIGHT_M / rawHeight;
      console.log('[zombie GLB] auto scale:', scale, '(targeting', ZOMBIE_TARGET_HEIGHT_M + 'm)');
    }
    zombieTemplate.scale.setScalar(scale);
    zombieTemplate.updateMatrixWorld(true);

    // CRITIQUE : désactive le frustum culling sur les meshes et recalcule les
    // bounding sphere/box (sinon avec un scale énorme Three croit que les
    // SkinnedMesh sont hors caméra et les supprime du rendu)
    zombieTemplate.traverse(child => {
      if (child.isSkinnedMesh || child.isMesh) {
        child.frustumCulled = false;
        if (child.geometry) {
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      }
    });

    // NEAREST sur toutes les textures embarquées (cohérence DA PS1)
    forceNearestFilter(zombieTemplate);


    // re-mesure après scale
    const finalBox = meshOnlyBoundingBox(zombieTemplate);
    zombieHeight = finalBox.max.y - finalBox.min.y;
    zombieBottomOffset = -finalBox.min.y;
    zombieHeadY = zombieHeight * 0.82 - zombieBottomOffset;
    console.log('[zombie GLB] scaled mesh box', { min: finalBox.min, max: finalBox.max, height: zombieHeight });
    console.log('[zombie GLB] animations détaillées :');
    console.table(zombieAnimations.map((a, i) => ({
      index: i,
      name: a.name || '(sans nom)',
      duration: a.duration.toFixed(2) + 's',
      tracks: a.tracks.length,
    })));
    console.log('[zombie GLB] bottomOffset:', zombieBottomOffset.toFixed(3), 'headY:', zombieHeadY.toFixed(3));

    for (const cb of onZombieLoaded) cb();
    onZombieLoaded.length = 0;
  },
  undefined,
  (err) => {
    console.error('[zombie GLB] load error:', err);
  }
);

// Collecte tous les materials d'un zombie cloné (pour le flash sur hit)
function collectMaterials(obj) {
  const set = new Set();
  obj.traverse(child => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => set.add(m));
      else set.add(child.material);
    }
  });
  return [...set];
}

// =============================================================================
//  makeZombie — clone le modèle GLB + setup AnimationMixer
// =============================================================================
export function makeZombie() {
  if (!zombieTemplate) return null;   // GLB pas encore chargé

  const z = cloneSkinned(zombieTemplate);
  z.scale.copy(zombieTemplate.scale);

  // CRITIQUE : SkeletonUtils.clone NE clone PAS les materials. Sans ça, les
  // modifications par instance (transparent/opacity lors du fade de mort,
  // emissive pour le flash de hit) se propagent à TOUS les zombies + au
  // modèle de la galerie.
  // En plus, on passe chaque material clonné dans applyLowPoly() pour qu'il
  // hérite du flat shading + vertex jitter PS2 — sinon le zombie reste en
  // PBR "haute qualité" et détonne avec le reste de la scène (qui est en
  // Lambert flat + jitter).
  z.traverse(child => {
    if (child.isMesh || child.isSkinnedMesh) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(m => applyLowPoly(m.clone()));
      } else if (child.material) {
        child.material = applyLowPoly(child.material.clone());
      }
      // castShadow pour la DA dark PBR — chaque zombie projette son ombre
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Outlines cartoon — appliquées par instance car les SkinnedMesh ont
  // chacun leur propre skeleton (cloné par SkeletonUtils.clone). Le clone
  // outline doit se bind sur le skeleton de l'instance, pas du template.
  // Épaisseur 0.015 = ~1.5cm sur un zombie de 1.8m de haut, discret mais
  // visible sur la silhouette.
  applyOutlinesRecursive(z, 0.015, 0x080612);

  // AnimationMixer par instance
  const mixer = new THREE.AnimationMixer(z);

  // === Résolution des clips : INDEX override (Meshy buggy) ou regex par noms ===
  let walkClip, runClip, deadClip, attackClips, attackLClip, attackRClip;

  if (ZOMBIE_ANIM_INDEX_MAP) {
    // Mode override : Meshy a exporté les clips avec des noms qui ne
    // correspondent pas au CONTENU réel. On pioche par INDEX en se fiant
    // au mapping testé via la galerie.
    walkClip = zombieAnimations[ZOMBIE_ANIM_INDEX_MAP.walk] || null;
    runClip  = zombieAnimations[ZOMBIE_ANIM_INDEX_MAP.run]  || null;
    deadClip = zombieAnimations[ZOMBIE_ANIM_INDEX_MAP.dead] || null;
    attackClips = (ZOMBIE_ANIM_INDEX_MAP.attacks || [])
      .map(i => zombieAnimations[i])
      .filter(Boolean);
    attackLClip = attackClips[0] || null;
    attackRClip = attackClips[1] || attackClips[0] || null;
  } else {
    // Mode auto : heuristique par regex sur les noms (modèles correctement
    // nommés). Stratégie 3 couches : nom direct → regex large → fallback positionnel.
    const KNOWN_LOCOMOTION = ['Unsteady_Walk', 'Walking', 'Running'];
    walkClip = zombieAnimations.find(a => a.name === 'Unsteady_Walk');
    runClip  = zombieAnimations.find(a => a.name === 'Running');
    const nonLoco = zombieAnimations.filter(a => !KNOWN_LOCOMOTION.includes(a.name));
    deadClip = nonLoco.find(a => /dead|death|dying|\bdie/i.test(a.name));
    if (!deadClip && nonLoco.length >= 2) deadClip = nonLoco[nonLoco.length - 1];
    attackClips = nonLoco.filter(a => a !== deadClip);
    attackLClip = attackClips.find(a => /hook|punch|jab|attack|hit/i.test(a.name))
               || attackClips.find(a => !a.name || a.name.trim() === '' || /^animation/i.test(a.name))
               || attackClips[0] || null;
    attackRClip = attackClips.find(a => a !== attackLClip && /slash|charged|heavy|cross|swing|kick/i.test(a.name))
               || attackClips.find(a => a !== attackLClip)
               || attackLClip;
  }

  const actions = {
    walk:    walkClip     ? mixer.clipAction(walkClip)     : null,
    run:     runClip      ? mixer.clipAction(runClip)      : null,
    dead:    deadClip     ? mixer.clipAction(deadClip)     : null,
    attackL: attackLClip  ? mixer.clipAction(attackLClip)  : null,
    attackR: attackRClip  ? mixer.clipAction(attackRClip)  : null,
    // array de toutes les attaques disponibles, pour alternance aléatoire
    attacks: attackClips.map(c => mixer.clipAction(c)).filter(Boolean),
  };
  // Log debug du mapping résolu (utile quand on switch de modèle Meshy)
  console.log('[zombie GLB] animation mapping:', {
    walk:     walkClip?.name    || '(absent)',
    run:      runClip?.name     || '(absent)',
    dead:     deadClip?.name    || '(absent)',
    attackL:  attackLClip?.name || '(absent)',
    attackR:  attackRClip?.name || '(absent)',
    attacks:  attackClips.map(c => c.name || '(unnamed)'),
  });

  // Marche en boucle dès le spawn, désynchronisée pour chaque zombie
  if (actions.walk) {
    actions.walk.setLoop(THREE.LoopRepeat);
    actions.walk.time = Math.random() * actions.walk.getClip().duration;
    actions.walk.play();
  }

  // Tag des meshes (raycast d'arme va lire userData.zombie + .part)
  z.traverse(m => {
    if (m.isMesh) {
      m.userData.zombie = null;       // setZombieRef remplira
      m.userData.part = 'body';       // headshot est détecté par hauteur du hit, pas par tag
    }
  });

  // userData gameplay
  z.userData = {
    hp: 100,
    speed: 1.6,
    attackCd: 0,
    phase: Math.random() * 6.28,
    mixer, actions,
    currentAnim: 'walk',         // 'walk' | 'attack' | 'dead'
    attackTimer: 0,              // temps restant de l'animation d'attaque
    alive: true, flash: 0,
    deathTime: 0, deathDur: 0,
    flashMats: collectMaterials(z),
    flashOriginalEmissive: new Map(),
  };
  return z;
}

const zombies = [];
const ZHEAD = 1.55;

// =============================================================================
//  CRÉATION
// =============================================================================

// Palettes de chemise (couleurs distinctes, style Synty)
const SHIRT_PALETTES = [
  [222, 195, 210],  // rose pâle
  [200, 195, 220],  // lilas / violet pâle
  [200, 215, 222],  // bleu très pâle
  [218, 210, 195],  // beige clair
  [195, 200, 200],  // gris bleuté
  [185, 205, 215],  // bleu clair
  [215, 195, 195],  // chair pâle
];

// Texture torse — chemise + ÉNORMES éclaboussures de sang (rouge / bordeaux / marron)
function bloodyTorsoTex(shirtR, shirtG, shirtB) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  // base : couleur chemise (légère variation locale)
  g.fillStyle = `rgb(${shirtR},${shirtG},${shirtB})`;
  g.fillRect(0, 0, 32, 32);
  // ombres de plis / saletés subtiles
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(40,30,25,${0.08 + Math.random()*0.18})`;
    g.beginPath(); g.arc(Math.random()*32, Math.random()*32, 1 + Math.random()*3.5, 0, 7); g.fill();
  }
  // SANG : 8 éclaboussures (subtle, plus low-poly Synty)
  const bloodColors = [
    [125, 10, 12],  // rouge frais
    [95, 18, 15],   // bordeaux
    [80, 28, 18],   // marron séché
  ];
  for (let i = 0; i < 8; i++) {
    const bc = bloodColors[Math.floor(Math.random() * bloodColors.length)];
    g.fillStyle = `rgba(${bc[0]},${bc[1]},${bc[2]},${0.7 + Math.random()*0.25})`;
    const x = Math.random()*32, y = Math.random()*32, rad = 2 + Math.random()*5;
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  // coulée centrale discrète
  g.fillStyle = `rgba(115,8,12,0.85)`;
  g.beginPath(); g.arc(16, 14, 3.5, 0, 7); g.fill();
  g.fillStyle = `rgba(100,12,18,0.7)`;
  g.fillRect(15, 16, 2, 5);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  return tex;
}

// Ancienne factory procédurale conservée pour fallback / référence si le GLB échoue
function makeZombieProcedural() {
  const g = new THREE.Group();

  // === PALETTE (dominante gris-vert mort, pas de bleu cyber) ===
  const skinChoice = Math.random();
  let skin;
  if (skinChoice < 0.55) {
    // gris-vert mort (dominant)
    skin = new THREE.Color(`rgb(${130+Math.floor(Math.random()*20)},${155+Math.floor(Math.random()*20)},${110+Math.floor(Math.random()*15)})`);
  } else if (skinChoice < 0.8) {
    // gris pourri
    skin = new THREE.Color(`rgb(${115+Math.floor(Math.random()*20)},${125+Math.floor(Math.random()*15)},${110+Math.floor(Math.random()*15)})`);
  } else {
    // jaunâtre malade
    skin = new THREE.Color(`rgb(${175+Math.floor(Math.random()*20)},${165+Math.floor(Math.random()*15)},${120+Math.floor(Math.random()*15)})`);
  }
  // jean denim
  const denim = [
    [55, 70, 110], [70, 85, 125], [45, 60, 95], [60, 75, 115],
  ][Math.floor(Math.random()*4)];
  const cloth = new THREE.Color(`rgb(${denim[0]},${denim[1]},${denim[2]})`);
  // chemise
  const sh = SHIRT_PALETTES[Math.floor(Math.random() * SHIRT_PALETTES.length)];
  const shirtColor = new THREE.Color(`rgb(${sh[0]},${sh[1]},${sh[2]})`);
  // cheveux : couleurs naturelles uniquement (pas de gris pour l'instant)
  const hairColor = [0x2a1c10, 0x3a2818, 0x5a3a1c, 0x7a5028, 0x8a6438][Math.floor(Math.random()*5)];

  // morpho léger (gros minoritaire)
  const isFat = Math.random() < 0.15;
  const morphoScale = isFat ? 1.15 : 1.0;

  const skinMat   = new THREE.MeshLambertMaterial({ color: skin,  flatShading: true });
  const torsoMat  = new THREE.MeshLambertMaterial({ map: bloodyTorsoTex(sh[0], sh[1], sh[2]), flatShading: true });
  const shirtMat  = new THREE.MeshLambertMaterial({ color: shirtColor, flatShading: true });
  const clothMat  = new THREE.MeshLambertMaterial({ color: cloth, flatShading: true });
  const shoeMat   = new THREE.MeshLambertMaterial({ color: 0x3a2010, flatShading: true });
  const hairMat   = new THREE.MeshLambertMaterial({ color: hairColor, flatShading: true });
  const beltMat   = new THREE.MeshLambertMaterial({ color: 0x3a1f0e, flatShading: true });
  const buckleMat = new THREE.MeshLambertMaterial({ color: 0xc8a04a, flatShading: true });
  const collarMat = new THREE.MeshLambertMaterial({ color: 0x141420, flatShading: true });
  const buttonMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0e, flatShading: true });
  // yeux SIMPLES jaune-orange (pas de glow additif criard)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff9c20 });
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x1a0008 });
  const bloodMat = new THREE.MeshBasicMaterial({ color: 0x7a0010 });

  // === HANCHE (jean) ===
  const hip = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.34), clothMat);
  hip.position.y = 0.7;
  g.add(hip);

  // === CEINTURE + BOUCLE ===
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.36), beltMat);
  belt.position.y = 0.82;
  g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.04), buckleMat);
  buckle.position.set(0, 0.82, 0.2);
  g.add(buckle);

  // === TORSE (chemise tachée de sang) ===
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 0.36), torsoMat);
  torso.position.y = 1.16;
  g.add(torso);

  // === ÉPAULES (chemise unie, plus larges que le torse pour signaler les épaules) ===
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 0.36), shirtMat);
  shoulders.position.y = 1.5;
  g.add(shoulders);

  // col en V (2 boxes inclinés au centre du col)
  const cV1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), collarMat);
  cV1.position.set(-0.06, 1.42, 0.19);
  cV1.rotation.z = 0.42;
  g.add(cV1);
  const cV2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), collarMat);
  cV2.position.set(0.06, 1.42, 0.19);
  cV2.rotation.z = -0.42;
  g.add(cV2);

  // 3 boutons noirs alignés sur le devant
  for (let b = 0; b < 3; b++) {
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), buttonMat);
    btn.position.set(0, 1.3 - b * 0.13, 0.183);
    g.add(btn);
  }

  // === COU (cylindre fin) ===
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.14, 8), skinMat);
  neck.position.y = 1.65;
  g.add(neck);

  // === TÊTE (sphère étirée verticalement pour forme humanoïde) ===
  const headGroup = new THREE.Group();

  const headBase = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), skinMat);
  headBase.scale.set(1.0, 1.15, 1.05);   // un peu plus haut que large, léger menton
  headGroup.add(headBase);

  // YEUX simples (boxes plats sur la face avant)
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.035, 0.02);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.08, 0.04, 0.21);
  headGroup.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.08, 0.04, 0.21);
  headGroup.add(eyeR);

  // BOUCHE ouverte (style Synty zombie : bouche noire + petites dents inférieures)
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.03), mouthMat);
  mouth.position.set(0, -0.08, 0.215);
  headGroup.add(mouth);
  // 4 dents inférieures
  const toothMat = new THREE.MeshLambertMaterial({ color: 0xeaddc0, flatShading: true });
  for (let t = 0; t < 4; t++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.02), toothMat);
    tooth.position.set(-0.048 + t * 0.032, -0.085, 0.225);
    headGroup.add(tooth);
  }
  // dégoulinement sang sous la bouche
  if (Math.random() < 0.7) {
    const drip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.02), bloodMat);
    drip.position.set(0.01, -0.17, 0.215);
    headGroup.add(drip);
  }

  // CHEVEUX (sphère couvrante au-dessus du crâne + frange)
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.235, 8, 5), hairMat);
  hairTop.position.set(0, 0.08, -0.01);
  hairTop.scale.set(1.0, 0.68, 1.08);   // aplatir verticalement, étirer en arrière
  headGroup.add(hairTop);
  // frange devant — mèche qui descend sur le front
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), hairMat);
  fringe.position.set(0, -0.01, 0.17);
  fringe.scale.set(1.0, 0.55, 0.4);
  headGroup.add(fringe);
  // mèches latérales (légères ondulations de chaque côté)
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), hairMat);
    side.position.set(sx * 0.18, 0.02, 0.05);
    side.scale.set(0.7, 0.6, 1.0);
    headGroup.add(side);
  }

  headGroup.position.y = 1.85;
  const headRestX = -0.05;
  headGroup.rotation.x = headRestX;
  g.add(headGroup);

  // === BRAS (cylindres tapered + main sphère étirée) ===
  // T-pose par défaut — l'animation walk en jeu modifiera rotation.x
  function makeArm(sign) {
    const grp = new THREE.Group();
    // manche courte (chemise) — cylindre épais
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.3, 6), shirtMat);
    upper.position.set(0, -0.15, 0);
    grp.add(upper);
    // avant-bras peau — cylindre fin tapered
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.36, 6), skinMat);
    fore.position.set(0, -0.48, 0);
    grp.add(fore);
    // main : sphère étirée comme une moufle
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), skinMat);
    hand.position.set(0, -0.7, 0.02);
    hand.scale.set(0.95, 0.95, 1.45);   // allongée vers l'avant
    grp.add(hand);
    // sang sur la main (subtle, plus discret)
    if (Math.random() < 0.5) {
      const blood = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), bloodMat);
      blood.position.set(0, -0.72, 0.08);
      blood.scale.set(1, 0.4, 1.1);
      grp.add(blood);
    }
    grp.position.set(sign * 0.43, 1.5, 0);
    grp.rotation.x = 0;   // T-pose
    return grp;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);
  g.add(armL);
  g.add(armR);

  // === JAMBES (cylindres + chaussures plates) ===
  function makeLeg(sign) {
    const grp = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 0.42, 6), clothMat);
    thigh.position.set(0, -0.21, 0);
    grp.add(thigh);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.092, 0.4, 6), clothMat);
    shin.position.set(0, -0.62, 0);
    grp.add(shin);
    // chaussure box plate basse marron
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.32), shoeMat);
    shoe.position.set(0, -0.87, 0.05);
    grp.add(shoe);
    grp.position.set(sign * 0.12, 0.6, 0);
    return grp;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  g.add(legL);
  g.add(legR);

  // === userData ===
  g.traverse(m => {
    if (m.isMesh) { m.userData.zombie = null; m.userData.part = 'body'; }
  });
  headGroup.traverse(m => {
    if (m.isMesh) m.userData.part = 'head';
  });

  g.scale.setScalar(morphoScale);

  g.userData = {
    hp: 100 * (isFat ? 1.3 : 1),
    speed: 1.6 * (isFat ? 0.8 : 1),
    attackCd: 0,
    phase: Math.random() * 6.28,
    twitchCd: 99,                    // pas de twitch (pour la galerie clean view)
    twitchAmount: 0,
    legL, legR, armL, armR, head: headGroup, torso,
    headRestX, headRestY: 0, headRestZ: 0,
    torsoMat, skinMat, clothMat,
    alive: true, flash: 0,
    deathTime: 0, deathDur: 0, deathAxis: 'x',
  };
  return g;
}

function setZombieRef(z) {
  z.traverse(m => { if (m.isMesh) m.userData.zombie = z; });
}

function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx*dx + dz*dz;
}

export function spawnZombie(waveNum) {
  const z = makeZombie();
  if (!z) return false;   // GLB pas encore chargé, réessaiera au prochain tick
  const spawns = getZombieSpawns();
  if (!spawns || spawns.length === 0) return false;
  const zone = getCurrentZone();
  if (!zone) return false;
  // pick spawn loin du joueur (en world coords, donc + offset zone)
  let chosen = spawns[Math.floor(Math.random() * spawns.length)];
  let best = -1;
  for (let attempt = 0; attempt < 4; attempt++) {
    const cand = spawns[Math.floor(Math.random() * spawns.length)];
    const wx = cand.x + zone.baseX, wz = cand.z + zone.baseZ;
    const d = dist2(wx, wz, camera.position.x, camera.position.z);
    if (d > best) { best = d; chosen = cand; }
  }
  // jitter
  const jx = (Math.random() - 0.5) * 1.4;
  const jz = (Math.random() - 0.5) * 1.4;
  // POSITION EN WORLD COORDS — le zombie va direct au scene, pas au group de zone
  // baseY + bottomOffset ancre le bas du modèle au sol de la zone
  z.position.set(
    chosen.x + jx + zone.baseX,
    zone.baseY + zombieBottomOffset,
    chosen.z + jz + zone.baseZ,
  );
  z.userData.hp = 100 + waveNum * 16;
  z.userData.baseY = zone.baseY;     // pour l'anim cadavre

  // === ARCHÉTYPES DE COMPORTEMENT IA ===
  // 60% walker, 25% runner, 15% stalker — distribution évolutive avec la wave
  const roll = Math.random();
  let archetype;
  if (roll < 0.60) archetype = 'walker';
  else if (roll < 0.85) archetype = 'runner';
  else archetype = 'stalker';
  z.userData.archetype = archetype;

  const baseSpeed = Math.min(1.5 + waveNum * 0.09, 3.4);
  if (archetype === 'walker') {
    // Standard : marche régulière, hésite parfois
    z.userData.speed = baseSpeed * (0.85 + Math.random() * 0.3);
    z.userData.hesitateChance = 0.015; // ~1.5% par sec de s'arrêter pour grogner
  } else if (archetype === 'runner') {
    // Rapide, charge directement, peu d'hésitation
    z.userData.speed = baseSpeed * (1.15 + Math.random() * 0.2);
    z.userData.hesitateChance = 0.005;
    z.userData.sprintChance = 0.08;    // ~8% par sec de sprinter +50%
  } else {
    // Stalker : lent, mais évite peu les autres (charge en ligne droite)
    z.userData.speed = baseSpeed * (0.65 + Math.random() * 0.15);
    z.userData.hesitateChance = 0.025;
    z.userData.separationFactor = 0.2; // moins de séparation = plus collant
  }
  // Stats par défaut si pas définies par archétype
  if (z.userData.separationFactor === undefined) z.userData.separationFactor = 0.5;
  if (z.userData.sprintChance === undefined) z.userData.sprintChance = 0;

  // État runtime IA
  z.userData.baseSpeed = z.userData.speed;
  z.userData.hesitating = 0;     // > 0 = compteur secondes restantes d'arrêt
  z.userData.sprinting = 0;      // > 0 = compteur secondes restantes de sprint
  z.userData.stuckTimer = 0;     // détection blocage obstacle
  z.userData.lastPos = z.position.clone();

  // Initialise le timeScale de walk dès le spawn (sinon premier tick → 1
  // frame de glissade avant que updateZombies le règle)
  if (z.userData.actions?.walk) {
    const raw = z.userData.speed / WALK_REF_SPEED;
    z.userData.actions.walk.timeScale = Math.max(WALK_TIMESCALE_MIN, Math.min(WALK_TIMESCALE_MAX, raw));
  }

  setZombieRef(z);
  scene.add(z);                       // direct sur scene, en world
  zombies.push(z);
  return true;
}

export function damageZombie(z, baseDmg, point) {
  // Headshot détecté par hauteur du point d'impact
  const head = (point.y - z.position.y) >= zombieHeadY * 0.85;
  const dmg = baseDmg * (head ? 2.4 : 1);
  z.userData.hp -= dmg;
  z.userData.flash = 0.08;
  burst(point, 0x8a0000, head ? 10 : 6, 4);
  sfx.hit();
  // récompense + popup pour chaque coup qui touche (avant le kill)
  if (z.userData.hp > 0) {
    player.money += REWARD_HIT;
    popupScore(REWARD_HIT, 'hit');
    updateHUD();
  }
  if (z.userData.hp <= 0) killZombie(z, head);

  // === ALERTE DE GROUPE : les zombies vivants dans 8m de rayon paniquent
  //     et accélèrent +30% pendant 4s (chaîne d'aggro réaliste horde)
  const ax = z.position.x, az = z.position.z;
  for (const other of zombies) {
    if (other === z || !other.userData.alive) continue;
    const ox = other.position.x - ax;
    const oz = other.position.z - az;
    if (ox*ox + oz*oz < 64) { // 8m * 8m = 64
      const ou = other.userData;
      // Sprint d'urgence — override si déjà sprintant pour reset timer
      ou.sprinting = Math.max(ou.sprinting || 0, 4.0);
      ou.speed = ou.baseSpeed * 1.3;
      // Annule l'hésitation s'ils étaient en pause
      ou.hesitating = 0;
    }
  }
}

function killZombie(z, head) {
  z.userData.alive = false;
  z.userData.deathTime = 0;
  z.userData.deathDur = 12 + Math.random() * 4;
  z.userData.currentAnim = 'dead';
  // arrête walk/attack et joue l'anim Dead (clampée sur la dernière frame)
  const acts = z.userData.actions;
  if (acts) {
    if (acts.walk)    acts.walk.fadeOut(0.2);
    // Stop toutes les attaques (array complet) — couvre attackL/attackR + variantes
    if (acts.attacks?.length) {
      for (const a of acts.attacks) a.stop();
    } else {
      if (acts.attackL) acts.attackL.stop();
      if (acts.attackR) acts.attackR.stop();
    }
    if (acts.dead) {
      acts.dead.reset();
      acts.dead.setLoop(THREE.LoopOnce);
      acts.dead.clampWhenFinished = true;
      acts.dead.fadeIn(0.2).play();
    }
  }
  const reward = head ? (REWARD_BODY + REWARD_HEAD_BONUS) : REWARD_BODY;
  player.money += reward;
  player.kills++;
  wave.alive--;
  popupScore(reward, head ? 'head' : 'body');
  burst(z.position.clone().setY(1), 0x8a0000, 14, 5);
  bloodPool(z.position);
  sfx.zdeath();
  updateHUD();
}

export function getAliveZombies() {
  return zombies.filter(z => z.userData.alive);
}

// =============================================================================
//  UPDATE (mouvement + attaque + cadavres qui tombent et fondent)
// =============================================================================
export function updateZombies(dt) {
  const px = camera.position.x, pz = camera.position.z;
  let gameover = false;

  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const u = z.userData;

    // --- foot-sliding fix : cadence de l'anim walk = vitesse réelle du zombie
    //     clampée pour éviter cadence robotique. Pendant attack/dead : 1.0.
    if (u.actions.walk) {
      if (u.alive && u.currentAnim === 'walk') {
        const raw = u.speed / WALK_REF_SPEED;
        u.actions.walk.timeScale = Math.max(WALK_TIMESCALE_MIN, Math.min(WALK_TIMESCALE_MAX, raw));
      } else {
        u.actions.walk.timeScale = 1.0;
      }
    }

    // --- mixer en continu (joue l'animation courante, walk / attack / dead) ---
    if (u.mixer) u.mixer.update(dt);

    // --- cadavre : laisse l'anim Dead jouer, fade en fin ---
    if (!u.alive) {
      u.deathTime += dt;
      // pas de rotation manuelle, le clip Dead s'occupe de la chute
      if (u.deathTime > u.deathDur - 1.5) {
        const a = Math.max(0, 1 - (u.deathTime - (u.deathDur - 1.5)) / 1.5);
        z.traverse(c => {
          if (c.material) {
            c.material.transparent = true;
            c.material.opacity = a;
          }
        });
      }
      if (u.deathTime > u.deathDur) {
        z.removeFromParent();
        zombies.splice(i, 1);
      }
      continue;
    }

    // --- attaque en cours : freeze le déplacement, attend la fin du clip ---
    if (u.currentAnim === 'attack') {
      u.attackTimer -= dt;
      if (u.attackTimer <= 0) {
        // retour à la marche
        if (u.actions.walk) {
          u.actions.walk.reset().fadeIn(0.15).play();
        }
        u.currentAnim = 'walk';
      }
      continue;   // pas de mouvement pendant l'attaque
    }

    // --- IA : gestion des états comportementaux ---
    // Hésitation : zombie s'arrête X secondes pour grogner (random trigger)
    if (u.hesitating > 0) {
      u.hesitating -= dt;
      // toujours faire face au joueur même en hésitant
      let dx0 = px - z.position.x, dz0 = pz - z.position.z;
      z.rotation.y = Math.atan2(dx0, dz0);
      continue;
    }
    // BUG fix : `* dt * 60` rendait la chance ~60× trop élevée (≈90 %/sec
    // au lieu de 1.5 %/sec) → zombies en hésitation perpétuelle, surplace.
    // dt est en secondes, hesitateChance est déjà "par seconde", donc on
    // multiplie juste par dt pour obtenir la chance par frame.
    if (u.hesitateChance > 0 && Math.random() < u.hesitateChance * dt) {
      u.hesitating = 0.8 + Math.random() * 1.2; // pause 0.8-2s
      continue;
    }
    // Sprint occasionnel (runner uniquement) — même correction.
    if (u.sprinting > 0) {
      u.sprinting -= dt;
      if (u.sprinting <= 0) u.speed = u.baseSpeed;
    } else if (u.sprintChance > 0 && Math.random() < u.sprintChance * dt) {
      u.sprinting = 1.2 + Math.random() * 1.5;
      u.speed = u.baseSpeed * 1.5;
    }

    // --- mouvement (marche) ---
    let dx = px - z.position.x, dz_ = pz - z.position.z;
    const d = Math.hypot(dx, dz_) || 1;
    dx /= d; dz_ /= d;

    // séparation des vivants seulement (factor varie par archétype)
    let sx = 0, sz = 0;
    for (const o of zombies) {
      if (o === z || !o.userData.alive) continue;
      const ox = z.position.x - o.position.x;
      const oz = z.position.z - o.position.z;
      const od = ox*ox + oz*oz;
      if (od > 0.001 && od < 1.6) {
        const f = 1 / od;
        sx += ox * f; sz += oz * f;
      }
    }
    const sl = Math.hypot(sx, sz) || 1;
    sx /= sl; sz /= sl;
    const sepFactor = u.separationFactor || 0.5;
    const mvx = dx + sx * sepFactor, mvz = dz_ + sz * sepFactor;
    const ml = Math.hypot(mvx, mvz) || 1;
    const prevX = z.position.x, prevZ = z.position.z;
    z.position.x += (mvx / ml) * u.speed * dt;
    z.position.z += (mvz / ml) * u.speed * dt;
    resolveCollision(z.position, 0.4);
    z.rotation.y = Math.atan2(dx, dz_);

    // --- Détection blocage : si très peu de mouvement effectif, le zombie
    //     essaie de contourner en strafing perpendiculaire à la direction joueur
    const moveSq = (z.position.x - prevX) ** 2 + (z.position.z - prevZ) ** 2;
    if (moveSq < (u.speed * dt * 0.3) ** 2) {
      u.stuckTimer += dt;
      if (u.stuckTimer > 0.4) {
        // tente un contournement : pousse perpendiculaire (alternance gauche/droite)
        const side = (z.id % 2 === 0) ? 1 : -1;
        const perpX = -dz_ * side, perpZ = dx * side;
        z.position.x += perpX * u.speed * dt * 0.7;
        z.position.z += perpZ * u.speed * dt * 0.7;
        resolveCollision(z.position, 0.4);
        u.stuckTimer = 0;
      }
    } else {
      u.stuckTimer = 0;
    }

    // --- flash hit ---
    if (u.flash > 0) {
      u.flash -= dt;
      const on = u.flash > 0;
      for (const m of u.flashMats) {
        if (!m.emissive) continue;
        if (on && !u.flashOriginalEmissive.has(m)) {
          u.flashOriginalEmissive.set(m, m.emissive.getHex());
          m.emissive.setHex(0x551010);
        } else if (!on && u.flashOriginalEmissive.has(m)) {
          m.emissive.setHex(u.flashOriginalEmissive.get(m));
          u.flashOriginalEmissive.delete(m);
        }
      }
    }

    // --- attaque ---
    u.attackCd = Math.max(0, u.attackCd - dt);
    if (d < 1.4 && u.attackCd <= 0) {
      u.attackCd = 1.5;   // cooldown global entre 2 attaques
      damagePlayer(9 + wave.num * 0.6);
      dmgFlash();
      sfx.hurt();
      applyCameraShake(0.55);
      updateHUD();
      if (player.hp <= 0) { gameover = true; }

      // joue l'anim d'attaque (alternance bras gauche / bras droit)
      // Pioche aléatoirement parmi TOUTES les attaques disponibles
      const attackPool = u.actions.attacks?.length ? u.actions.attacks : [u.actions.attackL, u.actions.attackR].filter(Boolean);
      const atk = attackPool[Math.floor(Math.random() * attackPool.length)] || u.actions.attackL;
      if (atk) {
        if (u.actions.walk) u.actions.walk.fadeOut(0.15);
        atk.reset();
        atk.setLoop(THREE.LoopOnce);
        atk.clampWhenFinished = false;
        atk.fadeIn(0.15).play();
        u.currentAnim = 'attack';
        u.attackTimer = atk.getClip().duration;
      }
    }
  }
  return gameover;
}

// =============================================================================
//  VAGUES
// =============================================================================
export function startWave(n) {
  wave.num = n;
  wave.toSpawn = 4 + n * 3;
  wave.spawned = 0;
  wave.alive = 0;
  wave.spawnTimer = 0;
  wave.respawnFast = 0;
  wave.active = true;
  showRoundStart(n);
  sfx.wave();
  // Blackout désactivé en MVP mono-map (stub no-op dans world.js)
  // if (n >= 3 && n % 3 === 0) { startBlackout(); sfx.blackout(); }
  updateHUD();
}

export function updateWaves(dt) {
  if (wave.active) {
    if (wave.spawned < wave.toSpawn) {
      wave.spawnTimer -= dt;
      const maxAlive = Math.min(wave.toSpawn, 22);
      const aliveCount = zombies.reduce((n, z) => n + (z.userData.alive ? 1 : 0), 0);
      if (wave.spawnTimer <= 0 && aliveCount < maxAlive) {
        if (spawnZombie(wave.num)) {
          wave.spawned++;
          wave.alive++;
          if (wave.respawnFast > 0) {
            wave.respawnFast--;
            wave.spawnTimer = 0.18;
          } else {
            wave.spawnTimer = Math.max(0.25, 1.0 - wave.num * 0.03);
          }
        } else {
          // GLB pas encore prêt → on retentera dans 100ms
          wave.spawnTimer = 0.1;
        }
      }
    } else if (wave.alive <= 0) {
      wave.active = false;
      wave.intermission = 4;
      const bonus = 100 + wave.num * 20;
      player.money += bonus;
      toast(`WAVE ${wave.num} CLEARED  +$${bonus}`);
      updateHUD();
    }
  } else if (game.state === State.PLAY) {
    wave.intermission -= dt;
    if (wave.intermission <= 0) startWave(wave.num + 1);
  }
}

export function clearZombies() {
  for (const z of zombies) z.removeFromParent();
  zombies.length = 0;
}

// Préparation à un changement de zone : retire les zombies mais conserve le
// nombre restant à tuer pour que la nouvelle zone les respawn — progressivement.
export function prepareZoneTransition() {
  const remaining = Math.max(0, (wave.toSpawn - wave.spawned) + wave.alive);
  clearZombies();
  wave.alive = 0;
  wave.spawned = Math.max(0, wave.toSpawn - remaining);
  wave.spawnTimer = 0.8;        // délai initial pour que le joueur s'installe
  wave.respawnFast = remaining; // tous ces zombies vont respawn en rafale (~0.18s)
}
