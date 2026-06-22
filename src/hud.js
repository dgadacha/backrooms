import { State, player, wave, ammo, game, activePerksCount } from './state.js';
import { WEAPONS } from './config.js';

const elHud         = document.getElementById('hud');
const elZlNum       = document.getElementById('zl-num');
const elPointsTotal = document.getElementById('points-total');
const elRoundRoman  = document.getElementById('round-roman');
const elRoundFlash  = document.getElementById('round-flash');
const elScorePops   = document.getElementById('score-popups');
const elSecurityLv  = document.getElementById('security-lv');
const elHealthFill  = document.getElementById('health-fill');
const elHealthValue = document.getElementById('health-value');
const elHealthBar   = document.getElementById('health-bar');
const elArmorBar    = document.getElementById('armor-bar');
const elArmorFill   = document.getElementById('armor-fill');
const elArmorValue  = document.getElementById('armor-value');
const elAmmoMag     = document.getElementById('ammo-mag');
const elAmmoReserve = document.getElementById('ammo-reserve');
const elWeaponName  = document.getElementById('weapon-name');
const elReloading   = document.getElementById('reloading');
const elPerkNum     = document.getElementById('perk-num');
const elPerkIcons   = document.getElementById('perk-icons');
const elPrompt      = document.getElementById('prompt');
const elBanner      = document.getElementById('event-banner');
const elHit         = document.getElementById('hitmarker');
const elDmg         = document.getElementById('damage');
const elVignette    = document.getElementById('vignette');
const elToasts      = document.getElementById('toasts');

// =============================================================================
//  HELPERS — chiffres romains + popups score
// =============================================================================
const ROMAN_MAP = [
  [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
  [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
  [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
];
export function toRoman(n) {
  if (n <= 0) return 'I';
  let s = '';
  for (const [v, k] of ROMAN_MAP) while (n >= v) { s += k; n -= v; }
  return s;
}

// jitter horizontal pour éviter d'empiler les popups exactement au même x
let popupSlot = 0;
const POPUP_SLOTS = [-90, -30, 30, 90, -60, 60, 0];

// popupScore — popup +X au centre, qui monte + fade. variant : 'hit' | 'body' | 'head' | 'melee'
export function popupScore(amount, variant = 'hit') {
  if (!elScorePops) return;
  const el = document.createElement('div');
  el.className = 'score-popup ' + variant;
  el.textContent = `+${amount}`;
  const jx = POPUP_SLOTS[popupSlot % POPUP_SLOTS.length];
  popupSlot++;
  el.style.left = `calc(50% + ${jx}px)`;
  elScorePops.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// showRoundStart — flash plein écran + maj du persistant (chiffres arabes)
export function showRoundStart(num) {
  const s = String(num);
  if (elRoundRoman) elRoundRoman.textContent = s;
  if (!elRoundFlash) return;
  elRoundFlash.textContent = s;
  elRoundFlash.classList.remove('show');
  void elRoundFlash.offsetWidth;
  elRoundFlash.classList.add('show');
}

// =============================================================================
//  PERKS — cercles colorés bottom-left, un par perk actif
// =============================================================================
// Chaque perk a une lettre + une couleur (via class CSS). Les noms sont
// génériques (REGEN/TANK/QUICK/BRUTE/IRON/NIGHTVISION/LIGHTUPGRADE) — mes
// propres choix, indépendants de toute franchise.
const PERK_DEF = {
  regen:        { letter: 'R', cls: 'regen',        label: 'REGEN' },
  tank:         { letter: 'T', cls: 'tank',         label: 'TANK' },
  quick:        { letter: 'Q', cls: 'quick',        label: 'QUICK' },
  brute:        { letter: 'B', cls: 'brute',        label: 'BRUTE' },
  iron:         { letter: 'I', cls: 'iron',         label: 'IRON' },
  nightVision:  { letter: 'N', cls: 'nightvision',  label: 'NIGHT VISION' },
  lightUpgrade: { letter: 'L', cls: 'lightupgrade', label: 'LIGHT' },
};

function renderPerkIcons() {
  if (!elPerkIcons) return;
  // mémoize l'état actif pour éviter de rebuild le DOM à chaque frame
  const activeKeys = Object.keys(PERK_DEF).filter(k => player.perks[k]).join(',');
  if (elPerkIcons.dataset.active === activeKeys) return;
  elPerkIcons.dataset.active = activeKeys;
  elPerkIcons.innerHTML = '';
  for (const [key, def] of Object.entries(PERK_DEF)) {
    if (!player.perks[key]) continue;
    const ic = document.createElement('div');
    ic.className = 'perk-icon ' + def.cls;
    ic.textContent = def.letter;
    ic.title = def.label;
    elPerkIcons.appendChild(ic);
  }
}

function zombiesRemaining() {
  return Math.max(0, (wave.toSpawn - wave.spawned) + wave.alive);
}

function securityLevel() {
  return 1 + Math.floor(player.kills / 8);
}

function fmt(n) { return n === Infinity ? '∞' : String(n); }

export function updateHUD() {
  const left = zombiesRemaining();
  const a = ammo[game.curWeapon];
  const w = WEAPONS[game.curWeapon];
  const hp = Math.max(0, Math.floor(player.hp));
  const armor = Math.max(0, Math.floor(player.armor));

  if (elPointsTotal) elPointsTotal.textContent = String(player.money);
  if (elRoundRoman)  elRoundRoman.textContent  = String(wave.num || 1);
  elZlNum.textContent = String(left);

  elSecurityLv.textContent  = String(securityLevel());
  elHealthFill.style.width  = Math.max(0, player.hp) + '%';
  elHealthValue.textContent = String(hp);
  // Couleur dynamique : vert (>60) → orange (30-60) → rouge (<30)
  if (elHealthBar) {
    elHealthBar.classList.toggle('warn', hp <= 60 && hp > 30);
    elHealthBar.classList.toggle('crit', hp <= 30);
  }

  if (armor > 0) {
    elArmorBar.classList.remove('empty');
    elArmorFill.style.width = armor + '%';
    elArmorValue.textContent = String(armor);
  } else {
    elArmorBar.classList.add('empty');
  }

  elAmmoMag.textContent     = fmt(a.mag);
  elAmmoReserve.textContent = fmt(a.reserve);
  elWeaponName.textContent  = w.name;
  elReloading.textContent   = game.reloading > 0 ? 'RELOADING…' : '';
  if (elPerkNum) elPerkNum.textContent = String(activePerksCount());
  renderPerkIcons();
}

export function showHud()    { elHud.classList.remove('hidden'); }
export function hideHud()    { elHud.classList.add('hidden'); }

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
export function hideScreens() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
}

export function toast(txt) {
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = txt;
  elToasts.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

export function banner(txt) {
  elBanner.textContent = txt;
  elBanner.classList.remove('show');
  void elBanner.offsetWidth;
  elBanner.classList.add('show');
}

export function hitmark() {
  elHit.style.opacity = '1';
  setTimeout(() => elHit.style.opacity = '0', 70);
}

export function dmgFlash() {
  elDmg.style.transition = 'none';
  elDmg.style.opacity = '0.85';
  requestAnimationFrame(() => {
    elDmg.style.transition = 'opacity .4s';
    elDmg.style.opacity = '0';
  });
}

export function updateLowHpVignette() {
  if (game.state !== State.PLAY) { elVignette.style.opacity = '0'; return; }
  const hp = player.hp;
  let op = 0;
  if (hp < 40) op = (1 - hp/40) * 0.45;
  if (hp < 20) op = 0.45 + (1 - hp/20) * 0.35;
  elVignette.style.opacity = String(op);
}

export function updatePrompt(nearStation) {
  if (nearStation && game.state === State.PLAY) {
    const can = player.money >= nearStation.cost;
    elPrompt.classList.remove('hidden');
    elPrompt.style.borderColor = can ? '#ffb200' : '#666';
    elPrompt.style.color = can ? '#ffb200' : '#888';
    elPrompt.textContent = `[E] ${nearStation.label} — $${nearStation.cost}`;
  } else {
    elPrompt.classList.add('hidden');
  }
}
