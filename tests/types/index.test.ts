import { describe, it, expect } from 'vitest'
import type { Flight, ProjectionCenter, MapOptions, FlightState, DataSource } from '@/types/index'

describe('Flight interface', () => {
  it('should_accept_valid_flight_when_all_fields_present', () => {
    const flight: Flight = {
      icao24: 'abc123',
      callsign: 'AF1234',
      originCountry: 'France',
      longitude: 2.35,
      latitude: 48.86,
      altitude: 11000,
      velocity: 250,
      heading: 285,
      verticalRate: 0,
      onGround: false,
      lastUpdate: 1710000000,
    }
    expect(flight.icao24).toBe('abc123')
    expect(flight.onGround).toBe(false)
  })
})

describe('ProjectionCenter interface', () => {
  it('should_accept_valid_center_when_lat_lon_label_present', () => {
    const center: ProjectionCenter = {
      lat: 48.86,
      lon: 2.35,
      label: 'Paris',
    }
    expect(center.label).toBe('Paris')
    expect(center.lat).toBeCloseTo(48.86)
  })
})

describe('FlightState interface', () => {
  const mockFlight: Flight = {
    icao24: 'abc123', callsign: 'AF1234', originCountry: 'France',
    longitude: 2.35, latitude: 48.86, altitude: 11000,
    velocity: 250, heading: 285, verticalRate: 0, onGround: false, lastUpdate: 1710000000,
  }

  it('should_accept_FlightState_with_null_previous', () => {
    const state: FlightState = { current: mockFlight, previous: null, lastFetchTime: Date.now() }
    expect(state.previous).toBeNull()
  })

  it('should_accept_FlightState_with_previous_flight', () => {
    const state: FlightState = { current: mockFlight, previous: mockFlight, lastFetchTime: Date.now() }
    expect(state.previous).not.toBeNull()
  })
})

describe('DataSource type', () => {
  it('should_accept_live_and_simulated_values', () => {
    const a: DataSource = 'live'
    const b: DataSource = 'simulated'
    expect(a).toBe('live')
    expect(b).toBe('simulated')
  })
})

describe('MapOptions interface', () => {
  it('should_accept_valid_options_when_all_toggles_present', () => {
    const options: MapOptions = {
      showAirports: true,
      showGraticule: true,
      showCountryBorders: true,
      showFlightPaths: false,
    }
    expect(options.showGraticule).toBe(true)
    expect(options.showFlightPaths).toBe(false)
  })
})
