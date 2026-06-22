# CALL OF ZOMBIES — Claude context

FPS horde-survival **solo / coop local 1-2 joueurs**, mono-map, esthétique
**DARK PBR semi-réaliste** (lumière locale dramatique, vraies shadows
projetées, fog dense). Pitch : *Le dernier bus ne viendra pas. Le dépôt
désaffecté est devenu ta dernière ligne de défense. Survis le plus longtemps
possible.* Boucle classique du genre : kill → argent → wall buys / mystery
box / perks → vagues plus dures.

Le user (Dylan) est **francophone — réponds en français sauf demande contraire**.

## Historique des renommages

Pour comprendre les commits anciens / variables qui datent :

| Période | Nom du jeu | Dossier / repo |
|---------|-----------|----------------|
| Origine | **DEAD MALL** (centre commercial multi-zones) | `dead-mall` |
| Pivot MVP | **HORDE** (mono-zone BUS DEPOT) | idem |
| Été 2025 | **Pacific Storm** (détour Place des Cocotiers de Nouméa) | idem |
| Actuel | **CALL OF ZOMBIES** (retour BUS DEPOT) | idem |

Le **dossier et le repo GitHub restent `dgadacha/deadmall`** pour ne pas
casser les remotes. Seul le nom UI affiché change : title HTML, h1 du menu,
écran de chargement, commentaires CSS.

## Comment lancer

```sh
cd ~/Documents/dead-mall
python3 -m http.server 8000
# puis http://localhost:8000 dans Chrome
```

**Important** : *pointer-lock* (capture souris) ne marche qu'en http/https,
pas en `file://`. Double-cliquer `index.html` = rien ne marchera.

Aucun build, aucun `npm install`. Three.js (r154) chargé depuis jsDelivr via
importmap dans `index.html`. Modifier un module → recharger l'onglet.

## Stack

- **Three.js r154** via CDN jsDelivr (pinné — r155+ casse les intensités lumières)
- **Vanilla JS** modules ES (`<script type="module">`)
- **importmap** pour résoudre `three` et `three/addons/`
- **WebAudio** synthèse procédurale (aucun asset audio)
- **CanvasTexture** procédurales + PNG dans `public/textures/`
- **GLTFLoader** pour tous les modèles dans `public/models/` (Midjourney → Meshy AI)

## Architecture

```
dead-mall/                       # le dossier garde son nom historique
├── index.html                   # DOM lean : canvas, overlays, loading screen, écrans
├── style.css                    # tout le visuel HUD/écrans, palette Call of Zombies
├── CLAUDE.md                    # ce fichier
├── prompt.md                    # prompts Midjourney/Meshy (assets GLB + textures)
├── .gitignore                   # IMPORTANT : public/models/*.glb ignorés
├── public/
│   ├── models/                  # GLB Midjourney/Meshy — GITIGNORÉS (voir plus bas)
│   ├── textures/                # PNG floor/wall/sign
│   └── maps/                    # docs LD perso (markdown, non chargés à runtime)
├── editor/                      # éditeur de map standalone (URL séparée)
└── src/
    ├── main.js                  # init + boucle + game state transitions
    ├── loading.js               # ★ NOUVEAU : LoadingManager + écran de chargement
    ├── config.js                # constantes (ARENA, EYE, WEAPONS, FOG, PERKS, …)
    ├── state.js                 # état mutable partagé : player, wave, game, ammo, owned
    ├── renderer.js              # scene/camera/renderer + maybeResize + applyLowPoly
    ├── world.js                 # BUS DEPOT (mono-zone) + buy stations + barricades
    ├── player.js                # PointerLockControls + WASD + collision + camera shake
    ├── weapons.js               # viewmodel + tir hitscan + recharge + unlock perks
    ├── enemies.js               # zombies + vagues + cadavres
    ├── effects.js               # particules + tracers + flaques de sang
    ├── audio.js                 # drone ambiant + SFX + heartbeat + grognements
    ├── hud.js                   # DOM (HUD, écrans, prompts, vignette)
    ├── gallery.js               # viewer 3D des modèles
    └── graphics-settings.js     # presets qualité (low/med/high)
```

Hiérarchie d'imports (pas de cycles) :
```
config ────┐
state ─────┼── hud ─────┐
audio ─────┤            │
loading ───┘            │
renderer ── world ──┴── player ── enemies ──┐
                                            ├── weapons
                                  effects ──┘
                                                main (orchestre tout)
```

## La map : BUS DEPOT (mono-zone, plate, no étages)

C'est le concept ORIGINAL du projet, restauré après les détours
Pacific Storm / Place des Cocotiers / Nuketown.

Cour extérieure **44 × 44** entourée d'un mur d'enceinte, avec au centre un
bâtiment **DEPOT 18 × 12** (hauteur intérieure 5m). 2 bus stationnés bord
nord, 4 voitures abandonnées éparpillées, 4 lampadaires aux coins.

```
                       N (mur d'enceinte)
   ┌──────────────────────────────────────┐
   │ ★ PISTOL                  OLYMPIA ★ │  ← Wall buys + lampes coins
   │      🚌            🚌                 │  ← 2 bus bord nord
   │                                       │
   │  🚗      ┌──────────┐         🚗      │
   │          │  ↑ porte │                 │
   │ 💊IRON   │  DEPOT   │ 💊REGEN  💊TANK │  ← Perks E/O + NE
   │          │  18×12   │                 │
   │          │  ↓ porte │                 │
   │  🚗      └──────────┘         🚗      │
   │                                       │
   │ 💊BRUTE        📦 box        💊QUICK │  ← Mystery sud + 2 perks coins
   │ ★ BAT                          MP5 ★ │
   └──────────────────────────────────────┘
                       S (mur)
```

- **Entrées du depot** : porte large nord + porte large sud (passages vides,
  pas de battant). Zombies peuvent y entrer en ligne droite.
- **Fenêtres barricadées** : 2 sur le mur est, 2 sur le mur ouest, ~2m de
  haut, 4 planches en travers (visuel V1). Mécanique cassage/rebuild = TODO.
- **Wall buys** (4 aux coins de la cour, contre le mur d'enceinte) :
  PISTOL AMMO (250), OLYMPIA fusil à pompe (500), MP5 SMG (1000), BAT mêlée (250).
- **Mystery Box** : bord sud de la cour (0, 16). 950$ par usage.
- **Perks (5)** : voir section dédiée plus bas.
- **Spawns zombies** : 8 points sur les bords de la cour (3 N, 3 S, 1 E, 1 O).
- **Spawn joueur** : centre de la cour (0, 0), face nord.

## Perks (5 actifs)

| Perk | Inspi générique du genre | Effet | Coût | Position |
|------|-------------------------|-------|------|----------|
| **REGEN** | (équivalent autoheal) | +HP/sec après 5s sans dégât | 2500 | Est du dépôt |
| **IRON** | (équivalent armure) | +100 armure max instant | 2500 | Ouest du dépôt |
| **BRUTE** | (équivalent damage boost) | +50% dégâts armes à feu | 2000 | Coin SO |
| **QUICK** | (équivalent reload boost) | -40% temps de recharge | 1500 | Coin SE |
| **TANK** | (équivalent vitesse) | +30% vitesse de course | 2000 | Coin NE |

Constantes dans `config.js` : `PERK_BRUTE_DAMAGE_MUL`, `PERK_IRON_ARMOR_BONUS`,
`PERK_QUICK_RELOAD_MUL`, `PERK_TANK_SPEED_MUL`, `PERK_REGEN_DELAY`,
`PERK_REGEN_RATE`.

Flags dans `state.js::player.perks` : `regen, brute, iron, quick, tank,
nightVision, lightUpgrade` (les 2 derniers stubs sans machine posée).

Unlock functions dans `weapons.js` : `unlockRegen/Brute/Iron/Quick/Tank/etc.`
Câblées dans `main.js::setActionHandlers`.

HUD : icônes rondes B/I/Q/T/R en bottom-left, couleurs CSS dans `style.css`.

## Workflow assets GLB (gitignored)

**`public/models/*.glb` est dans `.gitignore`**. Raisons :
1. Le user les régénère souvent via Midjourney → Meshy AI
2. Certains dépassent les limites GitHub (kiosque_musique.glb = 127 MB > 100 MB)
3. Pas envie d'engorger le repo avec des binaires lourds qui changent souvent

Workflow :
1. Le user édite un prompt dans `prompt.md`
2. Midjourney → image PNG du prop
3. Meshy AI → GLB à partir de l'image (option Low Poly, texture 1024)
4. User dépose le `.glb` dans `public/models/`
5. Si pas déjà branché : code le loader dans `world.js` ou ajoute au mapping
6. **Loading screen** précharge tout au démarrage → spawn instantané

GLB actuellement utilisés (présents en local sur la machine du user) :
- `bus.glb`, `car.glb`, `lampadaire_colonial.glb`, `mystery_box.glb`
- `perk_machine_{regen,iron,brute,quick,tank}.glb`
- `pistol.glb`, `shotgun_fps.glb`, `zombie.glb`
- + héritage Place des Cocotiers (kiosque, fontaine_celeste, cocotier,
  banc_jardin, brick_wall_module, brick_bench_module) — restent sur disque
  mais les loaders ont été mis en bloc commentaire dans `world.js`.
  Réutilisables via l'éditeur si on veut redécorer.

Textures PNG dans `public/textures/` (versionnées car plus légères) :
- `floor_paves_brique`, `floor_pelouse`, `floor_depot_concrete`
- `wall_depot`, `wall_fence_brick`
- `sign_bus_depot`, `sign_wall_{pistol_ammo,olympia,mp5,bat}`

## Loading screen

Singleton `THREE.LoadingManager` partagé dans `src/loading.js`. Tous les
`new GLTFLoader()` sont créés avec `new GLTFLoader(loadingManager)`. Les
images PNG (via `loadPng` dans `world.js`) sont trackées manuellement avec
`trackImageStart/trackImageEnd`.

Au démarrage :
1. `#loading-screen` overlay visible (titre Call of Zombies + barre de
   progression orange + texte "X/Y assets")
2. Menu caché via classes `hidden pre-load`
3. Chaque GLB/PNG terminé incrémente la barre
4. Quand `loaded === total` → fade-out loading + révèle menu
5. Joueur clique "Commencer" → spawn instantané, **plus de flash arme
   procédurale → GLB**

Failsafe : timeout 10s qui débloque le menu de force (au cas où une
extension navigateur bloque un asset).

## Palette UI (Call of Zombies)

Tout passé en **orange brûlé / crème / noir** pour cohérence avec l'écran
de chargement. Variables CSS dans `:root` (`style.css`) :

- `--accent: #ffb347` (orange clair, highlight)
- `--primary: #e35d3a` (orange brûlé, bouton primaire — le orange du "Zombies" du titre)
- `--bg: #0a0a14` (noir bleuté sombre)
- `--surface: #14141c` (cards/modales)
- `--text: #f7f1d8` (crème — le "Call of" du titre)
- `--text-muted: #b8ad94`

L'in-game garde son éclairage DARK PBR (lampes coloréés sur les
interactables, etc.) — la palette orange concerne le menu / loading /
settings, pas la scène 3D elle-même.

## Conventions

- **Modules ES** purs, imports relatifs `'./xxx.js'`. Pas de bundler.
- **État partagé** via objets mutables exportés depuis `state.js` (`player`,
  `wave`, `game`, `ammo`, `owned`). Les modules importent et mutent.
- **Pas de classes** sauf quand Three l'impose. Fonctions + closures.
- **Pas de TypeScript**. Pas de tests automatisés.
- **Commits** : messages courts en français, présent narratif. Préfixes
  optionnels `feat:`, `fix:`, `refactor:`, `style:`, `chore:`. Pas d'emoji.
- **Co-auteur des commits** : `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Constantes magiques** dans `config.js` si réutilisées, sinon inline.
- **Pas de README.md** sauf demande explicite. Ce CLAUDE.md fait office de doc.

## Choix techniques 3D (in-game)

### Style DARK PBR (la scène 3D, pas l'UI)

1. **`applyLowPoly` est no-op** — materials gardent leur shading d'origine
   (Lambert pour procédural, Standard pour GLB). Helper reste exporté pour
   ne pas casser les ~50 appels existants.

2. **`forceNearestFilter`, `addInvertedHullOutline`, `applyOutlinesRecursive`
   tous no-op** — héritages de tentatives cel-shading abandonnées.

3. **ACES filmique** avec `exposure = 0.95` — courbe cinéma qui préserve
   les highlights des spotlights sur fond noir.

4. **Shadows PCF Soft**. Moon DirectionalLight shadowMap 2048², frustum
   ±25m. SpotLights interactables shadowMap 512², frustum near 0.5 far 8.

5. **Antialiasing ON** + `setPixelRatio(min(DPR, 2))` rétina.

6. **Éclairage dark** :
   - AmbientLight `0x404048 × 0.15` (très basse)
   - DirectionalLight moon `0x8090b0 × 0.18` (bleu froid faible) castShadow
   - HemisphereLight sky `0x2a3040` / ground `0x1a1410` × 0.10
   - PointLight néons depot (jaune sale) + 4 lampadaires aux coins
   - SpotLight castShadow au-dessus de chaque interactable :
     - 4 wall buys → jaune `#ffd680`, intensité 7
     - 1 mystery box → doré `#ffc040`, intensité 9
     - 5 perk machines → couleur par perk (vert/bleu/rouge/jaune/olive), 8
   - Helper `addInteractableSpot(x, y, z, color, intensity)`

7. **Fog DENSE** : `FOG_NEAR=5, FOG_FAR=32, FOG_COLOR=0x121410` (brun-vert
   sale). Atmosphère oppressante.

8. **Skybox quasi-noir** : top `0x040408`, horizon `0x10141c`. Étoiles
   à peine visibles.

9. **CastShadow / receiveShadow** géré globalement via
   `setupShadowsRecursive` qui parcourt la scène en fin de build.

10. **Post-process** : `CartoonPostShader` (legacy nom) fait juste
    saturation × 0.85.

### Audio 100% procédural (WebAudio)

`audio.js` ne charge aucun asset. Drone ambiant (sawtooth 41Hz + sine 55Hz),
heartbeat HP<60, SFX tir/recharge/hit/death procéduraux, grognements
lointains toutes les 5-14s.

### Pointer-lock = vrai geste utilisateur

`controls.lock()` ne peut être déclenché que sur un `click` réel — pas de
test automatique du gameplay possible, vérification manuelle.

### r154 pinné

Three pinné en **0.154.0**. À partir de r155, `useLegacyLights` passe à
`false` par défaut → spam console + multiplier les intensités PointLight/
SpotLight par ~10-15.

### Camera shake via CSS

Le shake `transform: translate(x,y)` le canvas (`inset:-12px`) au lieu de
toucher `camera.quaternion` (qui se battrait avec PointerLockControls).

## Mécaniques implémentées

- **Vagues** : `4 + wave*3` zombies, cap 22 actifs simultanés.
- **Économie** : kill body = $50, headshot = $100, +$10 par hit. Constantes
  dans `config.js` : `REWARD_HIT`, `REWARD_BODY`, `REWARD_HEAD_BONUS`.
- **Armes** : pistol (départ ∞ réserve), shotgun, smg, bat, axe (mêlée).
- **5 perks** actifs (REGEN, BRUTE, IRON, QUICK, TANK) — voir section dédiée.
- **Wall buys** : 4 panneaux contre le mur d'enceinte (PISTOL AMMO, OLYMPIA,
  MP5, BAT).
- **Mystery Box** : 950$ par usage, RNG armes. Pas encore d'animation
  "peluche s'envole" ni de relocalisation.
- **HUD round romain** : flash + persistant en bas-centre.
- **Score popups** : +10 (hit) / +50 (body) / +100 (head) / +130 (head + perk).
- **Loading screen** : précharge tous les GLB/PNG avant le menu.

## Mécaniques à implémenter (prochaines étapes)

Ordre proposé :

1. **Barricades fenêtres reconstructibles** : zombies arrachent 1 planche/sec
   à une fenêtre, joueur appuie E proche pour rebuild (+10 pts/planche).
2. **Power-ups drops** : random kill → power-up flotte 10s — Max Ammo,
   Double Points, Insta-Kill, Nuke, Carpenter (rebuild toutes barricades).
3. **Knife** : touche V, hit conique courte portée, insta-kill jusqu'à
   round 8 puis dégâts dégressifs.
4. **Crawlers** : grenade aux jambes → zombie rampant (utile pour acheter
   en fin de vague).
5. **Round-start animation** : son de gong + "ROUND X" qui apparaît avec
   slash sang, fog s'épaissit 2s, drone monte d'une octave.
6. **Mystery box "peluche s'envole"** : après N usages, RNG de relocalisation
   vers un autre slot pré-défini.
7. **Coop local 2 joueurs** (split-screen ou hot-seat) : grosse feature,
   demande refonte input + caméra.

## Pièges connus

- **`flatShading` sans effet sur `BoxGeometry`** (faces déjà planes).
- **`window.innerWidth` peut être 0** dans certains environnements headless.
  `maybeResize` a un fallback `|| 1280`.
- **Pointer-lock requiert http** — JAMAIS recommander `file://`.
- **Les zombies cadavres restent dans `zombies[]`** pendant le fade. Toute
  fonction qui itère doit filtrer par `userData.alive`.
- **Stubs zones** : `getZone()`, `switchToZone()`, etc. sont des stubs
  MVP mono-zone. Ne pas les utiliser pour de la nouvelle logique.
- **GLB > 100 MB rejetés par GitHub** → `kiosque_musique.glb` (127 MB) a
  causé un push refusé. Solution : tous les GLB sont dans `.gitignore`.
- **`git pull` silencieux sur untracked files** : si des fichiers non-suivis
  sont sur le point d'être écrasés par un pull, ça peut échouer en silence.
  Toujours `git status` après pull.

## Notes Dylan

Dylan (`encheres.nc@gmail.com`). Francophone. Dev JS/React, pas Go ni
shader. Aime Netflix UX, low-friction (zéro build, zéro asset versionné),
self-hoste sur homelab.

Autre projet majeur : **Kuro** (fork seanime rebrandé Netflix, à
`~/Documents/seanime`).

Pour Call of Zombies : préfère **simplicité** sur configurabilité, **proto
rapide** sur architecture parfaite. Les itérations valident d'abord le
*fun* avant de complexifier.

Repo GitHub : `dgadacha/deadmall` (nom historique, ne pas renommer pour ne
pas casser les remotes — seul le nom UI affiché du jeu change).

Identité git locale : `user.name="Dylan"`, `user.email="dylan@tealforge.com"`.
