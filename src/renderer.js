import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
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
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: !PS1_MODE && !PS2_MODE });
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
const CartoonPostShader = {
  uniforms: {
    tDiffuse:         { value: null },
    uTime:            { value: 0 },
    uExposure:        { value: 1.05 },
    uSaturationBoost: { value: 1.10 },
    uVignetteStrength:{ value: 0.0 },
    uVignetteFalloff: { value: 1.4 },
    uColorTint:       { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    uGrainIntensity:  { value: 0.0 },
    uColorQuantize:   { value: 0.0 },
    uAberration:      { value: 0.0030 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uExposure;
    uniform float uSaturationBoost;
    uniform float uVignetteStrength;
    uniform float uVignetteFalloff;
    uniform vec3  uColorTint;
    uniform float uGrainIntensity;
    uniform float uColorQuantize;
    uniform float uAberration;
    varying vec2 vUv;

    // ACES filmique (Narkowicz 2015)
    vec3 ACESFilm(vec3 x) {
      float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a*x + b)) / (x * (c*x + d) + e), 0.0, 1.0);
    }

    // Pseudo-random hash pour le grain (Inigo Quilez classic)
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      // Aberration chromatique : décalage RGB croissant vers les bords (lentille caméra)
      vec2 vd = vUv - 0.5;
      float ab = uAberration * dot(vd, vd) * 3.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv - vd * ab).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv + vd * ab).b;

      // 1. Exposure
      col *= uExposure;

      // 2. ACES filmique
      col = ACESFilm(col);

      // 3. Saturation (désat forte SH3)
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturationBoost);

      // 4. Teinte froide subtile (verdâtre/grise SH3)
      col *= uColorTint;

      // 5. Grain léger (effet caméra usée PS2)
      float grain = (hash(vUv * vec2(1920.0, 1080.0) + uTime) - 0.5) * uGrainIntensity;
      col += grain;

      // 6. Vignette radiale dense (vd déjà calculé en haut pour l'aberration)
      float vdist = length(vd) * 1.4142;
      float vig = 1.0 - smoothstep(0.5, 1.0, pow(vdist, uVignetteFalloff)) * uVignetteStrength;
      col *= vig;

      col = clamp(col, 0.0, 1.0);

      // 7. PS2 color quantize (16-bit color depth signature) — actif si > 0
      if (uColorQuantize > 0.5) {
        col = floor(col * uColorQuantize) / uColorQuantize;
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// PIÈGE Three.js : le MSAA hardware (antialias: true du WebGLRenderer) est
// IGNORÉ quand on utilise un EffectComposer — le rendu va dans un renderTarget
// custom sans MSAA. Solution : forcer samples=4 sur le RT du composer pour
// récupérer le MSAA 4x dans le pipeline post-process. Coût : ~20% GPU.
const _composerRT = new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.UnsignedByteType,
  colorSpace: THREE.SRGBColorSpace,
  samples: 4,
});
export const composer = new EffectComposer(renderer, _composerRT);
// SSAO : occlusion ambiante en screen-space → ombres de contact dans les coins,
// jonctions mur/sol/plafond, sous les cloisons. Ancre toute la géo (gros gain
// réalisme). Rend la scène lui-même → remplace le RenderPass.
export const ssaoPass = new SSAOPass(scene, camera, 1, 1);
ssaoPass.kernelRadius = 0.5;     // rayon AO ~0.5 m (échelle mètres)
ssaoPass.minDistance = 0.004;
ssaoPass.maxDistance = 0.10;
composer.addPass(ssaoPass);
// Bloom : les sources émissives (néons) bavent → halo cinématique. threshold
// élevé pour ne capter que les lampes, pas tout l'écran.
export const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 0.62);
composer.addPass(bloomPass);
export const cartoonPass = new ShaderPass(CartoonPostShader);
composer.addPass(cartoonPass);
// SMAA : anti-aliasing post-process en plus du MSAA hardware. Plus net sur
// les bords (silhouettes), surtout combiné au DPR 2.0. Coût ~10-15 % GPU.
// Skip en modes PS1/PS2 où l'aliasing est volontaire.
if (!PS1_MODE && !PS2_MODE) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  composer.addPass(new SMAAPass(size.x, size.y));
}
composer.addPass(new OutputPass());

// Stub conservé pour compat ; plus de near/far à syncer en saturation-only
export function syncCartoonPostCamera() { /* no-op */ }

// Résolution interne :
//  - PS1_MODE : 540p upscalé NEAREST (pixelated dur)
//  - PS2_MODE : 540p upscalé LINEAR (résolution PS2 mais propre, ~480p widescreen)
//  - Normal : HD natif avec DPR cap (réglé par graphics-settings)
const PS1_RENDER_HEIGHT = 540;
const PS2_RENDER_HEIGHT = 540; // ~480i PS2 widescreen, un poil au-dessus pour lisibilité HUD
export function maybeResize() {
  const cw = canvas.clientWidth  || window.innerWidth  || 1280;
  const ch = canvas.clientHeight || window.innerHeight || 720;
  let wInternal, hInternal, pr;
  if (PS1_MODE || PS2_MODE) {
    const targetH = PS1_MODE ? PS1_RENDER_HEIGHT : PS2_RENDER_HEIGHT;
    const scale = targetH / ch;
    wInternal = Math.max(1, Math.round(cw * scale));
    hInternal = Math.max(1, Math.round(ch * scale));
    pr = 1;
  } else {
    pr = Math.min(window.devicePixelRatio || 1, 2);
    wInternal = Math.round(cw * pr);
    hInternal = Math.round(ch * pr);
  }
  if (canvas.width !== wInternal || canvas.height !== hInternal) {
    renderer.setPixelRatio(pr);
    const useInternal = PS1_MODE || PS2_MODE;
    renderer.setSize(useInternal ? wInternal : cw, useInternal ? hInternal : ch, false);
    composer.setSize(useInternal ? wInternal : cw, useInternal ? hInternal : ch);
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
