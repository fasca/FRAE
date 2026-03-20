/**
 * OpenSky Network API integration — parsing and fetch.
 * ⚠️ READ src/lib/CLAUDE.md before modifying this file.
 *
 * Rate limit rules:
 * - Minimum 10s between requests (anonymous mode)
 * - Never two requests in parallel
 * - HTTP 429: back off 30s minimum
 * - Filter flights with null lon/lat
 */
import type { Flight } from '@/types/index'

// OpenSky array index constants (per src/lib/CLAUDE.md)
const IDX_ICAO24          = 0
const IDX_CALLSIGN        = 1
const IDX_ORIGIN_COUNTRY  = 2
const IDX_LAST_CONTACT    = 4
const IDX_LONGITUDE       = 5
const IDX_LATITUDE        = 6
const IDX_BARO_ALTITUDE   = 7
const IDX_ON_GROUND       = 8
const IDX_VELOCITY        = 9
const IDX_TRUE_TRACK      = 10
const IDX_VERTICAL_RATE   = 11

/**
 * Parse a single OpenSky state array into a Flight object.
 * Returns null if coordinates are missing or icao24 is not a string.
 */
export function parseOpenSkyState(raw: unknown[]): Flight | null {
  const icao24 = raw[IDX_ICAO24]
  if (typeof icao24 !== 'string') return null

  const longitude = raw[IDX_LONGITUDE] as number | null
  const latitude  = raw[IDX_LATITUDE]  as number | null
  if (longitude === null || longitude === undefined) return null
  if (latitude  === null || latitude  === undefined) return null

  const rawCallsign = raw[IDX_CALLSIGN]
  const callsign = typeof rawCallsign === 'string' ? rawCallsign.trim() : ''

  return {
    icao24,
    callsign,
    originCountry:  typeof raw[IDX_ORIGIN_COUNTRY] === 'string' ? (raw[IDX_ORIGIN_COUNTRY] as string) : '',
    longitude,
    latitude,
    altitude:       (raw[IDX_BARO_ALTITUDE]  as number | null) ?? 0,
    velocity:       (raw[IDX_VELOCITY]        as number | null) ?? 0,
    heading:        (raw[IDX_TRUE_TRACK]      as number | null) ?? 0,
    verticalRate:   (raw[IDX_VERTICAL_RATE]   as number | null) ?? 0,
    onGround:       raw[IDX_ON_GROUND] === true,
    lastUpdate:     (raw[IDX_LAST_CONTACT]    as number) ?? 0,
  }
}

/**
 * Parse a full OpenSky API JSON response into a Flight array.
 * Returns [] for any malformed response.
 */
export function parseOpenSkyResponse(json: unknown): Flight[] {
  if (json === null || typeof json !== 'object') return []
  const obj = json as Record<string, unknown>
  if (!Array.isArray(obj.states)) return []
  const flights: Flight[] = []
  for (const state of obj.states) {
    if (!Array.isArray(state)) continue
    const flight = parseOpenSkyState(state as unknown[])
    if (flight !== null) flights.push(flight)
  }
  return flights
}

export type OpenSkyFetchResult =
  | { ok: true; flights: Flight[]; timestamp: number }
  | { ok: false; error: string }

const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all'

/**
 * Fetch live flight data from OpenSky Network.
 * Throws DOMException (AbortError) if signal is aborted — callers must handle this.
 * Returns { ok: false } for rate-limit (429), HTTP errors, and network failures.
 */
export async function fetchOpenSkyFlights(signal: AbortSignal): Promise<OpenSkyFetchResult> {
  let response: Response
  try {
    response = await fetch(OPENSKY_API_URL, { signal })
  } catch (err) {
    // DOMException does not extend Error in all environments — check name directly
    if (err !== null && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') throw err
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }

  if (response.status === 429) {
    return { ok: false, error: 'rate-limited' }
  }
  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}` }
  }

  const json: unknown = await response.json()
  const flights = parseOpenSkyResponse(json)
  return { ok: true, flights, timestamp: Date.now() }
}
