'use client'

import { useRef, useEffect, useCallback } from 'react'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'
import { createProjection, calculateZoomScale } from '@/lib/projection'
import { drawStaticLayer } from '@/lib/renderer'
import type { ProjectionCenter, MapOptions } from '@/types/index'

interface MapCanvasProps {
  center: ProjectionCenter
  scale: number
  options: MapOptions
  onScaleChange: (scale: number) => void
}

export default function MapCanvas({
  center,
  scale,
  options: _options,
  onScaleChange,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldDataRef = useRef<FeatureCollection | null>(null)

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !worldDataRef.current) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const width = rect.width || canvas.offsetWidth
    const height = rect.height || canvas.offsetHeight

    if (width === 0 || height === 0) return

    canvas.width = width * dpr
    canvas.height = height * dpr

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    ctx.scale(dpr, dpr)

    const projection = createProjection(center, width, height, scale)
    drawStaticLayer(ctx, projection, worldDataRef.current, width, height)
  }, [center, scale])

  // Load world atlas data once on mount
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((res) => res.json())
      .then((topology: Topology<{ countries: GeometryCollection }>) => {
        worldDataRef.current = feature(
          topology,
          topology.objects.countries
        ) as unknown as FeatureCollection
        drawMap()
      })
      .catch((err: unknown) => {
        console.error('Failed to load world atlas:', err)
      })
  }, [drawMap])

  // Redraw when center or scale changes
  useEffect(() => {
    drawMap()
  }, [drawMap])

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

  // Resize observer for responsive canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      drawMap()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawMap])

  return (
    <canvas
      ref={canvasRef}
      className="flex-1 w-full h-full cursor-crosshair block"
    />
  )
}
