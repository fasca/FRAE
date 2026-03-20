import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseOpenSkyState, parseOpenSkyResponse, fetchOpenSkyFlights } from '@/lib/opensky'

// Helper: build a valid OpenSky state array with optional overrides
function validState(overrides: Partial<Record<number, unknown>> = {}): unknown[] {
  const base: unknown[] = [
    'abc123',     // [0]  icao24
    'AF1234  ',   // [1]  callsign (with trailing spaces)
    'France',     // [2]  origin_country
    1609459200,   // [3]  time_position
    1609459200,   // [4]  last_contact
    2.55,         // [5]  longitude
    49.01,        // [6]  latitude
    10500,        // [7]  baro_altitude
    false,        // [8]  on_ground
    245,          // [9]  velocity
    285,          // [10] true_track (heading)
    -1.5,         // [11] vertical_rate
    null,         // [12] sensors (ignored)
    10600,        // [13] geo_altitude
    null,         // [14] squawk (ignored)
    false,        // [15] spi (ignored)
    0,            // [16] position_source (ignored)
  ]
  for (const [idx, val] of Object.entries(overrides)) base[Number(idx)] = val
  return base
}

describe('parseOpenSkyState', () => {
  it('should_return_flight_when_all_fields_present', () => {
    const result = parseOpenSkyState(validState())
    expect(result).not.toBeNull()
    expect(result!.icao24).toBe('abc123')
    expect(result!.callsign).toBe('AF1234')
    expect(result!.originCountry).toBe('France')
    expect(result!.longitude).toBeCloseTo(2.55)
    expect(result!.latitude).toBeCloseTo(49.01)
    expect(result!.altitude).toBe(10500)
    expect(result!.velocity).toBe(245)
    expect(result!.heading).toBe(285)
    expect(result!.verticalRate).toBe(-1.5)
    expect(result!.onGround).toBe(false)
    expect(result!.lastUpdate).toBe(1609459200)
  })

  it('should_return_null_when_longitude_is_null', () => {
    const result = parseOpenSkyState(validState({ 5: null }))
    expect(result).toBeNull()
  })

  it('should_return_null_when_latitude_is_null', () => {
    const result = parseOpenSkyState(validState({ 6: null }))
    expect(result).toBeNull()
  })

  it('should_trim_callsign_whitespace', () => {
    const result = parseOpenSkyState(validState({ 1: '  BA789  ' }))
    expect(result!.callsign).toBe('BA789')
  })

  it('should_default_callsign_to_empty_when_null', () => {
    const result = parseOpenSkyState(validState({ 1: null }))
    expect(result!.callsign).toBe('')
  })

  it('should_default_altitude_to_zero_when_null', () => {
    const result = parseOpenSkyState(validState({ 7: null }))
    expect(result!.altitude).toBe(0)
  })

  it('should_default_velocity_to_zero_when_null', () => {
    const result = parseOpenSkyState(validState({ 9: null }))
    expect(result!.velocity).toBe(0)
  })

  it('should_default_heading_to_zero_when_null', () => {
    const result = parseOpenSkyState(validState({ 10: null }))
    expect(result!.heading).toBe(0)
  })

  it('should_default_vertical_rate_to_zero_when_null', () => {
    const result = parseOpenSkyState(validState({ 11: null }))
    expect(result!.verticalRate).toBe(0)
  })

  it('should_return_null_when_icao24_is_not_string', () => {
    const result = parseOpenSkyState(validState({ 0: 12345 }))
    expect(result).toBeNull()
  })

  it('should_map_on_ground_boolean_correctly', () => {
    const result = parseOpenSkyState(validState({ 8: true }))
    expect(result!.onGround).toBe(true)
  })
})

describe('parseOpenSkyResponse', () => {
  it('should_return_flights_from_valid_response', () => {
    const json = { time: 1609459200, states: [validState(), validState({ 0: 'xyz999' })] }
    const result = parseOpenSkyResponse(json)
    expect(result).toHaveLength(2)
    expect(result[0].icao24).toBe('abc123')
    expect(result[1].icao24).toBe('xyz999')
  })

  it('should_return_empty_array_when_states_is_null', () => {
    const result = parseOpenSkyResponse({ time: 1609459200, states: null })
    expect(result).toEqual([])
  })

  it('should_return_empty_array_when_json_is_invalid', () => {
    expect(parseOpenSkyResponse(null)).toEqual([])
    expect(parseOpenSkyResponse('bad')).toEqual([])
    expect(parseOpenSkyResponse(42)).toEqual([])
  })

  it('should_filter_out_flights_with_null_coordinates', () => {
    const goodState = validState()
    const nullLon = validState({ 5: null })
    const nullLat = validState({ 6: null })
    const json = { time: 1609459200, states: [goodState, nullLon, nullLat] }
    const result = parseOpenSkyResponse(json)
    expect(result).toHaveLength(1)
    expect(result[0].icao24).toBe('abc123')
  })
})

// Helper to mock globalThis.fetch
function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }))
}

describe('fetchOpenSkyFlights', () => {
  const abortController = new AbortController()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should_return_flights_on_successful_fetch', async () => {
    mockFetch(200, { time: 1609459200, states: [validState()] })
    const result = await fetchOpenSkyFlights(abortController.signal)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.flights).toHaveLength(1)
      expect(result.flights[0].icao24).toBe('abc123')
      expect(typeof result.timestamp).toBe('number')
    }
  })

  it('should_return_rate_limited_error_on_429', async () => {
    mockFetch(429, null)
    const result = await fetchOpenSkyFlights(abortController.signal)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('rate-limited')
    }
  })

  it('should_return_error_on_500_status', async () => {
    mockFetch(500, null)
    const result = await fetchOpenSkyFlights(abortController.signal)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('500')
    }
  })

  it('should_return_error_on_network_failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))
    const result = await fetchOpenSkyFlights(abortController.signal)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Network error')
    }
  })

  it('should_pass_abort_signal_to_fetch', async () => {
    const mockFn = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ states: [] }) })
    vi.stubGlobal('fetch', mockFn)
    const controller = new AbortController()
    await fetchOpenSkyFlights(controller.signal)
    expect(mockFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('should_rethrow_abort_error', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))
    const controller = new AbortController()
    await expect(fetchOpenSkyFlights(controller.signal)).rejects.toThrow('Aborted')
  })
})
