import { geoPath, geoGraticule, geoInterpolate } from 'd3-geo'
import type { GeoProjection, GeoPermissibleObjects } from 'd3-geo'
import type { Airport, Flight, MapOptions, CompletedFlight, RouteCorridor } from '@/types/index'

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
export const TRAIL_LENGTH = 200
export const TRAIL_BASE_OPACITY = 0.6
export const TRAIL_DOT_RADIUS = 2
export const LABEL_FONT = '11px monospace'
export const LABEL_BACKGROUND_HEIGHT = 16
export const LABEL_BASELINE_OFFSET = 4
export const AIRPORT_LABEL_OFFSET_X = 5
export const AIRPORT_LABEL_OFFSET_Y = -3
export const LABEL_GAP = 4
export const TRAIL_SELECTED_COLOR_RGB = '255, 204, 0' // accentYellow

// Destination line: dashed cyan great-circle arc
const DEST_LINE_SAMPLES = 60  // points sampled along great circle for smooth curve
const DEST_LINE_DASH: [number, number] = [6, 4]

// ── Layer 6: Flight trails ────────────────────────────────────────────────────

const TRAIL_SUBSAMPLE = 5
const TRAIL_SUBSAMPLE_THRESHOLD = 20

/**
 * Draw the selected flight's trail (yellow). Non-selected flights have no trail —
 * the full historical track (fullTrack from DB) is used for the selected flight instead.
 */
export function drawFlightTrails(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  trails: Map<string, [number, number][]>,
  selectedIcao24: string | null = null
): void {
  if (!selectedIcao24) return
  const selected = trails.get(selectedIcao24)
  if (selected) {
    drawTrail(ctx, projection, selected, TRAIL_SELECTED_COLOR_RGB, 0.85)
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  positions: [number, number][],
  colorRgb: string,
  baseOpacity: number
): void {
  const len = positions.length
  const subsample = len > TRAIL_SUBSAMPLE_THRESHOLD
  for (let i = 0; i < len; i++) {
    if (subsample && i % TRAIL_SUBSAMPLE !== 0 && i !== len - 1) continue
    const projected = projection(positions[i])
    if (!projected) continue
    const [x, y] = projected
    const opacity = baseOpacity * ((i + 1) / len)
    ctx.beginPath()
    ctx.arc(x, y, TRAIL_DOT_RADIUS, 0, 2 * Math.PI)
    ctx.fillStyle = `rgba(${colorRgb}, ${opacity})`
    ctx.fill()
  }
}

// ── Full track from DB (complete route since takeoff) ────────────────────────

/**
 * Draw the complete historical track for the selected flight (from DB or OpenSky /tracks).
 * Rendered as a thin yellow line under the dots, before the regular trail layer.
 */
export function drawFullTrack(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  track: [number, number][]
): void {
  if (track.length < 2) return
  ctx.save()
  ctx.strokeStyle = `rgba(${TRAIL_SELECTED_COLOR_RGB}, 0.35)`
  ctx.lineWidth = 1
  ctx.beginPath()
  let started = false
  for (const coord of track) {
    const pt = projection(coord)
    if (!pt) { started = false; continue }
    if (!started) {
      ctx.moveTo(pt[0], pt[1])
      started = true
    } else {
      ctx.lineTo(pt[0], pt[1])
    }
  }
  ctx.stroke()
  ctx.restore()
}

// ── Destination line (great circle, dashed cyan) ─────────────────────────────

/**
 * Draw a dashed great-circle line from the aircraft's current position to the destination airport.
 * Samples DEST_LINE_SAMPLES interpolation points to curve correctly on the azimuthal projection.
 */
export function drawDestinationLine(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  flightLon: number,
  flightLat: number,
  destLon: number,
  destLat: number
): void {
  const interpolate = geoInterpolate([flightLon, flightLat], [destLon, destLat])
  ctx.save()
  ctx.strokeStyle = COLORS.accentCyan
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.6
  ctx.setLineDash(DEST_LINE_DASH)
  ctx.beginPath()
  let started = false
  for (let i = 0; i <= DEST_LINE_SAMPLES; i++) {
    const t = i / DEST_LINE_SAMPLES
    const coord = interpolate(t)
    const pt = projection(coord)
    if (!pt) { started = false; continue }
    if (!started) {
      ctx.moveTo(pt[0], pt[1])
      started = true
    } else {
      ctx.lineTo(pt[0], pt[1])
    }
  }
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  ctx.restore()
}

// ── Layer 7: Airports ─────────────────────────────────────────────────────────

export function drawAirports(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  airports: readonly Airport[]
): void {
  // Collect projected positions first, skipping airports outside the clipping region
  const visible: [number, number, string][] = []
  for (const airport of airports) {
    const pt = projection([airport.lon, airport.lat])
    if (pt) visible.push([pt[0], pt[1], airport.code])
  }

  ctx.fillStyle = COLORS.accentCyan

  // Batch all dots into a single path — 1 beginPath + N arcs + 1 fill
  // (N × beginPath/fill is avoided, reducing Canvas state-machine overhead)
  ctx.beginPath()
  for (const [x, y] of visible) {
    ctx.moveTo(x + AIRPORT_DOT_RADIUS, y)   // moveTo prevents dots from being connected
    ctx.arc(x, y, AIRPORT_DOT_RADIUS, 0, 2 * Math.PI)
  }
  ctx.fill()

  // Labels drawn in a second pass (fillText uses same fillStyle set above)
  ctx.font = AIRPORT_LABEL_FONT
  for (const [x, y, code] of visible) {
    ctx.fillText(code, x + AIRPORT_LABEL_OFFSET_X, y + AIRPORT_LABEL_OFFSET_Y)
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

// ── Replay layer constants ────────────────────────────────────────────────────

const REPLAY_ROUTE_COLOR         = 'rgba(0, 229, 255, 0.12)'
const REPLAY_AIRPORT_DOT_LARGE   = 6

// ── Replay: batch draw all completed-flight trajectories ─────────────────────

/**
 * Draw all non-selected completed flight trajectories in one batched path.
 * Single beginPath/stroke for all routes → minimal Canvas state overhead.
 */
export function drawCompletedRoutes(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  flights: readonly CompletedFlight[],
  selectedIndex: number | null
): void {
  ctx.beginPath()
  ctx.strokeStyle = REPLAY_ROUTE_COLOR
  ctx.lineWidth   = 1
  for (let i = 0; i < flights.length; i++) {
    if (i === selectedIndex) continue
    const { positions } = flights[i]
    if (positions.length < 2) continue
    let started = false
    for (const coord of positions) {
      const pt = projection(coord)
      if (!pt) { started = false; continue }
      if (!started) { ctx.moveTo(pt[0], pt[1]); started = true }
      else ctx.lineTo(pt[0], pt[1])
    }
  }
  ctx.stroke()
}

// ── Replay: draw selected flight's full route with airport connectors ─────────

/** Draw a straight dashed cyan segment between two geographic points (no great-circle interpolation). */
function drawStraightDashedLine(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  fromLon: number, fromLat: number,
  toLon: number, toLat: number
): void {
  const from = projection([fromLon, fromLat])
  const to   = projection([toLon,   toLat])
  if (!from || !to) return
  ctx.save()
  ctx.strokeStyle = `rgba(0, 229, 255, 0.6)`
  ctx.lineWidth   = 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(from[0], from[1])
  ctx.lineTo(to[0],   to[1])
  ctx.stroke()
  ctx.restore()
}

/**
 * Draw the selected completed flight: thick yellow polyline through all positions,
 * dashed straight-line connectors to departure/arrival airports, and highlighted airport dots.
 */
export function drawSelectedCompletedRoute(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  flight: CompletedFlight
): void {
  const { positions, departureAirport, arrivalAirport } = flight
  const firstPos = positions.length > 0 ? positions[0] : null
  const lastPos  = positions.length > 0 ? positions[positions.length - 1] : null

  if (departureAirport && firstPos) {
    drawStraightDashedLine(ctx, projection,
      departureAirport.lon, departureAirport.lat, firstPos[0], firstPos[1])
  }

  if (positions.length >= 2) {
    ctx.save()
    ctx.strokeStyle = `rgba(${TRAIL_SELECTED_COLOR_RGB}, 0.7)`
    ctx.lineWidth   = 2
    ctx.beginPath()
    let started = false
    for (const coord of positions) {
      const pt = projection(coord)
      if (!pt) { started = false; continue }
      if (!started) { ctx.moveTo(pt[0], pt[1]); started = true }
      else ctx.lineTo(pt[0], pt[1])
    }
    ctx.stroke()
    ctx.restore()
  } else if (departureAirport && arrivalAirport) {
    // No positions recorded — draw straight line between airports
    drawStraightDashedLine(ctx, projection,
      departureAirport.lon, departureAirport.lat, arrivalAirport.lon, arrivalAirport.lat)
  }

  if (lastPos && arrivalAirport) {
    drawStraightDashedLine(ctx, projection,
      lastPos[0], lastPos[1], arrivalAirport.lon, arrivalAirport.lat)
  }

  // Highlight departure/arrival dots (larger than regular airport dots)
  ctx.fillStyle = COLORS.accentCyan
  ctx.beginPath()
  for (const airport of [departureAirport, arrivalAirport]) {
    if (!airport) continue
    const pt = projection([airport.lon, airport.lat])
    if (!pt) continue
    ctx.moveTo(pt[0] + REPLAY_AIRPORT_DOT_LARGE, pt[1])
    ctx.arc(pt[0], pt[1], REPLAY_AIRPORT_DOT_LARGE, 0, 2 * Math.PI)
  }
  ctx.fill()
}

// ── Replay: plane icons at last recorded position ─────────────────────────────

function drawReplayPlanes(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  flights: readonly CompletedFlight[],
  selectedIndex: number | null
): void {
  for (let i = 0; i < flights.length; i++) {
    const { positions, lastHeading } = flights[i]
    if (positions.length === 0) continue
    const pt = projection(positions[positions.length - 1])
    if (!pt) continue
    const [x, y]   = pt
    const isSelected = i === selectedIndex
    const size       = isSelected ? PLANE_SELECTED_SIZE : PLANE_SIZE
    const color      = isSelected ? COLORS.accentYellow : 'rgba(255, 140, 66, 0.45)'
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((lastHeading * Math.PI) / 180)
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

// ── Replay composite layer ────────────────────────────────────────────────────

/** Draw all replay layers: faint routes, selected route, airports, plane icons, label. */
export function drawReplayLayer(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  airports: readonly Airport[],
  flights: readonly CompletedFlight[],
  selectedIndex: number | null,
  options: MapOptions
): void {
  drawCompletedRoutes(ctx, projection, flights, selectedIndex)
  if (selectedIndex !== null && flights[selectedIndex]) {
    drawSelectedCompletedRoute(ctx, projection, flights[selectedIndex])
  }
  if (options.showAirports) {
    drawAirports(ctx, projection, airports)
  }
  drawReplayPlanes(ctx, projection, flights, selectedIndex)
  if (selectedIndex !== null && flights[selectedIndex]) {
    const cf = flights[selectedIndex]
    if (cf.positions.length > 0) {
      const lastPos = cf.positions[cf.positions.length - 1]
      // Reuse drawSelectedLabel via a minimal Flight stub
      const stub: Flight = {
        icao24: cf.icao24, callsign: cf.callsign, originCountry: '',
        longitude: lastPos[0], latitude: lastPos[1],
        altitude: 0, velocity: 0, heading: cf.lastHeading,
        verticalRate: 0, onGround: false, lastUpdate: 0,
      }
      drawSelectedLabel(ctx, projection, stub)
    }
  }
}

// ── Composite: all dynamic layers (6-9) ──────────────────────────────────────

export function drawDynamicLayers(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  airports: readonly Airport[],
  flights: readonly Flight[],
  trails: Map<string, [number, number][]>,
  selectedIcao24: string | null,
  options: MapOptions,
  fullTrack?: [number, number][] | null,
  destinationAirport?: Airport | null
): void {
  // Full historical track (thin yellow line) — drawn before trail dots
  if (fullTrack && fullTrack.length > 1) {
    drawFullTrack(ctx, projection, fullTrack)
  }

  drawFlightTrails(ctx, projection, trails, selectedIcao24)

  // Destination line — drawn after trails, before airports
  const selected = flights.find(f => f.icao24 === selectedIcao24)
  if (selected && destinationAirport) {
    drawDestinationLine(
      ctx, projection,
      selected.longitude, selected.latitude,
      destinationAirport.lon, destinationAirport.lat
    )
  }

  if (options.showAirports) {
    drawAirports(ctx, projection, airports)
  }
  drawPlanes(ctx, projection, flights, selectedIcao24)
  if (selected) {
    drawSelectedLabel(ctx, projection, selected)
  }
}

// ── Routes mode: aggregated corridor drawing ──────────────────────────────

const CORRIDOR_COLOR_RGB     = '200, 220, 255'  // white-blue, distinct from live/replay
const CORRIDOR_MIN_WIDTH     = 0.5
const CORRIDOR_MAX_WIDTH     = 6
const CORRIDOR_BASE_OPACITY  = 0.12
const CORRIDOR_MAX_OPACITY   = 0.65
const CORRIDOR_SAMPLE_OPACITY = 0.07
const CORRIDOR_AIRPORT_RADIUS = 5

/**
 * Draw all corridor lines as straight pixel-space segments.
 * Width and opacity scale with flightCount relative to maxFlightCount.
 */
export function drawCorridorLines(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  corridors: readonly RouteCorridor[],
  maxFlightCount: number,
  selectedIndex: number | null
): void {
  ctx.save()
  ctx.lineCap = 'round'

  for (let i = 0; i < corridors.length; i++) {
    if (i === selectedIndex) continue
    const { departureAirport, arrivalAirport, flightCount } = corridors[i]
    if (!departureAirport || !arrivalAirport) continue

    const a = projection([departureAirport.lon, departureAirport.lat])
    const b = projection([arrivalAirport.lon,   arrivalAirport.lat])
    if (!a || !b) continue

    const t       = maxFlightCount > 0 ? flightCount / maxFlightCount : 0
    const width   = CORRIDOR_MIN_WIDTH + t * (CORRIDOR_MAX_WIDTH - CORRIDOR_MIN_WIDTH)
    const opacity = CORRIDOR_BASE_OPACITY + t * (CORRIDOR_MAX_OPACITY - CORRIDOR_BASE_OPACITY)

    ctx.strokeStyle = `rgba(${CORRIDOR_COLOR_RGB}, ${opacity})`
    ctx.lineWidth   = width
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draw sample position tracks for the selected corridor as thin faint polylines.
 * Shows the actual paths aircraft flew (including ocean detours captured by OpenSky).
 */
export function drawCorridorSampleTracks(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  corridor: RouteCorridor
): void {
  if (corridor.sampleTracks.length === 0) return
  ctx.save()
  ctx.strokeStyle = `rgba(${CORRIDOR_COLOR_RGB}, ${CORRIDOR_SAMPLE_OPACITY})`
  ctx.lineWidth   = 1
  ctx.setLineDash([])

  for (const track of corridor.sampleTracks) {
    ctx.beginPath()
    let started = false
    for (const coord of track) {
      const pt = projection(coord)
      if (!pt) { started = false; continue }
      if (!started) { ctx.moveTo(pt[0], pt[1]); started = true }
      else ctx.lineTo(pt[0], pt[1])
    }
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draw the selected corridor highlighted: dashed cyan line + airport endpoint dots.
 */
export function drawSelectedCorridor(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  corridor: RouteCorridor
): void {
  const { departureAirport, arrivalAirport } = corridor
  if (!departureAirport || !arrivalAirport) return

  const a = projection([departureAirport.lon, departureAirport.lat])
  const b = projection([arrivalAirport.lon,   arrivalAirport.lat])
  if (!a || !b) return

  ctx.save()
  ctx.strokeStyle = `rgba(0, 229, 255, 0.85)`
  ctx.lineWidth   = 2
  ctx.setLineDash([8, 5])
  ctx.lineCap     = 'round'
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.stroke()

  // Endpoint dots
  ctx.fillStyle = COLORS.accentCyan
  ctx.setLineDash([])
  for (const pt of [a, b]) {
    ctx.beginPath()
    ctx.arc(pt[0], pt[1], CORRIDOR_AIRPORT_RADIUS, 0, 2 * Math.PI)
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Composite draw function for Routes mode.
 * Renders all corridors, then highlights the selected one with sample tracks.
 */
export function drawRoutesLayer(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  corridors: readonly RouteCorridor[],
  airports: readonly Airport[],
  selectedIndex: number | null,
  options: MapOptions
): void {
  const maxFlightCount = corridors.reduce((m, c) => Math.max(m, c.flightCount), 0)

  drawCorridorLines(ctx, projection, corridors, maxFlightCount, selectedIndex)

  if (selectedIndex !== null && corridors[selectedIndex]) {
    drawCorridorSampleTracks(ctx, projection, corridors[selectedIndex])
    drawSelectedCorridor(ctx, projection, corridors[selectedIndex])
  }

  if (options.showAirports) {
    drawAirports(ctx, projection, airports)
  }
}
