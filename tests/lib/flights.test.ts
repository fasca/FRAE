import { describe, it, expect } from 'vitest'
import {
  generateCallsign,
  generateIcao24,
  calculateHeading,
  interpolatePosition,
  generateSimulatedFlights,
  updateSimulatedFlights,
  simulatedFlightToFlight,
  findClosestFlight,
} from '@/lib/flights'
import { AIRPORTS } from '@/lib/airports'
import type { Airport, Flight } from '@/types/index'
import type { GeoProjection } from 'd3-geo'

const CDG: Airport = { code: 'CDG', name: 'Paris Charles de Gaulle', lat: 49.01, lon: 2.55 }
const JFK: Airport = { code: 'JFK', name: 'New York JFK', lat: 40.64, lon: -73.78 }
const NRT: Airport = { code: 'NRT', name: 'Tokyo Narita', lat: 35.76, lon: 140.39 }

describe('generateCallsign', () => {
  it('should_return_string_matching_airline_pattern', () => {
    const callsign = generateCallsign()
    expect(callsign).toMatch(/^[A-Z]{2}\d{4}$/)
  })
  it('should_return_different_callsigns_on_successive_calls', () => {
    const callsigns = new Set(Array.from({ length: 10 }, () => generateCallsign()))
    expect(callsigns.size).toBeGreaterThan(1)
  })
})

describe('generateIcao24', () => {
  it('should_return_6_char_hex_string', () => {
    const icao = generateIcao24()
    expect(icao).toMatch(/^[0-9a-f]{6}$/)
  })
  it('should_return_unique_values', () => {
    const values = new Set(Array.from({ length: 10 }, () => generateIcao24()))
    expect(values.size).toBeGreaterThan(1)
  })
})

describe('calculateHeading', () => {
  it('should_return_value_between_0_and_360', () => {
    const heading = calculateHeading([0, 0], [45, 0])
    expect(heading).toBeGreaterThanOrEqual(0)
    expect(heading).toBeLessThan(360)
  })
  it('should_return_approximately_0_when_heading_north', () => {
    // from equator to north pole
    const heading = calculateHeading([0, 0], [0, 89])
    expect(heading).toBeCloseTo(0, 0)
  })
  it('should_return_approximately_90_when_heading_east', () => {
    // from prime meridian heading east along equator
    const heading = calculateHeading([0, 0], [89, 0])
    expect(heading).toBeCloseTo(90, 0)
  })
})

describe('interpolatePosition', () => {
  it('should_return_origin_when_t_is_0', () => {
    const [lon, lat] = interpolatePosition(CDG, JFK, 0)
    expect(lon).toBeCloseTo(CDG.lon, 1)
    expect(lat).toBeCloseTo(CDG.lat, 1)
  })
  it('should_return_destination_when_t_is_1', () => {
    const [lon, lat] = interpolatePosition(CDG, JFK, 1)
    expect(lon).toBeCloseTo(JFK.lon, 1)
    expect(lat).toBeCloseTo(JFK.lat, 1)
  })
  it('should_return_valid_lon_lat_for_any_t', () => {
    const [lon, lat] = interpolatePosition(CDG, NRT, 0.5)
    expect(lon).toBeGreaterThanOrEqual(-180)
    expect(lon).toBeLessThanOrEqual(180)
    expect(lat).toBeGreaterThanOrEqual(-90)
    expect(lat).toBeLessThanOrEqual(90)
  })
})

describe('generateSimulatedFlights', () => {
  it('should_return_requested_number_of_flights', () => {
    const flights = generateSimulatedFlights(10)
    expect(flights).toHaveLength(10)
  })
  it('should_generate_flights_with_distinct_icao24', () => {
    const flights = generateSimulatedFlights(10)
    const ids = flights.map(f => f.icao24)
    expect(new Set(ids).size).toBe(10)
  })
  it('should_generate_flights_with_progress_between_0_and_0_8', () => {
    const flights = generateSimulatedFlights(10)
    for (const f of flights) {
      expect(f.progress).toBeGreaterThanOrEqual(0)
      expect(f.progress).toBeLessThanOrEqual(0.8)
    }
  })
  it('should_generate_flights_with_valid_airports', () => {
    const codes = AIRPORTS.map(a => a.code)
    const flights = generateSimulatedFlights(10)
    for (const f of flights) {
      expect(codes).toContain(f.origin.code)
      expect(codes).toContain(f.destination.code)
      expect(f.origin.code).not.toBe(f.destination.code)
    }
  })
})

describe('updateSimulatedFlights', () => {
  it('should_keep_same_count_after_update', () => {
    const flights = generateSimulatedFlights(5)
    const now = Date.now()
    const updated = updateSimulatedFlights(flights, now)
    expect(updated).toHaveLength(5)
  })
  it('should_advance_progress_based_on_elapsed_time', () => {
    const flights = generateSimulatedFlights(3)
    // Set a very long duration so progress is near 0
    const fixedFlights = flights.map(f => ({
      ...f,
      progress: 0,
      departureTime: Date.now(),
      duration: 60000, // 60 seconds
    }))
    const later = Date.now() + 30000 // 30 seconds later
    const updated = updateSimulatedFlights(fixedFlights, later)
    for (const f of updated) {
      expect(f.progress).toBeGreaterThan(0)
      expect(f.progress).toBeLessThanOrEqual(1)
    }
  })
  it('should_recycle_completed_flights_with_new_routes', () => {
    // Create flights that are already completed (progress >= 1)
    const flights = generateSimulatedFlights(3)
    const completedFlights = flights.map(f => ({
      ...f,
      progress: 0,
      departureTime: 0, // very old
      duration: 1,      // 1ms duration — already completed
    }))
    const updated = updateSimulatedFlights(completedFlights, Date.now())
    expect(updated).toHaveLength(3)
    // Recycled flights should have fresh progress near 0
    for (const f of updated) {
      expect(f.progress).toBeGreaterThanOrEqual(0)
      expect(f.progress).toBeLessThanOrEqual(1)
    }
  })
})

describe('simulatedFlightToFlight', () => {
  it('should_return_valid_flight_interface', () => {
    const [sim] = generateSimulatedFlights(1)
    const flight = simulatedFlightToFlight(sim)
    expect(typeof flight.icao24).toBe('string')
    expect(typeof flight.callsign).toBe('string')
    expect(typeof flight.longitude).toBe('number')
    expect(typeof flight.latitude).toBe('number')
    expect(typeof flight.altitude).toBe('number')
    expect(typeof flight.velocity).toBe('number')
    expect(typeof flight.heading).toBe('number')
    expect(typeof flight.onGround).toBe('boolean')
  })
  it('should_compute_position_from_interpolation', () => {
    const sim = {
      icao24: 'abc123',
      callsign: 'AF1234',
      originCountry: 'France',
      origin: CDG,
      destination: JFK,
      progress: 0,
      departureTime: Date.now(),
      duration: 60000,
    }
    const flight = simulatedFlightToFlight(sim)
    // At progress=0, should be near CDG
    expect(flight.longitude).toBeCloseTo(CDG.lon, 0)
    expect(flight.latitude).toBeCloseTo(CDG.lat, 0)
  })
  it('should_set_reasonable_altitude_and_velocity', () => {
    const [sim] = generateSimulatedFlights(1)
    const flight = simulatedFlightToFlight(sim)
    expect(flight.altitude).toBeGreaterThan(5000)
    expect(flight.altitude).toBeLessThan(15000)
    expect(flight.velocity).toBeGreaterThan(100)
    expect(flight.velocity).toBeLessThan(400)
  })
})

describe('findClosestFlight', () => {
  // Mock projection: [lon, lat] -> [lon * 10, lat * 10]
  function makeMockProjection() {
    const fn = (coords: [number, number]): [number, number] => [coords[0] * 10, coords[1] * 10]
    return fn as unknown as GeoProjection
  }

  const flightAt: (lon: number, lat: number) => Flight = (lon, lat) => ({
    icao24: `${lon}_${lat}`,
    callsign: 'AF1234',
    originCountry: 'France',
    longitude: lon,
    latitude: lat,
    altitude: 10000,
    velocity: 250,
    heading: 90,
    verticalRate: 0,
    onGround: false,
    lastUpdate: Date.now(),
  })

  it('should_return_nearest_flight_when_within_max_distance', () => {
    const projection = makeMockProjection()
    const flight = flightAt(5, 10) // projects to [50, 100]
    const result = findClosestFlight([flight], projection, 50, 100, 20)
    expect(result).not.toBeNull()
    expect(result!.icao24).toBe('5_10')
  })

  it('should_return_null_when_no_flight_within_max_distance', () => {
    const projection = makeMockProjection()
    const flight = flightAt(5, 10) // projects to [50, 100]
    const result = findClosestFlight([flight], projection, 200, 200, 10)
    expect(result).toBeNull()
  })

  it('should_return_null_when_flights_array_is_empty', () => {
    const projection = makeMockProjection()
    const result = findClosestFlight([], projection, 50, 100, 20)
    expect(result).toBeNull()
  })

  it('should_return_closest_when_multiple_flights_present', () => {
    const projection = makeMockProjection()
    const near = flightAt(5, 10)  // projects to [50, 100]
    const far  = flightAt(20, 30) // projects to [200, 300]
    const result = findClosestFlight([near, far], projection, 50, 100, 20)
    expect(result?.icao24).toBe('5_10')
  })
})
