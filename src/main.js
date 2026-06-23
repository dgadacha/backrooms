import * as THREE from 'three';
import { renderer, scene, camera, maybeResize, composer, cartoonPass } from './renderer.js';
import {
  initGraphics, applyPreset, setShowFps, setFpsCap, setStartingWave, getStartingWave,
  getSettings, PRESETS, PS2_MODE, liveSettings,
} from './graphics-settings.js';
import { moon, interactableSpots, groundDecals, glowSprites, fogDefaults, lampPositions } from './world.js';
import { State, game, player, wave, resetState } from './state.js';
import { PERK_REGEN_DELAY, PERK_REGEN_RATE, EYE } from './config.js';
import { initAudio, sfx, setupSpatialLamps } from './audio.js';
import {
  updateHUD, showHud, showScreen, hideScreens,
  updateLowHpVignette, updatePrompt, banner,
} from './hud.js';
import {
  updateWorld, buyStations, endBlackout,
  switchToZone, getZone, setActionHandlers,
  importMapJson, MAP_ACTIVE_KEY, MAP_LIST_KEY, ACTIVE_MAP, getLightLevelAt,
  getExitPos, regenerateLevel,
} from './world.js';
// Fork BACKROOMS : coupe tout le gameplay horde (vagues, zombies, achats, perks)
// quand la map active est le Niveau 0. Repasser ACTIVE_MAP (world.js) sur
// 'bus_depot'/'terminus' réactive le jeu de zombies d'origine.
const IS_BACKROOMS = ACTIVE_MAP === 'backrooms';
// Aide dev : ?bright éclaire le menu (sinon étalonnage sombre) pour juger la scène 3D.
const MENU_BRIGHT = (() => { try { return new URLSearchParams(location.search).has('bright'); } catch (e) { return false; } })();
import { controls, initInput, updatePlayer, updateShake } from './player.js';
import { initPlayerBody, updatePlayerBody } from './player-body.js';
import {
  shoot, startReload, switchWeapon, giveWeapon, refillAmmo,
  applyMedkit, applyArmor, unlockRegen, unlockNightVision, unlockLight,
  unlockBrute, unlockIron, unlockQuick, unlockTank,
  updateWeapons, resetWeapons,
} from './weapons.js';
import {
  startWave, updateZombies, updateWaves, clearZombies, prepareZoneTransition,
  whenZombieReady, makeZombie,
} from './enemies.js';
import { updateEffects, clearEffects } from './effects.js';
import { setCamcorderVisible, setCamBattery, hideCamcorder } from './camcorder.js';
import {
  getModelList, showModel, setView, toggleAutoRotate,
  updateGallery, getGalleryScene, getGalleryCamera,
  setScaleMultiplier, getCurrentBaseScale,
  playCurrentAnimation, setAnimListListener, setModelListListener,
} from './gallery.js';

// =============================================================================
//  HANDLERS WORLD (achats des bornes)
//  MVP mono-zone : plus de transition de zone, on garde juste les actions d'achat.
// =============================================================================
setActionHandlers({
  giveWeapon,
  refillAmmo,
  medkit:      applyMedkit,
  armor:       applyArmor,
  regen:       unlockRegen,
  nightVision: unlockNightVision,
  lightUp:     unlockLight,
  brute:       unlockBrute,
  iron:        unlockIron,
  quick:       unlockQuick,
  tank:        unlockTank,
});

// Spawn initial : centre du Depot (ou position définie par l'éditeur)
{
  const zone = getZone('bus_depot');
  camera.position.set(
    zone.playerSpawn.x + zone.baseX,
    zone.playerSpawn.y + zone.baseY,
    zone.playerSpawn.z + zone.baseZ,
  );
  // Si le JSON éditeur a défini un yaw, oriente la caméra dans cette direction.
  // Le ry stocké est l'angle Y du wrapper editor (rotation autour de l'axe vertical) ;
  // on l'applique tel quel à camera.rotation.y. Pitch reste à 0.
  if (typeof zone.playerSpawnYaw === 'number' && zone.playerSpawnYaw !== 0) {
    camera.rotation.set(0, zone.playerSpawnYaw, 0, 'YXZ');
  }
}

// FIRST-PERSON BODY (Backrooms) : corps visible du joueur (bras/torse/jambes)
// quand on baisse les yeux ou qu'on court. Charge player.glb (fallback placeholder).
if (IS_BACKROOMS) initPlayerBody();

// =============================================================================
//  PROMPT DE BORNES
// =============================================================================
let nearStation = null;
function refreshNearStation() {
  nearStation = null;
  let best = 4.0;
  for (const s of buyStations) {
    if (s.zone !== game.currentZone) continue;
    const d = camera.position.distanceTo(s.pos);
    if (d < best) { best = d; nearStation = s; }
  }
}
function tryBuy() {
  if (!nearStation) return;
  if (player.money < nearStation.cost) { sfx.nope(); return; }
  player.money -= nearStation.cost;
  nearStation.action();
  sfx.buy();
  updateHUD();
}

// =============================================================================
//  INPUT
// =============================================================================
initInput({
  reload:   startReload,
  switchTo: switchWeapon,
  tryBuy,
  shoot,
});

// =============================================================================
//  GRAPHICS SETTINGS — init + UI
// =============================================================================
initGraphics({
  renderer, scene, moon, interactableSpots, cartoonPass, fogDefaults,
  glowSprites, decals: groundDecals,
});

const elSettings = document.getElementById('settings');
const elOpenSettings = document.getElementById('open-settings');
const elCloseSettings = document.getElementById('settings-close');
const elPresetCards = document.querySelectorAll('.preset-card');
const elToggleFps = document.getElementById('toggle-fps');
// Sélecteurs précis : on filtre par data-attr car d'autres boutons partagent
// la classe `fps-cap-btn` pour le style (import map, reset map…)
const elFpsCapBtns = document.querySelectorAll('.fps-cap-btn[data-fps]');
const elStartWaveBtns = document.querySelectorAll('.start-wave-btn');

function refreshPresetUI() {
  const s = getSettings();
  elPresetCards.forEach(card => {
    card.classList.toggle('active', card.dataset.preset === s.preset);
  });
  if (elToggleFps) elToggleFps.checked = !!s.showFps;
  // Sync le bouton cap FPS actif
  const cap = Number(s.fpsCap) || 0;
  elFpsCapBtns.forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.fps) === cap);
  });
  // Sync la vague de départ active
  const sw = Number(s.startingWave) || 1;
  elStartWaveBtns.forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.wave) === sw);
  });
}
refreshPresetUI();

elOpenSettings?.addEventListener('click', (e) => {
  e.stopPropagation();
  hideScreens();
  elSettings.classList.remove('hidden');
  refreshPresetUI();
});

elCloseSettings?.addEventListener('click', (e) => {
  e.stopPropagation();
  hideScreens();
  showScreen('menu');
});
elPresetCards.forEach(card => {
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    applyPreset(card.dataset.preset);
    refreshPresetUI();
  });
});
elToggleFps?.addEventListener('change', () => {
  setShowFps(elToggleFps.checked);
});
// Cap FPS — runtime (pas de reload). 30 / 60 / 0 (illimité)
elFpsCapBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setFpsCap(Number(btn.dataset.fps) || 0);
    refreshPresetUI();
  });
});
// Vague de départ — appliquée au prochain démarrage (startRun / resetRun)
elStartWaveBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setStartingWave(Number(btn.dataset.wave) || 1);
    refreshPresetUI();
  });
});

// =============================================================================
//  IMPORT CARTE (depuis l'éditeur — JSON exporté)
// =============================================================================
const elBtnImportMap   = document.getElementById('btn-import-map');
const elBtnResetMap    = document.getElementById('btn-reset-map');
const elFileImportMap  = document.getElementById('file-import-map');
const elActiveMapName  = document.getElementById('active-map-name');

function refreshActiveMapName() {
  if (!elActiveMapName) return;
  const activeId = localStorage.getItem(MAP_ACTIVE_KEY);
  if (!activeId) {
    elActiveMapName.textContent = 'par défaut';
    return;
  }
  try {
    const list = JSON.parse(localStorage.getItem(MAP_LIST_KEY) || '[]');
    const entry = list.find(m => m.id === activeId);
    elActiveMapName.textContent = entry?.name || activeId;
  } catch {
    elActiveMapName.textContent = activeId;
  }
}
refreshActiveMapName();

elBtnImportMap?.addEventListener('click', (e) => {
  e.stopPropagation();
  elFileImportMap?.click();
});

elFileImportMap?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      const { name } = importMapJson(data, file.name.replace(/\.json$/i, ''));
      refreshActiveMapName();
      if (confirm(`Carte importée : "${name}". Recharger maintenant pour l'appliquer ?`)) {
        location.reload();
      }
    } catch (err) {
      alert(`Erreur d'import : ${err.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // permet de réimporter le même fichier
});

elBtnResetMap?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!confirm('Revenir à la carte par défaut au prochain démarrage ?')) return;
  localStorage.removeItem(MAP_ACTIVE_KEY);
  refreshActiveMapName();
  if (confirm('Recharger maintenant ?')) location.reload();
});

// =============================================================================
//  POINTER LOCK
// =============================================================================
controls.addEventListener('lock', () => {
  initAudio();
  // Setup spatialized lamp buzz une seule fois (idempotent en interne)
  setupSpatialLamps(scene, camera, lampPositions, 4.7);
  if      (game.state === State.MENU)  startRun();
  else if (game.state === State.PAUSE) game.state = State.PLAY;
  showHud(); hideScreens();
  // caméscope baissé par défaut (vue à l'œil nu) — il se lève à la touche C
});
controls.addEventListener('unlock', () => {
  if (game.state === State.PLAY) {
    game.state = State.PAUSE;
    showScreen('pause');
    game.cameraUp = false;
    hideCamcorder();
  }
});

['menu', 'pause', 'gameover'].forEach(id => {
  document.getElementById(id).addEventListener('click', (e) => {
    // ignore les clicks sur les boutons internes (galerie etc.)
    if (e.target.closest('button')) return;
    if (id === 'gameover') resetRun();
    controls.lock();
  });
});

// CTA explicites — boutons "Jouer / Reprendre / Rejouer" du nouvel UI moderne.
// Le forEach ci-dessus ignore les clicks sur boutons, donc on câble ces CTA
// directement pour qu'ils déclenchent le pointer lock (= start/resume).
document.getElementById('cta-play')?.addEventListener('click', () => controls.lock());
document.getElementById('cta-resume')?.addEventListener('click', () => controls.lock());
document.getElementById('cta-retry')?.addEventListener('click', () => {
  resetRun();
  controls.lock();
});
// Interaction E : franchir la porte de descente (niveau suivant).
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && game.state === State.PLAY && nearExit) descend();
});

// =============================================================================
//  GALERIE 3D — ouverture / fermeture / navigation
// =============================================================================
function populateGalleryList() {
  const list = document.getElementById('gallery-list');
  // préserve la sélection active si l'item existe encore dans la nouvelle liste
  const currentActiveId = list.querySelector('.gallery-item.active')?.dataset.modelId;
  list.innerHTML = '';
  let activeRestored = false;
  for (const m of getModelList()) {
    const item = document.createElement('button');
    item.className = 'gallery-item';
    item.textContent = m.label;
    item.dataset.modelId = m.id;
    item.addEventListener('click', () => {
      document.querySelectorAll('.gallery-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      showModel(m.id);
    });
    if (m.id === currentActiveId) {
      item.classList.add('active');
      activeRestored = true;
    }
    list.appendChild(item);
  }
  if (!activeRestored) list.firstChild?.classList.add('active');
}

// Quand la galerie détecte un GLB qui apparaît (probe HEAD réussi), on
// reconstruit la sidebar si elle est ouverte.
setModelListListener(() => {
  if (game.state === State.GALLERY) populateGalleryList();
});

function openGallery() {
  game.state = State.GALLERY;
  hideScreens();
  showScreen('gallery');
  populateGalleryList();
  const first = getModelList()[0];
  if (first) showModel(first.id);
}
function closeGallery() {
  game.state = State.MENU;
  hideScreens();
  showScreen('menu');
}

document.getElementById('open-gallery').addEventListener('click', (e) => {
  e.stopPropagation();
  openGallery();
});
document.getElementById('gallery-close').addEventListener('click', closeGallery);
document.querySelectorAll('#gallery [data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    setView(btn.dataset.view);
    // pill toggle group : la vue active prend le fill rouge
    document.querySelectorAll('#gallery [data-view]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
document.getElementById('gallery-autorotate').addEventListener('click', () => {
  const on = toggleAutoRotate();
  document.getElementById('gallery-autorotate').textContent = on ? '↻ AUTO' : '⏸ MANUEL';
});

// sélecteur d'animation (galerie) — JOUE PAR INDEX ARRAY (pas par nom).
// Meshy nomme parfois mal les clips, donc on s'assure que la sélection
// joue exactement le clip à cet index dans gltf.animations.
const animSelect = document.getElementById('gallery-anim');
if (animSelect) {
  animSelect.addEventListener('change', () => {
    const val = animSelect.value;
    if (val === '' || val === '—') return;
    const idx = parseInt(val, 10);
    if (!isNaN(idx)) playCurrentAnimation(idx);
  });
}
setAnimListListener((animNames) => {
  if (!animSelect) return;
  animSelect.innerHTML = '';
  if (animNames.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '—';
    animSelect.appendChild(opt);
    animSelect.disabled = true;
    return;
  }
  animSelect.disabled = false;
  // value = index array (chaîne), textContent = "N — name"
  // L'index dans value est la source de vérité pour le playback ; le name
  // est juste informatif (peut ne pas correspondre au contenu réel chez Meshy).
  for (let i = 0; i < animNames.length; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i} — ${animNames[i]}`;
    animSelect.appendChild(opt);
  }
});

// slider de calibration de taille
const scaleSlider = document.getElementById('gallery-scale');
const scaleValueEl = document.getElementById('gallery-scale-value');
if (scaleSlider && scaleValueEl) {
  scaleSlider.addEventListener('input', () => {
    const mult = parseFloat(scaleSlider.value);
    const abs = setScaleMultiplier(mult);
    const base = getCurrentBaseScale();
    if (abs !== undefined) {
      scaleValueEl.textContent = `${mult.toFixed(3)}× (abs ${abs.toFixed(4)})`;
    } else {
      scaleValueEl.textContent = `${mult.toFixed(3)}× (base ${base.toFixed(4)})`;
    }
  });
}

function startRun() {
  game.state = State.PLAY;
  // La caméra du menu a dérivé (updateMenuCam) → on la replace au spawn et on
  // restaure la luminosité de jeu (le menu tournait en étalonnage sombre).
  const zone = getZone('bus_depot');
  camera.position.set(
    zone.playerSpawn.x + zone.baseX,
    zone.playerSpawn.y + zone.baseY,
    zone.playerSpawn.z + zone.baseZ,
  );
  camera.rotation.set(0, zone.playerSpawnYaw || 0, 0, 'YXZ');
  if (cartoonPass) cartoonPass.uniforms.uExposure.value = 1.0;
  if (!IS_BACKROOMS) startWave(getStartingWave());
}
function resetRun() {
  clearZombies();
  clearEffects();
  resetState();
  resetWeapons();
  endBlackout();
  const zone = getZone('bus_depot');
  camera.position.set(
    zone.playerSpawn.x + zone.baseX,
    zone.playerSpawn.y + zone.baseY,
    zone.playerSpawn.z + zone.baseZ,
  );
  if (typeof zone.playerSpawnYaw === 'number' && zone.playerSpawnYaw !== 0) {
    camera.rotation.set(0, zone.playerSpawnYaw, 0, 'YXZ');
  }
  game.state = State.PLAY;
  if (!IS_BACKROOMS) startWave(getStartingWave());
  updateHUD();
}
function gameOver() {
  game.state = State.OVER;
  document.getElementById('go-stats').innerHTML = IS_BACKROOMS
    ? `NIVEAU ATTEINT <span class="big-num">${game.level}</span>`
    : `WAVE REACHED <span class="big-num">${wave.num}</span><br/>` +
      `ZOMBIES KILLED <span class="big-num">${player.kills}</span><br/>` +
      `MONEY <span class="big-num">$${player.money}</span>`;
  controls.unlock();
  showScreen('gameover');
}

// =============================================================================
//  SANTÉ MENTALE (Backrooms) — baisse en continu, plus vite dans le noir.
//  Feedback immersif : vignette qui se referme + grain qui monte. 0 = game over.
// =============================================================================
function updateSanity(dt) {
  const light = getLightLevelAt(camera.position);     // 0 sombre → 1 éclairé
  const darkness = Math.max(0, 1 - light);
  player.sanity = Math.max(0, player.sanity - (0.4 + darkness * 3.0) * dt);
  const fear = 1 - player.sanity / 100;
  const pulse = player.sanity < 35 ? (0.5 + 0.5 * Math.sin(performance.now() * 0.006)) * 0.12 : 0;
  cartoonPass.uniforms.uVignetteStrength.value = 0.58 + fear * 0.36 + pulse;
  cartoonPass.uniforms.uGrainIntensity.value   = 0.085 + fear * 0.10;
  if (player.sanity <= 0) gameOver();
}

// =============================================================================
//  DESCENTE — franchir la porte → niveau suivant (régénéré, plus dur). Permadeath.
// =============================================================================
let nearExit = false;
function descend() {
  game.level++;
  player.sanity = 100;       // soulagement mental à chaque descente
  game.camBattery = 100;     // recharge (provisoire, jusqu'aux piles)
  regenerateLevel(game.level);
  const z = getZone();
  camera.position.set(z.playerSpawn.x + z.baseX, z.playerSpawn.y + z.baseY, z.playerSpawn.z + z.baseZ);
  banner(`NIVEAU ${game.level}`);
}

// =============================================================================
//  HORREUR + PERK REGEN
// =============================================================================
let heartCd = 0;
let gruntCd = 8;
function updateAmbient(dt) {
  if (game.state !== State.PLAY) return;
  if (player.hp < 60) {
    heartCd -= dt;
    if (heartCd <= 0) {
      sfx.heart();
      const hpRatio = Math.max(0.05, player.hp / 100);
      heartCd = 0.4 + hpRatio * 0.7;
    }
  } else { heartCd = 0; }
  gruntCd -= dt;
  if (gruntCd <= 0) {
    sfx.distantGrunt();
    gruntCd = 5 + Math.random() * 9;
  }
}

function updateRegen(dt) {
  if (!player.perks.regen) return;
  if (player.hp >= 100) return;
  const now = performance.now() / 1000;
  if (now - player.lastDamageTime < PERK_REGEN_DELAY) return;
  player.hp = Math.min(100, player.hp + PERK_REGEN_RATE * dt);
}

// =============================================================================
//  BOUCLE PRINCIPALE
// =============================================================================
// === FPS counter ===
const elFps = document.getElementById('fps-counter');
let fpsFrames = 0;
let fpsTimer = 0;
function updateFps(dt) {
  fpsFrames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    const fps = Math.round(fpsFrames / fpsTimer);
    fpsFrames = 0;
    fpsTimer = 0;
    if (elFps) {
      elFps.textContent = `${fps} FPS`;
      elFps.classList.toggle('warn', fps < 50 && fps >= 30);
      elFps.classList.toggle('bad',  fps < 30);
    }
  }
}

// =============================================================================
//  PRE-WARM SHADERS — au load du GLB zombie, spawn un dummy hors champ pour
//  forcer la compile du shader skinning + outlines. Sans ça, le premier vrai
//  spawn de zombie en jeu déclenche un stall de 100-300ms (= la chute brutale
//  de FPS observée). renderer.compile() compile tous les programs présents
//  dans la scene avec leurs defines/uniforms actuels.
// =============================================================================
whenZombieReady(() => {
  const dummy = makeZombie();
  if (!dummy) return;
  dummy.position.set(0, -100, 0); // bien hors champ
  scene.add(dummy);
  renderer.compile(scene, camera);
  scene.remove(dummy);
  console.log('[prewarm] zombie shaders compilés au boot');
});

// =============================================================================
//  RENDER LOOP
//  - shadowTick : la moon.shadow.autoUpdate est OFF (cf. world.js), on flag
//    needsUpdate toutes les 3 frames (~20 Hz à 60 fps). Économise massivement
//    le coût shadow pass quand le joueur est immobile.
// =============================================================================
const clock = new THREE.Clock();
let shadowTick = 0;
let capLastFrameTime = 0;

// =============================================================================
//  MENU — caméra cinématique : dérive lente dans les Backrooms + étalonnage
//  sombre (ambiance). La scène 3D est rendue derrière le menu (fond translucide).
// =============================================================================
let menuCamT = 0;
function updateMenuCam(dt) {
  menuCamT += dt;
  const t = menuCamT;
  // Dérive lente en cercle dans la zone dégagée du spawn (parallaxe), surélevée.
  camera.position.set(
    Math.sin(t * 0.06) * 0.7,
    EYE + 0.22 + Math.sin(t * 0.45) * 0.045,
    Math.cos(t * 0.05) * 0.7,
  );
  // Pan yaw très lent + léger pitch bas + micro-bob.
  camera.rotation.set(
    -0.05 + Math.sin(t * 0.27) * 0.012,
    Math.sin(t * 0.043) * 0.7,
    0, 'YXZ',
  );
  // Étalonnage sombre du menu (restauré à 1.0 par startRun au lancement).
  if (cartoonPass) {
    cartoonPass.uniforms.uExposure.value         = MENU_BRIGHT ? 1.0  : 0.42;
    cartoonPass.uniforms.uVignetteStrength.value = MENU_BRIGHT ? 0.32 : 0.88;
    cartoonPass.uniforms.uGrainIntensity.value   = MENU_BRIGHT ? 0.06 : 0.12;
  }
}

function loop() {
  requestAnimationFrame(loop);
  const cap = liveSettings.fpsCap;
  if (cap > 0) {
    const now = performance.now();
    const targetMs = 1000 / cap;
    if (now - capLastFrameTime < targetMs) return;
    capLastFrameTime = now;
  }
  const dt = Math.min(0.05, clock.getDelta());
  updateFps(dt);
  maybeResize();

  // throttle moon shadow update
  if (++shadowTick >= 3) {
    moon.shadow.needsUpdate = true;
    shadowTick = 0;
  }

  // Reset manuel des stats GPU au début de la frame — renderer.info.autoReset
  // est OFF (cf. renderer.js), donc on doit reset ici pour cumuler les stats
  // de toutes les passes du composer dans la frame courante.
  renderer.info.reset();

  // Anime le grain du CartoonPostShader (mood SH2/3 — texture caméra qui vibre)
  cartoonPass.uniforms.uTime.value = performance.now() * 0.001;
  // Vision nocturne : fondu doux selon que le caméscope est levé (touche C).
  {
    const nvU = cartoonPass.uniforms.uNightVision;
    if (nvU) nvU.value += ((game.cameraUp ? 1 : 0) - nvU.value) * Math.min(1, dt * 8);
  }

  if (game.state === State.GALLERY) {
    // mode galerie : rend la scène galerie au lieu du jeu
    updateGallery(dt);
    const gc = getGalleryCamera();
    gc.aspect = camera.aspect;
    gc.updateProjectionMatrix();
    renderer.render(getGalleryScene(), gc);
    return;
  }

  if (game.state === State.PLAY) {
    updatePlayer(dt);
    if (IS_BACKROOMS) updatePlayerBody(dt);
    let dead = false;
    if (!IS_BACKROOMS) {
      // gameplay horde (désactivé en Backrooms) : zombies, vagues, perks, achats
      dead = updateZombies(dt);
      updateWaves(dt);
      updateRegen(dt);
      refreshNearStation();
      updatePrompt(nearStation);
    }
    updateWeapons(dt);     // viewmodel (deviendra la lampe torche)
    updateWorld(dt);       // anime le grésillement des néons (zoneNeons)
    updateEffects(dt);
    updateLowHpVignette();
    updateAmbient(dt);     // grognements lointains + heartbeat = atmosphère
    // Caméscope : la batterie se vide caméra en main ; à 0 elle s'éteint.
    if (game.cameraUp) {
      game.camBattery = Math.max(0, game.camBattery - dt * 1.8);
      if (game.camBattery <= 0) game.cameraUp = false;
    }
    setCamcorderVisible(game.cameraUp);
    setCamBattery(game.camBattery);
    if (IS_BACKROOMS) {
      updateSanity(dt);
      // Porte de descente : prompt quand on est assez proche.
      const ep = getExitPos();
      nearExit = !!(ep && camera.position.distanceTo(ep) < 1.9);
      const pr = document.getElementById('prompt');
      if (pr) {
        if (nearExit) { pr.textContent = '[E] franchir la porte'; pr.classList.remove('hidden'); }
        else pr.classList.add('hidden');
      }
    }
    if (dead) gameOver();
  } else {
    if (IS_BACKROOMS && game.state === State.MENU) { updateMenuCam(dt); updateWorld(dt); }
    updateLowHpVignette();
  }
  updateShake(dt);
  composer.render();
}
loop();
updateHUD();
