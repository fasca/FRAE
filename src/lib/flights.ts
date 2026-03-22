/**
 * Flight simulation engine and interpolation utilities.
 * Uses d3-geo geoInterpolate for accurate great circle interpolation.
 * No network calls — purely computational.
 */
import { geoInterpolate } from 'd3-geo'
import type { GeoProjection } from 'd3-geo'
import type { Airport, Flight, FlightState, CompletedFlight, RouteCorridor } from '@/types/index'

const AIRLINE_CODES = [
  'AF', 'BA', 'LH', 'AA', 'UA', 'DL', 'EK', 'QR', 'SQ', 'NH',
  'KL', 'IB', 'AZ', 'TK', 'CX', 'JL', 'KE', 'QF', 'AC', 'LA',
]

export function generateCallsign(): string {
  const airline = AIRLINE_CODES[Math.floor(Math.random() * AIRLINE_CODES.length)]
  const digits = Math.floor(Math.random() * 9000) + 1000 // 1000–9999 → always 4 digits
  return `${airline}${digits}`
}

export function generateIcao24(): string {
  return Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}

export function calculateHeading(
  from: [number, number],
  to: [number, number]
): number {
  const [lon1, lat1] = from.map(d => (d * Math.PI) / 180)
  const [lon2, lat2] = to.map(d => (d * Math.PI) / 180)
  const dLon = lon2 - lon1
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

export function interpolatePosition(
  origin: Airport,
  destination: Airport,
  t: number
): [number, number] {
  const interp = geoInterpolate(
    [origin.lon, origin.lat],
    [destination.lon, destination.lat]
  )
  const [lon, lat] = interp(t)
  return [lon, lat]
}

/**
 * Interpolate heading via shortest angular arc to handle 0/360 wrap-around.
 * e.g., 350 → 10 at t=0.5 gives 0, not 180.
 */
function lerpHeading(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180
  return ((from + delta * t) + 360) % 360
}

/**
 * Interpolate a flight position between two OpenSky fetches using great circle interpolation.
 * Returns current position unchanged if no previous position is available.
 * @param fetchInterval - ms between fetches (typically 10000)
 */
export function interpolateFlight(state: FlightState, now: number, fetchInterval: number): Flight {
  if (!state.previous) return state.current
  const t = Math.min(1, Math.max(0, (now - state.lastFetchTime) / fetchInterval))
  const interp = geoInterpolate(
    [state.previous.longitude, state.previous.latitude],
    [state.current.longitude, state.current.latitude]
  )
  const [lon, lat] = interp(t)
  return {
    ...state.current,
    longitude: lon,
    latitude: lat,
    heading: lerpHeading(state.previous.heading, state.current.heading, t),
    altitude: state.previous.altitude + (state.current.altitude - state.previous.altitude) * t,
  }
}

/**
 * Filter flights by callsign or origin country (case-insensitive).
 * Returns all flights when query is empty.
 */
export function filterFlights(flights: readonly Flight[], query: string): readonly Flight[] {
  if (!query.trim()) return flights
  const q = query.toLowerCase()
  return flights.filter(
    f => f.callsign.toLowerCase().includes(q) || f.originCountry.toLowerCase().includes(q)
  )
}

export function findClosestFlight(
  flights: readonly Flight[],
  projection: GeoProjection,
  canvasX: number,
  canvasY: number,
  maxDistancePx: number
): Flight | null {
  let closest: Flight | null = null
  let minDist = maxDistancePx

  for (const flight of flights) {
    const projected = projection([flight.longitude, flight.latitude])
    if (!projected) continue
    const [px, py] = projected
    const dist = Math.sqrt((px - canvasX) ** 2 + (py - canvasY) ** 2)
    if (dist < minDist) {
      minDist = dist
      closest = flight
    }
  }

  return closest
}

/** Find the index of the closest CompletedFlight by its last recorded position. */
export function findClosestCompletedFlight(
  flights: readonly CompletedFlight[],
  projection: GeoProjection,
  canvasX: number,
  canvasY: number,
  maxDistancePx: number
): number | null {
  let closestIdx: number | null = null
  let minDist = maxDistancePx

  for (let i = 0; i < flights.length; i++) {
    const { positions } = flights[i]
    if (positions.length === 0) continue
    const lastPos = positions[positions.length - 1]
    const projected = projection(lastPos)
    if (!projected) continue
    const [px, py] = projected
    const dist = Math.sqrt((px - canvasX) ** 2 + (py - canvasY) ** 2)
    if (dist < minDist) {
      minDist = dist
      closestIdx = i
    }
  }

  return closestIdx
}


/**
 * Find the index of the corridor whose airport-to-airport straight line
 * is closest to (canvasX, canvasY) in pixel space.
 * Returns null if no corridor is within maxDistancePx.
 */
export function findClosestCorridor(
  corridors: readonly RouteCorridor[],
  projection: GeoProjection,
  canvasX: number,
  canvasY: number,
  maxDistancePx: number
): number | null {
  let closestIdx: number | null = null
  let minDist = maxDistancePx

  for (let i = 0; i < corridors.length; i++) {
    const { departureAirport, arrivalAirport } = corridors[i]
    if (!departureAirport || !arrivalAirport) continue

    const a = projection([departureAirport.lon, departureAirport.lat])
    const b = projection([arrivalAirport.lon,   arrivalAirport.lat])
    if (!a || !b) continue

    // Point-to-segment distance in pixel space
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const lenSq = dx * dx + dy * dy
    let dist: number

    if (lenSq === 0) {
      // Degenerate segment — just distance to point a
      dist = Math.sqrt((canvasX - a[0]) ** 2 + (canvasY - a[1]) ** 2)
    } else {
      const t = Math.max(0, Math.min(1, ((canvasX - a[0]) * dx + (canvasY - a[1]) * dy) / lenSq))
      const closestX = a[0] + t * dx
      const closestY = a[1] + t * dy
      dist = Math.sqrt((canvasX - closestX) ** 2 + (canvasY - closestY) ** 2)
    }

    if (dist < minDist) {
      minDist = dist
      closestIdx = i
    }
  }

  return closestIdx
}
