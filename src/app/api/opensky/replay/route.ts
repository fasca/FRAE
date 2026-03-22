/**
 * GET /api/opensky/replay?date=YYYY-MM-DD
 * Returns all completed flights for the given day with their full trajectories.
 * Positions are fetched in one batch then matched per flight.
 * Airports are resolved server-side for departure/arrival.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFlightsByDay, getPositionsByTimeRange } from '@/lib/db'
import { getAirportByIcao } from '@/lib/airports'
import { filterValidFlights, deduplicateFlights, matchPositionsToFlight } from '@/lib/replay'
import type { CompletedFlight } from '@/types/index'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const dateStr = request.nextUrl.searchParams.get('date')
  if (!dateStr || !DATE_RE.test(dateStr)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  const dayStart = Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000)
  const dayEnd   = dayStart + 86400

  // Step 1: fetch + filter + deduplicate flight records
  const raw     = getFlightsByDay(dayStart, dayEnd)
  const valid   = filterValidFlights(raw)
  const unique  = deduplicateFlights(valid)

  // Step 2: fetch all positions for the day in one query (1h buffer for midnight-crossing flights)
  const allPositions = getPositionsByTimeRange(dayStart - 3600, dayEnd + 3600)

  // Step 3: group positions by icao24 for O(1) per-flight lookup
  const posByIcao24 = new Map<string, typeof allPositions>()
  for (const p of allPositions) {
    const arr = posByIcao24.get(p.icao24) ?? []
    arr.push(p)
    posByIcao24.set(p.icao24, arr)
  }

  // Step 4: build CompletedFlight objects
  const flights: CompletedFlight[] = unique.map(f => {
    const firstSeen = f.first_seen!
    const lastSeen  = f.last_seen!
    const callsign  = f.callsign!

    const icaoPositions   = posByIcao24.get(f.icao24) ?? []
    const flightPositions = matchPositionsToFlight(icaoPositions, f.icao24, firstSeen, lastSeen)
    const positions: [number, number][] = flightPositions.map(p => [p.lon, p.lat])

    const lastPos     = flightPositions.length > 0 ? flightPositions[flightPositions.length - 1] : null
    const lastHeading = lastPos?.heading ?? 0

    return {
      icao24:           f.icao24,
      callsign,
      firstSeen,
      lastSeen,
      departureIcao:    f.departure_icao ?? null,
      arrivalIcao:      f.arrival_icao   ?? null,
      departureAirport: f.departure_icao ? (getAirportByIcao(f.departure_icao) ?? null) : null,
      arrivalAirport:   f.arrival_icao   ? (getAirportByIcao(f.arrival_icao)   ?? null) : null,
      positions,
      lastHeading,
    }
  })

  return NextResponse.json({ date: dateStr, flightCount: flights.length, flights })
}
