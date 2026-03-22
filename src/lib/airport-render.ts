/**
 * airport-render.ts
 * Returns the set of airports to display based on the current projection scale.
 *
 * Performance strategy:
 *   scale < MINOR_SCALE_THRESHOLD  → major airports only (~1177) — low zoom, many off-screen anyway
 *   scale ≥ MINOR_SCALE_THRESHOLD  → all airports (~4479)        — user is zoomed in, D3 clips off-screen
 */
import type { Airport } from '@/types/index'
import majorData from '@/data/airports-major.json'
import minorData from '@/data/airports-minor.json'

const AIRPORTS_MAJOR: readonly Airport[] = majorData as Airport[]
const AIRPORTS_ALL:   readonly Airport[] = [...majorData, ...minorData] as Airport[]

/** Scale at which minor (medium) airports become visible. Mid-point of the 100–1500 range. */
const MINOR_SCALE_THRESHOLD = 800

export function getVisibleAirports(scale: number): readonly Airport[] {
  return scale >= MINOR_SCALE_THRESHOLD ? AIRPORTS_ALL : AIRPORTS_MAJOR
}
