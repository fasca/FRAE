import { describe, it, expect } from 'vitest'
import { AIRPORTS, getAirportByCode, getAirportByIcao, getRandomAirportPair } from '@/lib/airports'

describe('AIRPORTS', () => {
  it('should_contain_intercontinental_airports', () => {
    // At least 100 intercontinental hubs (current target: ~118)
    expect(AIRPORTS.length).toBeGreaterThanOrEqual(100)
  })
  it('should_have_unique_iata_codes_for_all_airports', () => {
    const codes = AIRPORTS.map(a => a.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
  it('should_have_unique_icao_codes_for_all_airports', () => {
    const icaos = AIRPORTS.filter(a => a.icao).map(a => a.icao)
    expect(new Set(icaos).size).toBe(icaos.length)
  })
  it('should_have_valid_lat_lon_for_all_airports', () => {
    for (const a of AIRPORTS) {
      expect(a.lat).toBeGreaterThanOrEqual(-90)
      expect(a.lat).toBeLessThanOrEqual(90)
      expect(a.lon).toBeGreaterThanOrEqual(-180)
      expect(a.lon).toBeLessThanOrEqual(180)
    }
  })
  it('should_include_original_major_hubs', () => {
    const codes = AIRPORTS.map(a => a.code)
    for (const req of ['CDG', 'JFK', 'LHR', 'NRT', 'LAX', 'DXB', 'SIN', 'FRA', 'HKG', 'BKK']) {
      expect(codes).toContain(req)
    }
  })
  it('should_include_new_intercontinental_hubs', () => {
    const codes = AIRPORTS.map(a => a.code)
    // Pacific
    expect(codes).toContain('PPT')  // Tahiti
    expect(codes).toContain('HNL')  // Honolulu
    expect(codes).toContain('ANC')  // Anchorage
    expect(codes).toContain('AKL')  // Auckland
    // Russia
    expect(codes).toContain('SVO')  // Moscow
    // Middle East
    expect(codes).toContain('DOH')  // Doha
    expect(codes).toContain('AUH')  // Abu Dhabi
    // Africa
    expect(codes).toContain('NBO')  // Nairobi
    expect(codes).toContain('ADD')  // Addis Ababa
    expect(codes).toContain('CAI')  // Cairo
    // South America
    expect(codes).toContain('SCL')  // Santiago
    expect(codes).toContain('LIM')  // Lima
    expect(codes).toContain('BOG')  // Bogota
    // Europe (new)
    expect(codes).toContain('FCO')  // Rome
    expect(codes).toContain('LIS')  // Lisbon
    expect(codes).toContain('KEF')  // Reykjavik
  })
  it('should_have_non_empty_name_and_code_for_all_airports', () => {
    for (const a of AIRPORTS) {
      expect(a.code.length).toBeGreaterThan(0)
      expect(a.name.length).toBeGreaterThan(0)
    }
  })
  it('should_have_4_letter_icao_codes_for_all_airports', () => {
    for (const a of AIRPORTS) {
      if (a.icao !== undefined) {
        expect(a.icao).toHaveLength(4)
      }
    }
  })
})

describe('getAirportByCode', () => {
  it('should_return_airport_when_code_exists', () => {
    const cdg = getAirportByCode('CDG')
    expect(cdg).toBeDefined()
    if (!cdg) return
    expect(cdg.code).toBe('CDG')
  })
  it('should_return_undefined_when_code_not_found', () => {
    expect(getAirportByCode('XXX')).toBeUndefined()
  })
})

describe('getAirportByIcao', () => {
  it('should_return_airport_when_icao_exists', () => {
    const cdg = getAirportByIcao('LFPG')
    expect(cdg).toBeDefined()
    if (!cdg) return
    expect(cdg.code).toBe('CDG')
  })
  it('should_return_tahiti_by_icao', () => {
    const ppt = getAirportByIcao('NTAA')
    expect(ppt).toBeDefined()
    expect(ppt?.code).toBe('PPT')
  })
  it('should_return_moscow_by_icao', () => {
    const svo = getAirportByIcao('UUEE')
    expect(svo).toBeDefined()
    expect(svo?.code).toBe('SVO')
  })
  it('should_return_doha_by_icao', () => {
    const doh = getAirportByIcao('OTHH')
    expect(doh).toBeDefined()
    expect(doh?.code).toBe('DOH')
  })
  it('should_return_undefined_when_icao_not_found', () => {
    expect(getAirportByIcao('XXXX')).toBeUndefined()
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
