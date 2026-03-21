'use client'

/**
 * useFlightTrack — fetches the complete trajectory for the selected aircraft.
 *
 * Priority:
 * 1. Client-side cache (per session)
 * 2. /api/opensky/tracks (DB → OpenSky → positions fallback)
 *
 * Returns [lon, lat][] coordinates ready for renderer.drawFullTrack().
 */

import { useState, useEffect, useRef } from 'react'

interface UseFlightTrackReturn {
  fullTrack: [number, number][] | null
  loading: boolean
}

// Session-level cache: avoids re-fetching when user deselects and re-selects
const trackCache = new Map<string, [number, number][]>()

export function useFlightTrack(selectedIcao24: string | null): UseFlightTrackReturn {
  const [fullTrack, setFullTrack] = useState<[number, number][] | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!selectedIcao24) return

    // Abort any in-flight request for a previous selection
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Async IIFE keeps setState calls out of synchronous effect body
    const run = async () => {
      // Cache hit — resolve immediately
      const cached = trackCache.get(selectedIcao24)
      if (cached) {
        setFullTrack(cached)
        return
      }

      setLoading(true)
      try {
        const res = await fetch(
          `/api/opensky/tracks?icao24=${encodeURIComponent(selectedIcao24)}`,
          { signal: controller.signal }
        )
        const data = await res.json() as { track: [number, number][] | null }
        const track = data.track ?? null
        if (track && track.length > 0) {
          trackCache.set(selectedIcao24, track)
        }
        setFullTrack(track)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setFullTrack(null)
      } finally {
        setLoading(false)
      }
    }

    void run()
    return () => { controller.abort() }
  }, [selectedIcao24])

  // Derive null when nothing selected (avoids setState in synchronous guard clause)
  return { fullTrack: selectedIcao24 ? fullTrack : null, loading }
}
