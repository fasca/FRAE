/**
 * GET /api/opensky/replay?date=YYYY-MM-DD&time=X
 * Returns flights active at timestamp X on given date, with their trails.
 * time=X is a Unix timestamp (seconds) within the day.
 * Trail window: 20 minutes before replayTime.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPositionsByTimeRange } from '@/lib/db'

const TRAIL_WINDOW_SEC = 20 * 60  // 20 minutes of history per flight in replay

export async function GET(request: NextRequest) {
  const dateStr    = request.nextUrl.searchParams.get('date')
  const timeParam  = request.nextUrl.searchParams.get('time')

  if (!dateStr || !timeParam) {
    return NextResponse.json({ error: 'date and time params required' }, { status: 400 })
  }

  const replayTime = parseInt(timeParam, 10)
  if (isNaN(replayTime)) {
    return NextResponse.json({ error: 'time must be a Unix timestamp' }, { status: 400 })
  }

  const trailStart = replayTime - TRAIL_WINDOW_SEC

  // Fetch all positions in the trail window
  const positions = getPositionsByTimeRange(trailStart, replayTime)

  // Group by icao24
  const byIcao24 = new Map<string, typeof positions>()
  for (const p of positions) {
    const arr = byIcao24.get(p.icao24) ?? []
    arr.push(p)
    byIcao24.set(p.icao24, arr)
  }

  // Build response: for each aircraft, find latest position + full trail
  const flights: Array<{
    icao24: string
    callsign: string | null
    lon: number
    lat: number
    altitude: number
    heading: number
    velocity: number
    trail: [number, number][]
  }> = []

  for (const [icao24, pts] of byIcao24) {
    if (pts.length === 0) continue
    // Latest position = current aircraft state
    const latest = pts[pts.length - 1]
    const trail: [number, number][] = pts.map(p => [p.lon, p.lat])

    flights.push({
      icao24,
      callsign:  latest.callsign ?? null,
      lon:       latest.lon,
      lat:       latest.lat,
      altitude:  latest.altitude ?? 0,
      heading:   latest.heading  ?? 0,
      velocity:  latest.velocity ?? 0,
      trail,
    })
  }

  return NextResponse.json({ replayTime, flightCount: flights.length, flights })
}
