/**
 * GET /api/opensky/maintenance
 * Triggers database maintenance: purge old positions/flights/tracks/routes + VACUUM.
 * Called fire-and-forget from useOpenSkyData on session start, or manually via curl.
 */

import { NextResponse } from 'next/server'
import { runMaintenance } from '@/lib/db'

export async function GET() {
  const stats = runMaintenance()
  return NextResponse.json({ ok: true, purged: stats })
}
