/**
 * GET /api/opensky/states
 * Server-side proxy for OpenSky /api/states/all.
 * Uses OAuth2 client credentials (server-side only) to bypass the
 * anonymous rate limit (1 req/10s per IP) that blocks browser-side fetches.
 * Returns the raw OpenSky JSON so the existing parseOpenSkyResponse() works unchanged.
 */

import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/opensky-auth'

const OPENSKY_STATES_URL = 'https://opensky-network.org/api/states/all'

export async function GET() {
  let token: string
  try {
    token = await getAccessToken()
  } catch (err) {
    return NextResponse.json(
      { error: 'Auth failed', detail: String(err) },
      { status: 502 }
    )
  }

  let response: Response
  try {
    response = await fetch(OPENSKY_STATES_URL, {
      headers: { Authorization: `Bearer ${token}` },
      // No signal needed — Next.js handles request cancellation
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'OpenSky unreachable', detail: String(err) },
      { status: 503 }
    )
  }

  if (response.status === 429) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 })
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `OpenSky returned ${response.status}` },
      { status: response.status }
    )
  }

  const data: unknown = await response.json()
  return NextResponse.json(data)
}
