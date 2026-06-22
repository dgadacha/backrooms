import * as THREE from 'three';

export const EYE = 1.7;
export const PLAYER_R = 0.45;
export const START_MONEY = 500;
// Fog DA Fortnite/TF2 NUIT : brouillard bleu nuit qui matche l'horizon
// du sky shader. Distance moyenne (on voit loin mais l'atmosphère porte).
export const FOG_NEAR = 25;
export const FOG_FAR = 110;
export const FOG_COLOR = 0x1c2848; // bleu nuit (matche horizon sky)

// Spawn par défaut : centre du bâtiment Depot (mono-zone Bus Depot)
export const SPAWN = new THREE.Vector3(0, EYE, 0);

// =============================================================================
//  ARMES
//  - tir : pellets/spread/raycast hitscan
//  - mêlée : melee=true, hit en cône proche
// =============================================================================
export const WEAPONS = {
  pistol:  { name:"PISTOL",       dmg:34, mag:12, fireDelay:0.16, reload:1.1,  pellets:1, spread:0.006 },
  shotgun: { name:"PUMP SHOTGUN", dmg:22, mag:6,  fireDelay:0.7,  reload:1.6,  pellets:8, spread:0.07  },
  smg:     { name:"SMG",          dmg:18, mag:30, fireDelay:0.075,reload:1.4,  pellets:1, spread:0.014, auto:true },
  bat:     { name:"BAT",          dmg:60,  fireDelay:0.55, swingTime:0.45, range:2.3, coneAngle:Math.PI/2.6, melee:true },
  axe:     { name:"AXE",          dmg:120, fireDelay:0.75, swingTime:0.6,  range:2.1, coneAngle:Math.PI/3,   melee:true },
};

// Récompenses style survie zombie classique
export const REWARD_HIT = 10;          // chaque coup qui touche
export const REWARD_BODY = 50;         // kill body shot
export const REWARD_HEAD_BONUS = 50;   // headshot kill = body + bonus = 100
export const REWARD_MELEE_BONUS = 80;  // bonus mêlée (knife/bat) sur kill = 130 total

// =============================================================================
//  PERKS
// =============================================================================
export const PERK_REGEN_DELAY = 5.0;     // s sans dégât avant que la regen démarre
export const PERK_REGEN_RATE  = 12;      // HP/sec quand active
export const ARMOR_SOAK_RATIO = 0.7;     // 70% des dégâts absorbés par l'armure quand présente
// Perks COD Zombies-style :
export const PERK_BRUTE_DAMAGE_MUL = 1.5;  // +50% dégâts armes à feu (Double Tap)
export const PERK_IRON_ARMOR_BONUS = 100;  // donne 100 armure à l'achat (Juggernog)
export const PERK_QUICK_RELOAD_MUL = 0.6;  // ×0.6 = -40% temps de reload (Speed Cola)
export const PERK_TANK_SPEED_MUL   = 1.3;  // +30% vitesse de course (Stamin-Up)
