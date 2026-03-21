/**
 * POST /api/opensky/sync-routes
 * Background sync: fetches completed flights for the last 24h in 2h windows,
 * populates flights + routes tables. Called once per session (fire-and-forget).
 * Each window = 2h. 12 windows to cover 24h.
 */

import { NextResponse } from 'next/server'
import { insertFlight, upsertRoute } from '@/lib/db'
import { getAccessToken } from '@/lib/opensky-auth'

const OPENSKY_FLIGHTS_URL = 'https://opensky-network.org/api/flights/all'
const WINDOW_HOURS = 2
const WINDOWS = 12  // 12 × 2h = 24h

interface OpenSkyFlight {
  icao24: string
  callsign: string | null
  firstSeen: number
  lastSeen: number
  estDepartureAirport: string | null
  estArrivalAirport: string | null
}

export async function POST() {
  let token: string
  try {
    token = await getAccessToken()
  } catch (err) {
    return NextResponse.json({ error: 'Auth failed', detail: String(err) }, { status: 502 })
  }

  const nowSec  = Math.floor(Date.now() / 1000)
  let totalCount = 0
  let errors     = 0

  for (let i = 0; i < WINDOWS; i++) {
    const end   = nowSec - i * WINDOW_HOURS * 3600
    const begin = end   - WINDOW_HOURS * 3600

    try {
      const response = await fetch(
        `${OPENSKY_FLIGHTS_URL}?begin=${begin}&end=${end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!response.ok) {
        errors++
        continue
      }

      const flights = await response.json() as OpenSkyFlight[]

      for (const f of flights) {
        insertFlight({
          icao24:         f.icao24,
          callsign:       f.callsign,
          first_seen:     f.firstSeen,
          last_seen:      f.lastSeen,
          departure_icao: f.estDepartureAirport,
          arrival_icao:   f.estArrivalAirport,
        })

        if (f.callsign?.trim() && (f.estDepartureAirport || f.estArrivalAirport)) {
          upsertRoute(
            f.callsign.trim(),
            f.estDepartureAirport,
            f.estArrivalAirport,
            f.lastSeen
          )
        }
      }

      totalCount += flights.length
    } catch {
      errors++
    }
  }

  return NextResponse.json({ ok: true, totalFlights: totalCount, errors })
}
