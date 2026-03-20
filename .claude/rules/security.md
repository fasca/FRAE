---
paths:
  - src/lib/**
---

# Règles de Sécurité — Module lib/

## opensky.ts — API Externe

- **Rate limit** : minimum 10 secondes entre chaque requête en mode anonyme. Ne jamais lancer deux requêtes en parallèle vers l'API OpenSky.
- **HTTP 429** : toujours gérer gracieusement (back off, retenter après 30 secondes minimum, ne pas boucler rapidement).
- **Nettoyage** : utiliser `AbortController` pour annuler les requêtes fetch au démontage du composant (cleanup dans `useEffect`).
- **Données brutes** : ne jamais logger les tableaux de réponse OpenSky en entier (peuvent contenir des milliers d'entrées).
- **Filtrage** : toujours filtrer les vols sans coordonnées (`longitude === null || latitude === null`) avant tout traitement.
- **Secrets** : l'API OpenSky est anonyme. Si une authentification est ajoutée ultérieurement, utiliser des variables d'environnement uniquement (jamais de credentials en dur dans le code).

## renderer.ts — Pipeline Canvas

- **Inputs utilisateur** : toujours sanitiser les chaînes affichées sur le canvas (callsign, pays) — pas de `eval`, pas d'injection via des chaînes de formatage.
- **AbortController** : nettoyer `requestAnimationFrame` au démontage (`cancelAnimationFrame` dans le cleanup de `useEffect`).
- **Canvas offscreen** : ne jamais copier des données non validées vers le canvas offscreen.

## Général lib/

- Ne jamais écrire de variables d'environnement ou de secrets dans ce module.
- Tout accès réseau doit être isolé dans `opensky.ts` — les autres fichiers lib ne font pas de requêtes HTTP.
