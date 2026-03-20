/**
 * Flight simulation engine and interpolation utilities.
 * Uses d3-geo geoInterpolate for accurate great circle interpolation.
 * No network calls — purely computational.
 */
import { geoInterpolate } from 'd3-geo'
import type { GeoProjection } from 'd3-geo'
import { getRandomAirportPair } from '@/lib/airports'
import type { Airport, Flight, FlightState, SimulatedFlight } from '@/types/index'

const AIRLINE_CODES = [
  'AF', 'BA', 'LH', 'AA', 'UA', 'DL', 'EK', 'QR', 'SQ', 'NH',
  'KL', 'IB', 'AZ', 'TK', 'CX', 'JL', 'KE', 'QF', 'AC', 'LA',
]

const MIN_DURATION_MS = 30_000   // 30 seconds (accelerated simulation)
const MAX_DURATION_MS = 120_000  // 2 minutes (accelerated simulation)
const MIN_ALTITUDE = 10_000      // metres (cruising)
const MAX_ALTITUDE = 12_000
const MIN_VELOCITY = 220         // m/s
const MAX_VELOCITY = 280

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

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

export function generateSimulatedFlights(count: number): SimulatedFlight[] {
  return Array.from({ length: count }, () => {
    const [origin, destination] = getRandomAirportPair()
    const initialProgress = Math.random() * 0.8 // start mid-flight (0–80%)
    const duration = randomBetween(MIN_DURATION_MS, MAX_DURATION_MS)
    return {
      icao24: generateIcao24(),
      callsign: generateCallsign(),
      originCountry: origin.name.split(' ')[0], // simplified
      origin,
      destination,
      progress: initialProgress,
      departureTime: Date.now() - initialProgress * duration,
      duration,
    }
  })
}

export function updateSimulatedFlights(
  flights: SimulatedFlight[],
  now: number
): SimulatedFlight[] {
  return flights.map(f => {
    const progress = Math.min(1, (now - f.departureTime) / f.duration)
    if (progress >= 1) {
      // Recycle: assign a new route while keeping the same icao24
      const [origin, destination] = getRandomAirportPair()
      return {
        icao24: f.icao24,
        callsign: generateCallsign(),
        originCountry: origin.name.split(' ')[0],
        origin,
        destination,
        progress: 0,
        departureTime: now,
        duration: randomBetween(MIN_DURATION_MS, MAX_DURATION_MS),
      }
    }
    return { ...f, progress }
  })
}

export function simulatedFlightToFlight(sim: SimulatedFlight): Flight {
  const [lon, lat] = interpolatePosition(sim.origin, sim.destination, sim.progress)

  // Compute heading from current position to a slightly ahead position
  const tAhead = Math.min(1, sim.progress + 0.01)
  const [lonAhead, latAhead] = interpolatePosition(sim.origin, sim.destination, tAhead)
  const heading = calculateHeading([lon, lat], [lonAhead, latAhead])

  return {
    icao24: sim.icao24,
    callsign: sim.callsign,
    originCountry: sim.originCountry,
    longitude: lon,
    latitude: lat,
    altitude: randomBetween(MIN_ALTITUDE, MAX_ALTITUDE),
    velocity: randomBetween(MIN_VELOCITY, MAX_VELOCITY),
    heading,
    verticalRate: 0,
    onGround: false,
    lastUpdate: Date.now(),
  }
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
