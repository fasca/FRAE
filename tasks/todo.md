# Phase 1 — Static Map with Projection, Zoom, Centers

## Setup

- [x] Next.js installed (package.json)
- [x] d3-geo, topojson-client, world-atlas installed
- [x] TypeScript strict mode (tsconfig.json)
- [x] vitest configured with jsdom, @ alias

## Types (`src/types/index.ts`)

- [x] `Flight` interface (11 fields)
- [x] `ProjectionCenter` interface
- [x] `MapOptions` interface

## Projection (`src/lib/projection.ts`)

- [x] `createProjection()` with geoAzimuthalEquidistant, correct rotation, clipAngle(180)
- [x] `PREDEFINED_CENTERS` (6 entries)
- [x] `clampScale()`, `calculateZoomScale()`, MIN/MAX/DEFAULT constants

## Renderer (`src/lib/renderer.ts`)

- [x] `COLORS` palette (9+ keys)
- [x] Graticule constants (step + width)
- [x] `createGraticules()`
- [x] `drawStaticLayer()` pipeline: background → globe clip → fine graticule → thick graticule → countries

## Components

- [x] `MapCanvas.tsx`: canvas useRef, HiDPI, world data loading, drawMap, wheel zoom, ResizeObserver
- [x] `ControlPanel.tsx`: 6 center buttons, zoom +/-, uses clampScale
- [x] `StatsBar.tsx`: shows center + scale
- [x] `FlightRadar.tsx`: orchestrator with useState for center/scale/options

## App

- [x] `globals.css`: Tailwind v4 import, JetBrains Mono, CSS variables
- [x] `layout.tsx`: dark bg, title "AE Flight Radar"
- [x] `page.tsx`: full-screen FlightRadar

## Tests

- [x] `tests/types/index.test.ts`
- [x] `tests/lib/projection.test.ts`
- [x] `tests/lib/zoom.test.ts`
- [x] `tests/lib/renderer.test.ts`
- [x] `tests/components/ControlPanel.test.tsx`

## Status: COMPLETE ✓

All Phase 1 checks passed: type-check, lint, tests (29/29), build.

---

# Phase 2 — Simulated Flights with Animation and Info Panel

## Types (`src/types/index.ts`)

- [x] `Airport` interface (code, name, lat, lon)
- [x] `SimulatedFlight` interface (flat, no nested Flight; departureTime backtracked)

## Airport Database (`src/lib/airports.ts`)

- [x] `AIRPORTS` — 30 major airports (CDG, JFK, LHR, NRT, LAX, DXB, SIN, FRA, AMS, PEK, SYD, GRU, JNB, MEX, BOM, ICN, YYZ, EZE, DFW, ORD, ATL, IST, MAD, BCN, MUC, ZRH, HKG, BKK, DEL, CGK)
- [x] `getAirportByCode()`, `getRandomAirportPair()`

## Flight Simulation Engine (`src/lib/flights.ts`)

- [x] `generateCallsign()`, `generateIcao24()`
- [x] `calculateHeading()` — forward azimuth via spherical trig
- [x] `interpolatePosition()` — wraps `geoInterpolate` from d3-geo
- [x] `generateSimulatedFlights(count)` — backtracked departureTime for correct initial progress
- [x] `updateSimulatedFlights()` — advances progress, recycles completed flights
- [x] `simulatedFlightToFlight()` — on-demand Flight snapshot computation
- [x] `findClosestFlight()` — projection-based proximity search for click detection

## Renderer Extensions (`src/lib/renderer.ts`)

- [x] `drawAirports()` — cyan dots + IATA labels
- [x] `drawFlightTrails()` — degressive opacity trail dots
- [x] `drawPlanes()` — rotated triangles, orange / yellow for selected
- [x] `drawSelectedLabel()` — callsign with semi-transparent background
- [x] `drawDynamicLayers()` — orchestrator: trails → airports → planes → label

## Components

- [x] `MapCanvas.tsx`: offscreen canvas cache, RAF animation loop, prop-mirror refs, click detection, AbortController on CDN fetch
- [x] `FlightInfoPanel.tsx`: callsign, route, altitude (m+ft), speed (m/s+kts), heading, country, close button
- [x] `FlightRadar.tsx`: simulation state, 1s update interval, trail accumulation (useRef), selection + route state
- [x] `StatsBar.tsx`: added flightCount prop + Phase 2 watermark

## Tests

- [x] `tests/lib/airports.test.ts` (9 tests)
- [x] `tests/lib/flights.test.ts` (24 tests)
- [x] `tests/lib/renderer.test.ts` (extended, +19 tests)
- [x] `tests/components/MapCanvas.test.tsx` (4 tests)
- [x] `tests/components/FlightInfoPanel.test.tsx` (5 tests)
- [x] `tests/components/StatsBar.test.tsx` (4 tests)

## Status: COMPLETE ✓

All Phase 2 checks passed: type-check, lint (0 errors), tests (94/94), build.

---

# Phase 3 — Données réelles OpenSky Network

## Types (`src/types/index.ts`)

- [x] `FlightState` interface — `{ current, previous, lastFetchTime }`
- [x] `DataSource` type — `'live' | 'simulated'`

## OpenSky Integration (`src/lib/opensky.ts`)

- [x] `parseOpenSkyState()` — maps array indices, filters null lon/lat, defaults nullables
- [x] `parseOpenSkyResponse()` — extracts states array, filters nulls
- [x] `OpenSkyFetchResult` discriminated union type
- [x] `FETCH_INTERVAL_MS = 10_000` (exported)
- [x] `fetchOpenSkyFlights(signal)` — 429 backoff, AbortError rethrow (DOMException-safe)

## Flight Interpolation (`src/lib/flights.ts`)

- [x] `lerpHeading()` — shortest-arc heading interpolation
- [x] `interpolateFlight()` — great-circle position via geoInterpolate, linear altitude

## Components

- [x] `StatsBar.tsx` — added `lastUpdate`, `dataSource`; LIVE/SIM indicator; Phase 3 watermark
- [x] `MapCanvas.tsx` — optional `flightStatesRef`, `dataSource` props; RAF interpolates live positions
- [x] `FlightRadar.tsx` — slimmed to ~70 lines using `useOpenSkyData` hook

## Hook (`src/hooks/useOpenSkyData.ts`)

- [x] `useOpenSkyData()` — setTimeout chain (no overlap), 30s backoff on 429, simulation fallback after 3 errors
- [x] Trail accumulation + pruning on each fetch
- [x] `AbortController` cleanup (signal.aborted check prevents post-unmount scheduling)

## Tests

- [x] `tests/types/index.test.ts` — extended with FlightState, DataSource (+3 tests)
- [x] `tests/lib/opensky.test.ts` — 21 tests: parsing + fetch
- [x] `tests/lib/flights.test.ts` — extended with interpolateFlight, lerpHeading (+8 tests)
- [x] `tests/components/StatsBar.test.tsx` — extended with lastUpdate, dataSource (+5 tests)
- [x] `tests/components/MapCanvas.test.tsx` — extended with flightStatesRef, dataSource props (+2 tests)
- [x] `tests/hooks/useOpenSkyData.test.ts` — 10 tests: fetch loop, fallback, trails, abort

## Status: COMPLETE ✓

All Phase 3 checks passed: type-check, lint (0 errors), tests (142/142), build.
