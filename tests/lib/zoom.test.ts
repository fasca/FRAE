import { describe, it, expect } from 'vitest'
import { clampScale, calculateZoomScale, MIN_SCALE, MAX_SCALE, DEFAULT_SCALE } from '@/lib/projection'

describe('scale constants', () => {
  it('should_have_min_100_max_1500_default_250', () => {
    expect(MIN_SCALE).toBe(100)
    expect(MAX_SCALE).toBe(1500)
    expect(DEFAULT_SCALE).toBe(250)
  })
})

describe('clampScale', () => {
  it('should_return_value_when_within_bounds', () => {
    expect(clampScale(500)).toBe(500)
  })

  it('should_return_min_when_below_minimum', () => {
    expect(clampScale(50)).toBe(MIN_SCALE)
  })

  it('should_return_max_when_above_maximum', () => {
    expect(clampScale(2000)).toBe(MAX_SCALE)
  })

  it('should_return_min_at_boundary', () => {
    expect(clampScale(MIN_SCALE)).toBe(MIN_SCALE)
  })

  it('should_return_max_at_boundary', () => {
    expect(clampScale(MAX_SCALE)).toBe(MAX_SCALE)
  })
})

describe('calculateZoomScale', () => {
  it('should_increase_scale_when_delta_is_negative_scroll_up', () => {
    const result = calculateZoomScale(250, -100)
    expect(result).toBeGreaterThan(250)
  })

  it('should_decrease_scale_when_delta_is_positive_scroll_down', () => {
    const result = calculateZoomScale(250, 100)
    expect(result).toBeLessThan(250)
  })

  it('should_clamp_to_max_when_zooming_beyond_limit', () => {
    const result = calculateZoomScale(1490, -10000)
    expect(result).toBe(MAX_SCALE)
  })

  it('should_clamp_to_min_when_zooming_beyond_limit', () => {
    const result = calculateZoomScale(110, 10000)
    expect(result).toBe(MIN_SCALE)
  })
})
