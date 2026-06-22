# TERMINUS — Disposition canonique (Survie)

> Spec de référence pour reproduction fidèle de l'arène **TERMINUS** — **mode Survie uniquement**.
> Faits / dispositions uniquement — l'analyse design est dans le fichier compagnon.

---

## 0. Repère unique (à lire en premier)

Pour tuer toute ambiguïté gauche/droite, **un seul point de vue de référence pour tout le doc** :

> **🧍 OBSERVATEUR : debout dans la rue, face à la façade du terminal (on regarde le bâtiment).**

⚠️ Attention : décrire un emplacement « à gauche » depuis l'**intérieur** (en sortant, tourné vers l'extérieur) revient à « à droite » vu depuis la **rue** (tourné vers la façade). C'est le même mur, le même emplacement physique — seul le repère change. Tout le doc utilise le repère **face à la façade**.

→ Dans ce repère : le **Coffre aléatoire** est **à droite de la porte**, le **Bélier** **à gauche de la porte**.

---

## 1. Inventaire des emplacements (table de vérité)

| Élément | Zone | Position précise (repère = face à la façade) | Coût | Statut |
|--------|------|----------------------------------------------|------|--------|
| **Brèche-12** (pompe 2 canons) | Intérieur | Mur de la salle de départ | 500 | ✅ actif |
| **Marquis** (fusil semi-auto) | Intérieur | Mur de la salle de départ | 500 | ✅ actif |
| **Guêpe** (PM) | Extérieur | Mur **en face de l'entrée**, de l'autre côté de la rue | 1000 | ✅ actif |
| **Bélier** (pompe) | Extérieur | Mur extérieur du terminal, **à gauche de la porte** | 1500 | ✅ actif |
| **Coffre aléatoire** | Extérieur | Mur extérieur du terminal, **à droite de la porte** (côté opposé au Bélier), dans un recoin étroit | 950 / tirage | ✅ actif — **emplacement unique et fixe**, aucune mécanique de relocalisation |
| **Porte de sortie** | Intérieur→Extérieur | Une des 3 portes du lobby | 750 | ✅ **seule sortie utilisable** |
| **2 portes scellées** | (lobby) | Les 2 autres portes du lobby | — | ❌ **scellées** — non ouvrables (décor mural) |
| **Barricades / fenêtres** | Intérieur | **4 barrières** réparties dans le lobby | — | ✅ entrées ennemis |

> Point de départ standard : **500 points**. La porte coûtant 750, il faut farmer ~2 vagues avant de sortir.

---

## 2. Plan coté (repère = face à la façade)

```
              ┌──────────────────────────────────────────────┐
              │      ALLÉE le long de la lave → CUL-DE-SAC     │
              │      (ennemis de FACE uniquement = camp)       │
              └───────────────▲──────────────────────────────┘
                              │ passage étroit
   [COFFRE ALÉAT.] ─────┐     │
   (recoin étroit,      │     │
    à DROITE porte)     ▼     │
 ════════════════════════════════════════════════════  ← mur extérieur terminal
        🚪 PORTE 750         🚪 scellée   🚪 scellée
 ════════════════════════════════════════════════════
   [BÉLIER] ←── à GAUCHE de la porte (mur ext.)

   ─────────────────── RUE ───────────────────
                  🚌  BUS CRASHÉ                  ← pivot du train d'ennemis
        ● abri+banc    ● abri+banc    ● abri+banc ← piliers (circuit train)
   ▓▓▓ lave ▓▓▓        ▓▓▓ lave ▓▓▓

 ─────────────── (de l'autre côté de la rue) ───────────────
   [GUÊPE] ←── mur en face de l'entrée
```

### Intérieur (vu de dessus, schématique)
```
 ┌─────────────────────────────────────┐
 │  [barrière]            [barrière]    │
 │                                       │
 │   bancs                panneau        │   ← Marquis + Brèche-12 sur les murs
 │                        d'horaires      │
 │                                       │
 │  [barrière]   🚪750  🚪✕  🚪✕  [barrière] │
 │             téléphones publics         │
 └─────────────────────────────────────┘
```

---

## 3. Extérieur — éléments fixes

| Élément | Détail |
|--------|--------|
| **Bus crashé** | Au milieu de la rue. Sert de pivot central au train d'ennemis. |
| **Lave** | Fissures/coulées au sol dans la rue. **Inflige des dégâts au joueur** et **enflamme les ennemis** (qui peuvent exploser une fois touchés/frappés). Volumes de collision/dégâts, pas juste texture. |
| **Allée de camp** | Part **à droite du Coffre**, **longe la lave**, débouche sur un **petit cul-de-sac**. Les ennemis n'y arrivent que **de face** (un seul angle). |
| **Abris à bancs sur piliers** | Dans la rue. Espacés régulièrement = circuit du train d'ennemis. |

---

## 4. Spawns ennemis

| Phase | Source des ennemis |
|-------|--------------------|
| Porte **fermée** (vagues 1–~2) | Uniquement par les **4 barrières/fenêtres** du lobby (cassent les planches depuis le brouillard). |
| Porte **ouverte** | Tout le **périmètre de la rue** : depuis le brouillard, autour du bus, le long des bords. Convergent vers le joueur. |
| Type | Ennemis standards + rampants. Pas de vague de boss dédiée. Le **brouillard** masque les apparitions. |

---

## 5. Ce qui N'EXISTE PAS sur TERMINUS (Survie)

Pour ne pas réintroduire d'éléments hors-Survie par erreur :

- ❌ Aucun **bonus passif** (réanimation incluse), même en solo.
- ❌ Aucune **station d'amélioration d'arme**.
- ❌ Aucun **système de construction** (rien à assembler ; les 2 portes scellées restent fermées).
- ❌ Aucun autre **Coffre** que l'unique emplacement fixe.
- ❌ Aucune **arme** hors de celles listées (4 armes murales + le Coffre).

---

## 6. Checklist de fidélité (build)

- [ ] Lobby fermé avec **4 barrières** réparties (2 par paire de murs).
- [ ] **Brèche-12 + Marquis** sur murs intérieurs (500 chacun).
- [ ] **3 portes** : 1 marquée **750** (ouvrable), 2 **scellées**.
- [ ] **Porte 750** = seule liaison intérieur ↔ rue.
- [ ] **Coffre aléatoire** côté droit de la porte (face façade), recoin étroit, fixe.
- [ ] **Bélier** côté gauche de la porte, mur extérieur (1500).
- [ ] **Guêpe** sur le mur d'en face, de l'autre côté de la rue (1000).
- [ ] **Bus crashé** au centre de la rue.
- [ ] **Coulées de lave** = volumes de dégâts ; bordent la rue + ferment l'allée.
- [ ] **Allée → cul-de-sac** à droite du Coffre, longeant la lave.
- [ ] **Abris à bancs/piliers** espacés régulièrement pour le train.

---

*Spec interne — disposition de référence, mode Survie. Repère gauche/droite unifié sur l'observateur "face à la façade".*