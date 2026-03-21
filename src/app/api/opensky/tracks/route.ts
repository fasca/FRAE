/**
 * GET /api/opensky/tracks?icao24=XX
 * Returns the full trajectory for an aircraft:
 * 1. Check DB cache (tracks table) — return immediately if found
 * 2. Fetch from OpenSky /tracks/all with Bearer token
 * 3. Fallback: build track from accumulated positions table
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTrackByIcao24, insertTrack, getPositionsByIcao24 } from '@/lib/db'
import { getAccessToken } from '@/lib/opensky-auth'

const OPENSKY_TRACKS_URL = 'https://opensky-network.org/api/tracks/all'

// OpenSky path tuple: [time, lat, lon, alt, heading, on_ground]
type TrackPoint = [number, number | null, number | null, number | null, number | null, boolean]

export async function GET(request: NextRequest) {
  const icao24 = request.nextUrl.searchParams.get('icao24')
  if (!icao24) {
    return NextResponse.json({ error: 'Missing icao24 parameter' }, { status: 400 })
  }

  // 1. DB cache hit — avoids redundant API calls
  const cached = getTrackByIcao24(icao24)
  if (cached) {
    const path = JSON.parse(cached.path) as TrackPoint[]
    const coords = extractCoords(path)
    return NextResponse.json({ track: coords, source: 'db' })
  }

  // 2. Fetch from OpenSky with OAuth2 token
  try {
    const token = await getAccessToken()
    const url = `${OPENSKY_TRACKS_URL}?icao24=${encodeURIComponent(icao24)}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) {
      const data = await response.json() as {
        icao24: string
        callsign?: string
        startTime?: number
        endTime?: number
        path?: TrackPoint[]
      }
      const path = data.path ?? []
      const coords = extractCoords(path)

      // Persist for future requests (same flight, avoid re-fetching)
      insertTrack(
        icao24,
        (data.callsign ?? '').trim(),
        data.startTime ?? 0,
        data.endTime   ?? 0,
        JSON.stringify(path)
      )

      return NextResponse.json({ track: coords, source: 'opensky' })
    }
  } catch {
    // OpenSky unavailable or auth failed — fall through to positions fallback
  }

  // 3. Fallback: build track from locally accumulated positions
  const positions = getPositionsByIcao24(icao24)
  if (positions.length > 0) {
    const coords: [number, number][] = positions.map(p => [p.lon, p.lat])
    return NextResponse.json({ track: coords, source: 'positions-fallback' })
  }

  return NextResponse.json({ track: null, source: 'none' })
}

/** Extract [lon, lat] pairs from an OpenSky path, filtering null coordinates. */
function extractCoords(path: TrackPoint[]): [number, number][] {
  return path
    .filter(p => p[1] !== null && p[2] !== null)
    .map(p => [p[2] as number, p[1] as number])
}
