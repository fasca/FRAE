import { describe, it, expect } from 'vitest'
import {
  generateCallsign,
  generateIcao24,
  calculateHeading,
  interpolatePosition,
  findClosestFlight,
  interpolateFlight,
  filterFlights,
} from '@/lib/flights'
import type { Airport, Flight, FlightState } from '@/types/index'
import type { GeoProjection } from 'd3-geo'

const CDG: Airport = { code: 'CDG', icao: 'LFPG', name: 'Paris Charles de Gaulle', lat: 49.01, lon: 2.55 }
const JFK: Airport = { code: 'JFK', icao: 'KJFK', name: 'New York JFK', lat: 40.64, lon: -73.78 }
const NRT: Airport = { code: 'NRT', icao: 'RJAA', name: 'Tokyo Narita', lat: 35.76, lon: 140.39 }

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

// Helper for interpolateFlight tests
function makeFlightState(
  prevLon: number, prevLat: number, prevHeading: number, prevAlt: number,
  currLon: number, currLat: number, currHeading: number, currAlt: number,
  lastFetchTime: number
): FlightState {
  const base: Flight = {
    icao24: 'test', callsign: 'TEST1', originCountry: 'France',
    velocity: 250, verticalRate: 0, onGround: false, lastUpdate: lastFetchTime,
  } as Flight
  return {
    previous: { ...base, longitude: prevLon, latitude: prevLat, heading: prevHeading, altitude: prevAlt },
    current:  { ...base, longitude: currLon, latitude: currLat, heading: currHeading, altitude: currAlt },
    lastFetchTime,
  }
}

describe('interpolateFlight', () => {
  const INTERVAL = 10_000

  it('should_return_current_when_no_previous', () => {
    const current: Flight = {
      icao24: 'abc', callsign: 'AF1', originCountry: 'France',
      longitude: 2.5, latitude: 49.0, altitude: 11000,
      velocity: 250, heading: 90, verticalRate: 0, onGround: false, lastUpdate: 1000,
    }
    const state: FlightState = { current, previous: null, lastFetchTime: 1000 }
    const result = interpolateFlight(state, 5000, INTERVAL)
    expect(result).toBe(current)
  })

  it('should_return_previous_position_at_t_0', () => {
    const state = makeFlightState(0, 0, 0, 10000, 10, 10, 90, 11000, 1000)
    const result = interpolateFlight(state, 1000, INTERVAL)  // now === lastFetchTime → t=0
    expect(result.longitude).toBeCloseTo(0, 3)
    expect(result.latitude).toBeCloseTo(0, 3)
  })

  it('should_return_current_position_at_t_1', () => {
    const state = makeFlightState(0, 0, 0, 10000, 10, 10, 90, 11000, 1000)
    const result = interpolateFlight(state, 1000 + INTERVAL, INTERVAL)  // t=1
    expect(result.longitude).toBeCloseTo(10, 3)
    expect(result.latitude).toBeCloseTo(10, 3)
  })

  it('should_interpolate_midpoint_at_t_0_5', () => {
    // Use nearby points to keep great circle close to midpoint of linear lerp
    const state = makeFlightState(2.0, 48.0, 90, 10000, 2.2, 48.2, 90, 11000, 1000)
    const result = interpolateFlight(state, 1000 + INTERVAL / 2, INTERVAL)
    expect(result.longitude).toBeCloseTo(2.1, 1)
    expect(result.latitude).toBeCloseTo(48.1, 1)
  })

  it('should_clamp_t_to_1_when_exceeding_interval', () => {
    const state = makeFlightState(0, 0, 0, 10000, 10, 10, 90, 11000, 1000)
    const result = interpolateFlight(state, 1000 + INTERVAL * 2, INTERVAL)
    expect(result.longitude).toBeCloseTo(10, 3)
    expect(result.latitude).toBeCloseTo(10, 3)
  })

  it('should_clamp_t_to_0_when_before_fetch_time', () => {
    const state = makeFlightState(0, 0, 0, 10000, 10, 10, 90, 11000, 1000)
    const result = interpolateFlight(state, 500, INTERVAL)  // now < lastFetchTime
    expect(result.longitude).toBeCloseTo(0, 3)
    expect(result.latitude).toBeCloseTo(0, 3)
  })

  it('should_interpolate_heading_via_shortest_arc_350_to_10', () => {
    // 350 → 10 (delta = +20, shortest arc), at t=0.5 should be 0
    const state = makeFlightState(0, 0, 350, 10000, 0.1, 0.1, 10, 11000, 1000)
    const result = interpolateFlight(state, 1000 + INTERVAL / 2, INTERVAL)
    expect(result.heading).toBeCloseTo(0, 0)
  })

  it('should_interpolate_altitude_linearly', () => {
    const state = makeFlightState(0, 0, 0, 10000, 0.1, 0.1, 0, 12000, 1000)
    const result = interpolateFlight(state, 1000 + INTERVAL / 2, INTERVAL)
    expect(result.altitude).toBeCloseTo(11000, 0)
  })
})

const makeFlight = (icao24: string, callsign: string, originCountry: string): Flight => ({
  icao24, callsign, originCountry,
  longitude: 0, latitude: 0, altitude: 10000, velocity: 250,
  heading: 0, verticalRate: 0, onGround: false, lastUpdate: Date.now(),
})

describe('filterFlights', () => {
  const flights: readonly Flight[] = [
    makeFlight('abc', 'AF1234', 'France'),
    makeFlight('def', 'LH5678', 'Germany'),
    makeFlight('ghi', 'BA9012', 'United Kingdom'),
  ]

  it('should_return_all_flights_when_query_is_empty', () => {
    expect(filterFlights(flights, '')).toHaveLength(3)
  })

  it('should_filter_by_callsign', () => {
    const result = filterFlights(flights, 'AF')
    expect(result).toHaveLength(1)
    expect(result[0].callsign).toBe('AF1234')
  })

  it('should_filter_by_country', () => {
    const result = filterFlights(flights, 'germany')
    expect(result).toHaveLength(1)
    expect(result[0].originCountry).toBe('Germany')
  })

  it('should_be_case_insensitive', () => {
    expect(filterFlights(flights, 'france')).toHaveLength(1)
    expect(filterFlights(flights, 'FRANCE')).toHaveLength(1)
    expect(filterFlights(flights, 'lh')).toHaveLength(1)
  })

  it('should_return_empty_when_no_match', () => {
    expect(filterFlights(flights, 'zzz')).toHaveLength(0)
  })
})
