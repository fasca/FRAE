'use client'

import { useState } from 'react'
import MapCanvas from './MapCanvas'
import ControlPanel from './ControlPanel'
import StatsBar from './StatsBar'
import type { ProjectionCenter, MapOptions } from '@/types/index'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'

export default function FlightRadar() {
  const [center, setCenter] = useState<ProjectionCenter>(PREDEFINED_CENTERS[0])
  const [scale, setScale] = useState<number>(DEFAULT_SCALE)
  const [options] = useState<MapOptions>({
    showAirports: true,
    showGraticule: true,
    showCountryBorders: true,
    showFlightPaths: false,
  })

  return (
    <div className="flex flex-col h-full w-full bg-[#030a14]">
      <ControlPanel
        center={center}
        scale={scale}
        options={options}
        onCenterChange={setCenter}
        onScaleChange={setScale}
        onOptionsChange={() => undefined}
      />
      <MapCanvas
        center={center}
        scale={scale}
        options={options}
        onScaleChange={setScale}
      />
      <StatsBar center={center} scale={scale} />
    </div>
  )
}
