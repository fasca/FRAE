import { describe, it, expect } from 'vitest'
import { AIRPORTS, getAirportByCode, getRandomAirportPair } from '@/lib/airports'

describe('AIRPORTS', () => {
  it('should_contain_30_airports', () => {
    expect(AIRPORTS).toHaveLength(30)
  })
  it('should_have_unique_codes_for_all_airports', () => {
    const codes = AIRPORTS.map(a => a.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
  it('should_have_valid_lat_lon_for_all_airports', () => {
    for (const a of AIRPORTS) {
      expect(a.lat).toBeGreaterThanOrEqual(-90)
      expect(a.lat).toBeLessThanOrEqual(90)
      expect(a.lon).toBeGreaterThanOrEqual(-180)
      expect(a.lon).toBeLessThanOrEqual(180)
    }
  })
  it('should_include_required_airports', () => {
    const codes = AIRPORTS.map(a => a.code)
    for (const req of ['CDG', 'JFK', 'LHR', 'NRT', 'LAX']) {
      expect(codes).toContain(req)
    }
  })
  it('should_have_non_empty_name_and_code_for_all_airports', () => {
    for (const a of AIRPORTS) {
      expect(a.code.length).toBeGreaterThan(0)
      expect(a.name.length).toBeGreaterThan(0)
    }
  })
})

describe('getAirportByCode', () => {
  it('should_return_airport_when_code_exists', () => {
    const cdg = getAirportByCode('CDG')
    expect(cdg).toBeDefined()
    expect(cdg!.code).toBe('CDG')
  })
  it('should_return_undefined_when_code_not_found', () => {
    expect(getAirportByCode('XXX')).toBeUndefined()
  })
})

describe('getRandomAirportPair', () => {
  it('should_return_two_distinct_airports', () => {
    const [a, b] = getRandomAirportPair()
    expect(a.code).not.toBe(b.code)
  })
  it('should_return_airports_from_the_database', () => {
    const codes = AIRPORTS.map(a => a.code)
    const [a, b] = getRandomAirportPair()
    expect(codes).toContain(a.code)
    expect(codes).toContain(b.code)
  })
})
