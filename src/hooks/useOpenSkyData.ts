'use client'

/**
 * useOpenSkyData — custom hook for OpenSky Network data fetching.
 *
 * Architecture:
 * - setTimeout chain (not setInterval) to prevent overlapping requests
 * - 30s back-off on HTTP 429, 10s normal interval
 * - Fallback to simulation after 3 consecutive errors (no auto-recovery)
 * - flightStatesRef exposed for MapCanvas RAF interpolation
 * - trailsRef accumulates position history per icao24
 * - After each successful fetch, logs positions to SQLite via /api/opensky/log-positions
 *   (fire-and-forget — does not block the fetch cycle)
 */
import { useState, useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { Flight, FlightState, DataSource, Position } from '@/types/index'
import { fetchOpenSkyFlights } from '@/lib/opensky'
import { generateSimulatedFlights, updateSimulatedFlights, simulatedFlightToFlight, interpolatePosition } from '@/lib/flights'
import { TRAIL_LENGTH } from '@/lib/renderer'

const FETCH_INTERVAL_MS  = 10_000
const BACKOFF_INTERVAL_MS = 30_000
const MAX_ERRORS = 3
const SIM_FLIGHT_COUNT = 80
const SIM_UPDATE_MS = 1_000

interface UseOpenSkyDataReturn {
  flightStatesRef: MutableRefObject<Map<string, FlightState>>
  flights: readonly Flight[]
  trailsRef: MutableRefObject<Map<string, [number, number][]>>
  dataSource: DataSource
  lastUpdate: number | null
  flightCount: number
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
  const [dataSource, setDataSource] = useState<DataSource>('live')
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [flights, setFlights] = useState<readonly Flight[]>([])

  const flightStatesRef = useRef<Map<string, FlightState>>(new Map())
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map())
  const consecutiveErrorsRef = useRef<number>(0)
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Simulation refs (used when fallback is active)
  const simulatedFlightsRef = useRef(generateSimulatedFlights(SIM_FLIGHT_COUNT))
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dataSourceRef = useRef<DataSource>('live')

  // Keep dataSourceRef in sync with state (needed inside closures)
  useEffect(() => {
    dataSourceRef.current = dataSource
  }, [dataSource])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    function startSimulation(): void {
      simulatedFlightsRef.current = generateSimulatedFlights(SIM_FLIGHT_COUNT)
      if (simIntervalRef.current) return // already running
      simIntervalRef.current = setInterval(() => {
        const now = Date.now()
        simulatedFlightsRef.current = updateSimulatedFlights(simulatedFlightsRef.current, now)
        for (const sim of simulatedFlightsRef.current) {
          const pos = interpolatePosition(sim.origin, sim.destination, sim.progress)
          const trail = trailsRef.current.get(sim.icao24) ?? []
          trail.push(pos)
          if (trail.length > TRAIL_LENGTH) trail.shift()
          trailsRef.current.set(sim.icao24, trail)
        }
        setFlights(simulatedFlightsRef.current.map(simulatedFlightToFlight))
      }, SIM_UPDATE_MS)
    }

    function scheduleFetch(delay: number): void {
      fetchTimeoutRef.current = setTimeout(async () => {
        if (signal.aborted) return

        let result
        try {
          result = await fetchOpenSkyFlights(signal)
        } catch {
          // AbortError — component unmounted, do not reschedule
          return
        }

        if (signal.aborted) return

        if (result.ok) {
          consecutiveErrorsRef.current = 0
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
            // Accumulate trails (unbounded by icao24 for selected flight track support)
            const trail = trailsRef.current.get(icao24) ?? []
            trail.push([newFlight.longitude, newFlight.latitude])
            if (trail.length > TRAIL_LENGTH) trail.shift()
            trailsRef.current.set(icao24, trail)
          }

          // Prune stale icao24s
          for (const icao24 of flightStatesRef.current.keys()) {
            if (!newFlightMap.has(icao24)) {
              flightStatesRef.current.delete(icao24)
              trailsRef.current.delete(icao24)
            }
          }

          // Log positions to SQLite (fire-and-forget, best-effort)
          logPositions(result.flights)

          setLastUpdate(result.timestamp)
          setFlights(result.flights)
          scheduleFetch(FETCH_INTERVAL_MS)
        } else {
          consecutiveErrorsRef.current++
          const isRateLimited = result.error === 'rate-limited'
          if (consecutiveErrorsRef.current >= MAX_ERRORS) {
            setDataSource('simulated')
            startSimulation()
            return // stop fetch loop
          }
          scheduleFetch(isRateLimited ? BACKOFF_INTERVAL_MS : FETCH_INTERVAL_MS)
        }
      }, delay)
    }

    scheduleFetch(0)

    return () => {
      controller.abort()
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current)
        simIntervalRef.current = null
      }
    }
  }, [])

  return {
    flightStatesRef,
    flights,
    trailsRef,
    dataSource,
    lastUpdate,
    flightCount: flights.length,
  }
}
