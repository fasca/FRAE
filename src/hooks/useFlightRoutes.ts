'use client'

/**
 * useFlightRoutes — resolves origin/destination airports for the selected flight.
 *
 * On mount: triggers background sync of 24h of flight history (fire-and-forget).
 * When selectedCallsign changes: queries /api/opensky/route-lookup.
 * Resolves ICAO codes (e.g. LFPG) to Airport objects via getAirportByIcao().
 */

import { useState, useEffect, useRef } from 'react'
import type { Airport } from '@/types/index'
import { getAirportByIcao } from '@/lib/airports'

interface UseFlightRoutesReturn {
  originAirport: Airport | null
  destinationAirport: Airport | null
  loading: boolean
}

// Module-level flag — sync-routes runs at most once per browser session
let syncTriggered = false

function triggerSyncRoutes(): void {
  if (syncTriggered) return
  syncTriggered = true
  void fetch('/api/opensky/sync-routes', { method: 'POST' }).catch(() => {
    syncTriggered = false  // Allow retry if it failed
  })
}

export function useFlightRoutes(selectedCallsign: string | null): UseFlightRoutesReturn {
  const [originAirport, setOriginAirport]           = useState<Airport | null>(null)
  const [destinationAirport, setDestinationAirport] = useState<Airport | null>(null)
  const [loading, setLoading]                       = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Trigger route sync once on mount
  useEffect(() => { triggerSyncRoutes() }, [])

  useEffect(() => {
    if (!selectedCallsign) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Async IIFE to avoid synchronous setState in effect body
    const run = async () => {
      setLoading(true)
      setOriginAirport(null)
      setDestinationAirport(null)

      const encoded = encodeURIComponent(selectedCallsign.trim())
      try {
        const res = await fetch(
          `/api/opensky/route-lookup?callsign=${encoded}`,
          { signal: controller.signal }
        )
        const data = await res.json() as {
          route: { departure_icao: string | null; arrival_icao: string | null } | null
        }
        if (data.route) {
          setOriginAirport(
            data.route.departure_icao ? (getAirportByIcao(data.route.departure_icao) ?? null) : null
          )
          setDestinationAirport(
            data.route.arrival_icao ? (getAirportByIcao(data.route.arrival_icao) ?? null) : null
          )
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      } finally {
        setLoading(false)
      }
    }

    void run()
    return () => { controller.abort() }
  }, [selectedCallsign])

  // Derive null when deselected
  return {
    originAirport:      selectedCallsign ? originAirport : null,
    destinationAirport: selectedCallsign ? destinationAirport : null,
    loading,
  }
}
