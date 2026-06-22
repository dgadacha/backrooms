import * as THREE from 'three';

// =============================================================================
//  LOADING MANAGER — précharge tous les assets AVANT que le menu apparaisse.
//  Évite le flash "arme procédurale → GLB" au spawn.
// =============================================================================

// Singleton partagé : tous les GLTFLoader doivent être créés avec
// `new GLTFLoader(loadingManager)` pour être trackés ici.
export const loadingManager = new THREE.LoadingManager();

// État interne — compteurs séparés GLB (THREE) vs images PNG (manuel).
const state = {
  gltfLoaded: 0, gltfTotal: 0,
  imgLoaded: 0,  imgTotal: 0,
  done: false,
  onCompleteCbs: [],
};

// État public unifié (lecture).
export const loadingState = {
  get loaded() { return state.gltfLoaded + state.imgLoaded; },
  get total()  { return state.gltfTotal  + state.imgTotal;  },
  get done()   { return state.done; },
};

// Met à jour la barre + texte + vérifie si on a tout chargé.
function recompute() {
  const loaded = state.gltfLoaded + state.imgLoaded;
  const total  = state.gltfTotal  + state.imgTotal;
  const fill = document.getElementById('loading-bar-fill');
  const txt  = document.getElementById('loading-text');
  const sub  = document.getElementById('loading-sub');
  const ratio = total > 0 ? Math.min(1, loaded / total) : 0;
  if (fill) fill.style.width = `${(ratio * 100).toFixed(1)}%`;
  if (txt)  txt.textContent  = `${Math.round(ratio * 100)}%`;
  if (sub)  sub.textContent  = `${loaded} / ${total} assets`;
  if (!state.done && total > 0 && loaded >= total) {
    markComplete();
  }
}

// Marque la fin et fait disparaître le loading screen.
function markComplete() {
  if (state.done) return;
  state.done = true;
  // Petit délai pour laisser le 100% s'afficher
  setTimeout(() => {
    const screen = document.getElementById('loading-screen');
    if (screen) {
      screen.classList.add('fade-out');
      setTimeout(() => screen.classList.add('hidden'), 600);
    }
    // Révèle le menu principal
    const menu = document.getElementById('menu');
    if (menu) menu.classList.remove('hidden', 'pre-load');
    // Callbacks externes
    for (const cb of state.onCompleteCbs) {
      try { cb(); } catch (e) { console.warn('[loading] callback failed', e); }
    }
  }, 300);
}

// THREE.LoadingManager hooks — capture les compteurs GLTFLoader.
loadingManager.onStart = (_url, loaded, total) => {
  state.gltfLoaded = loaded;
  state.gltfTotal  = total;
  recompute();
};
loadingManager.onProgress = (_url, loaded, total) => {
  state.gltfLoaded = loaded;
  state.gltfTotal  = total;
  recompute();
};
loadingManager.onLoad = () => {
  state.gltfLoaded = state.gltfTotal;
  recompute();
};
loadingManager.onError = (url) => {
  console.warn('[loading] échec asset GLB:', url);
  state.gltfLoaded = Math.min(state.gltfTotal, state.gltfLoaded + 1);
  recompute();
};

// Tracker manuel pour les images PNG chargées via `new Image()` (loadPng).
const manualPending = new Set();
export function trackImageStart(url) {
  if (manualPending.has(url)) return;
  manualPending.add(url);
  state.imgTotal++;
  recompute();
}
export function trackImageEnd(url) {
  if (!manualPending.has(url)) return;
  manualPending.delete(url);
  state.imgLoaded++;
  recompute();
}

// API publique pour brancher un callback "tout est prêt".
export function onAllLoaded(cb) {
  if (state.done) { cb(); return; }
  state.onCompleteCbs.push(cb);
}

// Failsafe : si rien ne s'est enregistré au bout de 10s, on débloque
// le menu de force pour éviter de rester coincé sur le loading.
setTimeout(() => {
  if (!state.done) {
    console.warn('[loading] timeout 10s — déblocage forcé', { state });
    markComplete();
  }
}, 10000);
