'use client'

import { useRef, useEffect, useCallback } from 'react'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'
import type { GeoProjection } from 'd3-geo'
import { createProjection, calculateZoomScale } from '@/lib/projection'
import { drawStaticLayer, drawDynamicLayers } from '@/lib/renderer'
import { findClosestFlight } from '@/lib/flights'
import type { ProjectionCenter, MapOptions, Flight, Airport } from '@/types/index'

interface MapCanvasProps {
  center: ProjectionCenter
  scale: number
  options: MapOptions
  flights: readonly Flight[]
  airports: readonly Airport[]
  trails: Map<string, [number, number][]>
  selectedIcao24: string | null
  onScaleChange: (scale: number) => void
  onFlightSelect: (icao24: string | null) => void
}

export default function MapCanvas({
  center,
  scale,
  options,
  flights,
  airports,
  trails,
  selectedIcao24,
  onScaleChange,
  onFlightSelect,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldDataRef = useRef<FeatureCollection | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const projectionRef = useRef<GeoProjection | null>(null)

  // Refs for animation loop to avoid stale closures
  const flightsRef = useRef(flights)
  const airportsRef = useRef(airports)
  const trailsRef = useRef(trails)
  const selectedRef = useRef(selectedIcao24)
  const optionsRef = useRef(options)

  // Keep refs in sync with props (without re-rendering)
  useEffect(() => { flightsRef.current = flights }, [flights])
  useEffect(() => { airportsRef.current = airports }, [airports])
  useEffect(() => { trailsRef.current = trails }, [trails])
  useEffect(() => { selectedRef.current = selectedIcao24 }, [selectedIcao24])
  useEffect(() => { optionsRef.current = options }, [options])

  const drawStaticToOffscreen = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !worldDataRef.current) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const width = rect.width || canvas.offsetWidth
    const height = rect.height || canvas.offsetHeight
    if (width === 0 || height === 0) return

    // Create or resize offscreen canvas
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas')
    }
    const offscreen = offscreenRef.current
    offscreen.width = width * dpr
    offscreen.height = height * dpr

    const offCtx = offscreen.getContext('2d', { alpha: false })
    if (!offCtx) return

    offCtx.scale(dpr, dpr)
    const projection = createProjection(center, width, height, scale)
    projectionRef.current = projection
    drawStaticLayer(offCtx, projection, worldDataRef.current, width, height)
  }, [center, scale])

  // Animation loop — uses a ref to avoid self-reference-before-declaration lint error
  const animateRef = useRef<() => void>(() => {})

  useEffect(() => {
    animateRef.current = () => {
      const canvas = canvasRef.current
      const offscreen = offscreenRef.current
      if (!canvas || !offscreen) {
        rafRef.current = requestAnimationFrame(animateRef.current)
        return
      }

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = rect.width || canvas.offsetWidth
      const height = rect.height || canvas.offsetHeight
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(animateRef.current)
        return
      }

      canvas.width = width * dpr
      canvas.height = height * dpr

      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) {
        rafRef.current = requestAnimationFrame(animateRef.current)
        return
      }

      ctx.scale(dpr, dpr)

      // Copy static layers from offscreen cache
      ctx.drawImage(offscreen, 0, 0, width, height)

      // Draw dynamic layers
      const projection = projectionRef.current
      if (projection) {
        drawDynamicLayers(
          ctx,
          projection,
          airportsRef.current,
          flightsRef.current,
          trailsRef.current,
          selectedRef.current,
          optionsRef.current
        )
      }

      rafRef.current = requestAnimationFrame(animateRef.current)
    }
  })

  // Start animation loop on mount
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateRef.current)
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Rebuild offscreen cache when projection changes (center, scale, size)
  useEffect(() => {
    drawStaticToOffscreen()
  }, [drawStaticToOffscreen])

  // Load world atlas data on mount with AbortController
  useEffect(() => {
    const controller = new AbortController()
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((topology: Topology<{ countries: GeometryCollection }>) => {
        worldDataRef.current = feature(
          topology,
          topology.objects.countries
        ) as unknown as FeatureCollection
        drawStaticToOffscreen()
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Failed to load world atlas:', err)
      })
    return () => controller.abort()
  }, [drawStaticToOffscreen])

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const newScale = calculateZoomScale(scale, e.deltaY)
      onScaleChange(newScale)
    },
    [scale, onScaleChange]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Click handler for flight selection
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current
      const projection = projectionRef.current
      if (!canvas || !projection) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const found = findClosestFlight(flightsRef.current, projection, x, y, 15)
      onFlightSelect(found?.icao24 ?? null)
    },
    [onFlightSelect]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [handleClick])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      drawStaticToOffscreen()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawStaticToOffscreen])

  return (
    <canvas
      ref={canvasRef}
      className="flex-1 w-full h-full cursor-crosshair block"
    />
  )
}
