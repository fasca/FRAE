/**
 * GET /api/opensky/flights?begin=X&end=Y
 * Proxy for OpenSky /flights/all — fetches completed flights in a time window,
 * stores them in the DB (flights + routes tables), and returns the results.
 */

import { NextRequest, NextResponse } from 'next/server'
import { insertFlight, upsertRoute } from '@/lib/db'
import { getAccessToken } from '@/lib/opensky-auth'

const OPENSKY_FLIGHTS_URL = 'https://opensky-network.org/api/flights/all'

interface OpenSkyFlight {
  icao24: string
  callsign: string | null
  firstSeen: number
  lastSeen: number
  estDepartureAirport: string | null
  estArrivalAirport: string | null
}

export async function GET(request: NextRequest) {
  const begin = request.nextUrl.searchParams.get('begin')
  const end   = request.nextUrl.searchParams.get('end')

  if (!begin || !end) {
    return NextResponse.json({ error: 'begin and end params required' }, { status: 400 })
  }

  let token: string
  try {
    token = await getAccessToken()
  } catch (err) {
    return NextResponse.json({ error: 'Auth failed', detail: String(err) }, { status: 502 })
  }

  const url = `${OPENSKY_FLIGHTS_URL}?begin=${begin}&end=${end}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: `OpenSky returned ${response.status}` },
      { status: response.status }
    )
  }

  const flights = await response.json() as OpenSkyFlight[]

  // Persist each flight and derive routes
  for (const f of flights) {
    insertFlight({
      icao24:         f.icao24,
      callsign:       f.callsign,
      first_seen:     f.firstSeen,
      last_seen:      f.lastSeen,
      departure_icao: f.estDepartureAirport,
      arrival_icao:   f.estArrivalAirport,
    })

    // Update route index if callsign + airports are known
    if (f.callsign?.trim() && (f.estDepartureAirport || f.estArrivalAirport)) {
      upsertRoute(
        f.callsign.trim(),
        f.estDepartureAirport,
        f.estArrivalAirport,
        f.lastSeen
      )
    }
  }

  return NextResponse.json({ ok: true, count: flights.length })
}
