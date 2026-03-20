import { describe, it, expect } from 'vitest'
import { createProjection, PREDEFINED_CENTERS } from '@/lib/projection'
import type { ProjectionCenter } from '@/types/index'

describe('createProjection', () => {
  const northPole: ProjectionCenter = { lat: 90, lon: 0, label: 'Pôle Nord' }

  it('should_return_projection_function_when_called_with_valid_params', () => {
    const projection = createProjection(northPole, 800, 600, 250)
    expect(typeof projection).toBe('function')
  })

  it('should_project_center_to_canvas_center_when_center_matches_rotation', () => {
    const projection = createProjection(northPole, 800, 600, 250)
    const result = projection([0, 90])
    expect(result).not.toBeNull()
    const [x, y] = result!
    expect(x).toBeCloseTo(400, 0)
    expect(y).toBeCloseTo(300, 0)
  })

  it('should_project_paris_near_center_when_centered_on_paris', () => {
    const paris: ProjectionCenter = { lat: 48.86, lon: 2.35, label: 'Paris' }
    const projection = createProjection(paris, 800, 600, 250)
    const result = projection([2.35, 48.86])
    expect(result).not.toBeNull()
    const [x, y] = result!
    expect(x).toBeCloseTo(400, 0)
    expect(y).toBeCloseTo(300, 0)
  })

  it('should_not_clip_antipodal_point_when_clipAngle_is_180', () => {
    const projection = createProjection(northPole, 800, 600, 250)
    const result = projection([0, -90])
    expect(result).not.toBeNull()
  })
})

describe('PREDEFINED_CENTERS', () => {
  it('should_contain_six_centers', () => {
    expect(PREDEFINED_CENTERS).toHaveLength(6)
  })

  it('should_have_north_pole_as_first_center', () => {
    expect(PREDEFINED_CENTERS[0].lat).toBe(90)
    expect(PREDEFINED_CENTERS[0].lon).toBe(0)
    expect(PREDEFINED_CENTERS[0].label).toBe('Pôle Nord')
  })

  it('should_have_valid_lat_lon_for_all_centers', () => {
    for (const center of PREDEFINED_CENTERS) {
      expect(center.lat).toBeGreaterThanOrEqual(-90)
      expect(center.lat).toBeLessThanOrEqual(90)
      expect(center.lon).toBeGreaterThanOrEqual(-180)
      expect(center.lon).toBeLessThanOrEqual(180)
      expect(center.label.length).toBeGreaterThan(0)
    }
  })
})
