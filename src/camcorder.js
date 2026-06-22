// =============================================================================
//  CAMÉSCOPE — overlay found-footage (REC + timecode + horloge qui défilent).
//  Le clignotement REC, les scanlines, le cadrage et le jitter sont en CSS pur.
//  Ici on ne gère que le compteur de temps. Affiché/caché par main.js
//  (showCamcorder au pointer-lock, hideCamcorder à la pause).
// =============================================================================
const root   = document.getElementById('camcorder');
const tcEl    = document.getElementById('cam-tc');
const timeEl  = document.getElementById('cam-time');

let rec = 0;          // secondes d'enregistrement écoulées
let timer = null;
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

export function showCamcorder() {
  if (!root) return;
  root.classList.remove('hidden');
  if (!timer) { tick(); timer = setInterval(tick, 1000); }
}

export function hideCamcorder() {
  if (!root) return;
  root.classList.add('hidden');
  if (timer) { clearInterval(timer); timer = null; }
}
