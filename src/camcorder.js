// =============================================================================
//  CAMÉSCOPE — overlay found-footage (REC + timecode + batterie).
//  Désormais un OUTIL de gameplay : visible uniquement caméra levée (touche C).
//  La visibilité + la batterie sont pilotées par main.js (setCamcorderVisible /
//  setCamBattery). Le clignotement REC + scanlines + jitter restent en CSS pur.
// =============================================================================
const root   = document.getElementById('camcorder');
const tcEl   = document.getElementById('cam-tc');
const timeEl = document.getElementById('cam-time');
const battEl = document.querySelector('.cam-batt');

let rec = 0;            // secondes d'enregistrement écoulées
let timer = null;
let visible = false;
const pad = (n) => String(n).padStart(2, '0');

function tick() {
  rec++;
  const h = Math.floor(rec / 3600);
  const m = Math.floor(rec / 60) % 60;
  const s = rec % 60;
  if (tcEl) tcEl.textContent = `${h}:${pad(m)}:${pad(s)}`;
  // horloge « réelle » qui avance avec l'enregistrement (départ ~03:14:07)
  if (timeEl) {
    const tot = 3 * 3600 + 14 * 60 + 7 + rec;
    timeEl.textContent =
      `${pad(Math.floor(tot / 3600) % 24)}:${pad(Math.floor(tot / 60) % 60)}:${pad(tot % 60)}`;
  }
}

// Affiche/masque l'overlay (idempotent). Le timecode ne tourne que caméra levée.
export function setCamcorderVisible(v) {
  if (v === visible || !root) return;
  visible = v;
  if (v) {
    root.classList.remove('hidden');
    tick();
    if (!timer) timer = setInterval(tick, 1000);
  } else {
    root.classList.add('hidden');
    if (timer) { clearInterval(timer); timer = null; }
  }
}

// Met à jour la jauge de batterie (icône qui se vide, rouge en dessous de 20 %).
export function setCamBattery(pct) {
  if (!battEl) return;
  const p = Math.max(0, Math.min(100, pct));
  const col = p < 20 ? '#ff5a4a' : '#f3f2e6';
  battEl.style.background = `linear-gradient(to right, ${col} 0 ${p}%, transparent ${p}%)`;
}

// Conservé pour le handler "unlock" (pause) de main.js.
export function hideCamcorder() { setCamcorderVisible(false); }
