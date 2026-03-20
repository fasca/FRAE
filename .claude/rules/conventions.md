# Conventions de Code — AE Flight Radar

## TypeScript

- Mode strict activé — pas de `any`. Utiliser `unknown` si le type est incertain.
- Préférer les `interface` aux `type` pour les formes d'objets (Flight, ProjectionCenter, etc.)
- Toujours typer les paramètres de fonctions et les valeurs de retour
- Pas de non-null assertions (`!`) sauf si la nullité est prouvée structurellement

## React

- Composants fonctionnels avec hooks uniquement — jamais de class components
- `useRef` pour les données mutables liées à l'animation (positions des avions, interpolation, RAF handle)
- `useState` uniquement pour l'état UI (avion sélectionné, visibilité du panel, niveau de zoom, centre de projection)
- Toujours nettoyer les effets dans le return de `useEffect` (RAF, intervalles, AbortController)

## D3 et Canvas

- Importer uniquement les sous-modules nécessaires :
  ```typescript
  import { geoAzimuthalEquidistant, geoPath } from 'd3-geo'
  import { geoInterpolate } from 'd3-geo'
  ```
  Jamais `import * as d3 from 'd3'`
- Tout le code de dessin Canvas doit passer par `src/lib/renderer.ts` — pas d'appels Canvas inline dans les composants
- Les composants Canvas utilisent `useRef<HTMLCanvasElement>` et `useEffect` pour initialiser le contexte

## Structure des fichiers

- Fichiers < 300 lignes, fonctions < 50 lignes
- Un fichier = une responsabilité claire
- Nommage : PascalCase pour les composants, camelCase pour les fonctions/variables, UPPER_SNAKE_CASE pour les constantes
- Pas de magic numbers — utiliser des constantes nommées (ex: `const MIN_SCALE = 100`, `const MAX_SCALE = 1500`)

## CSS

- Classes Tailwind utility en priorité
- Pas de styles inline sauf pour les dimensions dynamiques du canvas
- Palette de couleurs définie dans `tailwind.config` ou `globals.css` — pas de valeurs hex dispersées dans les composants

## Tests

- Fichiers de test dans `tests/` qui miroir `src/`
- Pattern AAA (Arrange / Act / Assert)
- Nommage : `should_[comportement]_when_[condition]`
- Mocker les appels OpenSky, le contexte Canvas 2D, et les projections D3
