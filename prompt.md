# Pacific Storm — Prompts Midjourney / Meshy AI
## DA : Fortnite × Team Fortress 2 — stylized cartoon PBR (sans cel-shading)

> Style **cartoon stylized** type *Fortnite Battle Royale* et *Team Fortress 2* :
> proportions chunky lisibles, **textures lisses HD saturées** (pas de hand-painted
> visible, pas de peinture coup-de-pinceau, surface clean smooth moderne),
> palette saturée chaude **golden hour** (oranges, jaunes, bleus francs).
> Style joyeux/heroique : zombies cartoony pas horror, ambiance fin d'après-midi doré.
> Textures **1024×1024** smooth. Densité de polygones gérée par l'option
> **Low Poly** de Meshy — pas de count cible imposé dans les prompts.
> Le rendu en jeu utilise `MeshStandardMaterial` PBR + ombres douces PCFSoftShadowMap →
> tes assets modern PBR vont s'intégrer naturellement.

---

## ⚙️ Paramètres Meshy AI (à appliquer à TOUS les GLB)

| Setting | Valeur |
|---|---|
| Mode | Image to 3D |
| Topology | **Triangle** |
| Polycount | **Low Poly** (toggle Meshy) — laisse Meshy choisir, pas de cible imposée |
| Texture résolution | **1024×1024** partout |
| Style | Stylized |
| Material | Standard (sera converti en MeshStandardMaterial au code) |
| A-pose | Oui pour persos, non pour props |
| Auto-rig | Oui pour persos humanoïdes, non pour props |

> **Tip texture** : on veut un look **lisse smooth HD** (pas painterly, pas hand-painted
> visible coup-de-pinceau). Imagine la surface d'un perso Fortnite : aplats de couleur
> saturés smooth avec gradient doux, pas de textures grumeleuses. Évite aussi les
> outlines noires peintes dans la texture (clip avec le rendu PBR clean).

---

# §0 — BRANDING (logo du jeu)

## 0.1 — `logo_pacific_storm.png` (1920×1080, fond transparent)

> Logo principal du jeu **Pacific Storm**, pour l'écran titre et les communications.
> Le nom évoque le Pacifique (référence locale Nouvelle-Calédonie) + la tempête /
> chaos de la horde de zombies. Visuellement : vagues océan + foudre tempête,
> palette tropicale (cobalt + cyan + orange coucher de soleil).

```
Bold cinematic video game logo for a Pacific island zombie survival shooter
titled "Pacific Storm", two-word stacked logo with "PACIFIC" smaller on top and
"STORM" massively bigger underneath taking most of the frame, massive chunky
impact display lettering for STORM, comic block sans-serif font similar to
Bangers or Burbank, all caps, slight italic forward tilt for dynamic energy,
vibrant saturated cobalt blue (#1670d0) and bright cyan (#00c8e8) gradient fill
on "STORM" letters with thick black outline (8-10 px) around each letter, big
drop-shadow stack in deep navy blue offset down-right then black behind for 3D
pop, smaller "PACIFIC" word in warm orange (#ff9e2c) sunset color with same
black outline, dynamic painted lightning bolt accents striking through some of
the STORM letters in bright electric yellow (#ffd23a), small stylized ocean wave
swooshes wrapping around the bottom of the logo in cyan, clean smooth Fortnite/TF2
stylized cartoon rendering (no faceted low poly, no flat shading), 3D animation
movie render quality, polished surfaces, soft volumetric lighting, isolated on
plain neutral grey background centered horizontally, no extra text, no characters,
no zombies, no weapons, just the words PACIFIC STORM
--ar 16:9 --v 6.1 --style raw --no photorealism, no horror grunge, no anime, no chibi, no faceted low poly, no flat shading, no extra text, no characters in the frame, no palm trees
```

**Process** :
1. Génère en 1920×1080 sur Midjourney
2. Ouvre dans GIMP → Select by color sur le fond gris → Delete → Export PNG transparent
3. Place dans `public/textures/logo_pacific_storm.png`
4. Affiche sur le menu principal via CSS background-image ou `<img>` dans `index.html`

---

## 0.2 — `logo_pacific_storm_compact.png` (512×512, fond transparent) — optionnel

> Variante carrée compacte pour favicon, share image OG, ou icône PWA.
> Juste "STORM" + lightning bolt + petite vague.

```
Compact square logo icon for "Pacific Storm" zombie shooter video game, the
single word "STORM" in massive bold chunky impact display lettering filling
the square frame, comic block sans-serif font, all caps, vibrant saturated
cobalt blue and bright cyan gradient fill with thick black outline (10 px)
around each letter, big drop-shadow in deep navy for 3D pop, dynamic painted
lightning bolt accent in bright electric yellow (#ffd23a) striking through
the middle of the word, single stylized ocean wave swoosh in cyan wrapping
around the bottom edge, smooth Fortnite/TF2 stylized cartoon render quality
(no faceted low poly, no flat shading), polished surfaces, soft lighting,
isolated on plain neutral grey background, no extra text, no characters
--ar 1:1 --v 6.1 --style raw --no photorealism, no horror grunge, no anime, no chibi, no faceted low poly, no extra text, no character, no palm trees
```

**Process** : mêmes étapes que logo principal mais format 512×512.

---

# §1 — PERSONNAGES (Meshy image-to-3D)

## 1.1 — `player.glb` (joueur survivant)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
character model lone male survivor late 20s
slightly stylized comic proportions with slightly larger head, sharp
angular jaw, expressive eyes, short messy brown
hair rendered in flat tones with soft strokes for hair clumps, dark olive green canvas work jacket painted in flat saturated colors
with smooth shading on the folds, teal grey t-shirt
visible under collar, dark olive cargo pants with smooth shading, brown leather boots in two tones medium and dark slate grey backpack with bold contrasting straps, palette of olive
green teal grey warm brown leather dark slate warm cinematic lighting, sharp clean silhouette readable from far, full
body front view A-pose with arms slightly lowered at 30 degrees, feet
shoulder-width apart, neutral confident expression looking straight at
camera, plain neutral medium grey background, character centered head
to feet visible, modern stylized 3D character cartoon aesthetic
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no chibi, no T-pose, no weapons in hands, no held objects, no dynamic pose, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · A-pose · auto-rig humanoid

---

## 1.2 — `zombie_trucker.glb` (zombie variant A : routier)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
zombie character model undead truck driver male
40s comic proportions, gaunt sunken face painted with flat sickly green
skin tone and dark teal shadow under cheekbones rendered in hard
boundary, sunken bloody eye sockets one milky white with bold
black outline, mouth hanging open painted with smooth yellow rotten
teeth, greasy dark hair drawn in flat black ink clumps, dirty red plaid
flannel shirt with sharp flat color fills washed brick red and dark
brown shadows, oil-stained denim jeans torn at knees in two tones
indigo blue, heavy leather work boots flat dark brown, brass belt
buckle painted as bright flat ochre yellow with single highlight, bold
applatss no soft gradients, vibrant Fortnite TF2 palette
sickly green skin oxblood plaid faded indigo denim with magenta neon
rim accents, dramatic graphic novel lighting, twisted hunched posture
shoulders rolled forward, full body front view A-pose, plain neutral
medium grey background, character centered head to feet visible
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no chibi, no T-pose, no weapons, no held objects, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · A-pose · auto-rig humanoid

---

## 1.3 — `zombie_busdriver.glb` (zombie variant B : conducteur de bus)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
zombie character model undead transit bus driver
male early 50s comic proportions, gaunt face painted with flat clammy
greenish skin and hard-edged darker mid-tone shadow under jaw, sunken
dark eye sockets one milky white the other bloodshot painted in bold
flat red, mouth half-open with smooth broken yellow teeth, dirty
gauze bandage on left forearm painted as flat off-white with sharp
brown-red blood patch, faded blue-grey transit company uniform shirt
flat shaded with darker shadow band along the side, embroidered round
chest patch reading DEPOT 04 in bold flat letters, dark navy trousers
with bold contrasting side stripe, black work shoes flat black, grey
conductor cap battered with soft painted highlight, thick black outlines
around silhouette and uniform seams, vibrant Fortnite TF2 palette faded transit
blue grey sickly green skin oxblood patches teal shadows magenta rim
light flat fillss, full body front
view A-pose arms lowered 30 degrees, feet shoulder-width apart, neutral
expression, plain neutral medium grey background, character centered
head to feet
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no chibi, no T-pose, no weapons, no held objects, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · A-pose · auto-rig humanoid

---

## 1.4 — `zombie_mechanic.glb` (zombie variant C : mécanicien)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
zombie character model undead garage mechanic male
mid 30s comic proportions, gaunt face painted flat sickly green skin
tone with sharp hard-edged darker olive shadow along jaw and cheekbones one ear missing leaving a flat dark red wound with bold black outline mouth open with smooth broken teeth, dark navy mechanic coverall
jumpsuit painted in flat saturated dark blue
across the chest, sleeves torn at elbows showing decayed forearms in
flat green skin with magenta neon rim, blackened greasy hands painted
flat black, dirty heavy steel-toe work boots flat dark brown, bold
embroidered name patch reading MIKE on right chest in flat ochre yellow loose leather tool belt with one rusty socket wrench in flat ochre, bold
noir comic
palette dark navy grease black sickly green skin oxblood wound ochre
patch accents with magenta neon rim light, full body front view A-pose twisted posture left shoulder noticeably dropped, plain neutral medium
grey background, character centered head to feet
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no chibi, no T-pose, no weapons, no held objects, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · A-pose · auto-rig humanoid

---

## 1.5 — `zombie_traveler.glb` (zombie variant D : voyageur en hoodie)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
zombie character model undead young male traveler
late 20s comic proportions, dark grey hooded sweatshirt painted flat
slate grey with darker shadow on the chest and inside the
hood, hood half pulled up casting bold flat black shadow over hollow
face leaving only glowing magenta neon eyes visible, dark wash jeans
torn at knees in two tones deep indigo, beat-up white sneakers stained
flat brown patches, small canvas backpack hanging loose by one strap
with rip painted as carved slash, gaunt pale skin tinted bluish
green visible on chin and neck with smooth shading, dark cheap
headphones around neck painted flat black with magenta cord, fingerless
wool gloves in flat dark grey
and all clothing folds, vibrant Fortnite TF2 palette slate grey dark indigo
sickly green skin magenta neon eye glow oxblood accents, dramatic
graphic novel smooth lightings, full body front
view A-pose, twisted posture left arm dangling unnaturally below the
elbow, plain neutral medium grey background, character centered
head to feet
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no chibi, no T-pose, no weapons, no held objects, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · A-pose · auto-rig humanoid

---

## 1.6 — `zombie_boss_butcher.glb` (boss : ouvrier d'abattoir)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
boss zombie character model massive intimidating
undead slaughterhouse butcher male 50s extra-tall heavily-built comic
proportions broad shoulders thick neck, gaunt brutal face painted flat
sickly green skin with hard-edged darker olive shadow, deep sunken
eyes glowing flat magenta neon with bold black outline rim, mouth
half-open with smooth broken yellow teeth, dirty white butcher's
apron painted flat off-white with massive splatters of saturated
brick-red blood as hard-edged shapes covering chest and waist, dark
grey work pantswith darker shadow, heavy black rubber
boots flat black, thick leather butcher belt with multiple flat-shaded
hooks and chains hanging, hands flat black blood-caked with bold ink
outline, bald scalp painted flat with sharp shadow boundary, bold
slightly thicker than regular zombies to emphasize size, dramatic
vibrant Fortnite TF2 palette blood-splattered white apron sickly green skin
oxblood saturated red oxide blood patches dark grey pants with bold
magenta neon rim light from behind, dramatic graphic novel back-lit
silhouette feel, full body front view A-pose with arms slightly
lowered at 30 degrees imposing posture, plain neutral medium grey
background, character centered head to feet visible, intimidating
boss design
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic skin grunge, no horror, no anime, no chibi, no T-pose, no weapons in hands, no held cleaver, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · A-pose · auto-rig humanoid

---

# §2 — ARMES (Meshy image-to-3D, prop objet)

## 2.1 — `pistol.glb`

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a 9mm semi-automatic pistol Beretta-style hard-edged
smooth shading, body matte black with sharp lighter mid-tone band
along the upper slide, brown wooden grip painted in two flat tones, bold
magazine
visible at the grip in flat dark grey no specular highlights
isolated object front-three-
quarter view on plain neutral medium grey background, weapon centered graphic novel illustration aesthetic
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge textures, no horror vibe, no anime style, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.2 — `shotgun_olympia.glb`

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a sawed-off double-barrel shotgun Olympia-style vibrant stylized textures twin
barrels painted in flat gunmetal grey with sharp darker shadow band
underneath, dark stained walnut wood stock and pump in two tones warm
brown with bold brass hammer details painted
flat ochre yellow with single bold highlight
around silhouette and major form breaks
isolated object front-three-quarter view on plain
neutral medium grey background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge metal, no horror, no anime, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.3 — `smg_mp5.glb`

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an MP5 submachine gun 
flat colors body matte black with sharp
lighter mid-tone bands along upper receiver and forearm grip, retractable
metal stock in flat dark grey, plastic foregrip in two tones dark grey,
30-round straight magazine inserted in flat black, 
outlines around silhouette
highlights as flat shapes, isolated object front-three-quarter view on
plain neutral medium grey background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.4 — `bat.glb`

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an aluminum baseball bat wrapped in barbed wire vibrant stylized textures 
shaft in flat metallic silver-grey with bold darker shadow strip along
one side, grip wrapped in flat black tape, barbed wire spiraling around
the upper half painted as flat dark grey with sharp pointed barbs and
small flat oxblood blood splatters at the tip
around silhouette, PBR stylized friendly baked in texture as flat
shapes, isolated object diagonal view on plain neutral medium grey
background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.5 — `axe.glb`

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a fireman's axe flat
colors large axe head in two tones metallic
grey with one darker shadow side and sharp ink-outlined cutting edge red-painted shaft handle in flat saturated red with smooth shadow
along bottom, leather wrap on grip in flat dark brown, 
outlines around silhouette and bold flat
highlights, isolated object diagonal view on plain neutral medium grey
background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.6 — `rifle_m14.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an M14 battle rifle 
flat colors body in matte gunmetal grey
with sharp darker mid-tone shadow band, polished walnut wood stock and
forearm in two tones warm brown with soft stylized 
20-round magazine inserted in flat black, iron sights in flat black smooth flat colored
highlights, isolated object front-three-quarter view on plain neutral
medium grey background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.7 — `rifle_ak.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an AK-47 assault rifle 
flat colors body in matte black with sharp
lighter mid-tone bands, iconic banana-shaped curved magazine in flat
black, warm orange-brown polished wood stock pistol grip and forearm in
smooth with bold 
silhouette isolated object
front-three-quarter view on plain neutral medium grey background weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.8 — `lmg_m60.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an M60 light machine gun with bipod 
vibrant stylized textures heavy body in
matte black with sharp lighter mid-tone band, bipod legs deployed
folded forward in flat dark grey, hanging belt of brass cartridges
painted in flat ochre yellow on each individual
shell, thick wooden carry handle stock in two tones warm brown, bold
PBR stylized friendly with 
isolated object front-three-quarter view on plain neutral medium grey
background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.9 — `shotgun_pump.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a pump-action shotgun Remington 870 
vibrant stylized textures long barrel in
flat dark gunmetal with darker shadow strip underneath, ribbed pump
forearm in two tones dark brown wood, stock in flat warm brown wood
with bold ink grain, magazine tube under barrel in flat dark grey, bold
PBR stylized friendly with 
isolated object front-three-quarter view on plain neutral medium grey
background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.10 — `sniper_hunting.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a bolt-action hunting rifle with scope vibrant stylized textures long
barrel in matte gunmetal grey, polished dark walnut wood stock and
forearm in two tones with bold scope mounted
on top painted flat black with darker shadow underside and bold ink
ring detail at lens, bolt-action handle in flat dark grey, bold black
object front-three-quarter view on plain neutral medium grey background weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.11 — `rocket_rpg.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an RPG-7 rocket launcher 
flat colors long launch tube in flat olive
green with darker shadow band underneath, wooden pistol grip and forearm
in flat warm brown, large conical rocket warhead loaded at the front in
smooth dark grey, simple iron sights flat black, 
outlines around silhouette, 
object front-three-quarter view on plain neutral medium grey background weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.12 — `machete.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a long machete flat
colors wide blade in two tones metallic
silver-grey with bold ink-outlined cutting edge and sharp darker shadow
strip along spine, small flat saturated blood smear near tip, dark
brown wooden grip wrapped with frayed leather strap in two tones, brass
end-cap painted flat ochre,
PBR stylized friendly with isolated object diagonal view on plain
neutral medium grey background, weapon centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 2.13 — `arc_gun.glb` (mystery box wonder weapon)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a sci-fi tesla electric arc rifle 
vibrant stylized textures futuristic body in
flat dark blue-grey with bold magenta and cyan neon emission panels
running along the sides as flat saturated stripes, exposed copper coils
spiraling around the front muzzle painted in flat copper-orange with
sharp darker shadow, cyan neon glowing energy core visible through a
window panel painted as flat saturated cyan with bold ink ring outline trigger guard and grip in matte black, 
silhouette bold flat neon glow as solid color
shapes (post-process bloom adds the actual glow in game), isolated
object front-three-quarter view on plain neutral medium grey background weapon centered, Fortnite TF2 stylized cartoon aesthetic
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

# §2bis — VIEWMODELS FPS (mains + arme, Meshy image-to-3D)

> Mêmes armes que §2 mais avec les bras / mains du joueur, vues
> à la première personne. Pose : avant-bras vers le bas-droit du cadre,
> arme orientée vers l'avant à 30°. A-pose pas applicable.
>
> ⚠️ **Spécifique viewmodel** : la caméra est très proche → les **facettes
> polygonales seront visibles** si la texture / l'ombrage les met en avant.
> Insiste sur **smooth rounded forms, soft gradient shading, no visible
> polygon edges** dans le prompt + dans les negatives. Pas de "chunky angular
> proportions" ici (réservé aux props lointains).

## §2bis.1 — `pistol_fps.glb`

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding a Beretta-style 9mm semi-automatic pistol
 first-person POV camera angle, both hands
visible gripping the pistol, dark olive sleeve
cuffs visible on forearms in olive green with smooth fabric draping, skin painted warm beige with subtle skin shading and soft contact shadows on the knuckles, pistol body matte black with
subtle satin reflection on the slide, brown wooden grip with smooth polished varnish, isolated viewmodel
on plain neutral medium grey background, hands centered at bottom of
frame weapon pointing forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person view, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.2 — `shotgun_fps.glb`

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding a sawed-off double-barrel Olympia
shotgun first-person POV, both hands gripping
the wooden forearm and pistol grip, dark olive
sleeve cuffs in olive green with smooth fabric draping, beige skin with
hard shadow on knuckles, twin barrels in flat gunmetal grey with sharp
darker band underneath, dark walnut wood stock and forearm with smooth tonal blending
warm brown with ink grain strokes, brass hammer details flat ochre highlights, isolated viewmodel on plain neutral medium grey background hands centered at bottom weapon pointing forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.3 — `smg_fps.glb` (MP5)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding an MP5 submachine gun first-person POV, right hand on pistol grip left hand on
foregrip, dark olive sleeve cuffs in flat olive
with smooth fabric draping, beige skin with subtle skin shading, MP5 body matte black
with subtle satin reflection on upper receiver, retractable metal stock
folded against shoulder in flat dark grey, plastic foregrip with smooth tonal blending
dark grey, magazine inserted flat black, 
silhouette, 
neutral medium grey background, hands centered at bottom weapon pointing
forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.4 — `bat_fps.glb` (batte clouée)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male right hand holding a barbed wire wrapped aluminum
baseball bat first-person POV, single hand
gripping the taped handle with soft painted highlight, dark olive sleeve
cuff in olive with smooth fabric draping, beige skin with hard shadow
on knuckles, aluminum shaft in flat metallic silver-grey with darker
shadow strip, grip wrapped in flat black tape, barbed wire spiral
painted as flat dark grey with sharp pointed barbs and small flat
oxblood blood splatters at the tip, 
silhouette, 
plain neutral medium grey background, hand centered at bottom-right
bat extending up-left
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.5 — `axe_fps.glb` (hache pompier)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male right hand holding a fireman's axe first-person POV, single hand gripping the red-painted shaft
with soft painted highlight, dark olive sleeve cuff in olive with two-
tone folds, beige skin with subtle skin shading on the knuckles, axe head in two-
tone metallic grey with ink-outlined cutting edge, shaft in flat
saturated red with smooth shadow, leather wrap on grip flat dark
brown
highlights, isolated viewmodel on plain neutral medium grey background hand centered at bottom-right axe extending up-left
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.6 — `rifle_m14_fps.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding an M14 battle rifle first-person POV, right hand on pistol grip left hand under
forearm, dark olive sleeve cuffs in flat olive
with smooth fabric draping, beige skin with subtle skin shading, M14 body in matte
gunmetal grey, polished walnut wood stock and forearm with smooth tonal blending warm
brown with 20-round magazine flat black, 
outlines around silhouette, 
viewmodel on plain neutral medium grey background, hands centered at
bottom weapon pointing forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.7 — `rifle_ak_fps.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding an AK-47 assault rifle first-person POV, right hand on pistol grip left hand on
wooden forearm, dark olive sleeve cuffs in flat
olive with smooth fabric draping, beige skin, AK body matte black with lighter
subtle satin reflection, iconic curved banana magazine flat black, warm orange-
brown wood stock pistol grip and forearm with smooth tonal blending with ink wood
grain
highlights, isolated viewmodel on plain neutral medium grey background hands centered at bottom weapon pointing forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.8 — `lmg_m60_fps.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding an M60 light machine gun first-person POV, right hand on pistol grip left hand on
wooden carry handle stock, dark olive sleeve
cuffs in olive with smooth fabric draping, beige skin, heavy M60 body
matte black with subtle satin reflection, hanging belt of brass cartridges
in flat ochre yellow with ink outlined shells, wooden carry stock in
smooth warm brown
only isolated viewmodel on plain neutral medium
grey background, hands centered at bottom weapon pointing forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.9 — `shotgun_pump_fps.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding a Remington 870 pump shotgun first-person POV, right hand on pistol grip left hand
on ribbed pump forearm, dark olive sleeve cuffs
in olive with smooth fabric draping, beige skin, long barrel flat dark
gunmetal with darker shadow strip underneath, ribbed pump forearm
smooth dark brown wood, stock warm brown wood with ink grain, magazine
tube under barrel flat dark grey, 
silhouette, 
neutral medium grey background, hands centered at bottom weapon pointing
forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.10 — `sniper_hunting_fps.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding a bolt-action hunting rifle with scope
 first-person POV, right hand on pistol grip
left hand under wooden forearm, dark olive
sleeve cuffs in olive with smooth fabric draping, beige skin, long
barrel matte gunmetal grey, polished dark walnut stock with smooth tonal blending
warm brown with scope mounted on top painted flat
black with darker underside and painted accent ring detail at lens, bolt-
action handle flat dark grey, 
silhouette, 
neutral medium grey background, hands centered at bottom weapon pointing
forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.11 — `rocket_rpg_fps.glb` (mystery box)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding an RPG-7 rocket launcher first-person POV, right hand on pistol grip left hand on
wooden forearm, dark olive sleeve cuffs in flat
olive with smooth fabric draping, beige skin, long launch tube in flat olive
green with darker shadow band, large conical rocket warhead loaded at
the front with smooth tonal blending dark grey, wooden grip and forearm in flat warm
brown with simple iron sights flat black, bold black
isolated viewmodel on plain neutral medium grey background, hands
centered at bottom weapon pointing forward
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.12 — `machete_fps.glb` (mystery box mêlée)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male right hand holding a long machete first-person POV, single hand gripping the dark brown wooden
handle with soft painted highlight, dark olive sleeve cuff in olive with
smooth folds, beige skin with subtle skin shading on the knuckles, wide blade in
smooth metallic silver-grey with ink-outlined cutting edge and darker
shadow strip along spine, small flat saturated blood smear near tip handle wrapped with frayed leather strap, brass end-cap flat
ochre
highlights, isolated viewmodel on plain neutral medium grey background hand centered at bottom-right machete extending up-left
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

## §2bis.13 — `arc_gun_fps.glb` (mystery box wonder weapon)

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated colors, friendly designs) rendered as a smooth high-quality 3D animation, polished subdivision surface, soft volumetric shading, modern Blender Cycles render quality 3D
viewmodel of male hands holding a sci-fi tesla electric arc rifle first-person POV, both hands gripping the futuristic
body, dark olive sleeve cuffs in olive with
smooth folds, beige skin, body in flat dark blue-grey with bold
magenta and cyan neon emission stripes running along the sides as
saturated flat shapes, exposed copper coils at front muzzle in flat
copper-orange with darker shadow, cyan neon energy core glowing through
window panel as solid flat saturated cyan, trigger guard and grip matte
black
flat neon shapes (the actual bloom is added in-game post-process),
isolated viewmodel on plain neutral medium grey background, hands
centered at bottom weapon pointing forward, neon noir aesthetic
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no third-person, no full body, no faceted low poly geometry, no visible polygon edges, no Crossy Road, no Among Us angular, no Fortnite chunky proportions, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · viewmodel pose

---

# §3 — MAP BUS DEPOT — textures (seamless tileable sauf indication)

> Format **PNG carré seamless tileable**, **résolution 1024×1024** sauf indication.
> Style **textures vibrantes**, smooth color variations, palette
> Fortnite/TF2 (couleurs chaudes saturées). Pas d'outlines noires (le pipeline
> est PBR, pas cel-shading). Le brouillard golden hour de la scène et la lumière
> chaude se chargent du reste de l'ambiance.

## 3.1 — `floor_asphalt.png` (cour extérieure)

```
Seamless tileable square texture of urban cracked asphalt road surface in
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style flat
medium dark grey base color with darker shadow patches and
sharp lighter highlights for worn spots, bold ink crack lines drawn
flat black running diagonally across, scattered small flat yellow road
paint chip fragments, small flat oxblood blood stains, no soft gradients
no realistic asphalt photography only flat painted comic book texture clean tileable edges no border, top-down orthographic view, square 1:1
ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 3.2 — `floor_depot_concrete.png` (intérieur depot)

```
Seamless tileable square texture of polished industrial concrete floor in
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style flat
medium cool grey base color with darker shadow patches and
sharp lighter highlights for polished spots, bold ink expansion joint
lines drawn flat black in regular grid pattern, scattered small flat
oxblood blood drips, no soft gradients only flat painted comic texture clean tileable edges no border, top-down orthographic view, square 1:1
ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 3.3 — `wall_depot.png` (mur intérieur/extérieur depot)

```
Seamless tileable square texture of industrial painted wall surface in
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style flat
warm medium beige-grey base color with darker shadow patches
where paint chipped and lighter highlights, bold ink rust streaks
running vertically drawn flat dark brown, scattered small flat magenta
neon glow reflections suggesting nearby signs, no soft gradients only
flat painted comic book texture, clean tileable edges, orthographic
front view, square 1:1 ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 3.4 — `wall_fence_brick.png` (mur d'enceinte briques)

```
Seamless tileable square texture of dirty industrial red brick wall in
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style flat
oxblood-red base color with darker shadow on mortar lines
and brick gaps and sharp lighter highlights on brick top edges, mortar
lines drawn as bold flat dark grey rectangles in offset brick pattern no soft gradients only flat painted comic book bricks, clean tileable
edges, orthographic front view, square 1:1 ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 3.5 — `bus_body_yellow.png` (carrosserie bus, tileable)

```
Seamless tileable square texture of school bus yellow painted metal body
panel in Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style
flat saturated school-bus yellow base color with hard-edged darker
ochre shadow patches for dents and sharp lighter cream-yellow highlights
on bumps, bold ink rivet circles in regular pattern flat black, scattered
small flat oxblood blood splatters and flat dark green mold patches, no
soft gradients only flat painted comic texture, clean tileable edges orthographic side view, square 1:1 ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 3.6 — `plank_wood.png` (planches barricades, tileable)

```
Seamless tileable square texture of weathered wooden planks in Fortnite TF2 Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style flat warm
medium brown base color with darker shadow on plank seams
and sharp lighter highlights on plank surfaces, bold painted wood grain
strokes drawn flat dark brown running horizontally, scattered flat ochre
yellow rusty nail circles, no soft gradients only flat painted comic
texture, clean tileable edges, orthographic front view, square 1:1
ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 3.7 — `metal_corrugated.png` (toit/panneau métal ondulé, tileable)

```
Seamless tileable square texture of corrugated metal sheet panel in
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style flat
medium cool grey base color with darker shadow strips
running vertically for each corrugation valley and sharp lighter
highlights on each corrugation peak creating bold striped
pattern, scattered flat dark brown rust patches at the bottom, no soft
gradients only flat painted comic texture, clean tileable edges orthographic front view, square 1:1 ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

# §4 — PROPS GAMEPLAY (Meshy image-to-3D)

## 4.1 — `mystery_box.glb`

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a glowing mysterious wooden crate 
vibrant stylized textures dark warm brown
wood planks in two tones with bold ink grain strokes, ornate flat ochre
yellow brass bands and rivets wrapping the box, large bold question mark
symbol painted flat saturated magenta on the top lid, glowing magenta
neon edges around the lid drawn as solid flat saturated magenta strips
(in-game bloom will add the actual glow)
around silhouette, 
front-three-quarter view on plain neutral medium grey background, prop
centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge wood, no horror, no anime, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.2 — `perk_machine_regen.glb` (REGEN)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a retro vintage vending machine 
vibrant stylized textures tall rectangular
body painted flat saturated emerald green with darker shadow
band along one side, glass front panel revealing a single glowing potion
bottle inside, bottle painted flat saturated lime green with bold ink
ring outline and flat highlight, bold flat black REGEN label across
the top in comic block lettering, ornate flat ochre brass coin slot and
return slot, four small dark brown rubber feet at the base, bold black
and panel frames
highlights, isolated object front view on plain neutral medium grey
background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.3 — `perk_machine_tank.glb` (TANK)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a retro vintage vending machine 
vibrant stylized textures tall rectangular
body painted flat saturated steel-blue with darker shadow
band, glass front panel revealing a single glowing potion bottle, bottle
painted flat saturated electric blue with soft painted highlight and flat
highlight, bold flat black TANK label across the top in comic block
lettering, ornate flat ochre brass coin slot, dark brown rubber feet and panel frames isolated object front view on plain neutral medium
grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.4 — `perk_machine_quick.glb` (QUICK)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a retro vintage vending machine 
vibrant stylized textures tall rectangular
body painted flat saturated warm orange with darker shadow
band, glass front panel revealing a single glowing potion bottle, bottle
painted flat saturated bright orange with soft painted highlight and flat
highlight, bold flat black QUICK label across the top in comic block
lettering, ornate flat ochre brass coin slot, dark brown rubber feet and panel frames isolated object front view on plain neutral medium
grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.5 — `perk_machine_brute.glb` (BRUTE)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a retro vintage vending machine 
vibrant stylized textures tall rectangular
body painted flat saturated oxblood red with darker shadow
band, glass front panel revealing a single glowing potion bottle, bottle
painted flat saturated crimson with soft painted highlight and flat highlight bold flat black BRUTE label across the top in comic block lettering ornate flat ochre brass coin slot, dark brown rubber feet, bold black
and panel frames
highlights, isolated object front view on plain neutral medium grey
background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.6 — `perk_machine_iron.glb` (IRON)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a retro vintage vending machine 
vibrant stylized textures tall rectangular
body painted flat saturated charcoal black with darker shadow
band, glass front panel revealing a single glowing potion bottle, bottle
painted flat saturated metallic silver with soft painted highlight and flat
highlight, bold flat magenta IRON label across the top in comic block
lettering, ornate flat ochre brass coin slot, dark brown rubber feet and panel frames isolated object front view on plain neutral medium
grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.7 — `street_lamp.glb`

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an urban street lamp pole hand-
painted flat colors tall thin metal pole
in flat charcoal grey with sharp darker shadow strip along one side flat ochre brass base ring, single curved arm extending from the top
holding a vintage neon-style luminaire fixture with flat black housing
and a glowing magenta neon tube visible behind a clear panel painted
as solid flat saturated magenta (in-game bloom will add the glow), bold
PBR stylized friendly with 
isolated object front view on plain neutral medium grey background prop centered with the lamp head at top of frame
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.8 — `barricade_planks.glb` (barricade planches)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a hastily nailed wooden plank barricade vibrant stylized textures three
horizontal weathered planks in flat warm medium brown with bold ink
wood grain strokes and sharp darker shadow on seams, scattered flat
ochre rusty nail heads, splintered ends drawn as bold ink jagged
silhouettesoverall silhouette
only isolated object front view on plain neutral
medium grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge wood, no horror, no anime, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.9 — `bench_waiting.glb` (banc salle d'attente)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a vintage industrial waiting bench 
vibrant stylized textures dark stained
wooden slat seat and backrest in two tones warm brown with bold ink
wood grain, flat black wrought-iron metal frame legs and armrests with
sharp darker shadow strip,
PBR stylized friendly with isolated object front-three-quarter
view on plain neutral medium grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 4.10 — `vending_machine.glb` (distributeur générique)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a rusty vintage soda vending machine 
vibrant stylized textures tall rectangular
body painted flat saturated dark teal with darker shadow band
and scattered flat dark brown rust patches, glass front showing colorful
flat saturated soda cans behind in red blue green yellow each with bold
bold flat black SODA label at top in comic block
lettering, flat ochre brass coin slot and dispensing tray, dark brown
rubber feet and panel
frames, 
plain neutral medium grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

# §4bis — PROPS DE CLUTTER (densification cour)

## §4bis.1 — `dumpster.glb` (conteneur poubelle)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an industrial steel dumpster hand-
painted flat colors large rectangular body
painted flat saturated forest green with darker shadow band
along one side and scattered flat dark brown rust patches and flat
black graffiti tags as bold painted texture strokes, hinged steel lid open slightly
in smooth flat green, two flat black plastic side wheels at the base flat ochre brass corner reinforcement plates
around silhouette, 
front-three-quarter view on plain neutral medium grey background, prop
centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## §4bis.2 — `bus_shelter.glb` (abri arrêt de bus)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an urban bus stop shelter hand-
painted flat colors rectangular structure
with flat black metal frame uprights and roof, three transparent panels
on the back painted as bold flat shapes around faintly tinted
glass, single advertising panel on one side painted flat saturated
magenta with bold flat black BUS comic block lettering, simple wooden
bench underneath in two tones warm brown, 
silhouette, 
three-quarter view on plain neutral medium grey background, prop
centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## §4bis.3 — `shed.glb` (cabanon maintenance)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a small industrial maintenance shed 
vibrant stylized textures rectangular
corrugated metal walls in flat medium cool grey with smooth striped
corrugation pattern as bold lighter and darker bands, single rusty
wooden door in flat warm brown with bold ink panel lines and small flat
ochre brass handle, flat oxblood red roof in two tones, scattered flat
dark brown rust patches at the base, 
silhouette and panel frames, 
object front-three-quarter view on plain neutral medium grey background prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## §4bis.4 — `pallet_stack.glb` (empilement de palettes)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a stack of three wooden shipping pallets vibrant stylized textures each
pallet in flat warm medium brown wood with bold 
sharp darker shadow boundary between each stacked pallet and along the
slat gaps, scattered flat ochre rusty nail heads on the corner brackets highlights, isolated object front-three-quarter view on plain neutral
medium grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge wood, no horror, no anime, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## §4bis.5 — `trash_bag_pile.glb` (tas sacs poubelle)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a pile of three or four bulging black trash bags vibrant stylized textures 
bags in flat charcoal black with sharp lighter mid-tone highlights on
the bulges and darker shadow folds where bags compress against each
other, small flat ochre yellow drawstring ties visible at the tops scattered flat oxblood liquid stains on the ground around the base highlights, isolated object front-three-quarter view on plain neutral
medium grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## §4bis.6 — `wall_buy_panel.glb` (plaque générique wall buy)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of a rectangular weapon wall-mount display panel vibrant stylized textures base
panel in flat dark warm brown wood with bold ink grain, ornate flat
ochre brass corner brackets and rivets, blank space in the center where
a sign sticker will be applied dynamically (game will overlay the
sign_wall_*.png decal), no
PBR only isolated object front view on plain
neutral medium grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no black outlines, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

# §5 — VÉHICULES (Meshy image-to-3D)

## 5.1 — `bus_taneo.glb` (bus urbain Tanéo abandonné)

> Bus urbain européen moderne style **Setra S 415 LE business** avec livrée
> **Tanéo** (réseau de bus de Nouvelle-Calédonie / référence locale Dylan).
> Carrosserie blanche dominante, vagues bleues et orange dynamiques sur les
> flancs, logo Tanéo italique noir avec accent orange.

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant
textures, chunky cartoony proportions) 3D prop model of an abandoned modern
European urban city transit bus inspired by Setra S 415 LE business model,
single-deck low-floor city bus with sleek angular design, body painted dominant
clean white with dynamic flowing painted wave decals on the side panels in
saturated cobalt blue and bright orange and soft cyan running from front to
back, large italic "Tanéo" wordmark logo painted in bold black serif lettering
on the lower side panels with a small curving orange-and-blue swoosh accent
underneath, large panoramic side windows with dark tinted glass, big front
windshield wraparound design, four large dark grey wheel arches, six big black
rubber tires, sleek black front bumper with integrated LED headlight clusters,
electronic destination display panel above the windshield, single rear door
with two side doors on the right, scattered subtle dust and grime patches
showing the bus has been abandoned for a while but not destroyed, smooth
polished surfaces, isolated object front-three-quarter view on plain neutral
medium grey background, vehicle centered, abandoned static empty
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge metal, no horror, no anime, no school bus yellow, no American school bus, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · vehicle prop

> ⚠️ Si tu changes le nom du fichier `bus_taneo.glb`, pense à mettre à jour
> le chemin dans `src/world.js` (cherche `busLoader.load('public/models/bus.glb'`).
> Sinon laisse le fichier final s'appeler `bus.glb` pour matcher le code.

---

## 5.2 — `car_sedan.glb` (berline abandonnée)

```
Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style (vibrant textures, chunky cartoony proportions) 3D
prop model of an abandoned 1990s American sedan car vibrant stylized textures body
in flat saturated rusty deep red with darker shadow band and
scattered flat dark brown rust patches and flat dust patches, flat
darker grey wheel arches, four black rubber tires flat with sharp ink
outline two of them deflated drawn as compressed flat shapes, windshield
and side windows painted as bold flat shapes around dark slate
tinted glass with cracks drawn flat dark, flat dark grey bumpers, bold
PBR stylized friendly with 
isolated object front-three-quarter view on plain neutral medium grey
background, vehicle centered, abandoned static
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge metal, no horror, no anime, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · vehicle prop

---

# §6 — DECALS & SIGNALÉTIQUE (PNG fond transparent)

> Format **PNG transparent** sauf indication. Style flat illustrations comic book.

## 6.1 — `sign_bus_depot.png` (1024×512)

```
Vintage urban bus depot facade signboard in Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style, large rectangular metal sign painted flat
saturated forest green base with bold flat black BUS DEPOT comic block
serif lettering, scattered flat dark brown rust patches at the corners flat ochre brass rivets at the corners, 
the sign rectangle and letters, single small magenta neon outline glow
around the lettering as flat solid magenta strips no
PBR no realistic metal, transparent background, sign centered horizontal
ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 6.2 — `sign_wall_pistol_ammo.png` (512×256)

```
Small rectangular wall-mounted weapon shop sign in Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style, base panel painted flat dark warm brown wood, large bold flat black "PISTOL AMMO" comic block lettering across the top half, simple stylized illustration of a 9mm cardboard ammunition box in the center-left painted flat ochre yellow with brass cartridges visible, bold neon green price tag "$250" painted in the bottom-right corner with thick black outline white highlight and slight 3D drop-shadow, four flat ochre brass corner rivets, vibrant cartoon textures smooth surface, transparent background, sign centered ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no Unreal Engine 5 photoreal
```

---

## 6.3 — `sign_wall_olympia.png` (512×256)

```
Small rectangular wall-mounted weapon shop sign in Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style, base panel painted flat dark warm brown wood, large bold flat black "OLYMPIA" comic block lettering across the top half, simple stylized illustration of a sawed-off double-barrel shotgun in the center painted flat gunmetal grey and warm brown wooden stock, bold neon green price tag "$500" painted in the bottom-right corner with thick black outline white highlight and slight 3D drop-shadow, four flat ochre brass corner rivets, vibrant cartoon textures smooth surface, transparent background, sign centered ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no Unreal Engine 5 photoreal
```

---

## 6.4 — `sign_wall_mp5.png` (512×256)

```
Small rectangular wall-mounted weapon shop sign in Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style, base panel painted flat dark warm brown wood, large bold flat black "MP5" comic block lettering across the top half, simple stylized illustration of an MP5 submachine gun in the center painted matte black with lighter grey mid-tone band on receiver, bold neon green price tag "$1000" painted in the bottom-right corner with thick black outline white highlight and slight 3D drop-shadow, four flat ochre brass corner rivets, vibrant cartoon textures smooth surface, transparent background, sign centered ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no Unreal Engine 5 photoreal
```

---

## 6.5 — `sign_wall_bat.png` (512×256)

```
Small rectangular wall-mounted weapon shop sign in Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style, base panel painted flat dark warm brown wood, large bold flat black "BAT" comic block lettering across the top half, simple stylized illustration of a barbed-wire-wrapped aluminum baseball bat in the center painted flat metallic silver-grey with flat dark grey barbed wire spiraling around, bold neon green price tag "$250" painted in the bottom-right corner with thick black outline white highlight and slight 3D drop-shadow, four flat ochre brass corner rivets, vibrant cartoon textures smooth surface, transparent background, sign centered ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no Unreal Engine 5 photoreal
```

---

## 6.6 — `decal_blood_splatter.png` (512×512)

```
Large flat blood splatter stain in Fortnite Team Fortress 2 stylized cartoon
comic book style flat saturated oxblood-red base color
with sharp hard-edged darker burgundy shadow drops and a few flat lighter
crimson highlights around all major splatter shapes irregular splatter pattern with droplets radiating outward and small
satellite droplets, no soft gradients no realistic blood photography
only flat painted comic book splatter, transparent background, splatter
centered square 1:1
--ar 1:1 --v 6.1 --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 6.7 — `decal_graffiti_run.png` (512×256)

```
Urban spray-paint graffiti tag in Fortnite Team Fortress 2 stylized cartoon
comic book style, single word RUN painted with bold dripping flat
saturated magenta brushstrokes, sharp
hard-edged drip streaks running down from each letter as flat magenta
shapes, no soft gradients no realistic spray paint texture only flat
painted comic graffiti, transparent background, text centered ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 6.8 — `decal_graffiti_help.png` (512×256)

```
Urban spray-paint graffiti tag in Fortnite Team Fortress 2 stylized cartoon
comic book style, single word HELP painted with bold dripping flat
saturated cyan brushstrokes, sharp
hard-edged drip streaks running down from each letter as flat cyan
shapes, no soft gradients only flat painted comic graffiti, transparent
background, text centered ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 6.9 — `poster_missing.png` (512×768)

```
Wheat-pasted urban missing person poster in Fortnite Battle Royale and Team Fortress 2 stylized cartoon PBR style, off-white paper background painted flat with
torn corners drawn as bold ink jagged silhouettes, bold flat black
MISSING block lettering across the top, simple flat illustration portrait
of a young woman and flat smooth face painted
in beige skin and dark brown hair, small flat black phone number text
below, faded flat ochre water stain in one corner, soft stylized panel
outline vibrant textures, transparent background poster centered vertical ratio 2:3
--ar 2:3 --v 6.1 --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

## 6.10 — `plate_generic.png` (512×256)

```
Generic urban license plate in Fortnite Team Fortress 2 stylized cartoon comic
book style, rectangular metal plate painted flat off-white base with
sharp darker shadow band along one edge, bold flat black serif letters
and numbers reading random sample HRD-2003 in comic block lettering small flat oxblood rust stain at one corner, outline
around the plate vibrant textures, transparent
background, plate centered ratio 2:1
--ar 2:1 --v 6.1 --style raw --no photorealism, no soft gradients, no realistic, no anime, no Unreal Engine 5
```

---

# §7 — PLACE DES COCOTIERS (Nouméa) — assets dédiés

> Réplique de la place historique du centre-ville de Nouméa. Map 400×120m,
> 4 sous-places sur l'axe est-ouest. Génère ces 9 assets avec ton workflow
> Midjourney → Meshy habituel (option Low Poly), puis place les GLB dans
> `public/models/`.

## 7.1 — `kiosque_musique.glb` (centerpiece Place Feillet) — Nouméa réf.

> Kiosque à musique colonial français de la Place Feillet à Nouméa. Structure
> à **deux niveaux** : un grand kiosque octogonal ouvert (rez), surmonté
> d'une **lanterne octogonale** plus petite et ajourée. Toiture en deux
> sections tôle ondulée rouge brique. Tout en bois blanc ouvragé style
> victorien colonial, avec **frises de dentelle de bois** très ajourées en
> haut des colonnes. Au sommet, une **lyre dorée** (symbole musical).
> ~10m de diamètre × ~9m de hauteur.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a 19th century French colonial Victorian
octagonal music bandstand pavilion two-tier structure, main lower level is
a large eight-sided open pavilion about 10 meters wide with about sixteen
slender vertical white painted wood columns evenly spaced around the
octagonal perimeter (two columns per side), each column topped with
intricately carved ornate openwork lacy wooden brackets and frieze arches in
saturated white forming a decorative scalloped trim band wrapping the entire
upper edge, low waist-height white wooden balustrade with regularly spaced
turned spindle balusters running between every column except the entrance
gaps, flat white painted wooden plank ceiling visible underneath, first
roof is an octagonal pyramidal saturated brick-red corrugated metal sheet
roof with visible vertical ridges and a flat red-painted wooden fascia trim
band along the bottom edge, upper level is a smaller octagonal lantern
cupola sitting on top of the main roof with eight short wooden columns and
visible Saint-Andrew cross truss bracing struts between them forming a
decorative X pattern on each face (open lattice structure), upper smaller
octagonal pyramidal saturated brick-red corrugated metal roof matching the
lower one, single vertical finial mast topped with a small ornamental golden
brass lyre musical symbol pointing upward, low brick paver base only one
step high in saturated warm terracotta red bricks, no walls (fully open
pavilion accessible from all sides), smooth polished surfaces, isolated
object front view at slight low angle showing the full two-tier height on
plain neutral medium grey background
--ar 16:9 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no faceted low poly, no Tanit symbol, no crescent moon, no closed walls, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object  
**Format MJ** : 16:9 plutôt que 1:1 pour bien voir la verticalité du double étage

---

## 7.2 — `fontaine_celeste.glb` (centerpiece Place de la Paix) — Nouméa réf.

> Fontaine Céleste de la Place de la Paix à Nouméa. Style néo-Renaissance
> Beaux-Arts. Structure verticale ~8m : plateforme octogonale en gradins
> → bassin large encastré → niveau intermédiaire avec 8 jets radiaux et
> putti sculptés → 2ᵉ bassin octogonal plus haut → colonne cannelée
> classique → statue de Céleste (femme drapée gréco-romaine). Matériau
> pierre calcaire crème/beige patinée (PAS marbre blanc pur).

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a 19th century French neo-Renaissance Beaux-
Arts ornate public stone fountain monument about 8 meters tall total, fully
carved from stone (no organic figures, only sculptural monument), octagonal
stepped base platform with four concentric ascending stone steps in
saturated warm cream-beige weathered limestone leading up to the main basin,
large octagonal main basin embedded into the base with carved ornamental
decorative relief panels around its outer wall showing classical floral and
shell motifs, raised central pedestal column rising from the basin center
decorated with four small classical-style decorative carved cherub motif
reliefs sculpted around it and eight short water spout nozzles at mid-height
pointing outward radially in eight directions (frozen no water effect),
pedestal topped by a second smaller octagonal upper basin with a thick
moulded rim resting on the pedestal, single tall classical fluted column
rising up from the upper basin in matching cream-beige stone with vertical
groove ridges and a Corinthian capital, single fully draped robed allegorical
stone sculpture monument figure standing upright on the column top fully
covered head to toe in long flowing fabric drapery folds reaching the floor,
allegorical sculpture holding stone-carved fabric folds in both hands, the
sculpture is entirely made of solid carved cream-beige stone, all stone
surfaces painted in saturated warm cream-beige with subtle weathered patina
shadows in carved details, smooth polished surfaces overall, isolated object
front view showing the full height on plain neutral medium grey background,
no water no flowing liquid (frozen state), prop centered upright
--ar 9:16 --v 6.1 --style raw --no photorealism, no realistic, no horror, no anime, no faceted low poly, no broken statue, no red colored lighting, no nudity, no skin, no flesh tones, no living people, no real woman, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object  
**Format MJ** : 9:16 portrait pour capturer toute la hauteur

---

## 7.3 — `statue_poignee_main.glb` (Place de la Paix, symbole réconciliation)

> Statue moderne représentant la poignée de main historique entre Jean-Marie
> Tjibaou et Jacques Lafleur (accords de Matignon 1988). Style sculptural
> abstrait épuré sur un socle en pierre.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of an abstract modern bronze sculpture
representing two arms reaching forward to shake hands in a peaceful handshake
gesture symbolizing reconciliation, two stylized arms emerging from opposite
sides of a smooth polished bronze sculpted form, hands meeting and gripping
firmly in the center, smooth polished warm bronze surface, mounted on a tall
rectangular stone pedestal of carved smooth grey-beige marble about 1.5
meters tall, simple commemorative plaque on the pedestal front, isolated
object front-three-quarter view on plain neutral medium grey background, prop
centered upright
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic, no horror, no anime, no faceted low poly, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 7.4 — `cocotier.glb` (alignements le long des allées)

> Cocotier tropical, tronc légèrement penché, 6-8m de haut, couronne de
> palmes vertes en éventail. Quelques noix de coco visibles. Doit pouvoir
> être instancié en alignements de 30+.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a tall tropical coconut palm tree, slender
gracefully leaning trunk painted in smooth warm beige and brown ringed bark
texture, about 7 meters tall, crown of long arching saturated emerald green
palm fronds at the top fanning out symmetrically, three or four hanging
coconuts visible underneath the fronds painted in warm brown, single tree
isolated on plain neutral medium grey background, prop centered upright
viewed from a slight low angle showing the full height
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic, no horror, no anime, no faceted low poly, no Unreal Engine 5 photoreal, no flat shading
```

**Meshy** : Low Poly · texture 1024×1024 · prop object (sera instancié × 30+)

---

## 7.5 — `flamboyant.glb` (arbres tropicaux fleuris)

> Flamboyant (Delonix regia) en pleine floraison rouge-orange. Tronc gris
> tortueux, couronne large parasolée, fleurs rouge vif éclatantes.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a large royal poinciana flamboyant tree in
full bloom, thick twisted grey-brown trunk with smooth bark, wide umbrella-
shaped spreading canopy reaching outward like a parasol, dense crown covered
in saturated bright red-orange flame-colored flowers covering most of the
visible foliage, small green compound leaves visible underneath, tree about
8 meters tall and wide, isolated on plain neutral medium grey background,
prop centered upright showing the full umbrella canopy shape
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic, no horror, no anime, no faceted low poly, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 7.6 — `banc_jardin.glb` (bancs publics urbains modernes) — Nouméa réf.

> Banc public moderne contemporain de la Place des Cocotiers à Nouméa.
> Style minimaliste : lattes en bois clair patiné + structure métallique
> noire simple en arches. Pas d'ornements, pas d'accoudoirs. ~1.7m × 0.85m.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a modern contemporary minimalist urban park
bench, about 1.7 meters wide and 0.85 meters tall, five horizontal wood slats
forming the flat seat and five horizontal wood slats forming the vertical
backrest at slight recline angle, all slats painted in smooth saturated pale
cream-beige weathered wood with subtle wood grain visible, no armrests on
the sides, two simple curved black painted metal supports on each end forming
clean rounded arch shape from ground up around the seat and continuing up to
hold the backrest like an inverted U, two thin black metal legs per support
anchoring to the ground, smooth painted matte black metal finish with no
ornaments no scrollwork no decoration just clean modern lines, smooth
polished surfaces, isolated object front-three-quarter view on plain neutral
medium grey background, prop centered upright
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no faceted low poly, no scrollwork, no colonial decoration, no Victorian style, no armrests, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 7.7 — `gradins_amphi.glb` (gradins concentriques Place Feillet)

> Section de gradins en briques pavées formant un arc concentrique autour
> du kiosque. 3 niveaux d'environ 0.4m de hauteur chacun. À répliquer
> en arc.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a curved tiered amphitheater stone seating
step section, three concentric ascending levels each about 40 centimeters
tall, surface paved with saturated warm red-orange brick pavers, edges and
fronts trimmed with smooth grey concrete, section width about 6 meters with
gentle outward arc curve, viewable from one end showing the three step
profile, smooth polished surfaces, isolated object front-three-quarter view
on plain neutral medium grey background, prop centered
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no faceted low poly, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object (sera instancié × 8 en cercle)

---

## 7.8 — `lampadaire_colonial.glb` (remplace `street_lamp.glb` actuel)

> Lampadaire colonial blanc 19ᵉ : poteau cannelé blanc, base ornée, globe
> sphérique blanc opaque éclairé. Différent du lampadaire industriel actuel.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a 19th century colonial style street lamp
post, tall slender fluted column painted in smooth saturated white with
visible vertical groove ridges, ornamental cast iron base with decorative
square scrollwork patterns, single spherical milky-white glass globe at the
top about 30 centimeters diameter glowing softly with warm amber light, small
ornamental finial above the globe, total height about 4 meters, isolated
object front view on plain neutral medium grey background, prop centered
upright
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no horror, no anime, no faceted low poly, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object (remplace street_lamp.glb)

---

## 7.9 — `echiquier_geant.glb` (Place Courbet)

> Échiquier géant carrelé au sol (~3×3m), 8×8 cases noir/blanc, avec
> quelques pièces d'échec géantes (tour, roi, fou) en bord.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a large outdoor giant chessboard floor about
3 meters square, eight by eight grid of alternating saturated cream-beige
and dark slate-grey paving stones forming the chess pattern, flat against
the ground level, three large stylized chess pieces standing on the board
(a tall king piece, a queen, and a rook) each about 50 centimeters tall
carved smooth in saturated white and saturated black, isolated object
top-three-quarter view on plain neutral medium grey background, prop
centered upright
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic, no horror, no anime, no faceted low poly, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 7.10 — `brick_wall_module.glb` (muret modulaire de la place) — Nouméa réf.

> Petit muret droit modulaire (~3m de long × 45cm haut × 40cm épaisseur) en
> briques saumon claires, typique du mobilier urbain de la Place des
> Cocotiers. Dessus en dalle pavée légèrement saillante (couvre-mur). Sert
> de séparateur d'allée, bordure de jardinière ou contour de massif. Pose
> côte-à-côte plusieurs modules pour former un muret long ou un angle.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a short rectangular low garden wall module
3 meters long 0.4 meters thick 0.45 meters tall, body built of regular
horizontal rows of small saturated warm salmon-beige rectangular bricks
arranged in offset running bond pattern with thin medium grey mortar lines
clearly visible between bricks (about eight rows of bricks total height),
flat top surface capped with one row of slightly wider darker terracotta-brown
flat paving stone slabs forming a clean horizontal coping ledge that projects
about 3 centimeters beyond the brick face on both sides, simple rectangular
box silhouette no curves no ornaments, isolated object three-quarter front
view on plain neutral medium grey background, prop centered upright on
flat ground
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no realistic, no anime, no faceted low poly, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## 7.11 — `brick_bench_module.glb` (muret-banc avec assise bois) — Nouméa réf.

> Même module que 7.10 mais avec **une assise en bois marron** rapportée
> sur le dessus : 4-5 lattes de bois rectangulaires alignées dans le sens
> de la longueur, légèrement espacées (interstices visibles entre lattes).
> Hauteur totale ~50cm (assise comprise). On peut s'asseoir dessus.

```
Fortnite Battle Royale and Team Fortress 2 art direction (vibrant saturated
colors, friendly designs) rendered as a smooth high-quality 3D animation,
polished subdivision surface, soft volumetric shading, modern Blender Cycles
render quality 3D prop model of a short rectangular brick garden bench seat
3 meters long 0.45 meters wide 0.5 meters tall total, lower body built of
regular horizontal rows of small saturated warm salmon-beige rectangular
bricks arranged in offset running bond pattern with thin medium grey mortar
lines clearly visible between bricks forming the support structure, top
surface fitted with a wooden plank seat made of four parallel rectangular
wooden boards aligned along the length direction in saturated warm walnut
medium-brown wood with subtle wood grain texture, small visible gaps about
1 centimeter wide between each plank, planks slightly project beyond the
brick face by about 3 centimeters on the front and back, clean cartoon
stylized geometry, isolated object three-quarter front view on plain neutral
medium grey background, prop centered upright on flat ground
--ar 1:1 --v 6.1 --style raw --no photorealism, no realistic grunge, no realistic, no anime, no faceted low poly, no Unreal Engine 5 photoreal
```

**Meshy** : Low Poly · texture 1024×1024 · prop object

---

## §7.bis — Textures sol Place des Cocotiers

### `floor_paves_brique.png` (1024×1024, seamless tileable)

> Pavés briques rouges caractéristiques de la Place des Cocotiers, alignés
> en damier ou herringbone.

```
Seamless tileable square texture of urban red brick paver flooring stylized
cartoon Fortnite Team Fortress 2 art direction (vibrant saturated colors)
rendered as smooth high-quality, regular grid of saturated warm terracotta
red-orange rectangular bricks arranged in offset running bond pattern, very
thin medium grey mortar lines visible between bricks, slight smooth tonal
variation between individual bricks (some slightly darker some slightly
lighter), no cracks no damage no dirt, clean polished surface, no soft
gradients only soft tonal variation, clean tileable edges no border,
top-down orthographic view, square 1:1 ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no realistic grunge, no realistic, no anime, no Unreal Engine 5
```

### `floor_pelouse.png` (1024×1024, seamless tileable)

> Pelouse tropicale verte saturée pour les zones végétalisées.

```
Seamless tileable square texture of lush tropical green grass lawn stylized
cartoon Fortnite Team Fortress 2 art direction (vibrant saturated colors),
saturated emerald-green flat grass surface with smooth tonal variation
between slightly darker and slightly lighter patches creating organic
mottled look, no individual grass blade detail (stylized smooth surface),
no flowers no weeds, clean tileable edges no border, top-down orthographic
view, square 1:1 ratio
--ar 1:1 --v 6.1 --tile --style raw --no photorealism, no realistic grass blades, no realistic, no anime, no Unreal Engine 5
```

---

## 📋 Workflow pour la Place des Cocotiers

1. **Génère les 9 GLB + 2 textures** dans l'ordre suggéré (kiosque + fontaine d'abord = les pièces maîtresses)
2. **Place les GLB** dans `public/models/`
3. **Place les textures** dans `public/textures/`
4. **Dis-moi quand c'est fait** → je code l'intégration :
   - Ajout des types dans `PROP_CATALOG` (éditeur) + `spawnEditableProp` (HORDE)
   - Génération du JSON map `place_cocotiers.json` avec toutes les positions précises (basées sur la carte aérienne fournie)
   - Remplacement du sol asphalte par les nouveaux pavés brique + zones pelouse

Pour les **arbres et bancs** (cocotier, flamboyant, banc_jardin, lampadaire_colonial), tu en généreras 1 GLB chacun mais ils seront instanciés ×20-30 dans la map (cf. méthode `InstancedMesh` déjà utilisée pour `street_lamp`).

---

# 🎵 SFX AMBIENT (ElevenLabs Sound Effects)

> Les SFX ne sont pas affectés par la DA visuelle, mais on adapte l'ambiance vers
> **urbain noir nuit néon** plutôt que dépôt abandonné horror.

## Drones permanents (loop)

- `ambient_urban_drone.ogg` — low urban hum loop, distant city ambient drone with
 faint neon buzz, deep sub-bass urban texture, 60-second loopable, stereo
- `ambient_neon_buzz.ogg` — soft electric buzz of multiple neon signs cycling on
 and off, fluorescent hum, 30-second loopable, stereo
- `ambient_distant_traffic.ogg` — very distant urban traffic muffled, occasional
 faint car horn, 45-second loopable

## Météo / vent

- `wind_alley.ogg` — wind whistling through urban alley between buildings,
 occasional whoosh, 20-second loopable
- `rain_distant.ogg` — light distant rain on pavement, no heavy storm, ambient
 35-second loopable

## Eau

- `drip_puddle.ogg` — single water drip falling into shallow puddle in alley,
 short sound 1 second, occasional one-shot triggered every 8-15 sec
- `water_pipe_creak.ogg` — old metal water pipe groan in walls, occasional
 one-shot

## Métal / structure

- `metal_clank_distant.ogg` — distant metal pipe clank in industrial yard,
 occasional one-shot every 15-30 sec
- `chain_rattle_wind.ogg` — chain link fence rattling in wind, short loop
- `dumpster_lid_settle.ogg` — metal dumpster lid settling, occasional one-shot

## Électrique / lampes

- `neon_sign_buzz.ogg` — close neon sign electric buzz with occasional flicker
 crackle, 10-second loopable
- `lamp_flicker_crackle.ogg` — fluorescent lamp flicker crackle, short one-shot
- `electric_arc_spark.ogg` — small electric arc spark, very short one-shot

## Supernaturel lointain

- `distant_howl.ogg` — far-off animal howl (wolf-like, ambiguous), occasional
 one-shot every 60-120 sec, creates noir mystery atmosphere
- `whisper_voice_faint.ogg` — barely audible whispered voice fragment in alley
 echo, very rare one-shot
- `radio_static_distant.ogg` — distant tinny radio static with garbled voice,
 occasional one-shot

## Événements rares

- `glass_break_distant.ogg` — distant breaking glass bottle on pavement,
 one-shot
- `crow_caw.ogg` — single urban crow caw, occasional one-shot
- `door_slam_distant.ogg` — distant heavy door slamming in industrial building,
 one-shot

---

# 🔊 SFX GAMEPLAY (ElevenLabs Sound Effects)

## Armes

- `pistol_shot.ogg` — sharp 9mm pistol gunshot, crisp punchy report with
 short metallic echo, dry indoor reverb
- `shotgun_shot.ogg` — heavy double-barrel shotgun blast, deep boom with long
 tail
- `smg_shot.ogg` — short MP5 burst, rapid metallic pop pop pop
- `rifle_shot.ogg` — sharp medium-range rifle crack with reverb tail
- `lmg_shot.ogg` — heavy M60 machine gun burst, deep rapid thuds
- `sniper_shot.ogg` — deep punchy bolt-action rifle shot with long echo tail
- `rocket_launch.ogg` — RPG rocket launch with whoosh and propellant hiss
- `rocket_explosion.ogg` — heavy explosion with debris rain
- `arc_zap.ogg` — sci-fi tesla electric arc zap with crackling energy discharge
- `bat_swing.ogg` — quick metal bat air swing whoosh
- `bat_impact.ogg` — wet meaty thud of metal bat on flesh
- `axe_swing.ogg` — heavier axe air swing whoosh
- `axe_impact.ogg` — wet heavy chop of axe into flesh
- `machete_swing.ogg` — quick blade slice whoosh
- `machete_impact.ogg` — wet slash of blade through flesh
- `reload_magazine.ogg` — magazine release click followed by new mag insert
 and chamber load
- `reload_shotgun.ogg` — pump-action shotgun fore-end rack chuk-chuk
- `dry_fire.ogg` — empty chamber click on trigger pull

## Zombies

- `zombie_groan_idle.ogg` — low gurgling moan, idle ambient, multiple
 variations
- `zombie_growl_alert.ogg` — aggressive snarl on player detection
- `zombie_attack.ogg` — guttural roar during attack swing
- `zombie_hit_body.ogg` — wet meaty impact with grunt
- `zombie_hit_head.ogg` — sharper cracking impact (skull break)
- `zombie_death.ogg` — final wet collapse with gurgle
- `zombie_step_concrete.ogg` — heavy dragging shuffle on concrete, looped
- `zombie_step_asphalt.ogg` — slightly muffled drag on asphalt, looped

## Joueur

- `step_concrete.ogg` — clear footstep on concrete floor, single one-shot
- `step_asphalt.ogg` — slightly grittier footstep on asphalt, single one-shot
- `step_metal_grate.ogg` — hollow metallic footstep on grate
- `breath_heavy.ogg` — labored breathing loop when low HP
- `heartbeat_low_hp.ogg` — slow heartbeat thump loop when critical HP
- `pain_grunt.ogg` — short pain grunt on hit
- `death_groan.ogg` — final death groan exhale
- `coin_pickup.ogg` — short chime pickup sound (UI feedback)
- `health_pickup.ogg` — short healing chime, slight magical neon shimmer

## UI / gameplay

- `menu_select.ogg` — neutral UI button click
- `menu_confirm.ogg` — confirmation chime
- `menu_back.ogg` — back navigation click
- `wave_start.ogg` — dramatic stinger announcing new wave (low brass + neon
 buzz crescendo)
- `wave_complete.ogg` — triumphant clearing sting (rising synth chime)
- `mystery_box_open.ogg` — magical wooden crate opening with shimmering magenta
 neon chime
- `perk_drink.ogg` — bottle gulping with effervescent fizz and short magical
 chime
- `wall_buy_purchase.ogg` — coin clink followed by satisfying click of weapon
 appearing
- `barricade_repair.ogg` — quick hammering nail sequence
- `barricade_break.ogg` — wooden plank splintering crack

---

# 📋 Workflow recommandé

## Pour les modèles 3D (Meshy)

1. Génère l'image source via Midjourney avec le prompt ci-dessus
2. Importe dans Meshy → mode Image-to-3D
3. Paramètres : Topology Triangle, **Polycount Low Poly**, Texture 1024×1024,
 Style Stylized
4. Pour les persos : active A-pose + Auto-rig humanoid
5. Récupère le GLB et place-le dans `public/models/`
6. **Important** : pas d'outlines noires dans la texture (le pipeline est PBR
 Standard, pas cel-shading). Mise sur des **highlights peints chauds** et
 **shadows peintes** dans la texture pour le volume cartoon stylized.
7. Test in-game pour valider que les surfaces PBR rendent le bounce IBL
 correctement et que les couleurs poppent en golden hour

## Pour les textures (Midjourney)

1. Génère avec le prompt + flag `--tile` pour seamless tileable
2. Vérifie dans GIMP/Photoshop que les bords tilent vraiment (test : Image
 Size × 2, dupliquer en x et y, vérifier qu'on ne voit pas la couture)
3. Si bord visible : retouche manuelle au stamp / clone tool, ou re-roll
 Midjourney
4. Place dans `public/textures/`
5. Pour les decals (signs, blood, graffiti) : Midjourney sort souvent avec
 fond noir/gris au lieu de transparent. Ouvrir dans GIMP → couleur magique
 sur le fond → supprimer → exporter PNG transparent

## Pour les SFX (ElevenLabs)

1. Va sur elevenlabs.io/sound-effects
2. Copie/colle le prompt en anglais (les phrases ci-dessus marchent bien telles
 quelles)
3. Durée recommandée : 1-3s pour les one-shots, 8-30s pour les loops
4. Pour les loops : utilise Audacity → Effects → Crossfade Tracks pour rendre
 le loop seamless
5. Place dans `public/sfx/`

## Ordre de génération recommandé pour Pacific Storm V1

1. **Map textures** (§3) — fondation visuelle, 7 fichiers
2. **Sky / decals** (§6) — atmosphère noir néon, signs essentiels d'abord
 (sign_bus_depot, sign_wall_*)
3. **Props clutter** (§4bis) — densifie la cour rapidement
4. **Lampadaire + props gameplay** (§4.7 + reste §4) — borne d'achat, mystery
 box, perk machines (1 suffit pour V1 : regen)
5. **Véhicules** (§5) — bus + voiture pour la composition
6. **Armes basiques** (§2.1 à 2.5) — viewmodels FPS (§2bis.1 à 2bis.5)
7. **Personnages** (§1) — player + 1 zombie type d'abord (zombie_trucker)
8. **Mystery box weapons** (§2.6+) — au fur et à mesure du gameplay
9. **Boss zombie** (§1.6) — quand le wave system est mature
10. **SFX** — au fil de l'eau, prioriser armes + zombies + pas + UI core

---
