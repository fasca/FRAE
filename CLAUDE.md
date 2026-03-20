# AE Flight Radar (FRAE)

Application web de type FlightRadar24 utilisant la projection azimutale équidistante (carte de Gleason).
Tracking temps réel des vols mondiaux via l'API OpenSky Network. Rendu Canvas 2D haute performance avec D3-geo.

## Stack Technique

- **Framework** : Next.js 14+ (App Router, TypeScript strict)
- **Projection** : D3.js (d3-geo) — `geoAzimuthalEquidistant`
- **Rendu** : Canvas 2D (pas SVG — trop lent pour des milliers de points animés)
- **Données cartographiques** : TopoJSON via `world-atlas` (npm)
- **Données de vol** : OpenSky Network REST API (gratuit, sans clé API, CORS supporté)
- **CSS** : Tailwind CSS 4
- **State** : React state + `useRef` pour les données d'animation (pas de state manager externe)

## Carte du Repo

```
src/app/              → Next.js App Router (layout.tsx, page.tsx, globals.css)
src/components/       → Composants React
  FlightRadar.tsx     → Orchestrateur principal (données + state)
  MapCanvas.tsx       → Canvas de rendu (projection + dessin)
  ControlPanel.tsx    → Boutons zoom, centres, toggles
  FlightInfoPanel.tsx → Panel info avion sélectionné
  StatsBar.tsx        → Stats (nb vols, dernière MAJ)
src/lib/              → ⚠️ ZONE SENSIBLE — voir src/lib/CLAUDE.md avant toute modif
  projection.ts       → Config D3 geoAzimuthalEquidistant + helpers
  opensky.ts          → ⚠️ Fetch API OpenSky, parsing, rate limiting
  flights.ts          → Types, interpolation great circle, calculs de position
  airports.ts         → Base aéroports majeurs (code IATA, nom, lat, lon)
  renderer.ts         → ⚠️ Pipeline Canvas (fond, graticule, pays, avions, traînées)
src/types/index.ts    → Interfaces TypeScript (Flight, ProjectionCenter, MapOptions)
docs/                 → Architecture et ADRs (décisions techniques)
tasks/                → Plans de travail (todo.md) et leçons apprises (lessons.md)
```

## Commandes Essentielles

```bash
npm run dev          # Démarrer en développement (localhost:3000)
npm run build        # Build de production Next.js
npm run lint         # ESLint check
npm run test         # Lancer la suite de tests (Jest/Vitest)
npm run type-check   # tsc --noEmit (vérification TypeScript sans build)
```

## Workflows Recommandés (Plugins)

- **superpowers:brainstorming** → Avant toute nouvelle feature (exploration des besoins)
- **superpowers:writing-plans** → En mode Plan pour structurer l'implémentation
- **superpowers:test-driven-development** → Développement test-first (Phase 3 OpenSky)
- **superpowers:systematic-debugging** → Dès qu'un bug apparaît (Canvas, OpenSky, D3)
- **superpowers:verification-before-completion** → Avant de déclarer une tâche terminée
- **code-review** → Avant chaque merge / fin de phase
- **frae-review-checklist** (skill locale) → Après code-review, pour les points spécifiques FRAE
- **code-simplifier** → Après chaque implémentation pour simplifier
- **feature-dev:feature-dev** → Pour implémenter les features des phases 1-4
- **frontend-design:frontend-design** → Pour l'UI canvas (layout, thème radar)
- **typescript-lsp** → Analyse statique TypeScript en contexte
- **context7** → Documentation D3, Next.js, React en contexte
- **github** → Gestion des PRs et issues

## Règles Impératives

- Toujours écrire un plan dans `tasks/todo.md` avant d'implémenter (3+ étapes)
- Ne jamais modifier `src/lib/opensky.ts` ou `src/lib/renderer.ts` sans lire `src/lib/CLAUDE.md`
- Conventional Commits : `feat/fix/docs/chore/refactor/test(<scope>): description`
  - Scopes : `map`, `projection`, `opensky`, `canvas`, `ui`, `flights`, `airports`, `controls`, `stats`
- Après chaque correction de bug : ajouter une entrée dans `tasks/lessons.md`
- Ne jamais déclarer une tâche terminée sans avoir lancé `npm run build && npm run lint`
- Canvas : utiliser `useRef` pour les données mutables d'animation, jamais `setState` à chaque frame
- OpenSky API : respecter le rate limit de 10 secondes (mode anonyme), ne jamais stocker les réponses brutes en git
- D3 : importer uniquement les sous-modules nécessaires (`d3-geo`, `d3-interpolate`), jamais `import * as d3 from 'd3'`
- TypeScript strict : pas de `any`, utiliser `unknown` si nécessaire
- Fichiers < 300 lignes, fonctions < 50 lignes

## Gotchas (pièges connus)

- **D3 v7+ est ESM-only** — fonctionne nativement avec Next.js, pas de config spéciale
- **Canvas component** : DOIT utiliser `useRef` + `useEffect` pour le rendu, pas de JSX pour dessiner
- **TopoJSON** : nécessite `topojson-client` pour convertir en GeoJSON que D3 peut projeter
- **OpenSky rate limit** : 1 requête / 10 secondes en mode anonyme — les 429 surviennent vite
- **OpenSky response** : tableau d'arrays (pas d'objets) — le mapping des index est critique (voir `src/lib/CLAUDE.md`)
- **Projection rotation** : `rotate([-lon, -lat, 0])` — noter la négation des deux valeurs
- **clipAngle(180)** : obligatoire pour afficher le globe entier sur la projection azimutale
- **Canvas performance** : `canvas.getContext('2d', { alpha: false })` pour un rendu plus rapide
- **HiDPI** : gérer `devicePixelRatio` pour les écrans Retina — scale le canvas backing store

## Contexte Métier

La différence clé avec FlightRadar24 : la **projection azimutale équidistante** préserve les distances réelles depuis le point central, contrairement à Mercator. Les routes great circle apparaissent comme des droites depuis le centre. L'objectif de performance est **30 fps avec 3000+ avions simultanés** sur Canvas 2D. Le style visuel est "radar militaire/cockpit" : fond très sombre, accents cyan pour les aéroports, orange pour les avions.
