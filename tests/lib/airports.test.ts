import { describe, it, expect } from 'vitest'
import { AIRPORTS, AIRPORTS_MAJOR, getAirportByCode, getAirportByIcao, getRandomAirportPair } from '@/lib/airports'
import majorData from '@/data/airports-major.json'
import minorData from '@/data/airports-minor.json'

// ── Combined totals ───────────────────────────────────────────────────────────

describe('airport data totals', () => {
  it('should_have_at_least_500_major_airports', () => {
    expect(AIRPORTS_MAJOR.length).toBeGreaterThanOrEqual(500)
  })

  it('should_have_at_least_3000_airports_total', () => {
    const total = majorData.length + minorData.length
    expect(total).toBeGreaterThanOrEqual(3000)
  })
})

// ── AIRPORTS_MAJOR (previously AIRPORTS) ─────────────────────────────────────

describe('AIRPORTS_MAJOR', () => {
  it('should_have_unique_iata_codes', () => {
    const codes = AIRPORTS_MAJOR.map(a => a.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('should_have_unique_icao_codes', () => {
    const icaos = AIRPORTS_MAJOR.map(a => a.icao)
    expect(new Set(icaos).size).toBe(icaos.length)
  })

  it('should_have_valid_lat_lon_for_all_airports', () => {
    for (const a of AIRPORTS_MAJOR) {
      expect(a.lat).toBeGreaterThanOrEqual(-90)
      expect(a.lat).toBeLessThanOrEqual(90)
      expect(a.lon).toBeGreaterThanOrEqual(-180)
      expect(a.lon).toBeLessThanOrEqual(180)
    }
  })

  it('should_have_4_letter_icao_codes', () => {
    for (const a of AIRPORTS_MAJOR) {
      expect(a.icao).toHaveLength(4)
    }
  })

  it('should_have_3_letter_iata_codes', () => {
    for (const a of AIRPORTS_MAJOR) {
      expect(a.code).toHaveLength(3)
    }
  })

  it('should_have_non_empty_names', () => {
    for (const a of AIRPORTS_MAJOR) {
      expect(a.name.length).toBeGreaterThan(0)
    }
  })
})

// ── Combined uniqueness (major + minor must not overlap) ──────────────────────

describe('combined major + minor airport data', () => {
  const all = [...majorData, ...minorData] as { code: string; icao: string; lat: number; lon: number }[]

  it('should_have_unique_iata_codes_across_both_tiers', () => {
    const codes = all.map(a => a.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('should_have_unique_icao_codes_across_both_tiers', () => {
    const icaos = all.map(a => a.icao)
    expect(new Set(icaos).size).toBe(icaos.length)
  })

  it('should_have_valid_lat_lon_for_all_airports', () => {
    for (const a of all) {
      expect(a.lat).toBeGreaterThanOrEqual(-90)
      expect(a.lat).toBeLessThanOrEqual(90)
      expect(a.lon).toBeGreaterThanOrEqual(-180)
      expect(a.lon).toBeLessThanOrEqual(180)
    }
  })
})

// ── Backward compatibility ────────────────────────────────────────────────────

describe('AIRPORTS (backward-compat alias)', () => {
  it('should_equal_AIRPORTS_MAJOR', () => {
    expect(AIRPORTS).toBe(AIRPORTS_MAJOR)
  })
})

// ── Original 118 airports still present (spot-check) ─────────────────────────

describe('original airports spot-check', () => {
  it('should_contain_original_major_hubs_by_iata', () => {
    const originalHubs = ['CDG', 'JFK', 'LHR', 'NRT', 'LAX', 'DXB', 'SIN', 'FRA', 'HKG', 'BKK',
      'PPT', 'HNL', 'ANC', 'AKL', 'SVO', 'DOH', 'AUH', 'NBO', 'ADD', 'CAI',
      'SCL', 'LIM', 'BOG', 'FCO', 'LIS', 'KEF', 'SYD']
    for (const code of originalHubs) {
      expect(getAirportByCode(code), `Expected ${code} to be found`).toBeDefined()
    }
  })

  it('should_find_CDG_by_icao_LFPG', () => {
    const cdg = getAirportByIcao('LFPG')
    expect(cdg).toBeDefined()
    expect(cdg?.code).toBe('CDG')
  })

  it('should_find_JFK_by_icao_KJFK', () => {
    expect(getAirportByIcao('KJFK')?.code).toBe('JFK')
  })

  it('should_find_NRT_by_icao_RJAA', () => {
    expect(getAirportByIcao('RJAA')?.code).toBe('NRT')
  })

  it('should_find_SYD_by_icao_YSSY', () => {
    expect(getAirportByIcao('YSSY')?.code).toBe('SYD')
  })

  it('should_find_DXB_by_icao_OMDB', () => {
    expect(getAirportByIcao('OMDB')?.code).toBe('DXB')
  })
})

// ── O(1) lookup functions ─────────────────────────────────────────────────────

describe('getAirportByCode', () => {
  it('should_return_airport_when_code_exists', () => {
    const cdg = getAirportByCode('CDG')
    expect(cdg).toBeDefined()
    expect(cdg?.code).toBe('CDG')
  })

  it('should_return_undefined_when_code_not_found', () => {
    expect(getAirportByCode('XXX')).toBeUndefined()
  })

  it('should_find_minor_airports_by_iata', () => {
    // Pick a known medium airport that should be in the minor list
    // (any airport resolved from minorData is accessible via getAirportByCode)
    const first = (minorData as { code: string }[])[0]
    expect(getAirportByCode(first.code)).toBeDefined()
  })
})

describe('getAirportByIcao', () => {
  it('should_return_airport_when_icao_exists', () => {
    const cdg = getAirportByIcao('LFPG')
    expect(cdg?.code).toBe('CDG')
  })

  it('should_return_undefined_when_icao_not_found', () => {
    expect(getAirportByIcao('XXXX')).toBeUndefined()
  })

  it('should_find_minor_airports_by_icao', () => {
    const first = (minorData as { icao: string }[])[0]
    expect(getAirportByIcao(first.icao)).toBeDefined()
  })
})

// ── getRandomAirportPair ──────────────────────────────────────────────────────

describe('getRandomAirportPair', () => {
  it('should_return_two_distinct_airports', () => {
    const [a, b] = getRandomAirportPair()
    expect(a.code).not.toBe(b.code)
  })

  it('should_return_airports_from_AIRPORTS_MAJOR', () => {
    const codes = new Set(AIRPORTS_MAJOR.map(a => a.code))
    const [a, b] = getRandomAirportPair()
    expect(codes.has(a.code)).toBe(true)
    expect(codes.has(b.code)).toBe(true)
  })
})
