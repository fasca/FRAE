'use client'

/**
 * useOpenSkyData — custom hook for OpenSky Network data fetching.
 *
 * Architecture:
 * - setTimeout chain (not setInterval) to prevent overlapping requests
 * - 30s back-off on HTTP 429, 10s normal interval
 * - Retries indefinitely on error (no simulation fallback)
 * - flightStatesRef exposed for MapCanvas RAF interpolation
 * - After each successful fetch, logs positions to SQLite via /api/opensky/log-positions
 *   (fire-and-forget — does not block the fetch cycle)
 */
import { useState, useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { Flight, FlightState, Position } from '@/types/index'
import { fetchOpenSkyFlights } from '@/lib/opensky'

const FETCH_INTERVAL_MS   = 10_000
const BACKOFF_INTERVAL_MS = 30_000

// Trigger maintenance once per browser session (fire-and-forget)
let maintenanceTriggered = false

interface UseOpenSkyDataReturn {
  flightStatesRef: MutableRefObject<Map<string, FlightState>>
  flights: readonly Flight[]
  lastUpdate: number | null
  flightCount: number
  error: string | null
}

/** Fire-and-forget: log positions to SQLite without blocking the fetch cycle */
function logPositions(flights: readonly Flight[]): void {
  const now = Math.floor(Date.now() / 1000)
  const positions: Position[] = flights.map(f => ({
    icao24:        f.icao24,
    callsign:      f.callsign || null,
    time:          now,
    lat:           f.latitude,
    lon:           f.longitude,
    altitude:      f.altitude,
    heading:       f.heading,
    velocity:      f.velocity,
    vertical_rate: f.verticalRate,
    on_ground:     f.onGround,
  }))

  // Intentionally not awaited — position logging must not block the animation loop
  void fetch('/api/opensky/log-positions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(positions),
  }).catch(() => {
    // Silently ignore failures — logging is best-effort
  })
}

export function useOpenSkyData(): UseOpenSkyDataReturn {
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [flights, setFlights] = useState<readonly Flight[]>([])
  const [error, setError] = useState<string | null>(null)

  const flightStatesRef = useRef<Map<string, FlightState>>(new Map())
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    function scheduleFetch(delay: number): void {
      fetchTimeoutRef.current = setTimeout(async () => {
        if (signal.aborted) return

        let result
        try {
          result = await fetchOpenSkyFlights(signal)
        } catch (err) {
          // Only AbortError is expected here — anything else (e.g. SyntaxError from
          // response.json()) must still reschedule so the loop doesn't die permanently.
          if (signal.aborted) return
          console.warn('[OpenSky] unexpected fetch error:', err)
          setError('network-error')
          scheduleFetch(FETCH_INTERVAL_MS)
          return
        }

        if (signal.aborted) return

        if (result.ok) {
          const newFlightMap = new Map(result.flights.map(f => [f.icao24, f]))
          const now = Date.now()

          // Update flightStatesRef: previous = old current, current = new
          for (const [icao24, newFlight] of newFlightMap) {
            const existing = flightStatesRef.current.get(icao24)
            flightStatesRef.current.set(icao24, {
              current: newFlight,
              previous: existing?.current ?? null,
              lastFetchTime: now,
            })
          }

          // Prune stale icao24s
          for (const icao24 of flightStatesRef.current.keys()) {
            if (!newFlightMap.has(icao24)) {
              flightStatesRef.current.delete(icao24)
            }
          }

          // Log positions to SQLite (fire-and-forget, best-effort)
          logPositions(result.flights)

          setError(null)
          setLastUpdate(result.timestamp)
          setFlights(result.flights)
          scheduleFetch(FETCH_INTERVAL_MS)
        } else {
          setError(result.error)
          const isRateLimited = result.error === 'rate-limited'
          scheduleFetch(isRateLimited ? BACKOFF_INTERVAL_MS : FETCH_INTERVAL_MS)
        }
      }, delay)
    }

    // Run DB maintenance once per browser session — purge old rows + VACUUM
    if (!maintenanceTriggered) {
      maintenanceTriggered = true
      fetch('/api/opensky/maintenance').catch(() => {})
    }

    scheduleFetch(0)

    return () => {
      controller.abort()
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    }
  }, [])

  return {
    flightStatesRef,
    flights,
    lastUpdate,
    flightCount: flights.length,
    error,
  }
}
