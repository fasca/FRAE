'use client'

/**
 * useReplayData — fetches historical flight positions for the replay player.
 *
 * Queries /api/opensky/replay?date=YYYY-MM-DD&time=X where X is the
 * Unix timestamp (seconds) representing the current replay cursor position.
 * Polls automatically when isPlaying=true using the playback speed multiplier.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Flight } from '@/types/index'

export interface ReplayFlight {
  icao24: string
  callsign: string | null
  lon: number
  lat: number
  altitude: number
  heading: number
  velocity: number
  trail: [number, number][]
}

interface UseReplayDataReturn {
  replayFlights: ReplayFlight[]
  replayTime: number           // Unix timestamp (seconds)
  isPlaying: boolean
  setReplayTime: (t: number) => void
  play: () => void
  pause: () => void
  setSpeed: (speed: number) => void
  speed: number
  loading: boolean
}

const TICK_MS = 200  // UI update interval

/** Convert ReplayFlight to Flight for use with existing renderer */
export function replayFlightToFlight(rf: ReplayFlight): Flight {
  return {
    icao24:       rf.icao24,
    callsign:     rf.callsign ?? rf.icao24,
    originCountry: '',
    longitude:    rf.lon,
    latitude:     rf.lat,
    altitude:     rf.altitude,
    velocity:     rf.velocity,
    heading:      rf.heading,
    verticalRate: 0,
    onGround:     false,
    lastUpdate:   rf.trail.length > 0 ? Date.now() : 0,
  }
}

export function useReplayData(replayDate: Date | null): UseReplayDataReturn {
  // Start at midnight of the selected day
  const getStartOfDay = (date: Date) => Math.floor(
    new Date(date.toISOString().slice(0, 10) + 'T00:00:00Z').getTime() / 1000
  )

  const [replayTime, setReplayTime] = useState<number>(0)
  const [isPlaying, setIsPlaying]   = useState(false)
  const [speed, setSpeed]           = useState(10)
  const [replayFlights, setReplayFlights] = useState<ReplayFlight[]>([])
  const [loading, setLoading]       = useState(false)

  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef   = useRef<AbortController | null>(null)
  const isFetching = useRef(false)

  // Init replayTime when date changes
  useEffect(() => {
    if (!replayDate) return
    setReplayTime(getStartOfDay(replayDate))
    setIsPlaying(false)
    setReplayFlights([])
  }, [replayDate])

  const fetchReplay = useCallback(async (date: Date, time: number) => {
    if (isFetching.current) return
    isFetching.current = true

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    const dateStr = date.toISOString().slice(0, 10)

    try {
      const res = await fetch(
        `/api/opensky/replay?date=${dateStr}&time=${time}`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const data = await res.json() as { flights: ReplayFlight[] }
      setReplayFlights(data.flights ?? [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [])

  // Fetch on time change — fetchReplay is stable (useCallback with no deps)
  useEffect(() => {
    if (!replayDate || replayTime === 0) return
    void fetchReplay(replayDate, replayTime)
  }, [replayDate, replayTime, fetchReplay])

  // Playback tick — advances replayTime at speed × 1s per TICK_MS
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (!isPlaying || !replayDate) return

    tickRef.current = setInterval(() => {
      setReplayTime(prev => {
        const startOfDay = getStartOfDay(replayDate)
        const endOfDay   = startOfDay + 86400
        const next = prev + Math.round(speed * TICK_MS / 1000)
        if (next >= endOfDay) {
          setIsPlaying(false)
          return endOfDay
        }
        return next
      })
    }, TICK_MS)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [isPlaying, speed, replayDate])

  return {
    replayFlights,
    replayTime,
    isPlaying,
    setReplayTime,
    play:     () => setIsPlaying(true),
    pause:    () => setIsPlaying(false),
    setSpeed,
    speed,
    loading,
  }
}
