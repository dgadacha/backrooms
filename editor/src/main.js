// =============================================================================
//  MAIN — bootstrap éditeur + wiring UI
// =============================================================================
import { Editor } from './editor.js';
import { PROP_CATALOG, preloadAllTemplates, DEFAULT_MAP, WALL_TEXTURES, updateWall, getWallParams } from './props.js';

const canvas = document.getElementById('editor-canvas');
const editor = new Editor(canvas);
window.__editor = editor; // pour debug console

// =============================================================================
//  PRELOAD GLB → puis charge la carte par défaut
// =============================================================================
const statusEl = document.getElementById('canvas-status');
function setStatus(msg, hidden = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.toggle('hidden', !!hidden);
}

preloadAllTemplates((loaded, total, type) => {
  setStatus(`Chargement assets ${loaded}/${total} — ${type}`);
}).then(() => {
  setStatus('');
  // Restaure la dernière session ou la map par défaut
  const lastSession = localStorage.getItem('horde-editor-session');
  if (lastSession) {
    try {
      editor.loadMap(JSON.parse(lastSession));
      flash('Session restaurée');
    } catch {
      editor.loadMap(DEFAULT_MAP);
    }
  } else {
    editor.loadMap(DEFAULT_MAP);
  }
  setTimeout(() => setStatus('', true), 1000);
});

// =============================================================================
//  PALETTE — boutons "Ajouter un prop"
// =============================================================================
const paletteEl = document.getElementById('palette');
for (const [type, def] of Object.entries(PROP_CATALOG)) {
  const btn = document.createElement('button');
  btn.className = 'palette-item';
  btn.title = `Ajouter : ${def.label}`;
  btn.innerHTML = `<span class="palette-icon">${def.icon}</span><span class="palette-label">${def.label}</span>`;
  btn.addEventListener('click', () => {
    const newProp = editor.spawn(type, { x: 0, z: 0, ry: 0, scale: 1 });
    if (newProp) {
      editor.select(newProp);
      flash(`+ ${def.label}`);
    } else {
      flash(`Asset non chargé : ${def.label}`, true);
    }
  });
  paletteEl.appendChild(btn);
}

// =============================================================================
//  HIERARCHY — liste des props dans la scène
// =============================================================================
const hierarchyEl = document.getElementById('hierarchy');
const propCountEl = document.getElementById('prop-count');
function refreshHierarchy() {
  if (!hierarchyEl) return;
  hierarchyEl.innerHTML = '';
  // Grouper par type
  const grouped = new Map();
  for (const p of editor.props) {
    const t = p.userData.editable.type;
    if (!grouped.has(t)) grouped.set(t, []);
    grouped.get(t).push(p);
  }
  for (const [type, props] of grouped) {
    const def = PROP_CATALOG[type] || { label: type, icon: '•' };
    for (const p of props) {
      const row = document.createElement('div');
      row.className = 'hierarchy-item';
      if (p === editor.selectedProp) row.classList.add('active');
      row.innerHTML = `
        <span class="hierarchy-icon">${def.icon}</span>
        <span>${def.label}</span>
        <span class="hierarchy-id">${p.userData.editable.id.slice(-6)}</span>
      `;
      row.addEventListener('click', () => editor.select(p));
      hierarchyEl.appendChild(row);
    }
  }
  if (propCountEl) propCountEl.textContent = editor.props.length;
  if (document.getElementById('stat-props')) {
    document.getElementById('stat-props').textContent = editor.props.length;
  }
}

// =============================================================================
//  INSPECTOR — panel droite, sync au selectedProp
// =============================================================================
const inspectorEmpty = document.getElementById('inspector-empty');
const inspectorEl = document.getElementById('inspector');
const elPropType = document.getElementById('prop-type');
const elPropId = document.getElementById('prop-id');
const elPosX = document.getElementById('pos-x');
const elPosZ = document.getElementById('pos-z');
const elPosY = document.getElementById('pos-y');
const elRotY = document.getElementById('rot-y');
const elRotYVal = document.getElementById('rot-y-val');
const elScale = document.getElementById('scale');
const elScaleVal = document.getElementById('scale-val');

function showInspector(prop) {
  if (!prop) {
    inspectorEl.hidden = true;
    inspectorEmpty.hidden = false;
    return;
  }
  inspectorEl.hidden = false;
  inspectorEmpty.hidden = true;
  const def = prop.userData.editable;
  elPropType.textContent = PROP_CATALOG[def.type]?.label || def.type;
  elPropId.textContent = def.id;
  elPosX.value = prop.position.x.toFixed(2);
  elPosZ.value = prop.position.z.toFixed(2);
  elPosY.value = prop.position.y.toFixed(2);
  const deg = prop.rotation.y * 180 / Math.PI;
  elRotY.value = deg.toFixed(0);
  elRotYVal.textContent = `${deg.toFixed(0)}°`;
  const s = prop.scale.x;
  elScale.value = s.toFixed(2);
  elScaleVal.textContent = `${s.toFixed(2)}×`;

  // Section spécifique "Mur"
  const wallSection = document.getElementById('wall-section');
  if (def.type === 'wall') {
    wallSection.hidden = false;
    const p = getWallParams(prop);
    document.getElementById('wall-w').value = p.w;
    document.getElementById('wall-h').value = p.h;
    document.getElementById('wall-d').value = p.d;
    document.getElementById('wall-w-val').textContent = `${p.w.toFixed(2)}m`;
    document.getElementById('wall-h-val').textContent = `${p.h.toFixed(2)}m`;
    document.getElementById('wall-d-val').textContent = `${p.d.toFixed(2)}m`;
    document.getElementById('wall-texture').value = p.texture;
  } else {
    wallSection.hidden = true;
  }
}

// Populate dropdown des textures de mur
const wallTextureSelect = document.getElementById('wall-texture');
if (wallTextureSelect) {
  for (const [key, def] of Object.entries(WALL_TEXTURES)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = def.label;
    wallTextureSelect.appendChild(opt);
  }
}

// Wire sliders + dropdown du mur
function onWallChange() {
  if (!editor.selectedProp || editor.selectedProp.userData.editable.type !== 'wall') return;
  const w = parseFloat(document.getElementById('wall-w').value);
  const h = parseFloat(document.getElementById('wall-h').value);
  const d = parseFloat(document.getElementById('wall-d').value);
  const tex = document.getElementById('wall-texture').value;
  document.getElementById('wall-w-val').textContent = `${w.toFixed(2)}m`;
  document.getElementById('wall-h-val').textContent = `${h.toFixed(2)}m`;
  document.getElementById('wall-d-val').textContent = `${d.toFixed(2)}m`;
  updateWall(editor.selectedProp, { w, h, d, texture: tex });
  editor.requestRender();
  autoSaveSession();
}
document.getElementById('wall-w')?.addEventListener('input', onWallChange);
document.getElementById('wall-h')?.addEventListener('input', onWallChange);
document.getElementById('wall-d')?.addEventListener('input', onWallChange);
document.getElementById('wall-texture')?.addEventListener('change', onWallChange);

elPosX?.addEventListener('input', () => editor.applyToSelected('x', parseFloat(elPosX.value) || 0));
elPosZ?.addEventListener('input', () => editor.applyToSelected('z', parseFloat(elPosZ.value) || 0));
elPosY?.addEventListener('input', () => editor.applyToSelected('y', parseFloat(elPosY.value) || 0));
elRotY?.addEventListener('input', () => {
  const deg = parseFloat(elRotY.value) || 0;
  editor.applyToSelected('ry', deg * Math.PI / 180);
  elRotYVal.textContent = `${deg.toFixed(0)}°`;
});
elScale?.addEventListener('input', () => {
  const s = parseFloat(elScale.value) || 1;
  editor.applyToSelected('scale', s);
  elScaleVal.textContent = `${s.toFixed(2)}×`;
});

document.getElementById('btn-duplicate')?.addEventListener('click', () => editor.duplicateSelected());
document.getElementById('btn-delete')?.addEventListener('click', () => editor.deleteSelected());

// === Sync UI quand gizmo bouge un prop ===
editor.onSelectionChange = (prop) => {
  showInspector(prop);
  refreshHierarchy();
};
editor.onPropsChange = () => {
  refreshHierarchy();
  autoSaveSession();
};
editor.onTransformChange = () => {
  showInspector(editor.selectedProp);
  autoSaveSession();
};

// =============================================================================
//  MODE BUTTONS (Translate / Rotate / Scale)
// =============================================================================
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    editor.setMode(btn.dataset.mode);
  });
});

// =============================================================================
//  SNAP BUTTONS (Off / 0.5 m / 1 m)
// =============================================================================
const snapBtns = document.querySelectorAll('.snap-btn');
snapBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    snapBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    editor.setSnap(parseFloat(btn.dataset.snap));
  });
});

// =============================================================================
//  UNDO / REDO BUTTONS + sync de l'état disabled
// =============================================================================
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
btnUndo?.addEventListener('click', () => { editor.undo(); });
btnRedo?.addEventListener('click', () => { editor.redo(); });
editor.onHistoryChange = () => {
  if (btnUndo) btnUndo.disabled = !editor.history.canUndo();
  if (btnRedo) btnRedo.disabled = !editor.history.canRedo();
  autoSaveSession();
};
// État initial
if (btnUndo) btnUndo.disabled = true;
if (btnRedo) btnRedo.disabled = true;

// =============================================================================
//  CAMERA BUTTONS
// =============================================================================
document.getElementById('btn-top-down')?.addEventListener('click', () => {
  editor.setTopDownCamera();
  syncZoomSlider();
  flash('Vue de dessus');
});
document.getElementById('btn-perspective')?.addEventListener('click', () => {
  editor.setPerspectiveCamera();
  syncZoomSlider();
  flash('Vue perspective');
});

// =============================================================================
//  ZOOM SLIDER (remplace la molette)
// =============================================================================
const camZoom = document.getElementById('cam-zoom');
const camZoomVal = document.getElementById('cam-zoom-val');
function syncZoomSlider() {
  if (!camZoom) return;
  const d = editor.getCameraDistance();
  camZoom.value = d.toFixed(1);
  camZoomVal.textContent = `${d.toFixed(0)}m`;
}
camZoom?.addEventListener('input', () => {
  const d = parseFloat(camZoom.value);
  editor.setCameraDistance(d);
  camZoomVal.textContent = `${d.toFixed(0)}m`;
});
document.getElementById('zoom-out')?.addEventListener('click', () => {
  const d = Math.min(100, parseFloat(camZoom.value) + 5);
  editor.setCameraDistance(d);
  camZoom.value = d;
  camZoomVal.textContent = `${d.toFixed(0)}m`;
});
document.getElementById('zoom-in')?.addEventListener('click', () => {
  const d = Math.max(5, parseFloat(camZoom.value) - 5);
  editor.setCameraDistance(d);
  camZoom.value = d;
  camZoomVal.textContent = `${d.toFixed(0)}m`;
});
// Init au boot
syncZoomSlider();

// =============================================================================
//  KEYBOARD SHORTCUTS
// =============================================================================
window.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Z (undo) et Ctrl/Cmd + Y / Ctrl/Cmd + Shift + Z (redo).
  // On laisse le navigateur gérer le undo natif quand le focus est sur un
  // input texte (champ « Nom de la carte »), pour ne pas voler la frappe.
  // Les sliders / number inputs : on intercepte, leur undo natif n'a rien d'utile.
  const t = e.target;
  const isTextInput = t?.matches?.('input[type=text],input[type=search],textarea');
  const mod = e.ctrlKey || e.metaKey;
  if (!isTextInput && mod && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
    e.preventDefault();
    editor.undo();
    return;
  }
  if (!isTextInput && mod && ((e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
    e.preventDefault();
    editor.redo();
    return;
  }

  if (e.target.matches('input,textarea')) return;
  if (e.key === 'g' || e.key === 'G') { editor.setMode('translate'); syncModeUI('translate'); }
  if (e.key === 'r' || e.key === 'R') { editor.setMode('rotate'); syncModeUI('rotate'); }
  if (e.key === 's' || e.key === 'S') { editor.setMode('scale'); syncModeUI('scale'); }
  if (e.key === '1') editor.setTopDownCamera();
  if (e.key === '2') editor.setPerspectiveCamera();
  if (e.key === 'd' || e.key === 'D') {
    if (editor.selectedProp) { e.preventDefault(); editor.duplicateSelected(); }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedProp) {
    e.preventDefault();
    editor.deleteSelected();
  }
  if (e.key === 't' || e.key === 'T') {
    e.preventDefault();
    launchTestInGame();
  }
});
function syncModeUI(mode) {
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

// =============================================================================
//  TOPBAR ACTIONS (New / Depot / Load / Export)
// =============================================================================
document.getElementById('btn-new')?.addEventListener('click', async () => {
  if (!confirm('Démarrer une carte vierge ? Tout travail non exporté sera perdu.')) return;
  // clearAll() vide les props éditables (mais préserve sol, grille, outline du
  // dépôt qui sont des helpers permanents de la scène)
  editor.clearAll();
  const mapName = document.getElementById('map-name');
  if (mapName) mapName.value = '';
  flash('Carte vierge');
});

document.getElementById('btn-depot')?.addEventListener('click', async () => {
  if (!confirm('Charger la carte du dépôt par défaut ? Tout travail non exporté sera perdu.')) return;
  await editor.loadMap(DEFAULT_MAP);
  flash('Carte dépôt chargée');
});

document.getElementById('btn-export')?.addEventListener('click', () => {
  const data = editor.serialize();
  data.name = document.getElementById('map-name')?.value || 'horde-map';
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  flash(`Exporté : ${a.download}`);
  document.getElementById('stat-saved').textContent = 'Oui';
});

// =============================================================================
//  TESTER EN JEU — pousse la carte courante dans le slot localStorage de HORDE
//  puis ouvre HORDE dans un nouvel onglet. Suppose que les deux apps partagent
//  le même origin (HORDE à /, éditeur à /editor/).
// =============================================================================
const HORDE_TEST_MAP_ID = 'editor-test';
const HORDE_MAP_LIST_KEY = 'horde-maps-list';
const HORDE_MAP_ACTIVE_KEY = 'horde-map-active';

function launchTestInGame() {
  const data = editor.serialize();
  const baseName = document.getElementById('map-name')?.value?.trim() || 'Test éditeur';
  data.name = baseName;

  // Validation rapide : un spawn joueur est requis sinon HORDE pose le joueur
  // au centre du dépôt (peut intersecter un mur sur une carte custom)
  if (!data.playerSpawn) {
    if (!confirm('Aucun spawn joueur n\'est défini. HORDE te placera au (0,0) par défaut. Continuer ?')) return;
  }

  try {
    // 1. Sauvegarde le payload sous l'ID dédié au test
    localStorage.setItem(`horde-map-${HORDE_TEST_MAP_ID}`, JSON.stringify(data));

    // 2. Insère/met à jour dans la liste des cartes (pour que HORDE affiche
    //    un nom lisible dans Options > Carte > Carte active)
    let list = [];
    try { list = JSON.parse(localStorage.getItem(HORDE_MAP_LIST_KEY)) || []; } catch {}
    const idx = list.findIndex(m => m.id === HORDE_TEST_MAP_ID);
    const entry = {
      id: HORDE_TEST_MAP_ID,
      name: `🧪 ${baseName} (test)`,
      createdAt: idx >= 0 ? list[idx].createdAt : Date.now(),
      modifiedAt: Date.now(),
      temporary: true, // flag pour qu'on puisse la filtrer plus tard si besoin
    };
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    localStorage.setItem(HORDE_MAP_LIST_KEY, JSON.stringify(list));

    // 3. Active cette carte
    localStorage.setItem(HORDE_MAP_ACTIVE_KEY, HORDE_TEST_MAP_ID);

    // 4. Ouvre/réutilise l'onglet HORDE. Le nom 'horde-test' permet de
    //    réutiliser la même fenêtre — sinon on accumulerait un onglet par clic.
    //    '../' suppose HORDE servi à la racine du même origin (recommandé :
    //    sers le dossier parent dead-mall/ depuis un seul serveur statique).
    const win = window.open('../', 'horde-test');
    if (!win) {
      flash('Popup bloqué — autorise les popups pour cette page', true);
      return;
    }
    // Force un reload si l'onglet existait déjà (sinon il garde sa map précédente).
    // Try/catch : si pour une raison X on est cross-origin, on échoue silencieusement.
    try { win.location.reload(); } catch {}
    flash('Carte envoyée vers HORDE');
  } catch (err) {
    flash(`Erreur : ${err.message}`, true);
  }
}

document.getElementById('btn-test')?.addEventListener('click', launchTestInGame);

const fileLoadInput = document.getElementById('file-load');
document.getElementById('btn-load')?.addEventListener('click', () => fileLoadInput.click());
fileLoadInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.name) document.getElementById('map-name').value = data.name;
      await editor.loadMap(data);
      flash(`Importé : ${file.name}`);
    } catch (err) {
      flash(`Erreur : ${err.message}`, true);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// =============================================================================
//  FLASH MESSAGES
// =============================================================================
const flashEl = document.getElementById('flash');
function flash(msg, isError = false) {
  if (!flashEl) return;
  flashEl.textContent = msg;
  flashEl.classList.toggle('error', isError);
  flashEl.classList.add('show');
  clearTimeout(flash._t);
  flash._t = setTimeout(() => flashEl.classList.remove('show'), 1500);
}

// =============================================================================
//  AUTO-SAVE SESSION (localStorage) — restauré au reload
//  Debouncé à 2s pour éviter de bloquer le main thread pendant un drag.
// =============================================================================
let autoSaveTimer = null;
function autoSaveSession() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    // requestIdleCallback si dispo, sinon timeout direct
    const doSave = () => {
      try {
        localStorage.setItem('horde-editor-session', JSON.stringify(editor.serialize()));
      } catch (e) {
        console.warn('[autosave]', e);
      }
    };
    if (window.requestIdleCallback) {
      requestIdleCallback(doSave, { timeout: 1000 });
    } else {
      doSave();
    }
  }, 2000);
}
