# Lessons Learned — FRAE

## Phase 1 — Task 1 : Nullabilité des champs Flight

**Contexte :** L'interface `Flight` modélise les champs OpenSky comme non-nullables (`callsign: string`, `altitude: number`, etc.).

**Décision à prendre avant Phase 3 (opensky.ts) :** L'API OpenSky peut retourner `null` pour `callsign`, `altitude`, `velocity`, `heading`, `verticalRate`. Deux approches possibles :
1. Modéliser les champs comme `string | null` / `number | null` dans l'interface `Flight`
2. Garder `Flight` comme modèle de domaine post-parsing et gérer la nullabilité exclusivement dans `opensky.ts` (conversion null → valeur par défaut à l'entrée)

**Action :** Choisir l'approche et adapter `src/types/index.ts` et/ou `src/lib/opensky.ts` en cohérence avant d'implémenter le fetch OpenSky.
