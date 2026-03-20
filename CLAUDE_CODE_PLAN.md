# AE Flight Radar — Plan pour Claude Code

## Objectif

Construire une application web de type FlightRadar24 utilisant une **projection azimutale équidistante** (comme la carte de Gleason) au lieu de la projection Mercator classique. L'application affiche en temps réel les avions en vol au-dessus du monde, avec leurs routes en cercles orthodromiques (great circles).

## Stack technique

- **Framework** : Next.js 14+ (App Router, TypeScript)
- **Projection & géo** : D3.js (`d3-geo`) pour la projection azimutale équidistante (`d3.geoAzimuthalEquidistant`)
- **Rendu** : Canvas 2D (pas SVG — trop lent pour des milliers de points)
- **Données cartographiques** : TopoJSON via `world-atlas` (npm) pour les contours des pays
- **Données de vol** : API OpenSky Network (REST, gratuite, pas de clé API requise)
- **UI** : Tailwind CSS 4
- **State** : React state + useRef pour les données animées (pas de state manager externe)

## Architecture des fichiers

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Page principale, importe le composant radar
│   └── globals.css                 # Tailwind + font imports
├── components/
│   ├── FlightRadar.tsx             # Composant principal orchestrateur
│   ├── MapCanvas.tsx               # Canvas de rendu (projection + dessin)
│   ├── ControlPanel.tsx            # Boutons de contrôle (centre, zoom, filtres)
│   ├── FlightInfoPanel.tsx         # Panel d'info quand on clique sur un avion
│   └── StatsBar.tsx                # Barre de stats (nombre de vols, dernière MAJ, etc.)
├── lib/
│   ├── projection.ts              # Config et helpers de projection D3
│   ├── opensky.ts                 # Fetch et parsing de l'API OpenSky
│   ├── flights.ts                 # Types, interpolation great circle, calculs de position
│   ├── airports.ts                # Base de données des aéroports majeurs (code, nom, lat, lon)
│   └── renderer.ts                # Fonctions de dessin Canvas (pays, grilles, avions, routes)
└── types/
    └── index.ts                   # Types TypeScript (Flight, Airport, ProjectionCenter, etc.)
```

## Types principaux (types/index.ts)

```typescript
export interface Flight {
  icao24: string;          // Identifiant unique ICAO
  callsign: string;        // Ex: "AF1234"
  originCountry: string;
  longitude: number;
  latitude: number;
  altitude: number;        // En mètres
  velocity: number;        // En m/s
  heading: number;         // Direction en degrés (0-360)
  verticalRate: number;    // Taux de montée/descente
  onGround: boolean;
  lastUpdate: number;      // Timestamp
}

export interface ProjectionCenter {
  lat: number;
  lon: number;
  label: string;
}

export interface MapOptions {
  showAirports: boolean;
  showGraticule: boolean;
  showCountryBorders: boolean;
  showFlightPaths: boolean;   // Petite traînée derrière chaque avion
}
```

## API OpenSky Network (lib/opensky.ts)

Endpoint : `GET https://opensky-network.org/api/states/all`

- Pas de clé API requise (les requêtes anonymes sont limitées à 1 requête toutes les 10 secondes)
- Avec un compte gratuit : 1 requête toutes les 5 secondes
- La réponse contient un tableau `states` où chaque élément est un array de valeurs :
  - Index 0 : icao24 (string)
  - Index 1 : callsign (string)
  - Index 2 : origin_country (string)
  - Index 5 : longitude (number | null)
  - Index 6 : latitude (number | null)
  - Index 7 : baro_altitude (number | null) — altitude barométrique en mètres
  - Index 9 : velocity (number | null) — en m/s
  - Index 10 : true_track (number | null) — direction en degrés
  - Index 11 : vertical_rate (number | null)
  - Index 8 : on_ground (boolean)
  - Index 4 : last_contact (number) — timestamp unix

Implémentation :
- Fetch toutes les 10 secondes (respecter le rate limit)
- Filtrer les avions au sol (`onGround === true`) sauf si l'utilisateur veut les voir
- Filtrer les avions sans coordonnées (longitude/latitude null)
- Parser le tableau en objets `Flight[]`
- Stocker les positions précédentes pour interpoler entre les mises à jour (smooth animation)

```typescript
// Interpolation entre deux positions pour animation fluide
// Garder la position précédente et la position courante
// Interpoler linéairement entre les deux sur 10 secondes
interface FlightState {
  current: Flight;
  previous: Flight | null;
  lastFetchTime: number;
}
```

## Projection (lib/projection.ts)

```typescript
import * as d3 from 'd3-geo';

export function createProjection(center: ProjectionCenter, width: number, height: number, scale: number) {
  return d3.geoAzimuthalEquidistant()
    .rotate([-center.lon, -center.lat, 0])
    .translate([width / 2, height / 2])
    .scale(scale)
    .clipAngle(180);  // Afficher le globe entier (180° depuis le centre)
}
```

Centres prédéfinis à proposer :
- Pôle Nord (90, 0) — centre par défaut, projection standard
- Paris (48.86, 2.35)
- New York (40.71, -74.01)
- Tokyo (35.68, 139.69)
- Équateur (0, 0)
- Pôle Sud (-90, 0)
- Custom : l'utilisateur peut cliquer sur la carte pour recentrer

## Rendu Canvas (lib/renderer.ts)

L'ordre de dessin (du fond vers le premier plan) :
1. **Fond** : dégradé radial sombre (noir-bleu profond)
2. **Globe** : cercle de clippage (la Sphère projetée)
3. **Graticule fine** : lignes tous les 15° (très subtil, ~0.3px, couleur #091520)
4. **Graticule épaisse** : lignes tous les 30° (subtil, ~0.5px, couleur #0d1f35)
5. **Pays** : remplissage sombre (#0c1e30), contours fins (#1a3a5c)
6. **Traînées des avions** : les 5-10 positions précédentes de chaque avion, avec opacité dégressive
7. **Aéroports** : petits cercles cyan avec labels en code IATA
8. **Avions** : points orange avec halo lumineux, point sélectionné en jaune
9. **Labels** : callsign de l'avion sélectionné

Performance :
- Utiliser `requestAnimationFrame` pour le rendu
- Ne redessiner la carte de base (pays, graticule) que quand la projection change (centre ou zoom)
- Stocker la carte de base dans un canvas offscreen et la copier à chaque frame
- Ne redessiner que les avions à chaque frame d'animation
- Utiliser `canvas.getContext('2d', { alpha: false })` pour un rendu plus rapide

## Interaction utilisateur

### Clic sur un avion
- Détecter le clic sur le canvas
- Convertir les coordonnées écran en coordonnées de projection
- Trouver l'avion le plus proche (distance < 15px)
- Afficher le panel d'info avec tous les détails du vol

### Zoom
- Molette de souris : zoom in/out centré sur le curseur
- Boutons +/- dans le control panel
- Limites : scale de 100 à 1500

### Drag pour recentrer (optionnel, nice-to-have)
- Clic + drag sur la carte pour changer le centre de projection
- Utiliser `projection.invert([x, y])` de D3 pour convertir les coordonnées écran en lat/lon
- Mettre à jour le centre de projection

### Filtres
- Toggle : afficher/masquer les avions au sol
- Toggle : afficher/masquer les aéroports
- Toggle : afficher/masquer la graticule
- Toggle : afficher/masquer les traînées
- Input texte : filtrer par callsign ou pays d'origine

## UI Design

Thème : **radar militaire / aviation** — fond très sombre, accents cyan et orange.

Palette :
- Background : #030a14
- Surface : #0a1628
- Border : #1a3a5c
- Text primary : #c0d8f0
- Text secondary : #4a7a9f
- Accent cyan : #00e5ff (aéroports, UI active)
- Accent orange : #ff8c42 (avions)
- Accent jaune : #ffcc00 (avion sélectionné)
- Accent rouge : #ff3d5a (alertes, avions en descente rapide)

Font : `"JetBrains Mono"` ou `"Fira Code"` (monospace, ambiance cockpit)

Layout :
```
┌─────────────────────────────────────────────┐
│ ✈ AE FLIGHT RADAR          Stats    Heure  │
├─────────────────────────────────────────────┤
│ [Pôle Nord] [Paris] [New York] [Tokyo] [Équ] [Sud] │
│ [+] [-] [1:1]  │  [◉ Aéro] [◉ Routes]     │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│              CANVAS MAP                     │
│           (projection AE)                   │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│ Callsign: AF1234  │ Route: CDG → JFK        │
│ Alt: 38,000 ft    │ Speed: 487 kts          │
│ Heading: 285°     │ Country: France          │
└─────────────────────────────────────────────┘
```

## Étapes de développement (ordre recommandé)

### Phase 1 — Carte statique
1. Setup Next.js + TypeScript + Tailwind
2. Créer le composant Canvas avec la projection D3 azimutale équidistante
3. Charger et afficher les pays (TopoJSON world-atlas)
4. Afficher la graticule
5. Implémenter le zoom (molette + boutons)
6. Implémenter les centres de projection prédéfinis

### Phase 2 — Données de vol simulées
7. Créer une base de données d'aéroports (20-30 aéroports majeurs)
8. Générer des vols simulés avec interpolation great circle (`d3.geoInterpolate`)
9. Animer les avions sur le canvas
10. Implémenter le clic sur un avion + panel d'info
11. Optimiser le rendu avec canvas offscreen pour la carte de base

### Phase 3 — Données réelles OpenSky
12. Implémenter le fetch de l'API OpenSky
13. Parser les données et les transformer en objets Flight
14. Interpoler les positions entre les mises à jour (smooth animation)
15. Stocker les positions précédentes pour les traînées
16. Afficher le nombre de vols actifs et l'heure de dernière mise à jour

### Phase 4 — Polish
17. Drag-to-recenter
18. Filtre par callsign / pays
19. Responsive (adapter la taille du canvas)
20. Dark/light mode (optionnel)
21. Export en image PNG de la vue actuelle (optionnel)

## Contraintes techniques

- **Pas de clé API** : OpenSky est gratuit sans authentification (rate limité à 10s)
- **CORS** : L'API OpenSky supporte CORS, donc les appels front-end directs fonctionnent
- **Performance** : Viser 30fps minimum avec 3000+ avions sur Canvas 2D
- **Mobile** : Le canvas doit être responsive (utiliser le devicePixelRatio pour le rendu HiDPI)
- **Offline fallback** : Si l'API OpenSky est down, basculer sur des vols simulés

## Commande pour démarrer

```bash
npx create-next-app@latest ae-flight-radar --typescript --tailwind --app --src-dir
cd ae-flight-radar
npm install d3 d3-geo topojson-client world-atlas
npm install -D @types/d3 @types/d3-geo @types/topojson-client
```

## Notes importantes

- D3 v7+ est ESM-only. Avec Next.js, ça fonctionne nativement.
- Importer uniquement les modules D3 nécessaires (`d3-geo`, `d3-interpolate`) pas tout D3.
- Le composant Canvas DOIT utiliser `useRef` + `useEffect` pour le rendu, pas du JSX.
- Ne PAS utiliser `setState` pour les positions d'avions à chaque frame — utiliser `useRef` pour les données mutables et `requestAnimationFrame` pour le rendu.
- TopoJSON (`topojson-client`) est nécessaire pour convertir les données world-atlas en GeoJSON que D3 peut projeter.
