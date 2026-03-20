'use client'

import { useRef, useEffect, useCallback } from 'react'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'
import type { GeoProjection } from 'd3-geo'
import { createProjection, calculateZoomScale } from '@/lib/projection'
import { drawStaticLayer, drawDynamicLayers } from '@/lib/renderer'
import { findClosestFlight, interpolateFlight } from '@/lib/flights'
import { FETCH_INTERVAL_MS } from '@/lib/opensky'
import type { MutableRefObject } from 'react'
import type { ProjectionCenter, MapOptions, Flight, Airport, FlightState, DataSource } from '@/types/index'

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
  onCenterChange?: (center: ProjectionCenter) => void
  flightStatesRef?: MutableRefObject<Map<string, FlightState>>
  dataSource?: DataSource
  exportRef?: MutableRefObject<(() => void) | null>
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
  onCenterChange,
  flightStatesRef,
  dataSource,
  exportRef,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const worldDataRef = useRef<FeatureCollection | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const projectionRef = useRef<GeoProjection | null>(null)

  // Refs for drag-to-recenter
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<[number, number]>([0, 0])

  // Refs for animation loop to avoid stale closures
  const flightsRef = useRef(flights)
  const airportsRef = useRef(airports)
  const trailsRef = useRef(trails)
  const selectedRef = useRef(selectedIcao24)
  const optionsRef = useRef(options)
  const dataSourceRef = useRef(dataSource)

  // Keep refs in sync with props (without re-rendering)
  useEffect(() => { flightsRef.current = flights }, [flights])
  useEffect(() => { airportsRef.current = airports }, [airports])
  useEffect(() => { trailsRef.current = trails }, [trails])
  useEffect(() => { selectedRef.current = selectedIcao24 }, [selectedIcao24])
  useEffect(() => { optionsRef.current = options }, [options])
  useEffect(() => { dataSourceRef.current = dataSource }, [dataSource])

  const drawStaticToOffscreen = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !worldDataRef.current) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const width = rect.width || canvas.offsetWidth
    const height = rect.height || canvas.offsetHeight
    if (width === 0 || height === 0) return

    // Set main canvas backing-store dimensions (needed for correct sizing before first frame)
    canvas.width = width * dpr
    canvas.height = height * dpr

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
    drawStaticLayer(offCtx, projection, worldDataRef.current, width, height, options)
  }, [center, scale, options])

  // Ref to call drawStaticToOffscreen from mount-only effect without adding it as a dep
  const drawStaticToOffscreenRef = useRef<() => void>(() => {})
  useEffect(() => {
    drawStaticToOffscreenRef.current = drawStaticToOffscreen
  }, [drawStaticToOffscreen])

  // Animation loop — uses a ref to avoid self-reference-before-declaration lint error
  const animateRef = useRef<() => void>(() => {})

  // Intentionally no dependency array — must run after every render
  // so animateRef always captures latest refs (flightsRef, offscreenRef, etc.)
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

      // Get or initialize the 2d context (cached in ref to avoid per-frame allocation)
      if (!ctxRef.current) {
        const newCtx = canvas.getContext('2d', { alpha: false })
        if (!newCtx) {
          rafRef.current = requestAnimationFrame(animateRef.current)
          return
        }
        ctxRef.current = newCtx
      }
      const ctx = ctxRef.current

      // canvas.width assignment above resets the transform matrix, so re-apply scale each frame
      ctx.scale(dpr, dpr)

      // Copy static layers from offscreen cache
      ctx.drawImage(offscreen, 0, 0, width, height)

      // Draw dynamic layers
      const projection = projectionRef.current
      if (projection) {
        let liveFlights: readonly Flight[] = flightsRef.current
        if (dataSourceRef.current === 'live' && flightStatesRef) {
          const now = Date.now()
          liveFlights = Array.from(flightStatesRef.current.values()).map(
            state => interpolateFlight(state, now, FETCH_INTERVAL_MS)
          )
        }
        drawDynamicLayers(
          ctx,
          projection,
          airportsRef.current,
          liveFlights,
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

  // Load world atlas data on mount with AbortController (mount-only, never re-fetched)
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
        drawStaticToOffscreenRef.current()
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Failed to load world atlas:', err)
      })
    return () => controller.abort()
  }, [])

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

  const onCenterChangeRef = useRef(onCenterChange)
  useEffect(() => { onCenterChangeRef.current = onCenterChange }, [onCenterChange])

  const onFlightSelectRef = useRef(onFlightSelect)
  useEffect(() => { onFlightSelectRef.current = onFlightSelect }, [onFlightSelect])

  // Pointer handlers: distinguish click (flight select) from drag (recenter)
  const handlePointerDown = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture?.(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    dragStartRef.current = [e.clientX - rect.left, e.clientY - rect.top]
    isDraggingRef.current = false
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !(e.buttons & 1)) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const [sx, sy] = dragStartRef.current
    const dist = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2)
    if (dist > 5) {
      isDraggingRef.current = true
      canvas.style.cursor = 'grabbing'
    }
  }, [])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current
    const projection = projectionRef.current
    if (!canvas) return
    canvas.style.cursor = ''
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (isDraggingRef.current && projection && onCenterChangeRef.current) {
      const coords = projection.invert?.([x, y])
      if (coords) {
        const [lon, lat] = coords
        onCenterChangeRef.current({ lat, lon, label: 'Custom' })
      }
    } else {
      const found = findClosestFlight(flightsRef.current, projection!, x, y, 15)
      onFlightSelectRef.current(found?.icao24 ?? null)
    }
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp])

  // Export to PNG: composite static + dynamic layers into a temp canvas
  useEffect(() => {
    if (!exportRef) return
    exportRef.current = () => {
      const canvas = canvasRef.current
      const offscreen = offscreenRef.current
      const projection = projectionRef.current
      if (!canvas || !offscreen || !projection) return
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = rect.width || canvas.offsetWidth
      const height = rect.height || canvas.offsetHeight
      const tmp = document.createElement('canvas')
      tmp.width = width * dpr
      tmp.height = height * dpr
      const tmpCtx = tmp.getContext('2d')
      if (!tmpCtx) return
      tmpCtx.scale(dpr, dpr)
      tmpCtx.drawImage(offscreen, 0, 0, width, height)
      drawDynamicLayers(tmpCtx, projection, airportsRef.current, flightsRef.current, trailsRef.current, selectedRef.current, optionsRef.current)
      const url = tmp.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = 'frae-export.png'
      a.click()
    }
    return () => { if (exportRef) exportRef.current = null }
  })

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
