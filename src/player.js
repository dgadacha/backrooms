import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { camera, canvas } from './renderer.js';
import { EYE, PLAYER_R, ARMOR_SOAK_RATIO, PERK_TANK_SPEED_MUL } from './config.js';
import { State, game, player } from './state.js';
import { resolveCollision, getFloorMeshes } from './world.js';

export const controls = new PointerLockControls(camera, document.body);

export const keys = {};
const vel = new THREE.Vector3();

// Raycast bas pour la gravité dynamique (suit le sol / monte les rampes / chute douce)
const downRay = new THREE.Raycaster();
downRay.far = 8;
const DOWN_VEC = new THREE.Vector3(0, -1, 0);
const rayOrigin = new THREE.Vector3();
// fallback Y si aucun sol détecté (cas pathologique : on garde la dernière hauteur connue)
let lastFloorY = 0;

export function initInput(handlers) {
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (game.state === State.PLAY) {
      if (e.code === 'KeyR')    handlers.reload();
      if (e.code === 'Digit1')  handlers.switchTo('pistol');
      if (e.code === 'Digit2')  handlers.switchTo('shotgun');
      if (e.code === 'Digit3')  handlers.switchTo('smg');
      if (e.code === 'Digit4' && game.meleeSlot) handlers.switchTo(game.meleeSlot);
      if (e.code === 'KeyE')    handlers.tryBuy();
      if (e.code === 'KeyC') {           // caméscope : lève / baisse (vision nocturne)
        if (game.cameraUp) game.cameraUp = false;
        else if (game.camBattery > 0) game.cameraUp = true;
      }
    }
  });
  addEventListener('keyup', e => keys[e.code] = false);
  addEventListener('mousedown', e => {
    if (game.state === State.PLAY && e.button === 0) handlers.shoot();
  });
}

export function updatePlayer(dt) {
  const sprint = (keys['ShiftLeft'] || keys['ShiftRight']) ? 1.7 : 1;
  // Perk tank : +30% vitesse de course (Stamin-Up)
  const tankMul = player.perks.tank ? PERK_TANK_SPEED_MUL : 1;
  const speed = 5.2 * sprint * tankMul;
  const fwd = (keys['KeyW'] || keys['KeyZ'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  const str = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] || keys['KeyQ'] ? 1 : 0);
  const target = new THREE.Vector3(str, 0, fwd);
  if (target.lengthSq() > 1) target.normalize();
  vel.x += (target.x * speed - vel.x) * Math.min(1, dt*12);
  vel.z += (target.z * speed - vel.z) * Math.min(1, dt*12);
  controls.moveRight(vel.x * dt);
  controls.moveForward(vel.z * dt);

  // === Gravité dynamique : raycast bas pour trouver le sol sous le joueur ===
  // Origine au-dessus de la tête, vers le bas, pour catcher rampes et plateformes.
  rayOrigin.set(camera.position.x, camera.position.y + 0.3, camera.position.z);
  downRay.set(rayOrigin, DOWN_VEC);
  const hits = downRay.intersectObjects(getFloorMeshes(), false);
  if (hits.length) lastFloorY = hits[0].point.y;
  const targetY = lastFloorY + EYE;
  const dy = targetY - camera.position.y;
  if (Math.abs(dy) < 0.02) {
    camera.position.y = targetY;
  } else {
    // lerp rapide : monte en glissant sur les rampes / petites marches,
    // tombe en douceur depuis les plateformes (pas de vraie gravité pour la V1)
    camera.position.y += dy * Math.min(1, dt * 14);
  }

  resolveCollision(camera.position, PLAYER_R);
}

// =============================================================================
//  DAMAGE PLAYER — passe par armor (perk) puis HP, et tracke lastDamageTime
// =============================================================================
export function damagePlayer(amount) {
  let dmg = amount;
  if (player.armor > 0) {
    const soak = Math.min(player.armor, dmg * ARMOR_SOAK_RATIO);
    player.armor -= soak;
    dmg -= soak;
  }
  player.hp -= dmg;
  player.lastDamageTime = performance.now() / 1000;
}

export function applyCameraShake(amount) {
  game.shake = Math.min(1, game.shake + amount);
}
export function updateShake(dt) {
  game.shake = Math.max(0, game.shake - dt * 2.5);
  if (game.shake > 0) {
    const a = game.shake * 8;
    canvas.style.transform =
      `translate(${(Math.random()-0.5)*a}px, ${(Math.random()-0.5)*a}px)`;
  } else if (canvas.style.transform) {
    canvas.style.transform = '';
  }
}

export function isMoving()    { return Math.abs(vel.x) > 0.4 || Math.abs(vel.z) > 0.4; }
export function isSprinting() { return !!(keys['ShiftLeft'] || keys['ShiftRight']); }
