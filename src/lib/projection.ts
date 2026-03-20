import { geoAzimuthalEquidistant, type GeoProjection } from 'd3-geo'
import type { ProjectionCenter } from '@/types/index'

/**
 * Creates a D3 azimuthal equidistant projection centered at the given point
 * with the specified canvas dimensions and scale.
 *
 * @param center - The projection center (lat, lon) and label
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param scale - D3 scale factor for the projection
 * @returns A D3 projection function that transforms [lon, lat] to [x, y]
 */
export function createProjection(
  center: ProjectionCenter,
  width: number,
  height: number,
  scale: number
): GeoProjection {
  return geoAzimuthalEquidistant()
    .rotate([-center.lon, -center.lat, 0])
    .translate([width / 2, height / 2])
    .scale(scale)
    .clipAngle(180)
}

/**
 * Predefined projection centers for quick access to common locations
 * Includes poles, major cities, and equator for testing and UI selection
 */
export const PREDEFINED_CENTERS: readonly ProjectionCenter[] = [
  { lat: 90, lon: 0, label: 'Pôle Nord' },
  { lat: 48.86, lon: 2.35, label: 'Paris' },
  { lat: 40.71, lon: -74.01, label: 'New York' },
  { lat: 35.68, lon: 139.69, label: 'Tokyo' },
  { lat: 0, lon: 0, label: 'Équateur' },
  { lat: -90, lon: 0, label: 'Pôle Sud' },
]

export const MIN_SCALE = 100
export const MAX_SCALE = 1500
export const DEFAULT_SCALE = 250

const ZOOM_SENSITIVITY = 0.001

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export function calculateZoomScale(currentScale: number, wheelDelta: number): number {
  const factor = 1 - wheelDelta * ZOOM_SENSITIVITY
  return clampScale(currentScale * factor)
}
