'use client'

/**
 * useRoutesData — fetches aggregated corridor data for the Routes mode.
 * Fetches once on activation; corridors are derived from the 30-day routes table.
 */

import { useState, useEffect, useRef } from 'react'
import type { RouteCorridor } from '@/types/index'

export interface UseRoutesDataReturn {
  corridors: RouteCorridor[]
  loading: boolean
  error: string | null
}

export function useRoutesData(active: boolean): UseRoutesDataReturn {
  const [corridors, setCorridors] = useState<RouteCorridor[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!active) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    void (async () => {
      setCorridors([])
      setError(null)
      setLoading(true)
      try {
        const res = await fetch(
          '/api/opensky/routes-aggregate?minCount=2&limit=200',
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { corridors: RouteCorridor[] }
        setCorridors(data.corridors ?? [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Fetch failed')
      } finally {
        setLoading(false)
      }
    })()

    return () => { controller.abort() }
  }, [active])

  return {
    corridors: active ? corridors : [],
    loading:   active ? loading   : false,
    error:     active ? error     : null,
  }
}
