# /test — Génération et Exécution des Tests FRAE

Génère les tests manquants et exécute la suite complète.

## Actions

1. Identifier les fichiers `src/lib/*.ts` et `src/components/*.tsx` sans tests correspondants dans `tests/`
2. Prioriser dans cet ordre : `opensky.ts` → `projection.ts` → `flights.ts` → `renderer.ts` → composants
3. Générer les tests manquants selon la skill `testing` :
   - Utiliser les factories `createMockFlight()` et `createMockOpenSkyResponse()`
   - Mocker `fetch`, `CanvasRenderingContext2D`, `requestAnimationFrame`
   - Tester happy path + null coords + HTTP errors + cleanup
4. Exécuter : `npm run test`
5. Reporter les échecs dans `tasks/todo.md`

Focus : $ARGUMENTS

## Fichiers de tests cibles

```
tests/lib/opensky.test.ts      → Parsing index mapping, null filtering, 429 handling
tests/lib/projection.test.ts   → createProjection, rotate signs, scale bounds
tests/lib/flights.test.ts      → Position interpolation, FlightState management
tests/lib/renderer.test.ts     → Draw pipeline phases, offscreen buffer
tests/components/MapCanvas.test.tsx → Mount/unmount RAF cleanup
```
