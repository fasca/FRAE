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
  insertPositions(positions)

  return NextResponse.json({ ok: true, count: positions.length })
}
