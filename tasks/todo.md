# Plan — AE Flight Radar (FRAE)

## Objectif

Construire une application web de type FlightRadar24 avec projection azimutale équidistante (carte de Gleason), données temps réel OpenSky, rendu Canvas 2D haute performance avec D3-geo.

---

## Phase 1 — Carte statique

- [ ] **Setup Next.js**
  - [ ] `npx create-next-app@latest ae-flight-radar --typescript --tailwind --app --src-dir`
  - [ ] `npm install d3-geo topojson-client world-atlas`
  - [ ] `npm install -D @types/d3-geo @types/topojson-client`
  - [ ] Configurer `tsconfig.json` en mode strict
  - [ ] Configurer ESLint + Prettier
  - [ ] Ajouter `"type-check": "tsc --noEmit"` dans les scripts package.json
- [ ] **Types** (`src/types/index.ts`)
  - [ ] Interface `Flight` (icao24, callsign, originCountry, longitude, latitude, altitude, velocity, heading, verticalRate, onGround, lastUpdate)
  - [ ] Interface `ProjectionCenter` (lat, lon, label)
  - [ ] Interface `MapOptions` (showAirports, showGraticule, showCountryBorders, showFlightPaths)
- [ ] **Projection** (`src/lib/projection.ts`)
  - [ ] `createProjection(center, width, height, scale)` avec `geoAzimuthalEquidistant`
  - [ ] `rotate([-center.lon, -center.lat, 0])` — négation des coordonnées
  - [ ] `clipAngle(180)` pour afficher le globe entier
  - [ ] Centres prédéfinis : Pôle Nord, Paris, New York, Tokyo, Équateur, Pôle Sud
- [ ] **Composant MapCanvas** (`src/components/MapCanvas.tsx`)
  - [ ] Canvas avec `useRef` + `useEffect`
  - [ ] `canvas.getContext('2d', { alpha: false })`
  - [ ] Gestion `devicePixelRatio` pour HiDPI
  - [ ] Chargement TopoJSON world-atlas (`world-atlas/countries-110m.json`)
  - [ ] `topojson.feature()` pour convertir en GeoJSON
  - [ ] Dessin des pays avec `geoPath(projection)(feature)`
  - [ ] Dessin graticule fine (15°, 0.3px, #091520) et épaisse (30°, 0.5px, #0d1f35)
  - [ ] Fond dégradé radial sombre (noir → bleu profond)
  - [ ] Globe circulaire (Sphere projetée en clip)
- [ ] **Zoom**
  - [ ] Molette souris (wheel event) : zoom centré sur le curseur
  - [ ] Boutons +/- dans ControlPanel
  - [ ] Limites : scale 100 à 1500
- [ ] **Centres de projection prédéfinis**
  - [ ] Boutons dans ControlPanel (Pôle Nord, Paris, NYC, Tokyo, Équateur, Pôle Sud)
  - [ ] Canvas redessine la carte de base sur changement de centre
- [ ] **Layout et thème**
  - [ ] Palette aviation dark : fond #030a14, surface #0a1628, border #1a3a5c
  - [ ] Texte : #c0d8f0 / #4a7a9f, accent cyan #00e5ff, orange #ff8c42, jaune #ffcc00
  - [ ] Font monospace : JetBrains Mono ou Fira Code

---

## Phase 2 — Données de vol simulées

- [ ] **Aéroports** (`src/lib/airports.ts`)
  - [ ] 20-30 aéroports majeurs : CDG, JFK, LHR, NRT, LAX, DXB, SIN, FRA, AMS, PEK, SYD, GRU, JNB, MEX, BOM, ICN, YYZ, EZE, DFW, ORD, ATL
  - [ ] Structure : `{ code: string, name: string, lat: number, lon: number }`
- [ ] **Vols simulés** (`src/lib/flights.ts`)
  - [ ] Interface `FlightState` (current, previous, lastFetchTime)
  - [ ] Génération de vols entre aéroports aléatoires
  - [ ] Interpolation position avec `geoInterpolate` (great circles)
  - [ ] Progression temporelle basée sur `Date.now()`
- [ ] **Renderer** (`src/lib/renderer.ts`)
  - [ ] Canvas offscreen pour la carte statique (fond + graticule + pays)
  - [ ] `drawFrame(ctx, offscreen, flights, options)` : copie offscreen + dessine avions
  - [ ] Traînées : 5-10 positions précédentes avec opacité dégressive
  - [ ] Aéroports : petits cercles cyan avec labels IATA
  - [ ] Avions : points orange avec halo lumineux
  - [ ] Avion sélectionné : point jaune + label callsign
  - [ ] Ordre de dessin : fond → globe → graticule → pays → traînées → aéroports → avions → labels
- [ ] **Animation** dans `MapCanvas.tsx`
  - [ ] `requestAnimationFrame` loop
  - [ ] `cancelAnimationFrame` dans cleanup `useEffect`
  - [ ] Interpolation des positions entre les updates
- [ ] **Clic sur un avion**
  - [ ] Convertir coordonnées écran → projection → lat/lon
  - [ ] Trouver l'avion le plus proche (distance < 15px)
  - [ ] Afficher FlightInfoPanel avec détails du vol
- [ ] **FlightInfoPanel** (`src/components/FlightInfoPanel.tsx`)
  - [ ] Callsign, pays d'origine, altitude (ft), vitesse (kts), cap (°)
- [ ] **StatsBar** (`src/components/StatsBar.tsx`)
  - [ ] Nombre de vols actifs, dernière mise à jour

---

## Phase 3 — Données réelles OpenSky

- [ ] **Fetch OpenSky** (`src/lib/opensky.ts`)
  - [ ] `fetchFlights()` : GET `https://opensky-network.org/api/states/all`
  - [ ] Parsing tableau : [0]=icao24, [1]=callsign, [2]=country, [4]=lastContact, [5]=lon, [6]=lat, [7]=alt, [8]=onGround, [9]=velocity, [10]=heading, [11]=vertRate
  - [ ] Filtrer coordonnées nulles
  - [ ] Filtrer `onGround === true` (option utilisateur)
  - [ ] `AbortController` pour cleanup au démontage
  - [ ] Gestion HTTP 429 (back-off 30s)
  - [ ] Fallback sur vols simulés si API down
- [ ] **Polling** dans `FlightRadar.tsx`
  - [ ] `setInterval` de 10 secondes
  - [ ] Cleanup dans `useEffect`
  - [ ] Stocker `previous` positions pour l'interpolation
- [ ] **Interpolation** entre updates
  - [ ] Lerp linéaire entre `previous` et `current` sur 10 secondes
  - [ ] Basé sur `Date.now() - lastFetchTime`
- [ ] **Traînées** (5-10 positions précédentes)
  - [ ] Stocker l'historique des positions par icao24
  - [ ] Opacité dégressive sur les positions passées
- [ ] **StatsBar** avec données réelles
  - [ ] Nombre d'avions en vol (hors sol)
  - [ ] Timestamp de la dernière mise à jour OpenSky

---

## Phase 4 — Polish

- [ ] **Drag-to-recenter**
  - [ ] Mousedown + mousemove sur canvas
  - [ ] `projection.invert([x, y])` pour convertir en lat/lon
  - [ ] Mettre à jour le centre de projection
- [ ] **Filtres**
  - [ ] Input texte : filtrer par callsign ou pays d'origine
  - [ ] Toggle : afficher/masquer avions au sol
  - [ ] Toggle : afficher/masquer aéroports
  - [ ] Toggle : afficher/masquer graticule
  - [ ] Toggle : afficher/masquer traînées
- [ ] **Responsive**
  - [ ] `ResizeObserver` pour adapter le canvas à la fenêtre
  - [ ] Recalculer la projection et l'offscreen canvas au resize
- [ ] **Offline fallback**
  - [ ] Si OpenSky retourne une erreur 3 fois, basculer sur vols simulés
  - [ ] Indicateur visuel "Mode simulation" dans StatsBar
- [ ] **Export PNG** (optionnel)
  - [ ] Bouton "Capture" : `canvas.toDataURL('image/png')` + download
- [ ] **Tests**
  - [ ] `/test` — générer tous les tests manquants
  - [ ] Viser 80%+ de couverture sur `src/lib/`
- [ ] **Review finale**
  - [ ] `/review` — revue de code complète avant "done"
  - [ ] Commit de finalisation

---

## Notes

[Décisions prises en cours de route]

## Review

[Résumé de ce qui a été fait une fois terminé]
