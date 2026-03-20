'use client'

import { useState, useCallback, useRef } from 'react'
import MapCanvas from './MapCanvas'
import ControlPanel from './ControlPanel'
import StatsBar from './StatsBar'
import FlightInfoPanel from './FlightInfoPanel'
import type { ProjectionCenter, MapOptions } from '@/types/index'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'
import { AIRPORTS } from '@/lib/airports'
import { useOpenSkyData } from '@/hooks/useOpenSkyData'
import { filterFlights } from '@/lib/flights'

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
  const [filterQuery, setFilterQuery] = useState('')
  const exportRef = useRef<(() => void) | null>(null)

  const { flightStatesRef, flights, trailsRef, dataSource, lastUpdate } = useOpenSkyData()

  const handleFlightSelect = useCallback((icao24: string | null) => {
    setSelectedIcao24(icao24)
  }, [])

  const handleOptionsChange = useCallback((newOptions: MapOptions) => {
    setOptions(newOptions)
  }, [])

  const filteredFlights = filterFlights(flights, filterQuery)
  const selectedFlight = filteredFlights.find(f => f.icao24 === selectedIcao24) ?? null

  return (
    <div className="flex flex-col h-full w-full bg-[#030a14] relative">
      <ControlPanel
        center={center}
        scale={scale}
        options={options}
        filterQuery={filterQuery}
        onCenterChange={setCenter}
        onScaleChange={setScale}
        onOptionsChange={handleOptionsChange}
        onFilterChange={setFilterQuery}
        onExport={() => exportRef.current?.()}
      />
      <MapCanvas
        center={center}
        scale={scale}
        options={options}
        flights={filteredFlights}
        airports={AIRPORTS}
        // eslint-disable-next-line react-hooks/refs
        trails={trailsRef.current}
        selectedIcao24={selectedIcao24}
        onScaleChange={setScale}
        onFlightSelect={handleFlightSelect}
        onCenterChange={setCenter}
        flightStatesRef={flightStatesRef}
        dataSource={dataSource}
        exportRef={exportRef}
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
        flightCount={filteredFlights.length}
        lastUpdate={lastUpdate}
        dataSource={dataSource}
      />
    </div>
  )
}
