// =============================================================================
//  GRAPHICS SETTINGS — état + presets + apply()
//
//  L'état est persisté dans localStorage sous la clé 'horde-graphics'.
//  Au boot, on charge ce qui existe et on applique. Sinon defaults = 'high'.
// =============================================================================

const STORAGE_KEY = 'horde-graphics';

// Presets — 2 seulement : un choix binaire perf vs qualité
export const PRESETS = {
  performance: {
    name: 'PERFORMANCE',
    desc: '~120 fps · ombres OFF, résolution 75%, GPU intégré OK',
    resolutionScale: 0.75,
    dprCap: 1.0,           // cap du devicePixelRatio (retina = 2 par défaut)
    shadows: false,
    shadowMapSize: 512,
    interactableShadows: false,
    postIntensity: 0.5,    // post-FX réduit mais grain SH reste constant
    fogShort: false,
    glowSprites: false,
    decals: false,
  },
  quality: {
    name: 'QUALITÉ',
    desc: '~60 fps · ombres + spots, DPR 2.0 + SMAA',
    resolutionScale: 1.0,
    dprCap: 2.0,           // qualité native max sur retina (rendu plus net)
    shadows: true,
    shadowMapSize: 1024,
    interactableShadows: true,
    postIntensity: 1.0,
    fogShort: true,
    glowSprites: true,
    decals: true,
  },
};

// Migration des anciens noms de preset (compat localStorage)
const PRESET_MIGRATION = {
  low: 'performance',
  medium: 'performance',
  high: 'quality',
  cinema: 'quality',
};

// État actuel (copie d'un preset + tweaks user)
let current = {
  ...PRESETS.quality,
  showFps: true,
  preset: 'quality',
  fpsCap: 60,
  startingWave: 1,
};

// Objet mutable exporté pour que le main loop lise le cap FPS dynamiquement
// (changement runtime sans reload, contrairement à PS2_MODE qui est figé au boot)
export const liveSettings = {
  fpsCap: current.fpsCap,
};

// load au boot si présent + migration des anciens noms low/medium/high/cinema
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    // Migration : si l'utilisateur avait un ancien preset, on le mappe au nouveau
    if (parsed.preset && PRESET_MIGRATION[parsed.preset]) {
      const newName = PRESET_MIGRATION[parsed.preset];
      current = { ...current, ...PRESETS[newName], ...parsed, preset: newName };
    } else {
      current = { ...current, ...parsed };
    }
    // Filet de sécurité : si le preset stocké n'existe plus, fallback quality
    if (!PRESETS[current.preset]) {
      current = { ...current, ...PRESETS.quality, preset: 'quality' };
    }
  }
} catch (e) { /* localStorage indispo, on garde defaults */ }

// PS1/PS2/FlatShading retirés des settings UI — gardés à false pour compat
// avec le code dead-branch qui les référence encore (renderer.js, world.js).
export const PS1_MODE     = false;
export const PS2_MODE     = false;
export const FLAT_SHADING = false;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); }
  catch (e) {}
}

export function getSettings() { return { ...current }; }

// Appel quand le user clique sur un preset (migre les anciens noms au passage)
export function applyPreset(presetName) {
  if (PRESET_MIGRATION[presetName]) presetName = PRESET_MIGRATION[presetName];
  const preset = PRESETS[presetName];
  if (!preset) return;
  current = { ...current, ...preset, preset: presetName };
  save();
  apply();
}

// Toggle FPS counter visibility
export function setShowFps(visible) {
  current.showFps = !!visible;
  save();
  apply();
}


// Cap FPS — runtime (pas de reload). Valeurs : 30, 60, 0 (illimité)
export function setFpsCap(cap) {
  const n = Number(cap) || 0;
  current.fpsCap = n;
  liveSettings.fpsCap = n;
  save();
}

// Vague de départ — appliquée au prochain démarrage de partie. Valeurs : 1, 5, 10, 15, 20
export function setStartingWave(n) {
  current.startingWave = Math.max(1, Number(n) || 1);
  save();
}

export function getStartingWave() {
  return Math.max(1, Number(current.startingWave) || 1);
}


// =============================================================================
//  APPLY — pousse l'état dans renderer / scene / uniforms
//  Les modules concernés sont injectés via initGraphics(deps) au démarrage
// =============================================================================
let deps = null;
export function initGraphics(d) {
  deps = d;
  apply();
}

function apply() {
  if (!deps) return;
  const { renderer, scene, moon, interactableSpots, cartoonPass, fogDefaults } = deps;

  // Sync liveSettings au cas où apply est appelé après un setter qui a oublié
  liveSettings.fpsCap = current.fpsCap;

  // 1. Resolution scale × DPR cap (preset-dépendant — sur retina, cap 1.5-1.75
  //    suffit largement et économise massivement le pixel fillrate)
  const cap = current.dprCap || 2;
  const dpr = Math.min(window.devicePixelRatio || 1, cap) * (current.resolutionScale || 1);
  renderer.setPixelRatio(Math.max(0.5, dpr));

  // 2. Shadows globales
  renderer.shadowMap.enabled = !!current.shadows;

  // 3. Moon shadow size
  if (moon) {
    moon.castShadow = !!current.shadows;
    if (current.shadows && moon.shadow.mapSize.x !== current.shadowMapSize) {
      moon.shadow.mapSize.set(current.shadowMapSize, current.shadowMapSize);
      // force regen de la shadow map
      if (moon.shadow.map) {
        moon.shadow.map.dispose();
        moon.shadow.map = null;
      }
    }
  }

  // 4. Interactable spots castShadow
  for (const sp of (interactableSpots || [])) {
    const wantsShadow = sp.userData.wantsShadow && current.interactableShadows && current.shadows;
    sp.castShadow = !!wantsShadow;
    if (!wantsShadow && sp.shadow.map) {
      sp.shadow.map.dispose();
      sp.shadow.map = null;
    }
  }

  // 5. Post-process — étalonnage horreur found-footage : désaturé, vignette
  //    dense, grain caméra, teinte jaune malsaine. (uTime anime grain ;
  //    uAberration reste à sa valeur shader.)
  if (cartoonPass) {
    cartoonPass.uniforms.uExposure.value         = 1.0;
    cartoonPass.uniforms.uSaturationBoost.value  = 0.82;
    cartoonPass.uniforms.uVignetteStrength.value = 0.60;
    cartoonPass.uniforms.uVignetteFalloff.value  = 1.7;
    cartoonPass.uniforms.uGrainIntensity.value   = 0.085;
    cartoonPass.uniforms.uColorTint.value.set(1.0, 0.99, 0.9);
  }

  // 6. Fog
  if (scene.fog && fogDefaults) {
    if (current.fogShort) {
      scene.fog.near = fogDefaults.near;
      scene.fog.far  = fogDefaults.far;
    } else {
      scene.fog.near = fogDefaults.near * 2;
      scene.fog.far  = fogDefaults.far * 2;
    }
  }

  // 7. Glow sprites visibility
  for (const spr of (deps.glowSprites || [])) {
    spr.visible = !!current.glowSprites;
  }

  // 8. Decals visibility
  for (const d of (deps.decals || [])) {
    d.visible = !!current.decals;
  }

  // 9. FPS counter
  const fpsEl = document.getElementById('fps-counter');
  if (fpsEl) {
    fpsEl.style.display = current.showFps ? '' : 'none';
  }
}
