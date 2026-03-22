/**
 * Airport database — ~4479 medium + large airports worldwide (OurAirports, public domain).
 * Split into two tiers for render performance:
 *   AIRPORTS_MAJOR : ~1177 large_airport entries — always rendered
 *   (minor entries) : ~3302 medium_airport entries — only rendered when zoomed in (see airport-render.ts)
 *
 * Lookups use Map<string, Airport> (O(1)) over both tiers, covering all ~4479 airports.
 * ICAO codes are used for route resolution from OpenSky flight data.
 */
import type { Airport } from '@/types/index'
import majorData from '@/data/airports-major.json'
import minorData from '@/data/airports-minor.json'

export const AIRPORTS_MAJOR: readonly Airport[] = majorData as Airport[]

/** Backward-compatible alias — component imports expecting AIRPORTS still work */
export const AIRPORTS = AIRPORTS_MAJOR

// Build O(1) lookup Maps over all ~4479 airports (major + minor)
const _byIcao = new Map<string, Airport>()
const _byCode = new Map<string, Airport>()

for (const a of majorData as Airport[]) {
  _byIcao.set(a.icao, a)
  _byCode.set(a.code, a)
}
for (const a of minorData as Airport[]) {
  // Major tier takes precedence — only add if not already present
  if (!_byIcao.has(a.icao)) _byIcao.set(a.icao, a)
  if (!_byCode.has(a.code)) _byCode.set(a.code, a)
}

/** Lookup by ICAO code (e.g. 'LFPG') — used for route resolution from OpenSky data */
export function getAirportByIcao(icao: string): Airport | undefined {
  return _byIcao.get(icao)
}

/** Lookup by IATA code (e.g. 'CDG') */
export function getAirportByCode(code: string): Airport | undefined {
  return _byCode.get(code)
}

export function getRandomAirportPair(): [Airport, Airport] {
  const airports = AIRPORTS_MAJOR
  const i = Math.floor(Math.random() * airports.length)
  let j = Math.floor(Math.random() * (airports.length - 1))
  if (j >= i) j++
  return [airports[i], airports[j]]
}
