import { geoPath, geoGraticule } from 'd3-geo'
import type { GeoProjection, GeoPermissibleObjects } from 'd3-geo'

export const COLORS = {
  background: '#030a14',
  backgroundGradientEnd: '#0a1628',
  surface: '#0a1628',
  countryFill: '#0c1e30',
  countryStroke: '#1a3a5c',
  graticuleFine: '#091520',
  graticuleThick: '#0d1f35',
  accentCyan: '#00e5ff',
  accentOrange: '#ff8c42',
  accentYellow: '#ffcc00',
  textPrimary: '#c0d8f0',
  textSecondary: '#4a7a9f',
} as const

export const GRATICULE_FINE_STEP: [number, number] = [15, 15]
export const GRATICULE_THICK_STEP: [number, number] = [30, 30]
export const GRATICULE_FINE_WIDTH = 0.3
export const GRATICULE_THICK_WIDTH = 0.5

export function createGraticules() {
  const fine = geoGraticule().step(GRATICULE_FINE_STEP)
  const thick = geoGraticule().step(GRATICULE_THICK_STEP)
  return { fine, thick }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
  gradient.addColorStop(0, COLORS.backgroundGradientEnd)
  gradient.addColorStop(1, COLORS.background)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function drawGlobe(
  ctx: CanvasRenderingContext2D,
  path: ReturnType<typeof geoPath>
): void {
  ctx.save()
  ctx.beginPath()
  path({ type: 'Sphere' } as GeoPermissibleObjects)
  ctx.clip()
}

function drawGraticule(
  ctx: CanvasRenderingContext2D,
  path: ReturnType<typeof geoPath>,
  type: 'fine' | 'thick'
): void {
  const { fine, thick } = createGraticules()
  const generator = type === 'fine' ? fine : thick
  const lineWidth = type === 'fine' ? GRATICULE_FINE_WIDTH : GRATICULE_THICK_WIDTH
  const color = type === 'fine' ? COLORS.graticuleFine : COLORS.graticuleThick
  ctx.beginPath()
  path(generator())
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

function drawCountries(
  ctx: CanvasRenderingContext2D,
  path: ReturnType<typeof geoPath>,
  worldGeoJson: GeoPermissibleObjects
): void {
  ctx.beginPath()
  path(worldGeoJson)
  ctx.fillStyle = COLORS.countryFill
  ctx.fill()
  ctx.strokeStyle = COLORS.countryStroke
  ctx.lineWidth = 0.5
  ctx.stroke()
}

export function drawStaticLayer(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  worldGeoJson: GeoPermissibleObjects,
  width: number,
  height: number
): void {
  const path = geoPath(projection, ctx)
  drawBackground(ctx, width, height)
  drawGlobe(ctx, path)
  drawGraticule(ctx, path, 'fine')
  drawGraticule(ctx, path, 'thick')
  drawCountries(ctx, path, worldGeoJson)
  ctx.restore()
}
