/**
 * POST /api/opensky/log-positions
 * Receives an array of flight positions from the client after each /states/all fetch
 * and persists them to the SQLite positions table.
 * Called fire-and-forget from useOpenSkyData every 10s.
 */

import { NextRequest, NextResponse } from 'next/server'
import { insertPositions } from '@/lib/db'
import type { Position } from '@/types/index'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'Expected non-empty array' }, { status: 400 })
  }

  // Minimal validation — trust client data (internal API)
  const positions = body as Position[]

  // Only persist in-flight positions: altitude > 5000 m (en-route long-haul)
  // or significant velocity > 100 m/s (~360 km/h) when altitude is missing.
  // This eliminates ground traffic, low-altitude local flights, and helicopters
  // and reduces write volume by ~70% compared to logging everything.
  const meaningful = positions.filter(p =>
    (p.altitude != null && p.altitude > 5000) ||
    (p.velocity != null && p.velocity > 100)
  )
  insertPositions(meaningful)

  return NextResponse.json({ ok: true, count: meaningful.length, total: positions.length })
}
