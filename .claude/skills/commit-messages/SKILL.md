---
name: commit-messages
description: Génère des messages de commit conventionnels pour FRAE. Utiliser quand l'utilisateur dit "commit", "message de commit", "git commit", ou après avoir complété une tâche.
---

# Conventional Commits — AE Flight Radar

## Format

```
<type>(<scope>): <description courte>

[corps optionnel]

[footer optionnel]
```

## Types

- `feat` : nouvelle fonctionnalité
- `fix` : correction de bug
- `perf` : amélioration de performance (Canvas, RAF, rendu)
- `docs` : documentation uniquement
- `style` : formatage, pas de changement logique
- `refactor` : refactoring sans new feature ni fix
- `test` : ajout ou correction de tests
- `chore` : build, deps, config

## Scopes FRAE

- `map` — projection, carte, globe
- `projection` — D3 geoAzimuthalEquidistant, centres, zoom
- `opensky` — API fetch, parsing, rate limiting, interpolation
- `canvas` — rendu Canvas, offscreen buffer, RAF pipeline
- `flights` — types Flight, great circles, interpolation de position
- `airports` — base de données aéroports
- `controls` — ControlPanel, zoom buttons, centres prédéfinis
- `ui` — layout, thème, typographie, palette de couleurs
- `stats` — StatsBar, compteurs, timestamps

## Exemples FRAE

```
feat(map): add azimuthal equidistant projection with D3-geo
feat(opensky): implement 10s polling with AbortController cleanup
feat(canvas): add offscreen buffer for static map layer
feat(flights): interpolate positions between OpenSky updates
fix(opensky): handle null coordinates before parsing flight state
fix(projection): negate lon/lat in rotate() call
fix(canvas): cancel RAF on component unmount to prevent memory leak
perf(canvas): skip offscreen redraw when projection unchanged
perf(canvas): use alpha:false context for faster rendering
feat(airports): add 30 major airports with IATA codes
feat(controls): add preset projection centers (Paris, NYC, Tokyo)
feat(ui): apply aviation radar dark theme with cyan/orange palette
test(opensky): add tests for null coordinates filtering
refactor(renderer): extract drawing phases into separate functions
```

## Règles

- Description en minuscules, impératif présent ("add" pas "added")
- Pas de point à la fin
- Maximum 72 caractères pour la première ligne
- Corps : expliquer le POURQUOI, pas le quoi (le quoi est dans le diff)
