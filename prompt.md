# BACKROOMS — Prompts Midjourney (textures photoréalistes)

> DA : **liminal horror found-footage photoréaliste** (réf. Kane Pixels).
> On veut des surfaces **vraies, sales, défraîchies** — pas cartoon, pas saturé.
> Les textures sont **seamless/tileable** (carrelables à l'infini) et servent
> d'**albedo** (couleur de base) sur des `MeshStandardMaterial`. Le relief et la
> brillance viennent ensuite (voir §3).

---

## 1. Workflow

1. Génère chaque texture dans **Midjourney** avec le prompt fourni (le paramètre
   `--tile` rend l'image **seamless**).
2. **Upscale** le résultat (bouton U / Upscale), idéalement vers ~**2048×2048**
   (sinon 1024 suffit).
3. Renomme **exactement** avec le nom de fichier indiqué (le code le charge par ce
   nom) et dépose-le dans **`public/textures/`**.
4. Le code charge la texture si elle est là ; **sinon il garde un fallback
   procédural** → le jeu marche même avant que tu aies généré les PNG.

> Pas de Meshy ici : les textures, c'est Midjourney seul. Meshy reste pour les
> **modèles 3D** (entité, props — voir §5).

---

## 2. Règles pour une bonne texture (à garder dans chaque prompt)

- **`--tile`** : seamless (obligatoire).
- **`--ar 1:1`** : carrée.
- **`--style raw --v 6.1`** : photoréalisme sans le « beau » stylisé de MJ.
- Vue **orthographique à plat** (top-down pour sol/plafond, front pour mur) →
  pas de perspective.
- **Éclairage diffus uniforme, pas d'ombres, pas de reflets, pas de vignette** :
  une albedo doit être « plate » sinon les ombres peintes clochent une fois
  relightée en jeu.
- Mots-clés réalisme + ambiance : `worn, grimy, stained, faded, photorealistic`.

---

## 3. Relief & rugosité (normal / roughness) — 2 options

Une seule image MJ = la **couleur** (albedo). Pour le relief :

- **Option A — zéro effort (par défaut).** Tu ne fournis QUE l'albedo. Le code
  en dérive automatiquement un léger relief (`bumpMap` = l'albedo en niveaux de
  gris) + une rugosité fixe. Suffisant pour un gros gain de réalisme.
- **Option B — qualité max.** Passe l'albedo dans un générateur gratuit
  (**NormalMap-Online** : `cpetry.github.io/NormalMap-Online`, ou **Materialize**)
  pour exporter une **normal map** et une **roughness map**. Dépose-les à côté,
  suffixées `_normal` et `_rough` (ex. `carpet_yellow_normal.png`). Le code les
  utilise automatiquement si présentes.

> Commence en Option A. On passera des textures clés en Option B si on veut
> pousser le réalisme.

---

## 4. Textures — NIVEAU 0 (les 3 essentielles)

### 4.1 — Sol : moquette jaune → `carpet_yellow.png`
```
Seamless tileable texture of worn mustard-yellow commercial loop-pile carpet, 1970s office flooring, faded and grimy, subtle dirt patches, faint footprints and traffic wear, fine fibrous detail, flat top-down orthographic view, even diffuse studio lighting, no shadows, no highlights, no vignette, photorealistic PBR albedo, high detail --tile --ar 1:1 --style raw --v 6.1
```
*Note : c'est LA texture signature des Backrooms. Vise un jaune moutarde sale,
pas vif.*

### 4.2 — Murs : papier peint jaune → `wallpaper_yellow.png`
```
Seamless tileable texture of old faded yellow wallpaper, vintage office wall covering, very subtle vertical stripe pattern, brown water stains and moisture damage, discolored grimy patches, slightly bumpy paper surface, flat front orthographic view, even diffuse lighting, no shadows, no highlights, no vignette, photorealistic PBR albedo, high detail --tile --ar 1:1 --style raw --v 6.1
```

### 4.3 — Plafond : dalles acoustiques → `ceiling_tile.png`
```
Seamless tileable texture of a suspended acoustic drop ceiling, a perfectly regular and even grid of identical square tiles, uniform grid with equal spacing on both axes, straight thin grid lines, all tiles exactly the same size and perfectly aligned, white acoustic panels slightly yellowed and water-stained with age, fine speckled surface, flat top-down orthographic view, no perspective, even diffuse lighting, no shadows, photorealistic PBR albedo, high detail --tile --ar 1:1 --style raw --v 6.1
```
> ⚠️ **Grille régulière obligatoire.** La 1re version avait des colonnes régulières mais des **lignes irrégulières** → les luminaires s'alignaient sur un seul axe. Vérifie que les dalles sont **équidistantes dans les deux sens** (idéalement un **3×3 carré** pour matcher la grille de luminaires du code). Si Midjourney n'y arrive pas, le plafond procédural (déjà en jeu, parfaitement aligné) reste le fallback. Pour rebrancher la photo : régénérer régulier → `applyPBR(ceilMat, 'ceiling_tile', BR_COLS)` dans `world.js::buildBackrooms`.

---

## 5. Textures — BONUS (variations / niveaux suivants)

Optionnelles, pour casser la répétition et préparer d'autres salles.

### 5.1 — Béton sale (sol/mur alternatif) → `concrete_dirty.png`
```
Seamless tileable texture of dirty worn concrete floor, industrial basement, grey stained surface, cracks, water marks, dust and grime, flat top-down orthographic view, even diffuse lighting, no shadows, photorealistic PBR albedo, high detail --tile --ar 1:1 --style raw --v 6.1
```

### 5.2 — Tache de moisissure (décalque alpha, à parsemer sur murs/sol) → `decal_mold.png`
```
Isolated patch of dark mold and water damage stain, irregular organic shape, brown and black grime, on transparent background, top-down flat view, even lighting, photorealistic, high detail --ar 1:1 --style raw --v 6.1
```
*(Pas de `--tile` ici : c'est un décalque ponctuel, fond transparent.)*

### 5.3 — Luminaire plafond : PANNEAU CARRÉ → `light_fixture.png`
Un seul panneau fluo **carré** qui remplit le cadre **bord à bord** (il occupe
une dalle de la grille du plafond). **Pas de `--tile`** (carte unique sur un quad,
pas une texture répétée).
```
A single square fluorescent ceiling light panel, viewed straight from below, flat orthographic, a frosted prismatic diffuser filling the entire square frame edge to edge, uniform even glow, no vignette, slightly yellowed and dusty, two faint fluorescent tubes visible through the diffuser, thin dark metal frame at the very edges, photorealistic, high detail --ar 1:1 --style raw --v 6.1
```
> Variante **panneau LED pur** (juste une dalle lumineuse uniforme) : retire
> « two faint fluorescent tubes visible through the diffuser ».
> Le code charge déjà `light_fixture.png` en `map` + `emissiveMap` sur chaque
> dalle-luminaire (loadTex repeat 1) → rien à changer, dépose et recharge.

---

## 6. Modèles 3D (Meshy)

- **Corps du joueur — first-person body** ⭐ ACTIF : personnage complet vu à la
  1re personne (on voit bras / torse / jambes en baissant les yeux, ils tanguent
  en courant). Le code charge déjà `public/models/player.glb` (fallback =
  placeholder en cubes). Dépose le GLB, recharge, c'est branché.
  - **Pose** : debout, **bras le long du corps ou légèrement en avant** (PAS de
    grand T-pose : sinon les bras partent sur les côtés, hors champ).
  - **Tête** : peu importe (la caméra est à sa place). Masquée automatiquement si
    c'est un mesh séparé nommé `head/face/hair/…` ; si ton export est un seul mesh
    et que la tête dépasse, dis-le-moi, je la coupe par seuil de hauteur.
  - **Tenue** : **combinaison hazmat jaune** (la tenue classique des explorateurs
    Backrooms) — capuche + masque à gaz à **visière opaque** : **visage jamais
    visible** (anonyme, plus flippant ; et rien à masquer côté tête en vue FPS).
  - **Meshy** : Image to 3D, Low Poly, **rig + anim de marche si possible** (sinon
    statique, le bob procédural est déjà là).
  - **Réglages** dans `src/player-body.js` au besoin : `TARGET_HEIGHT` (échelle),
    `MODEL_FACING` (s'il regarde à l'envers), `BACK_OFFSET` (avant/arrière).

  Prompt concept Midjourney (→ Meshy) :
```
Full body character concept sheet, person wearing a bright yellow full-body hazmat suit, chemical protective coverall, hood up tightly sealed, industrial gas mask with a dark opaque tinted visor that completely conceals the face, faceless, no visible face, no visible skin, thick rubber gloves and boots, standing straight, arms relaxed down at the sides, neutral A-pose, front view, full figure from head to toe, plain neutral grey studio background, even diffuse lighting, no shadows, photorealistic, high detail --no bare face, exposed skin, eyes --ar 2:3 --style raw --v 6.1
```

### À venir

- **Entité qui traque** (itér. 5) : créature liminale cauchemardesque, pâle et
  décharnée, **sans visage** — elle te poursuit dans les couloirs. Workflow
  Midjourney (concept) → **Meshy AI** (Image to 3D, Low Poly, **rig + anim si
  possible** : il lui faut une démarche/course) → `public/models/entity.glb`.
  - **Pour Meshy** : figure **entière de face, fond gris uni, lumière diffuse
    uniforme** (sinon la conversion 3D bave). La DA sombre vient de l'éclairage
    en jeu, pas du concept — garde le concept clair et net.
  - **Pose** : debout, bras le long du corps ou légèrement écartés (rig propre).

  Prompt Midjourney — *« Le Pâle »* (humanoïde décharné sans visage) :
```
Full body creature concept sheet, tall gaunt emaciated humanoid monster, pale grey clammy waxy skin stretched tight over a skeletal frame, visible ribs and sharp protruding bones, unnaturally long thin elongated limbs, long bony clawed fingers, hunched stalking posture, smooth featureless head with no eyes and a wide gaping lipless mouth lined with needle teeth, mouth slightly agape, standing upright facing forward, full figure from head to toe, plain neutral grey studio background, even diffuse lighting, no harsh shadows, photorealistic, hyperdetailed skin, body horror, nightmarish, deeply unsettling --ar 2:3 --style raw --v 6.1
```
  - Variantes pour pousser l'horreur : tête → `a head split vertically into a
    gaping toothy maw, no eyes` ; peau → `skin like melted dripping wax` ;
    membres → `too many joints, limbs bent the wrong way`.
- **Props** (chaises renversées, néons cassés, panneaux de sortie, caméscope) :
  idem Midjourney → Meshy → `public/models/`.

> Rappel : `public/models/*.glb` est **gitignoré** (lourds, régénérés souvent).
> Les textures `public/textures/*.png` sont **versionnées** (plus légères).
