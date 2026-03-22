/**
 * Pure business logic for replay mode — no DB calls, no network.
 * Extracted here for testability.
 */
import type { FlightRecord, Position } from '@/types/index'

/** Keep only flights that have callsign, first_seen, and last_seen. */
export function filterValidFlights(records: FlightRecord[]): FlightRecord[] {
  return records.filter(
    f => f.callsign && f.first_seen != null && f.last_seen != null
  )
}

/** Remove duplicate entries (same icao24 + callsign + first_seen). */
export function deduplicateFlights(records: FlightRecord[]): FlightRecord[] {
  const seen = new Set<string>()
  return records.filter(f => {
    const key = `${f.icao24}|${f.callsign}|${f.first_seen}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Extract positions belonging to a specific flight from a batch. */
export function matchPositionsToFlight(
  positions: Position[],
  icao24: string,
  firstSeen: number,
  lastSeen: number
): Position[] {
  return positions.filter(
    p => p.icao24 === icao24 && p.time >= firstSeen && p.time <= lastSeen
  )
}
