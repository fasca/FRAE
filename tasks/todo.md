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
