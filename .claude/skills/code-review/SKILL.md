---
name: frae-review-checklist
description: Checklist de vérifications SPÉCIFIQUES AU PROJET FRAE, à utiliser APRÈS
  le plugin code-review. Déclencheurs : "checklist FRAE", "vérifications spécifiques FRAE",
  "en plus du code-review", "points spécifiques canvas", "vérif opensky".
  NE PAS utiliser pour la revue générique — utiliser le plugin code-review.
allowed-tools: Read, Grep, Glob
---

# Checklist Complémentaire FRAE

> Le plugin `code-review` vérifie déjà la sécurité, la qualité et les patterns génériques.
> Ce fichier ajoute les vérifications SPÉCIFIQUES à l'architecture FRAE que le plugin ne connaît pas.

## Contraintes Canvas 2D (spécifiques FRAE)

- [ ] La carte statique (pays, graticule, fond) utilise-t-elle le canvas offscreen ?
- [ ] L'offscreen est-il recalculé UNIQUEMENT sur changement de projection (centre ou zoom) ?
- [ ] `requestAnimationFrame` est-il utilisé pour l'animation des avions (pas setTimeout) ?
- [ ] `cancelAnimationFrame` est-il dans le cleanup du `useEffect` ?
- [ ] `canvas.getContext('2d', { alpha: false })` est-il utilisé ?
- [ ] `devicePixelRatio` est-il géré pour HiDPI ?

## Contraintes D3 / Projection (spécifiques FRAE)

- [ ] La rotation est-elle `rotate([-lon, -lat, 0])` (avec NÉGATION) ?
- [ ] `clipAngle(180)` est-il présent ?
- [ ] Les imports D3 sont-ils scopés (`from 'd3-geo'`, PAS `from 'd3'`) ?
- [ ] La projection n'est-elle PAS recréée à chaque frame ?

## Contraintes API OpenSky (spécifiques FRAE)

- [ ] Le polling respecte-t-il le rate limit de 10 secondes ?
- [ ] Y a-t-il un `AbortController` pour nettoyer les requêtes ?
- [ ] Les vols avec `longitude === null || latitude === null` sont-ils filtrés ?
- [ ] HTTP 429 est-il géré gracieusement (pas de retry immédiat) ?
- [ ] Le mapping des index est-il correct ?
  - [5]=lon, [6]=lat, [7]=alt, [8]=onGround, [9]=velocity, [10]=heading, [1]=callsign (`.trim()`)

## Contraintes React FRAE

- [ ] Les données d'animation (positions, RAF handle) sont-elles dans `useRef` (pas `useState`) ?
- [ ] Les `useEffect` ont-ils tous un cleanup (intervals, RAF, listeners, AbortController) ?
- [ ] Aucun appel Canvas inline dans les composants (tout passe par `renderer.ts`) ?
