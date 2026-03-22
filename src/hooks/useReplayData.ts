'use client'

/**
 * useReplayData — fetches all completed flights for a selected day.
 * Replaces the time-slider playback hook with a simple date-based fetch.
 * Returns the full CompletedFlight list with trajectories and resolved airports.
 */

import { useState, useEffect, useRef } from 'react'
import type { CompletedFlight } from '@/types/index'

export interface UseReplayDataReturn {
  completedFlights: CompletedFlight[]
  loading: boolean
  error: string | null
}

export function useReplayData(replayDate: Date | null): UseReplayDataReturn {
  const [completedFlights, setCompletedFlights] = useState<CompletedFlight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!replayDate) return  // no sync setState — derive empty state in return below

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Async IIFE keeps all setState calls out of the synchronous effect body
    void (async () => {
      const dateStr = replayDate.toISOString().slice(0, 10)
      setCompletedFlights([])
      setError(null)
      setLoading(true)
      try {
        const res = await fetch(`/api/opensky/replay?date=${dateStr}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { flights: CompletedFlight[] }
        setCompletedFlights(data.flights ?? [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Fetch failed')
      } finally {
        setLoading(false)
      }
    })()

    return () => { controller.abort() }
  }, [replayDate])

  // When no date is selected, derive empty/idle state without touching state variables
  return {
    completedFlights: replayDate ? completedFlights : [],
    loading:          replayDate ? loading : false,
    error:            replayDate ? error   : null,
  }
}
