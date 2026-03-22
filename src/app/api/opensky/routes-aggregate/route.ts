/**
 * GET /api/opensky/routes-aggregate
 * Returns aggregated intercontinental corridors derived from the routes table.
 * Groups flights by (departure_icao, arrival_icao) pair, resolves airports,
 * and attaches sample position tracks when available.
 *
 * Query params:
 *   minCount  — minimum total flight count for a corridor (default: 2)
 *   limit     — max number of corridors returned (default: 200)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAggregatedCorridors, getSamplePositionsForCallsign } from '@/lib/db'
import { getAirportByIcao } from '@/lib/airports'
import type { RouteCorridor } from '@/types/index'

const SAMPLE_TRACKS_PER_CORRIDOR = 3
const SAMPLE_POSITIONS_PER_TRACK = 200

export async function GET(request: NextRequest) {
  const params   = request.nextUrl.searchParams
  const minCount = Math.max(1, parseInt(params.get('minCount') ?? '2', 10))
  const limit    = Math.min(500, Math.max(1, parseInt(params.get('limit') ?? '200', 10)))

  const rows = getAggregatedCorridors(minCount, limit)

  const corridors: RouteCorridor[] = []

  for (const row of rows) {
    const departureAirport = getAirportByIcao(row.departure_icao)
    const arrivalAirport   = getAirportByIcao(row.arrival_icao)

    // Skip corridors where either airport is not in our database
    if (!departureAirport || !arrivalAirport) continue

    // Parse and deduplicate callsigns, take first 5 for display
    const allCallsigns = row.callsigns
      ? [...new Set(row.callsigns.split(',').filter(Boolean))].slice(0, 5)
      : []

    // Fetch sample trajectories from positions table
    const sampleTracks: [number, number][][] = []
    for (const cs of allCallsigns.slice(0, SAMPLE_TRACKS_PER_CORRIDOR)) {
      const track = getSamplePositionsForCallsign(cs, SAMPLE_POSITIONS_PER_TRACK)
      if (track.length >= 2) sampleTracks.push(track)
    }

    corridors.push({
      departureIcao:   row.departure_icao,
      arrivalIcao:     row.arrival_icao,
      departureAirport,
      arrivalAirport,
      flightCount:     row.total_flights,
      callsigns:       allCallsigns,
      sampleTracks,
    })
  }

  return NextResponse.json({ corridors })
}
