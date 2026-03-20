import { describe, it, expect } from 'vitest'
import {
  COLORS,
  GRATICULE_FINE_STEP,
  GRATICULE_THICK_STEP,
  GRATICULE_FINE_WIDTH,
  GRATICULE_THICK_WIDTH,
  createGraticules,
  drawStaticLayer,
} from '@/lib/renderer'

describe('COLORS', () => {
  it('should_define_dark_aviation_palette', () => {
    expect(COLORS.background).toBe('#030a14')
    expect(COLORS.surface).toBe('#0a1628')
    expect(COLORS.countryFill).toBe('#0c1e30')
    expect(COLORS.countryStroke).toBe('#1a3a5c')
    expect(COLORS.graticuleFine).toBe('#091520')
    expect(COLORS.graticuleThick).toBe('#0d1f35')
    expect(COLORS.accentCyan).toBe('#00e5ff')
    expect(COLORS.accentOrange).toBe('#ff8c42')
    expect(COLORS.accentYellow).toBe('#ffcc00')
  })
})

describe('graticule constants', () => {
  it('should_define_correct_step_and_width_values', () => {
    expect(GRATICULE_FINE_STEP).toEqual([15, 15])
    expect(GRATICULE_THICK_STEP).toEqual([30, 30])
    expect(GRATICULE_FINE_WIDTH).toBe(0.3)
    expect(GRATICULE_THICK_WIDTH).toBe(0.5)
  })
})

describe('createGraticules', () => {
  it('should_return_fine_and_thick_generators_producing_multilinestring', () => {
    const { fine, thick } = createGraticules()
    const fineGeo = fine()
    const thickGeo = thick()
    expect(fineGeo.type).toBe('MultiLineString')
    expect(thickGeo.type).toBe('MultiLineString')
  })
})

describe('drawStaticLayer', () => {
  it('should_be_a_function_with_correct_arity', () => {
    expect(typeof drawStaticLayer).toBe('function')
    expect(drawStaticLayer.length).toBe(5)
  })
})
