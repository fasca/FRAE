# Module lib/ — Zone Sensible

⚠️ **LIRE CE FICHIER AVANT TOUTE MODIFICATION dans `src/lib/`**

---

## opensky.ts — API Externe (CRITIQUE)

### Mapping des index du tableau OpenSky

La réponse API retourne un tableau d'arrays (pas d'objets). Le mapping est :

```
[0]  icao24         — string
[1]  callsign       — string (avec espaces de padding — toujours .trim())
[2]  origin_country — string
[3]  time_position  — number | null
[4]  last_contact   — number
[5]  longitude      — number | null  ← TOUJOURS vérifier null avant usage
[6]  latitude       — number | null  ← TOUJOURS vérifier null avant usage
[7]  baro_altitude  — number | null  (en mètres)
[8]  on_ground      — boolean
[9]  velocity       — number | null  (en m/s)
[10] true_track     — number | null  (cap en degrés, 0-360)
[11] vertical_rate  — number | null  (m/s)
[12] sensors        — null (ignoré)
[13] geo_altitude   — number | null
[14] squawk         — null (ignoré)
[15] spi            — boolean (ignoré)
[16] position_source — number (ignoré)
```

### Règles impératives

- **Rate limit** : MINIMUM 10 secondes entre chaque requête anonyme. Jamais deux requêtes en parallèle.
- **AbortController** : TOUJOURS créer un AbortController dans le fetch. Appeler `abort()` dans le cleanup du useEffect.
- **Filtrage null** : TOUJOURS filtrer `longitude === null || latitude === null` avant de créer un objet Flight.
- **HTTP 429** : détecter `response.status === 429`, attendre 30 secondes minimum avant retry. Ne jamais boucler rapidement.
- **Fallback** : si 3 erreurs consécutives → basculer sur vols simulés, afficher indicateur dans StatsBar.
- **Logs** : ne jamais logger le tableau `states` complet (peut contenir 10 000+ entrées, saturera les DevTools).

---

## renderer.ts — Pipeline Canvas (CRITIQUE)

### Ordre de dessin obligatoire (arrière vers avant)

```
1. Fond dégradé radial
2. Globe (Sphere clipping)
3. Graticule fine (15°, 0.3px, #091520)
4. Graticule épaisse (30°, 0.5px, #0d1f35)
5. Pays (fill #0c1e30, stroke #1a3a5c)
6. Traînées avions (5-10 pts, opacité dégressive)
7. Aéroports (cyan #00e5ff)
8. Avions (orange #ff8c42, sélectionné jaune #ffcc00)
9. Labels (callsign avion sélectionné)
```

### Règles de performance

- **Canvas offscreen** : les couches 1-5 (statiques) DOIVENT être dans un canvas offscreen. Les recalculer UNIQUEMENT quand la projection change (centre ou zoom). Copier avec `ctx.drawImage(offscreen, 0, 0)` à chaque frame.
- **RAF** : toujours stocker le handle RAF dans un `useRef`. Appeler `cancelAnimationFrame(ref.current)` dans le cleanup.
- **Context** : utiliser `canvas.getContext('2d', { alpha: false })` pour le canvas principal (plus rapide).
- **HiDPI** : `canvas.width = width * devicePixelRatio` + `ctx.scale(devicePixelRatio, devicePixelRatio)`.
- **Target** : 30fps minimum avec 3000+ avions. Profiler si dégradation.

---

## projection.ts

- **Rotation** : `rotate([-center.lon, -center.lat, 0])` — les deux valeurs sont NIÉES.
- **clipAngle(180)** : OBLIGATOIRE pour afficher le globe entier depuis le centre.
- **Scale** : range 100 (dézoomé) à 1500 (zoomé au max). Défaut : ~250 pour globe entier.
- **translate** : `[width / 2, height / 2]` — recentrer après chaque changement de taille du canvas.

---

## flights.ts

- **geoInterpolate** : utiliser `import { geoInterpolate } from 'd3-geo'` pour les great circles.
- **Interpolation** : `t = Math.min(1, (Date.now() - lastFetchTime) / 10000)` — borner entre 0 et 1.
- **FlightState** : stocker `{ current, previous, lastFetchTime }` par icao24 dans une `Map<string, FlightState>`.

---

## airports.ts

- Données statiques uniquement — pas d'appels réseau.
- Format : `{ code: string, name: string, lat: number, lon: number }[]`
- 20-30 aéroports majeurs : CDG, JFK, LHR, NRT, LAX, DXB, SIN, FRA, AMS, PEK, SYD, GRU, JNB, MEX, BOM, ICN, YYZ, EZE, DFW, ORD, ATL, IST, MAD, BCN, MUC, ZRH, HKG, BKK, DEL, CGK
