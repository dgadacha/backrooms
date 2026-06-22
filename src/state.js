import { WEAPONS, START_MONEY } from './config.js';

export const State = { MENU:'menu', PLAY:'play', PAUSE:'pause', OVER:'over', GALLERY:'gallery' };

export const player = {
  hp: 100,
  sanity: 100,               // santé mentale (Backrooms) — baisse dans le noir, 0 = mort
  armor: 0,
  money: START_MONEY,
  kills: 0,
  lastDamageTime: 0,
  perks: { regen:false, nightVision:false, lightUpgrade:false,
           brute:false, iron:false, quick:false, tank:false },
};

export const wave = {
  num:0, toSpawn:0, spawned:0, alive:0,
  spawnTimer:0, intermission:2, active:false,
  respawnFast:0,
};

export const owned = {
  pistol:  true,
  shotgun: false,
  smg:     false,
  bat:     false,
  axe:     false,
};

export const ammo = {
  pistol:  { mag:WEAPONS.pistol.mag,  reserve:Infinity },
  shotgun: { mag:0,                   reserve:0 },
  smg:     { mag:0,                   reserve:0 },
  bat:     { mag:Infinity,            reserve:Infinity },   // mêlée = pas d'ammo
  axe:     { mag:Infinity,            reserve:Infinity },
};

// État global mutable, partagé entre modules.
export const game = {
  state: State.MENU,
  curWeapon: 'pistol',
  meleeSlot: null,            // 'bat' | 'axe' (la dernière mêlée achetée, pour la touche 4)
  currentZone: 'bus_depot',
  blackout: 0,
  fireCd: 0,
  reloading: 0,
  shake: 0,
  swingPhase: 0,              // animation swing mêlée (1 = peak, 0 = repos)
  level: 0,                  // niveau de profondeur atteint (descente)
  // --- Caméscope (gameplay found-footage) ---
  cameraUp: false,           // caméscope levé (overlay + vision nocturne)
  camBattery: 100,           // batterie % (se vide caméra en main)
};

export function resetState() {
  player.hp = 100;
  player.sanity = 100;
  player.armor = 0;
  player.money = START_MONEY;
  player.kills = 0;
  player.lastDamageTime = 0;
  player.perks = { regen:false, nightVision:false, lightUpgrade:false,
                   brute:false, iron:false, quick:false, tank:false };
  owned.pistol = true; owned.shotgun = false; owned.smg = false; owned.bat = false; owned.axe = false;
  ammo.pistol  = { mag:WEAPONS.pistol.mag, reserve:Infinity };
  ammo.shotgun = { mag:0, reserve:0 };
  ammo.smg     = { mag:0, reserve:0 };
  ammo.bat     = { mag:Infinity, reserve:Infinity };
  ammo.axe     = { mag:Infinity, reserve:Infinity };
  game.curWeapon = 'pistol';
  game.meleeSlot = null;
  game.currentZone = 'bus_depot';
  game.fireCd = 0;
  game.reloading = 0;
  game.shake = 0;
  game.blackout = 0;
  game.swingPhase = 0;
  game.level = 0;
  game.cameraUp = false;
  game.camBattery = 100;
  wave.num = 0; wave.toSpawn = 0; wave.spawned = 0; wave.alive = 0;
  wave.spawnTimer = 0; wave.intermission = 2; wave.active = false;
  wave.respawnFast = 0;
}

export function activePerksCount() {
  let n = 0;
  if (player.perks.regen) n++;
  if (player.perks.nightVision) n++;
  if (player.perks.lightUpgrade) n++;
  if (player.perks.brute) n++;
  if (player.perks.iron)  n++;
  if (player.perks.quick) n++;
  if (player.perks.tank)  n++;
  return n;
}
