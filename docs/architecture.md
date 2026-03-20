# Architecture — AE Flight Radar (FRAE)

## Vue d'ensemble

```
[Navigateur]
  │
  ├── [FlightRadar.tsx] ─── Orchestrateur
  │     ├── Polling 10s ──── GET https://opensky-network.org/api/states/all
  │     ├── State UI: avion sélectionné, zoom, centre, toggles
  │     └── Ref: positions actuelles + précédentes (interpolation)
  │
  ├── [MapCanvas.tsx] ──── Rendu Canvas 2D
  │     ├── D3 geoAzimuthalEquidistant (lib/projection.ts)
  │     ├── Canvas offscreen (carte statique)
  │     ├── requestAnimationFrame (avions animés)
  │     └── renderer.ts (pipeline de dessin)
  │
  ├── [ControlPanel.tsx] ── Zoom, centres prédéfinis, toggles
  ├── [FlightInfoPanel.tsx] ── Détails avion sélectionné
  └── [StatsBar.tsx] ──── Nb vols, dernière MAJ
```

## Composants

| Composant | Rôle | Tech |
|---|---|---|
| `FlightRadar.tsx` | Orchestrateur : fetch, state, coordination | React hooks |
| `MapCanvas.tsx` | Rendu Canvas + interaction (clic, zoom, drag) | Canvas 2D, D3-geo |
| `ControlPanel.tsx` | Zoom buttons, centres prédéfinis, toggles filtres | React + Tailwind |
| `FlightInfoPanel.tsx` | Détails de l'avion sélectionné | React + Tailwind |
| `StatsBar.tsx` | Compteur de vols, timestamp dernière MAJ | React + Tailwind |

## Modules lib/

| Module | Rôle |
|---|---|
| `projection.ts` | Création et configuration de la projection D3 azimutale |
| `opensky.ts` | Fetch API OpenSky, parsing tableau, rate limiting, fallback |
| `flights.ts` | Types Flight/FlightState, interpolation, great circle math |
| `airports.ts` | Base de données statique des aéroports majeurs (IATA) |
| `renderer.ts` | Pipeline Canvas : fond, graticule, pays, traînées, avions, labels |

## Flux de données

1. `FlightRadar` monte → démarre un `setInterval` de 10 secondes
2. `opensky.ts` : GET `/api/states/all` → parse le tableau → `Flight[]`
3. `FlightRadar` stocke `{ current, previous, lastFetchTime }` par icao24 dans un `useRef`
4. Boucle `requestAnimationFrame` dans `MapCanvas` :
   - a. Copie du canvas offscreen (carte statique : fond + graticule + pays)
   - b. Interpolation de chaque position avion : `lerp(previous, current, t)` où `t = elapsed / 10000`
   - c. Dessin des traînées (5-10 positions précédentes, opacité dégressive)
   - d. Dessin des avions (points orange avec halo, sélectionné en jaune)
   - e. Dessin du label callsign si avion sélectionné
5. Interactions utilisateur (clic, zoom, changement de centre) → `useState` → re-render → recalcul projection

## Pipeline de rendu Canvas (ordre, arrière vers avant)

1. **Fond** : dégradé radial sombre (noir → bleu profond #030a14)
2. **Globe** : cercle de clippage (Sphere projetée)
3. **Graticule fine** : toutes les 15°, 0.3px, couleur `#091520`
4. **Graticule épaisse** : toutes les 30°, 0.5px, couleur `#0d1f35`
5. **Pays** : remplissage `#0c1e30`, contours `#1a3a5c`
6. **Traînées** : positions précédentes avec opacité dégressive (5-10 points)
7. **Aéroports** : petits cercles cyan `#00e5ff` + labels IATA
8. **Avions** : points orange `#ff8c42` avec halo lumineux (avion sélectionné : jaune `#ffcc00`)
9. **Label** : callsign de l'avion sélectionné

Les couches 1-5 sont dans le canvas offscreen (recalculé uniquement quand la projection change).
Les couches 6-9 sont redessinées à chaque frame d'animation.

## Décisions importantes

Voir `docs/decisions/` pour les ADRs détaillés :
- `001-choix-stack.md` — Pourquoi D3-geo, Canvas 2D, OpenSky, Next.js, React state+useRef
