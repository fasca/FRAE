/**
 * GET /api/opensky/route-lookup?callsign=XX
 * Returns the known departure/arrival ICAO airports for a callsign from the routes table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRouteByCallsign } from '@/lib/db'

export async function GET(request: NextRequest) {
  const callsign = request.nextUrl.searchParams.get('callsign')
  if (!callsign) {
    return NextResponse.json({ error: 'Missing callsign parameter' }, { status: 400 })
  }

  const route = getRouteByCallsign(callsign)
  if (!route) {
    return NextResponse.json({ route: null })
  }

  return NextResponse.json({
    route: {
      callsign:       route.callsign,
      departure_icao: route.departure_icao,
      arrival_icao:   route.arrival_icao,
    },
  })
}
