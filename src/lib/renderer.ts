import { geoPath, geoGraticule } from 'd3-geo'
import type { GeoProjection, GeoPermissibleObjects } from 'd3-geo'
import type { Airport, Flight, MapOptions } from '@/types/index'

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
  height: number,
  options: MapOptions
): void {
  const path = geoPath(projection, ctx)
  drawBackground(ctx, width, height)
  drawGlobe(ctx, path)
  if (options.showGraticule) {
    drawGraticule(ctx, path, 'fine')
    drawGraticule(ctx, path, 'thick')
  }
  if (options.showCountryBorders) {
    drawCountries(ctx, path, worldGeoJson)
  }
  ctx.restore()
}

// ── Dynamic layer constants ───────────────────────────────────────────────────

export const AIRPORT_DOT_RADIUS = 3
export const AIRPORT_LABEL_FONT = '9px monospace'
export const PLANE_SIZE = 6
export const PLANE_SELECTED_SIZE = 8
export const TRAIL_LENGTH = 8
export const TRAIL_BASE_OPACITY = 0.6
export const TRAIL_DOT_RADIUS = 2
export const LABEL_FONT = '11px monospace'
export const LABEL_BACKGROUND_HEIGHT = 16
export const LABEL_BASELINE_OFFSET = 4
export const AIRPORT_LABEL_OFFSET_X = 5
export const AIRPORT_LABEL_OFFSET_Y = -3
export const LABEL_GAP = 4
// For trail color with alpha: RGB components of COLORS.accentOrange (#ff8c42 = 255,140,66)
export const TRAIL_COLOR_RGB = '255, 140, 66'

// ── Layer 6: Flight trails ────────────────────────────────────────────────────

export function drawFlightTrails(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  trails: Map<string, [number, number][]>
): void {
  for (const positions of trails.values()) {
    const len = positions.length
    for (let i = 0; i < len; i++) {
      const projected = projection(positions[i])
      if (!projected) continue
      const [x, y] = projected
      const opacity = TRAIL_BASE_OPACITY * ((i + 1) / len)
      ctx.beginPath()
      ctx.arc(x, y, TRAIL_DOT_RADIUS, 0, 2 * Math.PI)
      ctx.fillStyle = `rgba(${TRAIL_COLOR_RGB}, ${opacity})`
      ctx.fill()
    }
  }
}

// ── Layer 7: Airports ─────────────────────────────────────────────────────────

export function drawAirports(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  airports: readonly Airport[]
): void {
  ctx.font = AIRPORT_LABEL_FONT
  for (const airport of airports) {
    const projected = projection([airport.lon, airport.lat])
    if (!projected) continue
    const [x, y] = projected
    ctx.beginPath()
    ctx.arc(x, y, AIRPORT_DOT_RADIUS, 0, 2 * Math.PI)
    ctx.fillStyle = COLORS.accentCyan
    ctx.fill()
    ctx.fillText(airport.code, x + AIRPORT_LABEL_OFFSET_X, y + AIRPORT_LABEL_OFFSET_Y)
  }
}

// ── Layer 8: Planes ───────────────────────────────────────────────────────────

export function drawPlanes(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  flights: readonly Flight[],
  selectedIcao24: string | null
): void {
  for (const flight of flights) {
    const projected = projection([flight.longitude, flight.latitude])
    if (!projected) continue
    const [x, y] = projected
    const isSelected = flight.icao24 === selectedIcao24
    const size = isSelected ? PLANE_SELECTED_SIZE : PLANE_SIZE
    const color = isSelected ? COLORS.accentYellow : COLORS.accentOrange
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((flight.heading * Math.PI) / 180)
    ctx.beginPath()
    ctx.moveTo(0, -size)
    ctx.lineTo(size * 0.6, size * 0.5)
    ctx.lineTo(0, 0)
    ctx.lineTo(-size * 0.6, size * 0.5)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }
}

// ── Layer 9: Selected flight label ────────────────────────────────────────────

export function drawSelectedLabel(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  flight: Flight
): void {
  const projected = projection([flight.longitude, flight.latitude])
  if (!projected) return
  const [x, y] = projected
  const label = flight.callsign
  ctx.font = LABEL_FONT
  const metrics = ctx.measureText(label)
  const padding = 4
  const bw = metrics.width + padding * 2
  const bh = LABEL_BACKGROUND_HEIGHT
  const bx = x - bw / 2
  const by = y - PLANE_SELECTED_SIZE - bh - LABEL_GAP
  ctx.fillStyle = 'rgba(10, 22, 40, 0.85)'
  ctx.fillRect(bx, by, bw, bh)
  ctx.fillStyle = COLORS.accentYellow
  ctx.fillText(label, bx + padding, by + bh - LABEL_BASELINE_OFFSET)
}

// ── Composite: all dynamic layers (6-9) ──────────────────────────────────────

export function drawDynamicLayers(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  airports: readonly Airport[],
  flights: readonly Flight[],
  trails: Map<string, [number, number][]>,
  selectedIcao24: string | null,
  options: MapOptions
): void {
  drawFlightTrails(ctx, projection, trails)
  if (options.showAirports) {
    drawAirports(ctx, projection, airports)
  }
  drawPlanes(ctx, projection, flights, selectedIcao24)
  const selected = flights.find(f => f.icao24 === selectedIcao24)
  if (selected) {
    drawSelectedLabel(ctx, projection, selected)
  }
}
