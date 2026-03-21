# AE Flight Radar — Documentation d'utilisation et d'exploitation

## Démarrage rapide

```bash
npm install
npm run dev        # développement — http://localhost:3000
```

Build de production :

```bash
npm run build
npm start
```

---

## Interface utilisateur

### Barre de contrôle (haut)

| Contrôle | Action |
|----------|--------|
| **Boutons de centre** | Pôle Nord / Paris / New York / Tokyo / Équateur / Pôle Sud — repositionne le centre de la projection |
| **+  /  −** | Zoom avant / arrière (par palier de 50) |
| **Aéro** | Afficher / masquer les aéroports majeurs (points cyan) |
| **Grille** | Afficher / masquer la graticule (15° et 30°) |
| **Pays** | Afficher / masquer les bordures des pays |
| **Traînées** | Afficher / masquer les traînées de position derrière chaque avion (~33 min d'historique, 200 points) |
| **Input texte** | Filtrer les vols par callsign (ex: `AF`, `LH1234`) ou par pays (ex: `France`, `Germany`) |
| **PNG** | Exporter la vue actuelle en image PNG (téléchargement automatique) |

### Sur la carte

| Geste | Action |
|-------|--------|
| **Molette** | Zoom avant / arrière centré sur le curseur |
| **Clic sur un avion** | Ouvre le panneau d'informations (callsign, altitude, vitesse, cap, pays) |
| **Clic + glisser** | Recentre la projection sur le point de relâchement (distance > 5px) — le centre passe en `Custom` |
| **Clic sur fond** | Désélectionne l'avion actif |

### Barre de statut (bas)

Affiche en permanence :
- Centre de projection actuel et ses coordonnées
- Niveau de zoom
- Nombre de vols affichés (après filtre)
- Indicateur de source de données : **LIVE** (vert) = données OpenSky en temps réel, **SIM** (orange) = simulation
- Heure de la dernière mise à jour

---

## API OpenSky Network

### Mode anonyme (défaut — aucune configuration requise)

L'application fonctionne **sans token ni compte** en mode anonyme :

- Endpoint : `GET https://opensky-network.org/api/states/all`
- Rafraîchissement : toutes les **10 secondes** (limite anonyme)
- Aucune clé API, aucune variable d'environnement à configurer

### Mode authentifié (optionnel — doublez la fréquence de mise à jour)

Pour passer à 1 requête / 5 secondes, créez un compte gratuit sur [opensky-network.org](https://opensky-network.org/index.php?option=com_users&view=registration).

Le support de l'authentification Basic Auth n'est pas encore implémenté dans le code. Pour l'ajouter, modifier `src/lib/opensky.ts` :

```typescript
// Exemple d'ajout de Basic Auth
const response = await fetch(OPENSKY_API_URL, {
  signal,
  headers: {
    Authorization: `Basic ${btoa(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`)}`,
  },
})
```

Puis définir dans `.env.local` :

```
OPENSKY_USERNAME=votre_login
OPENSKY_PASSWORD=votre_mot_de_passe
```

Et réduire `FETCH_INTERVAL_MS` de `10_000` à `5_000` dans `src/lib/opensky.ts`.

> **Sécurité** : ne jamais committer `.env.local` ni les credentials en dur dans le code.

### Comportement en cas d'erreur

| Situation | Comportement |
|-----------|-------------|
| HTTP 429 (trop de requêtes) | Backoff automatique de **30 secondes** avant retry |
| Erreur réseau / HTTP 5xx | Retry après 10 secondes |
| 3 erreurs consécutives | Bascule automatique en **mode simulation** (80 vols générés) — aucun retry OpenSky |
| Mode simulation actif | Indicateur **SIM** (orange) dans la StatsBar — recharger la page pour retenter |

---

## Architecture technique

```
src/
  app/            → Next.js App Router (layout, page, globals.css)
  components/
    FlightRadar   → Orchestrateur principal (state, hooks)
    MapCanvas     → Rendu Canvas 2D (projection, RAF, interaction)
    ControlPanel  → Contrôles UI (centres, zoom, toggles, filtre, export)
    FlightInfoPanel → Panneau infos avion sélectionné
    StatsBar      → Barre de statut (indicateurs, compteurs)
  hooks/
    useOpenSkyData → Fetch OpenSky, interpolation, fallback simulation
  lib/
    projection.ts → D3 geoAzimuthalEquidistant, clamp, zoom
    renderer.ts   → Pipeline Canvas (fond, graticule, pays, avions, traînées)
    opensky.ts    → Fetch + parsing API OpenSky
    flights.ts    → Simulation, interpolation great circle, filtre
    airports.ts   → Base statique 30 aéroports majeurs
  types/index.ts  → Interfaces TypeScript (Flight, MapOptions, etc.)
```

**Choix techniques clés :**
- **Canvas 2D** (pas SVG) — performance 30 fps avec 3000+ avions simultanés
- **Canvas offscreen** — la carte statique (fond, graticule, pays) est rendue une seule fois dans un canvas hors-écran et copiée à chaque frame
- **RAF** (requestAnimationFrame) — interpolation fluide des positions entre les mises à jour OpenSky (toutes les 10s)
- **Projection azimutale équidistante** — les routes orthodromiques (great circles) apparaissent comme des droites depuis le centre de projection

---

## Commandes de développement

```bash
npm run dev         # Serveur de développement (Next.js + Turbopack)
npm run build       # Build de production
npm run start       # Serveur de production (après build)
npm run lint        # ESLint
npm run type-check  # TypeScript strict (tsc --noEmit)
npm run test        # Suite de tests Vitest (158 tests)
npm run test:watch  # Tests en mode watch
```

---

## Dépannage

**La carte affiche "SIM" au lieu de "LIVE"**
→ OpenSky est down, rate-limité (429), ou 3 erreurs consécutives se sont produites. Recharger la page pour relancer le cycle de fetch.

**La carte est entièrement noire / vide**
→ Le fichier `countries-110m.json` se charge depuis le CDN jsDelivr. Vérifier la connexion réseau et la console navigateur.

**Aucun avion affiché alors que le mode est LIVE**
→ Un filtre est peut-être actif dans l'input. Vider l'input ou vérifier le compteur de vols dans la StatsBar.

**Les avions ne se déplacent pas**
→ Normal si `dataSource = 'live'` et que la mise à jour n'a pas encore eu lieu. Les avions s'interpolent entre deux fetches OpenSky (toutes les 10s).

**Zoom bloqué**
→ Les limites sont scale 100 (dézoomé maximum) à 1500 (zoomé maximum).
