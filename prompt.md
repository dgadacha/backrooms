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
Seamless tileable texture of suspended acoustic drop-ceiling tiles, white panels yellowed and water-stained with age, fine fissured perforated surface, faint metal T-grid lines between panels, flat bottom-up orthographic view, even diffuse lighting, no shadows, no highlights, photorealistic PBR albedo, high detail --tile --ar 1:1 --style raw --v 6.1
```

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

### 5.3 — Néon plafond (luminaire, pour habiller les tubes) → `light_fixture.png`
```
Seamless tileable texture of a long fluorescent ceiling light fixture, white plastic diffuser panel, slightly yellowed, dust inside, flat bottom-up view, even diffuse lighting, no harsh highlights, photorealistic PBR albedo, high detail --tile --ar 1:1 --style raw --v 6.1
```

---

## 6. À VENIR — modèles 3D (Meshy, plus tard)

Pas pour tout de suite — placeholder pour l'itération « entité ».

- **Entité qui traque** (itér. 3) : créature liminale cauchemardesque. Workflow
  Midjourney (image de concept) → **Meshy AI** (Image to 3D, Low Poly, rig si
  possible) → `public/models/entity.glb`. Prompt à affiner le moment venu.
- **Props** (chaises renversées, néons cassés, panneaux de sortie, caméscope) :
  idem Midjourney → Meshy → `public/models/`.

> Rappel : `public/models/*.glb` est **gitignoré** (lourds, régénérés souvent).
> Les textures `public/textures/*.png` sont **versionnées** (plus légères).
