// Audio mixte :
//  - SFX procéduraux (Web Audio API) — tirs, hit, blip d'achat
//  - Ambient drones .mp3 (HTMLAudioElement loop) — fond constant
//  - Lamp buzz spatialisé .mp3 (THREE.PositionalAudio) — buzz qui baisse
//    quand on s'éloigne de chaque lampadaire

import * as THREE from 'three';

let actx = null;
let noiseBuf = null;
let droneStarted = false;
let ambientStarted = false;
const ambientAudios = [];

// Spatial lamp buzz
let audioListener = null;
let lampBuzzBuffer = null;
const lampBuzzInstances = [];
let spatialLampsSetup = false;

export function initAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const len = actx.sampleRate * 0.5;
  noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random()*2 - 1;
  // Lance UNIQUEMENT les ambient samples mp3 (les vraies pistes Suno/ElevenLabs).
  // Le drone synth procédural est désactivé pour éviter le double-emploi audible.
  // Si les mp3 ne chargent pas, la console log un warning ; on reste silencieux.
  if (!ambientStarted) { startAmbientSamples(); ambientStarted = true; }
  droneStarted = true; // marque comme démarré pour éviter relance accidentelle
}

// =============================================================================
//  AMBIENT SAMPLES — drones .mp3 loopés en background (mood Silent Hill 2/3)
//  Volume très bas : ces sons doivent COMPLÉTER le silence, pas le couvrir.
// =============================================================================
const AMBIENT_TRACKS = [
  { file: 'drone_subbass.mp3',         volume: 0.22 },
  { file: 'drone_tinnitus.mp3',        volume: 0.05 },
  { file: 'electrical_hum_distant.mp3', volume: 0.12 },
  // lamp_buzz retiré ici → géré par setupSpatialLamps en PositionalAudio 3D
];

function startAmbientSamples() {
  for (const t of AMBIENT_TRACKS) {
    const audio = new Audio(`public/audio/sfx/ambient/${t.file}`);
    audio.loop = true;
    audio.volume = t.volume;
    audio.preload = 'auto';
    // Le play() peut être rejeté si pas de user gesture, mais initAudio() est
    // appelé sur pointer lock = user gesture, donc OK normalement.
    audio.play().catch(err => {
      console.warn(`[ambient] ${t.file} play failed:`, err);
    });
    ambientAudios.push(audio);
  }
  console.log(`[ambient] ${AMBIENT_TRACKS.length} drones démarrés en boucle`);
}

// Helpers exposés pour fade-in / fade-out (par exemple silence durant la pause)
export function setAmbientVolume(multiplier) {
  for (let i = 0; i < ambientAudios.length; i++) {
    const baseVol = AMBIENT_TRACKS[i].volume;
    ambientAudios[i].volume = Math.max(0, Math.min(1, baseVol * multiplier));
  }
}
export function pauseAmbient() {
  for (const a of ambientAudios) a.pause();
  for (const s of lampBuzzInstances) { if (s.isPlaying) s.pause(); }
}
export function resumeAmbient() {
  for (const a of ambientAudios) a.play().catch(() => {});
  for (const s of lampBuzzInstances) { if (!s.isPlaying && s.buffer) s.play(); }
}

// =============================================================================
//  LAMP BUZZ SPATIALISÉ — PositionalAudio par lampadaire
//  Le buzz de chaque lampe s'atténue avec la distance — le joueur entend
//  fort la lampe la plus proche, et l'ensemble crée un soundscape 3D.
//
//  À appeler une seule fois (idempotent) après initAudio + scene/camera prêts.
// =============================================================================
export function setupSpatialLamps(scene, camera, positions, yHeight = 4.7) {
  if (spatialLampsSetup) return;
  spatialLampsSetup = true;

  // 1. Listener attaché à la camera (une seule instance pour toute la scène)
  if (!audioListener) {
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
  }

  // 2. Charge le buffer audio UNE SEULE FOIS, puis distribue à toutes les instances
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load('public/audio/sfx/ambient/lamp_buzz.mp3', (buffer) => {
    lampBuzzBuffer = buffer;
    // Assigne le buffer à toutes les instances déjà créées et démarre
    for (const sound of lampBuzzInstances) {
      sound.setBuffer(buffer);
      sound.play();
    }
    console.log(`[lamp_buzz spatial] buffer chargé, ${lampBuzzInstances.length} instances jouent`);
  }, undefined, (err) => {
    console.warn('[lamp_buzz spatial] échec chargement :', err);
  });

  // 3. Crée un PositionalAudio par lampadaire, attaché à un Object3D ancré
  for (const pos of positions) {
    const sound = new THREE.PositionalAudio(audioListener);
    sound.setLoop(true);
    sound.setVolume(1.0);
    // Rolloff calibré pour une cour de ~44m :
    //   - refDistance 2m : volume max à 2m de la lampe
    //   - rolloff 1.8   : atténuation marquée mais audible jusqu'à ~15m
    //   - maxDistance 20m : silence garanti au-delà
    sound.setRefDistance(2);
    sound.setRolloffFactor(1.8);
    sound.setMaxDistance(20);
    sound.setDistanceModel('exponential');

    // Si le buffer est déjà chargé (cas rare où le load est instantané), play
    if (lampBuzzBuffer) {
      sound.setBuffer(lampBuzzBuffer);
      sound.play();
    }

    // Object3D ancré à la position de la lampe (Y au niveau de l'ampoule)
    const anchor = new THREE.Object3D();
    anchor.position.set(pos.x, yHeight, pos.z);
    anchor.add(sound);
    scene.add(anchor);

    lampBuzzInstances.push(sound);
  }
  console.log(`[lamp_buzz spatial] ${positions.length} PositionalAudio créés (en attente du buffer)`);
}

// drone basse fréquence continu — ambiance horreur
function startDrone() {
  const o1 = actx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 41;
  const o2 = actx.createOscillator(); o2.type = 'sine';     o2.frequency.value = 55;
  const filter = actx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320;
  const g = actx.createGain(); g.gain.value = 0.055;
  const lfo = actx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.11;
  const lfoG = actx.createGain(); lfoG.gain.value = 0.025;
  lfo.connect(lfoG).connect(g.gain);
  o1.connect(filter); o2.connect(filter); filter.connect(g).connect(actx.destination);
  o1.start(); o2.start(); lfo.start();
}

function blip({ freq=440, type='square', dur=0.1, vol=0.3, slideTo=null } = {}) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, actx.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, actx.currentTime + dur);
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  o.connect(g).connect(actx.destination);
  o.start(); o.stop(actx.currentTime + dur);
}

function noise({ dur=0.1, vol=0.3, hp=600 } = {}) {
  if (!actx) return;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const g = actx.createGain();
  const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  s.connect(f).connect(g).connect(actx.destination);
  s.start(); s.stop(actx.currentTime + dur);
}

export const sfx = {
  pistol:  () => { noise({dur:0.08, vol:0.35, hp:900}); blip({freq:220, slideTo:60, type:'square', dur:0.09, vol:0.25}); },
  shotgun: () => { noise({dur:0.18, vol:0.5,  hp:300}); blip({freq:120, slideTo:40, type:'sawtooth', dur:0.18, vol:0.3}); },
  hit:     () => blip({freq:1200, type:'square', dur:0.03, vol:0.15}),
  zdeath:  () => { noise({dur:0.25, vol:0.3, hp:200}); blip({freq:90, slideTo:30, type:'sawtooth', dur:0.3, vol:0.2}); },
  hurt:    () => { noise({dur:0.2, vol:0.4, hp:150}); blip({freq:160, slideTo:50, type:'sawtooth', dur:0.2, vol:0.25}); },
  reload:  () => { blip({freq:300, type:'square', dur:0.04, vol:0.2});
                   setTimeout(() => blip({freq:500, type:'square', dur:0.04, vol:0.2}), 140); },
  buy:     () => { blip({freq:600, type:'square', dur:0.07, vol:0.25});
                   setTimeout(() => blip({freq:900, type:'square', dur:0.1, vol:0.25}), 80); },
  nope:    () => blip({freq:140, type:'square', dur:0.12, vol:0.25}),
  wave:    () => blip({freq:80, type:'sawtooth', dur:0.55, vol:0.32, slideTo:30}),
  blackout:() => { noise({dur:0.6, vol:0.35, hp:60}); blip({freq:55, slideTo:20, type:'sawtooth', dur:0.7, vol:0.3}); },
  heart:   () => {
    if (!actx) return;
    const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = 55;
    const g = actx.createGain();
    g.gain.setValueAtTime(0, actx.currentTime);
    g.gain.linearRampToValueAtTime(0.45, actx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 0.18);
  },
  distantGrunt: () => {
    noise({dur:0.45, vol:0.12, hp:80});
    blip({freq:70, slideTo:48, type:'sawtooth', dur:0.5, vol:0.08});
  },
  melee: () => {
    // whoosh d'air + impact mat
    noise({dur:0.18, vol:0.28, hp:400});
    blip({freq:160, slideTo:80, type:'sawtooth', dur:0.2, vol:0.18});
  },
};
