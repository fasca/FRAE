'use client'

import { useState } from 'react'
import MapCanvas from './MapCanvas'
import ControlPanel from './ControlPanel'
import StatsBar from './StatsBar'
import type { ProjectionCenter, MapOptions, Flight, Airport } from '@/types/index'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'

const EMPTY_FLIGHTS: readonly Flight[] = []
const EMPTY_AIRPORTS: readonly Airport[] = []
const EMPTY_TRAILS = new Map<string, [number, number][]>()

export default function FlightRadar() {
  const [center, setCenter] = useState<ProjectionCenter>(PREDEFINED_CENTERS[0])
  const [scale, setScale] = useState<number>(DEFAULT_SCALE)
  const [options] = useState<MapOptions>({
    showAirports: true,
    showGraticule: true,
    showCountryBorders: true,
    showFlightPaths: false,
  })
  const [selectedIcao24, setSelectedIcao24] = useState<string | null>(null)

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
        flights={EMPTY_FLIGHTS}
        airports={EMPTY_AIRPORTS}
        trails={EMPTY_TRAILS}
        selectedIcao24={selectedIcao24}
        onScaleChange={setScale}
        onFlightSelect={setSelectedIcao24}
      />
      <StatsBar center={center} scale={scale} />
    </div>
  )
}
