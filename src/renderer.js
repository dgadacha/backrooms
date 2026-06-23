import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, SMAAEffect, SMAAPreset, Effect, BlendFunction,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { FOG_NEAR, FOG_FAR, FOG_COLOR, SPAWN } from './config.js';
import { PS1_MODE, PS2_MODE, FLAT_SHADING } from './graphics-settings.js';

// Color management activé : les textures GLB Meshy sont en sRGB, le pipeline
// fait sRGB → linear → calculs lighting → sRGB output (rendu fidèle). Les
// CanvasTextures procédurales (sang, signes, etc.) sont forcées explicitement
// en SRGBColorSpace au moment de leur création — sinon Three les traite en
// linear et les rouges deviennent rose/orange.
THREE.ColorManagement.enabled = true;

export const canvas = document.getElementById('game');

// Mode normal : antialias ON, shadows PCF.
// Mode PS1 : antialias OFF (aliasing volontaire), shadows OFF (incohérent
// avec basse résolution), classe CSS `pixelated` ajoutée au canvas.
// PS2 mode : antialias OFF (jaggies signature), BasicShadowMap (ombres dures pixelisées)
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });  // AA via pmndrs (MSAA composer)
renderer.setClearColor(FOG_COLOR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = !PS1_MODE;
// DA Fortnite/TF2 : ombres douces PCFSoftShadowMap pour un look stylized
// propre sans pixelisation cartoony-trop-rigide. BasicShadowMap (très tranché)
// serait pour cell-shading ; on n'en veut plus.
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// autoReset OFF : on veut que renderer.info accumule les stats sur TOUTES les
// passes du composer (RenderPass + CartoonPostShader + OutputPass). Sans ça,
// info.render.calls ne reflète que la dernière pass (= OutputPass, 1 call).
// Reset manuel fait dans le main loop avant composer.render().
renderer.info.autoReset = false;
if (PS1_MODE) {
  canvas.classList.add('ps1-pixelated');
}
if (PS2_MODE) {
  // upscale linear (pas nearest = pas pixelated PS1) pour rendu PS2 propre
  canvas.classList.add('ps2-fidelity');
}

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

// Anisotropy max supportée par le GPU (typiquement 16). Utilisée par
// applyHQTextureFiltering() pour réduire l'aliasing texture à distance
// (les surfaces inclinées sous des angles rasants — sol, murs, bus de loin).
export const MAX_ANISOTROPY = renderer.capabilities.getMaxAnisotropy();

/**
 * Configure une texture pour le filtrage haute qualité :
 * - mipmaps activées (réduit l'aliasing à distance via LOD)
 * - trilinear filtering (LinearMipmapLinearFilter) en minification
 * - linear filtering en magnification
 * - anisotropy max GPU (8-16× selon hardware)
 *
 * À appeler sur les textures map/normalMap/etc. après chargement d'un GLB ou
 * d'un PNG. No-op sur les CanvasTextures pixelisées (ce serait flouter le sang).
 */
export function applyHQTextureFiltering(tex) {
  if (!tex) return tex;
  tex.generateMipmaps = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = MAX_ANISOTROPY;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Parcourt récursivement un Object3D et applique applyHQTextureFiltering
 * à toutes ses textures (map, normalMap, roughnessMap, metalnessMap,
 * emissiveMap, aoMap, alphaMap, bumpMap, specularMap).
 *
 * À appeler après chaque chargement de GLB (bus, voiture, zombies, props…)
 * pour que les textures embarquées bénéficient de l'AA.
 */
const _HQ_TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap',
                      'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'specularMap'];
export function upgradeMeshTextures(root) {
  if (!root) return;
  root.traverse(c => {
    if (!c.isMesh && !c.isSkinnedMesh) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    for (const m of mats) {
      if (!m) continue;
      for (const key of _HQ_TEX_KEYS) {
        if (m[key]) applyHQTextureFiltering(m[key]);
      }
    }
  });
}

// IBL désactivé volontairement : RoomEnvironment ajoutait un bounce gris
// neutre qui désaturait les couleurs des assets (les rouges et jaunes
// perdaient leur pop par rapport au rendu Meshy preview). Sans IBL, les
// MeshStandardMaterial s'appuient juste sur ambient + directionnel + hemi
// → couleurs vives, look TF2/Fortnite cartoon préservé.

export const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 200);
camera.position.copy(SPAWN);
scene.add(camera);

// =============================================================================
//  POSTPROCESSING : RenderPass → CartoonPostPass (saturation boost)
//  → OutputPass
//
//  Le pass actuel applique uniquement le saturation boost. Les outlines via
//  depth-edge-detect ont été testés mais le combo DepthTexture + MSAA +
//  EffectComposer custom RT pétait le rendu (écran noir).
//
//  Pour les outlines on a 2 approches plus robustes (V2 si Dylan valide
//  le rendu cartoon actuel) :
//   - **Normal-extrude inverted hull** : duplique chaque mesh avec MeshBasicMaterial
//     noir + side: BackSide + scale +N en normale. Donne des outlines propres
//     sans postprocess. Marche bien pour les meshes statiques, à adapter
//     pour les SkinnedMesh (zombie).
//   - **Render normal buffer séparé** : un RenderPass avec override material
//     MeshNormalMaterial dans un RT distinct, puis edge-detect sur ce buffer.
// =============================================================================
// CartoonPostShader — DA Fortnite/TF2 (mode neutre, color management fait
// le travail principal). Les valeurs sont quasi-pass-through : on garde
// juste un léger lift d'exposure + très léger sat boost pour le pop.
//  1. Exposure 1.05 (léger lift cinéma)
//  2. ACES filmique conservé
//  3. Saturation 1.10 (très léger pop, pas un filtre)
//  4. Teinte neutre (1.0, 1.0, 1.0)
//  5. Grain off
//  6. Pas de vignette
//  7. Color quantize off
// =============================================================================
//  GRADE found-footage — porté de l'ancien CartoonPostShader vers un Effect
//  pmndrs (postprocessing). Per-pixel : exposure + ACES + saturation + teinte +
//  vision nocturne + grain + vignette + quantize. (L'aberration multi-tap n'est
//  pas rebranchée pour l'instant.) Les uniforms du Map sont auto-déclarés par
//  pmndrs → on ne les redéclare PAS dans le shader. mainImage reçoit `uv`.
//  ACES s'applique maintenant sur du HDR linéaire (pipeline HalfFloat) → la
//  réponse tonale diffère de l'ancien, on re-règle exposure/grade en conséquence.
// =============================================================================
const _gradeFrag = /* glsl */`
  uniform float uExposure;
  uniform float uSaturationBoost;
  uniform float uVignetteStrength;
  uniform float uVignetteFalloff;
  uniform vec3  uColorTint;
  uniform float uGrainIntensity;
  uniform float uColorQuantize;
  uniform float uNightVision;
  uniform float uTime;

  vec3 ACESFilm(vec3 x) {
    float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a*x + b)) / (x * (c*x + d) + e), 0.0, 1.0);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 col = inputColor.rgb;
    col *= uExposure;                                   // 1. exposure
    col = ACESFilm(col);                                // 2. ACES (HDR linéaire)
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray), col, uSaturationBoost);       // 3. saturation
    col *= uColorTint;                                  // 4. teinte
    if (uNightVision > 0.001) {                         // 4.5 vision nocturne caméscope
      float lum = dot(col, vec3(0.30, 0.59, 0.11));
      lum = pow(clamp(lum, 0.0, 1.0), 0.45) * 1.7;
      float n = (hash(uv * vec2(1280.0, 720.0) + uTime * 60.0) - 0.5) * 0.18;
      vec3 nv = clamp(vec3(lum * 0.18, lum, lum * 0.30) + n, 0.0, 1.0);
      col = mix(col, nv, uNightVision);
    }
    float grain = (hash(uv * vec2(1920.0, 1080.0) + uTime) - 0.5) * uGrainIntensity;
    col += grain;                                       // 5. grain
    vec2 vd = uv - 0.5;                                 // 6. vignette
    float vdist = length(vd) * 1.4142;
    float vig = 1.0 - smoothstep(0.5, 1.0, pow(vdist, uVignetteFalloff)) * uVignetteStrength;
    col *= vig;
    col = clamp(col, 0.0, 1.0);
    if (uColorQuantize > 0.5) col = floor(col * uColorQuantize) / uColorQuantize;   // 7. quantize
    outputColor = vec4(col, inputColor.a);
  }
`;

class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', _gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uExposure',         new THREE.Uniform(1.05)],
        ['uSaturationBoost',  new THREE.Uniform(1.10)],
        ['uVignetteStrength', new THREE.Uniform(0.0)],
        ['uVignetteFalloff',  new THREE.Uniform(1.4)],
        ['uColorTint',        new THREE.Uniform(new THREE.Vector3(1.0, 1.0, 1.0))],
        ['uGrainIntensity',   new THREE.Uniform(0.0)],
        ['uColorQuantize',    new THREE.Uniform(0.0)],
        ['uNightVision',      new THREE.Uniform(0.0)],
        ['uTime',             new THREE.Uniform(0.0)],
      ]),
    });
  }
}

// =============================================================================
//  POSTPROCESSING — pipeline pmndrs (postprocessing), HDR (HalfFloat) + MSAA 4× :
//    RenderPass → N8AO (AO de contact) → Bloom → Grade found-footage [→ SMAA]
//  N8AO remplace le SSAO daté (halo Far Cry 3). Tout tourne en HDR linéaire,
//  l'encodage sRGB final est géré par pmndrs.
// =============================================================================
export const composer = new EffectComposer(renderer, {
  frameBufferType: THREE.HalfFloatType,
  multisampling: 4,                 // MSAA 4× (N8AO désactivé → plus de contrainte depth)
});
composer.addPass(new RenderPass(scene, camera));

// N8AO — occlusion ambiante de contact (n8ao). DÉSACTIVÉ pour l'instant :
// bug de viewport avec notre composer pmndrs quand DPR≠1 → l'AO interne est bien
// full-res (vérifié) mais le blit final ne couvre que le quart haut-gauche.
// À reprendre (patch viewport n8ao). Le reste du pipeline HDR tourne sans lui.
// const _aoSize = renderer.getDrawingBufferSize(new THREE.Vector2());
// export const n8aoPass = new N8AOPostPass(scene, camera, Math.max(1, _aoSize.x), Math.max(1, _aoSize.y));
// n8aoPass.configuration.aoRadius = 1.2; n8aoPass.configuration.intensity = 2.4;
// composer.addPass(n8aoPass);

// Bloom (effet de convolution → passe dédiée) : halo des néons émissifs.
composer.addPass(new EffectPass(camera, new BloomEffect({
  intensity: 0.8, luminanceThreshold: 0.6, luminanceSmoothing: 0.4, mipmapBlur: true,
})));

// Grade found-footage (ex-CartoonPostShader) + SMAA. Shim `cartoonPass.uniforms.*`
// (THREE.Uniform → .value) pour que main.js / graphics-settings pilotent
// exposure/vignette/grain/teinte/vision nocturne sans aucun changement.
const _grade = new GradeEffect();
export const cartoonPass = {
  uniforms: {
    uExposure:         _grade.uniforms.get('uExposure'),
    uSaturationBoost:  _grade.uniforms.get('uSaturationBoost'),
    uVignetteStrength: _grade.uniforms.get('uVignetteStrength'),
    uVignetteFalloff:  _grade.uniforms.get('uVignetteFalloff'),
    uColorTint:        _grade.uniforms.get('uColorTint'),
    uGrainIntensity:   _grade.uniforms.get('uGrainIntensity'),
    uColorQuantize:    _grade.uniforms.get('uColorQuantize'),
    uNightVision:      _grade.uniforms.get('uNightVision'),
    uTime:             _grade.uniforms.get('uTime'),
    uAberration:       { value: 0.0030 },   // dummy (aberration non rebranchée)
  },
};
const _post = [_grade];
if (!PS1_MODE && !PS2_MODE) _post.push(new SMAAEffect({ preset: SMAAPreset.HIGH }));
composer.addPass(new EffectPass(camera, ..._post));

// Stub conservé pour compat ; plus de near/far à syncer en saturation-only
export function syncCartoonPostCamera() { /* no-op */ }

// Résolution interne :
//  - PS1_MODE : 540p upscalé NEAREST (pixelated dur)
//  - PS2_MODE : 540p upscalé LINEAR (résolution PS2 mais propre, ~480p widescreen)
//  - Normal : HD natif avec DPR cap (réglé par graphics-settings)
const PS1_RENDER_HEIGHT = 540;
const PS2_RENDER_HEIGHT = 540; // ~480i PS2 widescreen, un poil au-dessus pour lisibilité HUD
const _szTmp = new THREE.Vector2();
export function maybeResize() {
  const cw = canvas.clientWidth  || window.innerWidth  || 1280;
  const ch = canvas.clientHeight || window.innerHeight || 720;
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr);
  renderer.getSize(_szTmp);
  if (Math.round(_szTmp.x) !== Math.round(cw) || Math.round(_szTmp.y) !== Math.round(ch)) {
    // pmndrs gère renderer.setSize + RTs au drawing buffer (cw*pr). updateStyle par
    // défaut → pose un style inline sur le canvas (= valeur du calc, layout inchangé).
    composer.setSize(cw, ch);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  }
}
window.addEventListener('resize', maybeResize);
maybeResize();

// =============================================================================
//  applyLowPoly / forceNearestFilter
//  - Mode normal : no-op
//  - Mode PS1 : vertex jitter 160×120 + flatShading + NEAREST filter
//  - Mode PS2 : flatShading + slight UV jitter (affine wobble) + BILINEAR
//    (mipmaps OFF, magFilter Linear, anisotropy 1)
// =============================================================================
const PS1_GRID = new THREE.Vector2(160, 120);
const PS2_GRID = new THREE.Vector2(640, 480); // jitter sub-pixel léger PS2

function injectPs1Jitter(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPS1Grid = { value: PS1_GRID };
    shader.vertexShader = 'uniform vec2 uPS1Grid;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       vec4 _ps1pos = gl_Position;
       _ps1pos.xy = floor((_ps1pos.xy / _ps1pos.w) * uPS1Grid + 0.5) / uPS1Grid * _ps1pos.w;
       gl_Position = _ps1pos;`
    );
  };
}

// PS2 : vertex snap subtile (signature de la précision finie VU0/VU1).
// Pas d'affine UV (trop violent visuellement sur les viewmodels et géométrie
// proche caméra — testé, abandonné).
function injectPs2Jitter(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPS2Grid = { value: PS2_GRID };
    shader.vertexShader = 'uniform vec2 uPS2Grid;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       // PS2 vertex snap subtile (precision finie du VU0/VU1)
       vec4 _ps2pos = gl_Position;
       _ps2pos.xy = floor((_ps2pos.xy / _ps2pos.w) * uPS2Grid + 0.5) / uPS2Grid * _ps2pos.w;
       gl_Position = _ps2pos;`
    );
  };
}

// Cache pour éviter de reconvertir un même material plusieurs fois
// (les GLB clonés appellent applyLowPoly sur le matériau original).
const _materialUpgradeCache = new WeakMap();

export function applyLowPoly(material) {
  if (!material) return material;
  if (material instanceof THREE.MeshBasicMaterial) return material;
  if (PS1_MODE) {
    material.flatShading = true;
    injectPs1Jitter(material);
    return material;
  }
  if (PS2_MODE) {
    material.flatShading = true;            // per-vertex Lambert signature PS2
    injectPs2Jitter(material);              // vertex snap subtile
    return material;
  }
  // DA Fortnite/TF2 stylized cartoon : upgrade Lambert/Phong → MeshStandardMaterial
  // PBR léger. Pas de cell-shading (pas de MeshToonMaterial), pas d'outlines noires.
  // Le look stylized vient des textures hand-painted + saturation post-process +
  // exposure boostée + lumière chaude.
  if (material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshPhongMaterial) {
    if (_materialUpgradeCache.has(material)) return _materialUpgradeCache.get(material);
    const std = new THREE.MeshStandardMaterial({
      color:             material.color ? material.color.clone() : new THREE.Color(0xffffff),
      map:               material.map || null,
      emissive:          material.emissive ? material.emissive.clone() : new THREE.Color(0),
      emissiveIntensity: material.emissiveIntensity ?? 1,
      emissiveMap:       material.emissiveMap || null,
      transparent:       !!material.transparent,
      opacity:           material.opacity ?? 1,
      alphaTest:         material.alphaTest ?? 0,
      alphaMap:          material.alphaMap || null,
      depthWrite:        material.depthWrite !== false,
      side:              material.side ?? THREE.FrontSide,
      // Look facetté low poly (Among Us / Crossy Road) si l'option est ON.
      // Sinon smooth (TF2-style) par défaut. Lu une fois au boot.
      flatShading:       FLAT_SHADING,
      roughness:         0.80,
      metalness:         0.0,
    });
    _materialUpgradeCache.set(material, std);
    return std;
  }
  return material;
}

const TEX_KEYS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap',
  'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'specularMap',
];
export function forceNearestFilter(root) {
  if (!root) return;
  if (!PS1_MODE && !PS2_MODE) {
    // Mode normal (Fortnite/TF2) : on en profite pour appliquer le filtrage
    // haute qualité (mipmaps + trilinear + anisotropy max) → réduit
    // drastiquement l'aliasing texture à distance / angles rasants.
    upgradeMeshTextures(root);
    return;
  }
  root.traverse(c => {
    if (!c.isMesh && !c.isSkinnedMesh) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    for (const m of mats) {
      if (!m) continue;
      for (const key of TEX_KEYS) {
        const tex = m[key];
        if (!tex) continue;
        if (PS1_MODE) {
          // PS1 : NEAREST tout-dur, palette dégueulasse
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          tex.anisotropy = 1;
        } else if (PS2_MODE) {
          // PS2 : BILINEAR cheap (linear sans mipmaps = textures qui swimment)
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearFilter; // pas LinearMipmapLinear → look PS2
          tex.generateMipmaps = false;
          tex.anisotropy = 1;
        }
        tex.needsUpdate = true;
      }
    }
  });
}

// =============================================================================
//  OUTLINES — no-op (DA cartoon Fortnite/TF2 : pas d'outlines noires,
//  les silhouettes se lisent via le contraste de couleurs et l'éclairage)
// =============================================================================
// =============================================================================
//  OUTLINES — toutes no-op (DA Fortnite/TF2 sans cel-shading)
//  Les exports sont conservés pour compat avec les callsites existants
//  (~10 dans world.js / enemies.js + import dans weapons.js).
// =============================================================================
export function addInvertedHullOutline(_mesh, _thickness, _color) { return null; }
export function addRimOutline(_mesh, _color, _threshold) { return null; }
export function applyWeaponOutlines(_root, _thickness, _color, _minSize, _rimThreshold) { /* no-op */ }
export function applyOutlinesRecursive(_root, _thickness, _color, _minSize) { /* no-op */ }
