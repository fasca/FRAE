# Lessons Learned — AE Flight Radar (FRAE)

> Claude : relis ce fichier au début de chaque session.
> Après chaque correction de bug, ajoute une règle ici.

## Règles Techniques

*(Aucune entrée pour l'instant — ajouter après le premier bug corrigé)*

---

## Règles de Process

*(Aucune entrée pour l'instant — ajouter après le premier problème de process)*

---

## Phase 3 — DOMException n'est pas instanceof Error dans jsdom

**Bug :** `fetchOpenSkyFlights` vérifiait `err instanceof Error && err.name === 'AbortError'` pour détecter les AbortError. Dans jsdom, `DOMException` n'hérite pas de `Error`, donc la condition échouait silencieusement — les AbortError étaient avalées au lieu d'être rethrown.

**Fix :** Détecter via `err !== null && typeof err === 'object' && (err as { name?: string }).name === 'AbortError'` sans passer par `instanceof Error`.

**Règle :** Pour les AbortError dans les tests avec jsdom (ou tout environnement non-navigateur), ne jamais utiliser `instanceof Error` comme garde. Vérifier `err?.name === 'AbortError'` directement.

---

## Phase 3 — React 18 + vi.useFakeTimers() + async act() = deadlock

**Bug :** `await act(async () => { await vi.advanceTimersByTimeAsync(100) })` causait un timeout infini ("Aborting after running 10000 timers"). React 18 batchs les mises à jour via microtasks et `advanceTimersByTimeAsync` ajoute des timers synthétiques qui créent une boucle infinie d'interactions.

**Fix :** Séparer en deux opérations distinctes :
1. Avancer les timers de manière **synchrone** : `act(() => { vi.advanceTimersByTime(N) })`
2. Flusher les promises et mises à jour React : `await act(async () => { await flushAsync(10) })`

où `flushAsync = async (cycles = 5) => { for (let i = 0; i < cycles; i++) await Promise.resolve() }`

**Règle :** Ne jamais mélanger `advanceTimersByTimeAsync` (async) avec `await act()`. Utiliser uniquement la forme synchrone `act(() => vi.advanceTimersByTime(N))` pour le timer et `await act(async () => flushAsync())` séparément pour les promises.

---

## Phase 3 — vi.fn().mockReturnValue() ne fonctionne pas avec new

**Bug :** Mocker `AbortController` avec `vi.stubGlobal('AbortController', vi.fn().mockReturnValue({ signal: {...}, abort: spy }))` ne fonctionnait pas — l'instance créée avec `new` n'avait pas les bonnes propriétés.

**Fix :** Utiliser une classe ES inline : `vi.stubGlobal('AbortController', class { signal = { aborted: false }; abort = abortSpy })`

**Règle :** Pour mocker des constructeurs (utilisés avec `new`), toujours utiliser une classe inline plutôt que `vi.fn().mockReturnValue()`.

---

## Phase 1 — Task 1 : Nullabilité des champs Flight

**Contexte :** L'interface `Flight` modélise les champs OpenSky comme non-nullables (`callsign: string`, `altitude: number`, etc.).

**Décision à prendre avant Phase 3 (opensky.ts) :** L'API OpenSky peut retourner `null` pour `callsign`, `altitude`, `velocity`, `heading`, `verticalRate`. Deux approches possibles :
1. Modéliser les champs comme `string | null` / `number | null` dans l'interface `Flight`
2. Garder `Flight` comme modèle de domaine post-parsing et gérer la nullabilité exclusivement dans `opensky.ts` (conversion null → valeur par défaut à l'entrée)

**Action :** Choisir l'approche et adapter `src/types/index.ts` et/ou `src/lib/opensky.ts` en cohérence avant d'implémenter le fetch OpenSky.
