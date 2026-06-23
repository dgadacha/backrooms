import * as THREE from 'three';

// =============================================================================
//  MINIMAP — vue de dessus du labyrinthe avec BROUILLARD DE GUERRE.
//  Ne révèle que les cellules explorées (la cellule courante + ce qu'on voit
//  en ligne de vue dans les couloirs). Affiche la position + l'orientation du
//  joueur. La sortie n'est PAS marquée : on la cherche soi-même.
// =============================================================================

let cv = null, ctx = null;
let explored = new Set();
let mazeRef = null;                       // ref du labyrinthe courant (détecte la régénération)
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export function initMinimap() {
  cv = document.getElementById('minimap');
  ctx = cv ? cv.getContext('2d') : null;
}

export function resetMinimap() { explored = new Set(); mazeRef = null; }

export function updateMinimap(camera, maze) {
  if (!ctx || !maze) return;
  if (maze !== mazeRef) { explored = new Set(); mazeRef = maze; }   // nouveau niveau → brouillard neuf

  const { cols, rows, cell, halfX, halfZ, passR, passD } = maze;

  // Cellule courante du joueur.
  let c = Math.max(0, Math.min(cols - 1, Math.floor((camera.position.x + halfX) / cell)));
  let r = Math.max(0, Math.min(rows - 1, Math.floor((camera.position.z + halfZ) / cell)));

  // Révèle la cellule courante + tout ce qu'on voit en ligne droite dans les
  // 4 directions jusqu'à un mur (ligne de vue des couloirs).
  const mark = (cc, rr) => explored.add(cc + ',' + rr);
  mark(c, r);
  let k;
  k = c; while (k < cols - 1 && passR[k][r]) { k++; mark(k, r); }     // est
  k = c; while (k > 0 && passR[k - 1][r]) { k--; mark(k, r); }        // ouest
  k = r; while (k < rows - 1 && passD[c][k]) { k++; mark(c, k); }     // sud
  k = r; while (k > 0 && passD[c][k - 1]) { k--; mark(c, k); }        // nord

  // --- rendu ---
  const W = cv.width, H = cv.height;
  const cw = W / cols, ch = H / rows;
  ctx.clearRect(0, 0, W, H);

  ctx.lineWidth = Math.max(1, cw * 0.16);
  ctx.lineCap = 'round';
  for (const key of explored) {
    const i = key.indexOf(',');
    const cc = +key.slice(0, i), rr = +key.slice(i + 1);
    const x = cc * cw, y = rr * ch;
    ctx.fillStyle = 'rgba(226,206,138,0.16)';      // sol exploré (jaune sale)
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(235,222,168,0.9)';     // murs
    ctx.beginPath();
    if (rr === 0        || !passD[cc][rr - 1]) { ctx.moveTo(x, y);       ctx.lineTo(x + cw, y); }        // nord
    if (rr === rows - 1 || !passD[cc][rr])     { ctx.moveTo(x, y + ch);  ctx.lineTo(x + cw, y + ch); }   // sud
    if (cc === 0        || !passR[cc - 1][rr]) { ctx.moveTo(x, y);       ctx.lineTo(x, y + ch); }        // ouest
    if (cc === cols - 1 || !passR[cc][rr])     { ctx.moveTo(x + cw, y);  ctx.lineTo(x + cw, y + ch); }   // est
    ctx.stroke();
  }

  // Joueur : flèche dans le sens du regard (top-down : x→droite, z→bas, nord en haut).
  const px = (camera.position.x + halfX) / (2 * halfX) * W;
  const py = (camera.position.z + halfZ) / (2 * halfZ) * H;
  _euler.setFromQuaternion(camera.quaternion, 'YXZ');
  const yaw = _euler.y;
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw);   // avant monde (x,z)
  const ex = -dz, ez = dx;                          // perpendiculaire
  const s = Math.max(4, cw * 0.55);
  ctx.fillStyle = '#ffce4a';
  ctx.beginPath();
  ctx.moveTo(px + dx * s, py + dz * s);
  ctx.lineTo(px - dx * s * 0.6 + ex * s * 0.55, py - dz * s * 0.6 + ez * s * 0.55);
  ctx.lineTo(px - dx * s * 0.6 - ex * s * 0.55, py - dz * s * 0.6 - ez * s * 0.55);
  ctx.closePath();
  ctx.fill();
}
