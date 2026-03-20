# ADR-001 — Choix du Stack Technique FRAE

**Date** : 2026-03-19
**Statut** : Accepté

## Contexte

Besoin d'une application web affichant les positions de vol mondiales en temps réel sur une projection azimutale équidistante. Objectif de performance : 30 fps avec 3000+ avions simultanés. Contrainte : pas de clé API, déploiement simple.

## Options considérées

### Bibliothèque de projection

1. **Leaflet/Mapbox** — Pros : mature, tiles cachés. Cons : verrouillé sur Mercator/Web Mercator, pas de projection azimutale équidistante native.
2. **D3.js (d3-geo)** — Pros : `geoAzimuthalEquidistant()` natif, contrôle total de la projection, interpolation great circle intégrée. Cons : pas de tile caching, doit tout rendre manuellement.
3. **Globe.gl / Three.js** — Pros : globe 3D. Cons : overkill, pas de projection azimutale équidistante 2D.

**Décision : D3.js (d3-geo)** — seule bibliothèque avec projection azimutale équidistante native.

### Rendu

1. **SVG** — Pros : événements DOM natifs, styling CSS. Cons : trop lent pour 3000+ éléments animés (DOM manipulations à chaque frame).
2. **Canvas 2D** — Pros : rapide pour des milliers de points, contrôle pixel direct. Cons : hit detection manuelle (clic sur un avion), pas d'événements DOM.
3. **WebGL** — Pros : accéléré GPU. Cons : complexité élevée, surdimensionné pour des points 2D simples.

**Décision : Canvas 2D** — meilleur ratio performance/complexité pour ce cas d'usage.

### Données de vol

1. **OpenSky Network** (gratuit, sans clé) — Pros : gratuit, CORS supporté, données mondiales réelles. Cons : rate limit 10s, parfois instable.
2. **ADS-B Exchange** — Pros : données plus riches. Cons : clé API requise, payant.
3. **FlightAware** — Pros : très riche. Cons : coûteux, pas adapté au hobbyiste.

**Décision : OpenSky Network** — gratuit, suffisant pour le MVP, CORS friendly.

### Framework

1. **Next.js 14+** (App Router) — Pros : TypeScript natif, SSR pour le chargement initial, excellent DX, déploiement Vercel simple.
2. **Vite + React** — Pros : plus léger. Cons : pas de SSR natif, routing manuel.
3. **Vanilla JS** — Pros : pas de surcharge framework. Cons : DX médiocre, pas de TypeScript tooling natif.

**Décision : Next.js 14+** — meilleur DX, TypeScript first-class, déploiement facile.

### State management

1. **React state + useRef** — Pros : simple, `useRef` parfait pour les données mutables d'animation (positions à chaque frame), `useState` pour l'état UI.
2. **Zustand/Jotai** — Pros : plus propre pour l'état complexe. Cons : dépendance supplémentaire inutile pour cette portée.
3. **Redux** — Overkill pour une SPA de cette complexité.

**Décision : React state + useRef** — les données d'animation dans `useRef` (mutations sans re-render), l'état UI dans `useState`.

## Conséquences

- Hit detection sur Canvas à implémenter manuellement (clic sur un avion = calcul de distance pixel)
- Canvas offscreen obligatoire pour les performances (carte statique dans un buffer, avions redessinés à chaque frame)
- Rate limiting OpenSky à gérer rigoureusement (AbortController, backoff sur 429)
- D3 ESM-only fonctionne nativement avec Next.js — mais imports scopés aux sous-modules obligatoires
- Fallback sur vols simulés nécessaire si OpenSky est down
