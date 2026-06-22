// =============================================================================
//  EDITOR — Scène Three.js + OrbitControls + TransformControls
// =============================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { PROP_CATALOG, spawnProp, loadTemplate, DEFAULT_MAP } from './props.js';

const COURT_SIZE = 44;  // taille de la cour HORDE
const DEPOT_W = 14, DEPOT_D = 10, DEPOT_H = 4.5;

export class Editor {
  constructor(canvas) {
    this.canvas = canvas;
    this.props = []; // refs des Group<Editable> spawn dans la scène
    this.selectedProp = null;
    this.currentMode = 'translate';

    // === Scene ===
    // Pas de fog (c'est un éditeur, on veut tout voir) + background plus clair
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a22);

    // === Renderer ===
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // === Camera (perspective, vue oblique 3/4 par défaut) ===
    this.persp = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.persp.position.set(35, 35, 35);
    this.persp.lookAt(0, 0, 0);

    // === Camera ortho top-down ===
    this.ortho = new THREE.OrthographicCamera(-26, 26, 26, -26, 0.1, 500);
    this.ortho.position.set(0, 80, 0);
    this.ortho.up.set(0, 0, -1);
    this.ortho.lookAt(0, 0, 0);

    this.camera = this.persp;

    // === Lighting (clair, neutre pour édition) ===
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(30, 50, 20);
    dir.castShadow = true;
    dir.shadow.camera.left = -40;
    dir.shadow.camera.right = 40;
    dir.shadow.camera.top = 40;
    dir.shadow.camera.bottom = -40;
    dir.shadow.camera.near = 0.1;
    dir.shadow.camera.far = 150;
    dir.shadow.mapSize.set(1024, 1024); // 2048 était overkill pour un éditeur
    this.scene.add(dir);
    const hemi = new THREE.HemisphereLight(0xaabbdd, 0x554433, 0.4);
    this.scene.add(hemi);

    // === Sol (grille + plane) ===
    this.buildGround();

    // === Silhouette dépôt central (référence visuelle) ===
    this.buildDepotOutline();

    // === Controls ===
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.target.set(0, 0, 0);
    this.orbit.maxPolarAngle = Math.PI / 2.05; // empêche de passer sous le sol
    this.orbit.enableZoom = false; // zoom géré par le slider, pas la molette
    this.orbit.minDistance = 5;
    this.orbit.maxDistance = 100;
    this.orbit.mouseButtons = {
      LEFT: null, // gauche = sélection (pas orbit)
      MIDDLE: null, // pas de dolly clic milieu
      RIGHT: THREE.MOUSE.ROTATE,
    };
    // Callback externe quand la distance change (pour sync le slider UI)
    this.onZoomChange = null;

    this.transform = new TransformControls(this.camera, canvas);
    this.transform.setSize(0.9);
    this.transform.setSpace('local');
    this.transform.addEventListener('dragging-changed', (e) => {
      this.orbit.enabled = !e.value;
      this._dragging = e.value;
      // Snapshot du state pour l'historique : capture before au début du drag,
      // push une TransformCommand à la fin si quelque chose a vraiment changé.
      if (e.value === true) {
        this._dragSnapshotBefore = this._snapshotTransform(this.selectedProp);
      } else if (this._dragSnapshotBefore) {
        const before = this._dragSnapshotBefore;
        const after = this._snapshotTransform(this.selectedProp);
        if (after && !transformsEqual(before, after)) {
          this.history.push(new TransformCommand(this.selectedProp, before, after));
          this.onHistoryChange?.();
        }
        this._dragSnapshotBefore = null;
      }
    });
    this.transform.addEventListener('change', () => {
      this.requestRender();
      this.onTransformChange?.();
    });
    this.scene.add(this.transform);

    // === Historique undo/redo + snapping ===
    this.history = new CommandStack();
    this.onHistoryChange = null; // callback externe pour UI (bouton dispo / count)
    this.snapValue = 0; // 0 = off, 0.5, 1 en mètres
    this._dragSnapshotBefore = null;

    // === Raycaster pour sélection ===
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('resize', this.resize.bind(this));

    // === Animation loop ===
    this.needsRender = true;
    // Bind UNE SEULE FOIS pour éviter de créer un nouvel objet à chaque frame
    // (sinon memory leak progressif → freeze après quelques minutes)
    this._animateLoop = this._animateLoop.bind(this);
    this._animateLoop();
    this.resize();
  }

  // === Ground + grid ===
  buildGround() {
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData._isGround = true;
    this.scene.add(ground);

    // Court boundary (44×44m)
    const courtBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(COURT_SIZE, 0.01, COURT_SIZE)),
      new THREE.LineBasicMaterial({ color: 0x3a3a44, transparent: true, opacity: 0.6 })
    );
    courtBorder.position.y = 0.01;
    courtBorder.userData._isHelper = true;
    this.scene.add(courtBorder);

    // Grid 2m
    const grid = new THREE.GridHelper(COURT_SIZE, COURT_SIZE / 2, 0x2a2a32, 0x1c1c22);
    grid.position.y = 0.005;
    grid.userData._isHelper = true;
    this.scene.add(grid);
  }

  buildDepotOutline() {
    // Silhouette du dépôt central — purement visuel
    const mat = new THREE.MeshLambertMaterial({
      color: 0x2a2a30, transparent: true, opacity: 0.5,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(DEPOT_W, 0.05, DEPOT_D), mat);
    slab.position.y = 0.02;
    slab.userData._isHelper = true;
    this.scene.add(slab);
    // Edges
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(DEPOT_W, DEPOT_H, DEPOT_D)),
      new THREE.LineBasicMaterial({ color: 0x5fb4e0, transparent: true, opacity: 0.4 })
    );
    edge.position.y = DEPOT_H / 2;
    edge.userData._isHelper = true;
    this.scene.add(edge);
  }

  // === Animate loop (on-demand rendering) ===
  // _animateLoop est bound dans le ctor pour éviter le memory leak.
  _animateLoop() {
    requestAnimationFrame(this._animateLoop);
    const damp = this.orbit.update(); // true = damping toujours en cours
    if (this.needsRender || damp) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
  }
  requestRender() { this.needsRender = true; }

  // === Zoom (slider UI au lieu de la molette) ===
  getCameraDistance() {
    if (this.camera === this.ortho) {
      // En ortho on mappe le zoom vers une "distance équivalente" 5..100
      // zoom élevé = vue rapprochée → distance faible
      const z = this.ortho.zoom || 1;
      // z dans [0.5..4] → dist dans [100..5]
      const t = THREE.MathUtils.clamp((z - 0.5) / 3.5, 0, 1);
      return 100 - t * 95;
    }
    return this.camera.position.distanceTo(this.orbit.target);
  }

  setCameraDistance(dist) {
    dist = Math.max(5, Math.min(100, dist));
    if (this.camera === this.ortho) {
      // dist 5..100 → zoom 4..0.5
      const t = (dist - 5) / 95;
      this.ortho.zoom = 4 - t * 3.5;
      this.ortho.updateProjectionMatrix();
    } else {
      const dir = new THREE.Vector3().subVectors(this.camera.position, this.orbit.target);
      const cur = dir.length() || 1;
      dir.multiplyScalar(dist / cur);
      this.camera.position.copy(this.orbit.target).add(dir);
    }
    this.requestRender();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.persp.aspect = w / h;
    this.persp.updateProjectionMatrix();
    const aspect = w / h;
    const half = 26;
    this.ortho.left = -half * aspect;
    this.ortho.right = half * aspect;
    this.ortho.top = half;
    this.ortho.bottom = -half;
    this.ortho.updateProjectionMatrix();
    this.requestRender();
  }

  // === Camera switch ===
  setTopDownCamera() {
    this.camera = this.ortho;
    this.orbit.object = this.ortho;
    this.orbit.enableRotate = false;
    this.transform.camera = this.ortho;
    this.requestRender();
  }
  setPerspectiveCamera() {
    this.camera = this.persp;
    this.orbit.object = this.persp;
    this.orbit.enableRotate = true;
    this.transform.camera = this.persp;
    this.requestRender();
  }

  // === Selection via raycaster ===
  onPointerDown(e) {
    if (e.button !== 0) return;        // seulement bouton gauche
    if (this._dragging) return;        // skip si en train de drag gizmo

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Cherche meshes des props
    const candidates = [];
    for (const p of this.props) {
      p.traverse(c => { if (c.isMesh) candidates.push(c); });
    }
    const hits = this.raycaster.intersectObjects(candidates, false);
    if (hits.length === 0) {
      this.select(null);
      return;
    }
    let obj = hits[0].object;
    while (obj && !obj.userData.editable) obj = obj.parent;
    if (obj) this.select(obj);
  }

  // === Selection state ===
  select(prop) {
    this.selectedProp = prop;
    if (prop) {
      this.transform.attach(prop);
      this.setMode(this.currentMode);
    } else {
      this.transform.detach();
    }
    this.onSelectionChange?.(prop);
    this.requestRender();
  }

  setMode(mode) {
    this.currentMode = mode;
    if (!this.selectedProp) return;
    this.transform.setMode(mode);
    // Pour translate : seulement X et Z (pas Y vertical, plus simple)
    if (mode === 'translate') {
      this.transform.showX = true; this.transform.showY = false; this.transform.showZ = true;
    } else if (mode === 'rotate') {
      this.transform.showX = false; this.transform.showY = true; this.transform.showZ = false;
    } else { // scale
      this.transform.showX = true; this.transform.showY = true; this.transform.showZ = true;
    }
    this.requestRender();
  }

  // === Spawn / delete / duplicate ===
  spawn(type, opts = {}) {
    // Empêche les doublons de player_spawn (singleton)
    if (type === 'player_spawn') {
      const existing = this.props.find(p => p.userData.editable?.type === 'player_spawn');
      if (existing) {
        this.select(existing);
        this.onPropsChange?.();
        return existing;
      }
    }
    const wrapper = spawnProp(type, this.scene, opts);
    if (wrapper) {
      this.props.push(wrapper);
      // Push une AddCommand sauf si on est en mode silencieux (loadMap, undo, redo)
      if (!opts.silent) {
        this.history.push(new AddCommand(this, snapshotProp(wrapper)));
        this.onHistoryChange?.();
      }
      this.onPropsChange?.();
      this.requestRender();
    }
    return wrapper;
  }

  // Suppression physique d'un prop SANS toucher à l'historique.
  // Utilisée par les commandes undo/redo et par deleteSelected (qui push après).
  _removeProp(prop) {
    if (!prop) return;
    this.transform.detach();
    this.scene.remove(prop);
    const idx = this.props.indexOf(prop);
    if (idx >= 0) this.props.splice(idx, 1);
    prop.traverse(c => {
      if (c.geometry) c.geometry.dispose?.();
      if (c.material) {
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => m.dispose?.());
      }
    });
    if (this.selectedProp === prop) {
      this.selectedProp = null;
      this.onSelectionChange?.(null);
    }
    this.onPropsChange?.();
    this.requestRender();
  }

  deleteSelected() {
    if (!this.selectedProp) return;
    const prop = this.selectedProp;
    const snap = snapshotProp(prop);
    this._removeProp(prop);
    this.history.push(new RemoveCommand(this, snap));
    this.onHistoryChange?.();
  }

  duplicateSelected() {
    if (!this.selectedProp) return;
    const type = this.selectedProp.userData.editable.type;
    const x = this.selectedProp.position.x + 1.5;
    const z = this.selectedProp.position.z + 1.5;
    const ry = this.selectedProp.rotation.y;
    const scale = this.selectedProp.scale.x;
    const dup = this.spawn(type, { x, z, ry, scale });
    if (dup) this.select(dup);
  }

  // === Undo / Redo ===
  undo() {
    if (!this.history.undo()) return false;
    this.requestRender();
    this.onHistoryChange?.();
    return true;
  }
  redo() {
    if (!this.history.redo()) return false;
    this.requestRender();
    this.onHistoryChange?.();
    return true;
  }

  // === Snapping (grille de translation) ===
  // value : 0 (off) | 0.5 | 1 (mètres). Active aussi un snap rotation à 15°
  // et un snap scale à 0.1 dès qu'on est en mode snap.
  setSnap(value) {
    this.snapValue = value;
    if (value <= 0) {
      this.transform.setTranslationSnap(null);
      this.transform.setRotationSnap(null);
      this.transform.setScaleSnap(null);
    } else {
      this.transform.setTranslationSnap(value);
      this.transform.setRotationSnap(THREE.MathUtils.degToRad(15));
      this.transform.setScaleSnap(0.1);
    }
    this.requestRender();
  }

  // Snapshot léger pour les commandes de transformation (drag du gizmo).
  // Capture position + rotation Y + scale uniforme (suffit pour notre cas).
  _snapshotTransform(prop) {
    if (!prop) return null;
    return {
      pos: prop.position.clone(),
      rot: prop.rotation.y,
      scale: prop.scale.x,
    };
  }

  clearAll() {
    for (const p of [...this.props]) {
      this.transform.detach();
      this.scene.remove(p);
      p.traverse(c => {
        if (c.geometry) c.geometry.dispose?.();
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(m => m.dispose?.());
        }
      });
    }
    this.props.length = 0;
    this.selectedProp = null;
    // Reset l'historique : aucune undo possible vers un état "vide à mi-chemin"
    this.history.clear();
    this.onHistoryChange?.();
    this.onPropsChange?.();
    this.onSelectionChange?.(null);
    this.requestRender();
  }

  // === Load / Export ===
  async loadMap(data) {
    this.clearAll();
    if (!data) return;

    // 1) Props ordinaires (silent: true → pas d'AddCommand pour chaque spawn de load)
    if (Array.isArray(data.props)) {
      const types = [...new Set(data.props.map(p => p.type))];
      await Promise.all(types.map(t => loadTemplate(t).catch(() => {})));
      for (const entry of data.props) {
        this.spawn(entry.type, {
          id: entry.id,
          x: entry.x, z: entry.z,
          ry: entry.ry,
          scale: entry.scale ?? 1,
          wallParams: entry.wallParams,
          silent: true,
        });
      }
    }

    // 2) Marker player_spawn (singleton)
    if (data.playerSpawn) {
      this.spawn('player_spawn', {
        x: data.playerSpawn.x ?? 0,
        z: data.playerSpawn.z ?? 0,
        ry: data.playerSpawn.ry ?? 0,
        silent: true,
      });
    }

    // 3) Markers zombie_spawn (multiples)
    if (Array.isArray(data.zombieSpawns)) {
      for (const s of data.zombieSpawns) {
        this.spawn('zombie_spawn', { x: s.x ?? 0, z: s.z ?? 0, ry: 0, silent: true });
      }
    }

    // Reset l'historique après load (état initial propre)
    this.history.clear();
    this.onHistoryChange?.();
    this.requestRender();
  }

  serialize() {
    const props = [];
    let playerSpawn = null;
    const zombieSpawns = [];

    for (const p of this.props) {
      const e = p.userData.editable;
      const x = Number(p.position.x.toFixed(3));
      const z = Number(p.position.z.toFixed(3));
      const ry = Number(p.rotation.y.toFixed(3));

      if (e.type === 'player_spawn') {
        playerSpawn = { x, z, ry };
      } else if (e.type === 'zombie_spawn') {
        zombieSpawns.push({ x, z });
      } else {
        const entry = {
          id: e.id,
          type: e.type,
          x, z, ry,
          scale: Number(p.scale.x.toFixed(3)),
        };
        // Sérialise les paramètres muraux (W/H/D/texture) pour les murs
        if (e.type === 'wall') {
          const mesh = p.children.find(c => c.isMesh);
          if (mesh?.userData?._wallParams) {
            entry.wallParams = { ...mesh.userData._wallParams };
          }
        }
        props.push(entry);
      }
    }

    return {
      version: 4,
      // Flag clé : signale à HORDE que ce JSON liste exhaustivement les props
      // à conserver. Les props HORDE de types « simples » (dumpster / abri bus /
      // palettes / sacs / murs) absents du JSON seront supprimés au load.
      replaceAll: true,
      props,
      playerSpawn,
      zombieSpawns,
    };
  }

  // === Apply transform to selected (depuis l'UI) ===
  applyToSelected(field, value) {
    const p = this.selectedProp;
    if (!p) return;
    if (field === 'x') p.position.x = value;
    else if (field === 'z') p.position.z = value;
    else if (field === 'y') p.position.y = value;
    else if (field === 'ry') p.rotation.y = value;
    else if (field === 'scale') p.scale.setScalar(value);
    this.requestRender();
  }
}

// =============================================================================
//  HISTORIQUE UNDO/REDO — pile de commandes, capacité 100
// =============================================================================
//
// Trois commandes : Add (création d'un prop), Remove (suppression), Transform
// (drag du gizmo translate/rotate/scale). Les commandes "input UI" (sliders
// dans l'inspecteur) ne sont PAS prises en charge ici — un drag du gizmo après
// modification du slider effacera le redo, ce qui est acceptable.

class CommandStack {
  constructor(limit = 100) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }
  push(cmd) {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }
  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo();
    this.redoStack.push(cmd);
    return true;
  }
  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.redo();
    this.undoStack.push(cmd);
    return true;
  }
  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
}

// Capture l'état complet d'un prop (pour Add/Remove). Inclut wallParams pour
// pouvoir reconstruire un mur identique à l'undo d'un delete.
function snapshotProp(prop) {
  if (!prop) return null;
  const e = prop.userData.editable;
  const snap = {
    id: e.id,
    type: e.type,
    x: prop.position.x,
    y: prop.position.y,
    z: prop.position.z,
    ry: prop.rotation.y,
    scale: prop.scale.x,
  };
  if (e.type === 'wall') {
    const mesh = prop.children.find(c => c.isMesh);
    if (mesh?.userData?._wallParams) {
      snap.wallParams = { ...mesh.userData._wallParams };
    }
  }
  return snap;
}

function transformsEqual(a, b) {
  if (!a || !b) return false;
  return a.pos.equals(b.pos)
      && Math.abs(a.rot - b.rot) < 1e-4
      && Math.abs(a.scale - b.scale) < 1e-4;
}

class AddCommand {
  constructor(editor, snapshot) {
    this.editor = editor;
    this.snapshot = snapshot;
    this.instance = null; // ref vers le prop actuellement vivant
  }
  // À la création, l'instance vivante est celle qu'on vient d'ajouter ; mais
  // on ne la stocke pas ici — c'est la stratégie redo() qui la (re)crée.
  // Pour l'undo immédiat post-add, on doit retrouver le prop par ID :
  _findCurrentInstance() {
    return this.editor.props.find(p => p.userData.editable?.id === this.snapshot.id);
  }
  undo() {
    const live = this.instance || this._findCurrentInstance();
    if (live) this.editor._removeProp(live);
    this.instance = null;
  }
  redo() {
    this.instance = this.editor.spawn(this.snapshot.type, {
      id: this.snapshot.id,
      x: this.snapshot.x, z: this.snapshot.z,
      ry: this.snapshot.ry,
      scale: this.snapshot.scale,
      wallParams: this.snapshot.wallParams,
      silent: true,
    });
  }
}

class RemoveCommand {
  constructor(editor, snapshot) {
    this.editor = editor;
    this.snapshot = snapshot;
    this.instance = null;
  }
  undo() {
    // Recrée le prop tel qu'il était avant la suppression
    this.instance = this.editor.spawn(this.snapshot.type, {
      id: this.snapshot.id,
      x: this.snapshot.x, z: this.snapshot.z,
      ry: this.snapshot.ry,
      scale: this.snapshot.scale,
      wallParams: this.snapshot.wallParams,
      silent: true,
    });
  }
  redo() {
    const live = this.instance || this.editor.props.find(p => p.userData.editable?.id === this.snapshot.id);
    if (live) this.editor._removeProp(live);
    this.instance = null;
  }
}

class TransformCommand {
  constructor(prop, before, after) {
    this.prop = prop;
    this.before = before;
    this.after = after;
  }
  _apply(state) {
    if (!this.prop || !state) return;
    this.prop.position.copy(state.pos);
    this.prop.rotation.y = state.rot;
    this.prop.scale.setScalar(state.scale);
  }
  undo() { this._apply(this.before); }
  redo() { this._apply(this.after); }
}
