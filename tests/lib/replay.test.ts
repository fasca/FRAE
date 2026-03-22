import { describe, it, expect } from 'vitest'
import { filterValidFlights, deduplicateFlights, matchPositionsToFlight } from '@/lib/replay'
import { getAirportByIcao } from '@/lib/airports'
import type { FlightRecord, Position } from '@/types/index'

// ── filterValidFlights ────────────────────────────────────────────────────────

describe('filterValidFlights', () => {
  it('should_keep_flights_with_callsign_and_timestamps', () => {
    const records: FlightRecord[] = [
      { icao24: 'abc123', callsign: 'AFR001', first_seen: 1000, last_seen: 2000 },
      { icao24: 'def456', callsign: null, first_seen: 1000, last_seen: 2000 },
      { icao24: 'ghi789', callsign: 'BAW123', first_seen: null, last_seen: 2000 },
      { icao24: 'jkl012', callsign: 'DLH456', first_seen: 1000, last_seen: null },
    ]
    const result = filterValidFlights(records)
    expect(result).toHaveLength(1)
    expect(result[0].icao24).toBe('abc123')
  })

  it('should_return_empty_when_all_invalid', () => {
    const records: FlightRecord[] = [
      { icao24: 'abc', callsign: null, first_seen: null, last_seen: null },
    ]
    expect(filterValidFlights(records)).toHaveLength(0)
  })

  it('should_return_all_when_all_valid', () => {
    const records: FlightRecord[] = [
      { icao24: 'a', callsign: 'AFR1', first_seen: 100, last_seen: 200 },
      { icao24: 'b', callsign: 'BAW2', first_seen: 100, last_seen: 200 },
    ]
    expect(filterValidFlights(records)).toHaveLength(2)
  })
})

// ── deduplicateFlights ────────────────────────────────────────────────────────

describe('deduplicateFlights', () => {
  it('should_remove_exact_duplicates', () => {
    const records: FlightRecord[] = [
      { icao24: 'abc', callsign: 'AFR1', first_seen: 1000, last_seen: 2000 },
      { icao24: 'abc', callsign: 'AFR1', first_seen: 1000, last_seen: 2000 },
    ]
    const result = deduplicateFlights(records)
    expect(result).toHaveLength(1)
  })

  it('should_keep_different_first_seen_as_separate_flights', () => {
    const records: FlightRecord[] = [
      { icao24: 'abc', callsign: 'AFR1', first_seen: 1000, last_seen: 2000 },
      { icao24: 'abc', callsign: 'AFR1', first_seen: 3000, last_seen: 4000 },
    ]
    expect(deduplicateFlights(records)).toHaveLength(2)
  })

  it('should_keep_same_icao24_different_callsign', () => {
    const records: FlightRecord[] = [
      { icao24: 'abc', callsign: 'AFR1', first_seen: 1000, last_seen: 2000 },
      { icao24: 'abc', callsign: 'BAW2', first_seen: 1000, last_seen: 2000 },
    ]
    expect(deduplicateFlights(records)).toHaveLength(2)
  })

  it('should_preserve_first_occurrence', () => {
    const records: FlightRecord[] = [
      { icao24: 'abc', callsign: 'AFR1', first_seen: 1000, last_seen: 2000, departure_icao: 'LFPG' },
      { icao24: 'abc', callsign: 'AFR1', first_seen: 1000, last_seen: 2000, departure_icao: 'EGLL' },
    ]
    const result = deduplicateFlights(records)
    expect(result).toHaveLength(1)
    expect(result[0].departure_icao).toBe('LFPG')
  })
})

// ── matchPositionsToFlight ────────────────────────────────────────────────────

const makePos = (icao24: string, time: number): Position => ({
  icao24, time, lat: 48.0, lon: 2.0,
})

describe('matchPositionsToFlight', () => {
  it('should_filter_by_icao24_and_time_range', () => {
    const positions: Position[] = [
      makePos('abc', 1000),
      makePos('abc', 1500),
      makePos('abc', 2000),
      makePos('abc', 2500),  // outside range
      makePos('xyz', 1500),  // wrong icao24
    ]
    const result = matchPositionsToFlight(positions, 'abc', 1000, 2000)
    expect(result).toHaveLength(3)
    expect(result.every(p => p.icao24 === 'abc')).toBe(true)
    expect(result.every(p => p.time >= 1000 && p.time <= 2000)).toBe(true)
  })

  it('should_return_empty_when_no_positions_in_range', () => {
    const positions: Position[] = [
      makePos('abc', 500),
      makePos('abc', 3000),
    ]
    expect(matchPositionsToFlight(positions, 'abc', 1000, 2000)).toHaveLength(0)
  })

  it('should_include_boundary_timestamps', () => {
    const positions: Position[] = [
      makePos('abc', 1000),
      makePos('abc', 2000),
    ]
    const result = matchPositionsToFlight(positions, 'abc', 1000, 2000)
    expect(result).toHaveLength(2)
  })

  it('should_return_empty_for_flight_beyond_7day_positions_retention', () => {
    // Simulates a flight where positions have been purged (empty batch)
    const positions: Position[] = []
    expect(matchPositionsToFlight(positions, 'abc', 1000, 2000)).toHaveLength(0)
  })
})

// ── Airport resolution ────────────────────────────────────────────────────────

describe('getAirportByIcao', () => {
  it('should_resolve_known_icao_to_airport', () => {
    const airport = getAirportByIcao('LFPG')  // Paris CDG
    expect(airport).toBeDefined()
    expect(airport?.code).toBe('CDG')
  })

  it('should_return_undefined_for_unknown_icao', () => {
    expect(getAirportByIcao('XXXX')).toBeUndefined()
  })

  it('should_return_undefined_for_empty_string', () => {
    expect(getAirportByIcao('')).toBeUndefined()
  })
})
