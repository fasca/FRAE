'use client'

import { useState, useCallback } from 'react'
import MapCanvas from './MapCanvas'
import ControlPanel from './ControlPanel'
import StatsBar from './StatsBar'
import FlightInfoPanel from './FlightInfoPanel'
import type { ProjectionCenter, MapOptions } from '@/types/index'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'
import { AIRPORTS } from '@/lib/airports'
import { useOpenSkyData } from '@/hooks/useOpenSkyData'

export default function FlightRadar() {
  const [center, setCenter] = useState<ProjectionCenter>(PREDEFINED_CENTERS[0])
  const [scale, setScale] = useState<number>(DEFAULT_SCALE)
  const [options, setOptions] = useState<MapOptions>({
    showAirports: true,
    showGraticule: true,
    showCountryBorders: true,
    showFlightPaths: false,
  })
  const [selectedIcao24, setSelectedIcao24] = useState<string | null>(null)

  const { flightStatesRef, flights, trailsRef, dataSource, lastUpdate, flightCount } = useOpenSkyData()

  const handleFlightSelect = useCallback((icao24: string | null) => {
    setSelectedIcao24(icao24)
  }, [])

  const handleOptionsChange = useCallback((newOptions: MapOptions) => {
    setOptions(newOptions)
  }, [])

  const selectedFlight = flights.find(f => f.icao24 === selectedIcao24) ?? null

  return (
    <div className="flex flex-col h-full w-full bg-[#030a14] relative">
      <ControlPanel
        center={center}
        scale={scale}
        options={options}
        onCenterChange={setCenter}
        onScaleChange={setScale}
        onOptionsChange={handleOptionsChange}
      />
      <MapCanvas
        center={center}
        scale={scale}
        options={options}
        flights={flights}
        airports={AIRPORTS}
        // eslint-disable-next-line react-hooks/refs
        trails={trailsRef.current}
        selectedIcao24={selectedIcao24}
        onScaleChange={setScale}
        onFlightSelect={handleFlightSelect}
        flightStatesRef={flightStatesRef}
        dataSource={dataSource}
      />
      {selectedFlight && selectedIcao24 && (
        <FlightInfoPanel
          flight={selectedFlight}
          onClose={() => handleFlightSelect(null)}
        />
      )}
      <StatsBar
        center={center}
        scale={scale}
        flightCount={flightCount}
        lastUpdate={lastUpdate}
        dataSource={dataSource}
      />
    </div>
  )
}
