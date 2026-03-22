'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import MapCanvas from './MapCanvas'
import ControlPanel from './ControlPanel'
import StatsBar from './StatsBar'
import FlightInfoPanel from './FlightInfoPanel'
import ReplayControls from './ReplayControls'
import CorridorInfoPanel from './CorridorInfoPanel'
import type { ProjectionCenter, MapOptions, Flight, Airport } from '@/types/index'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'
import { getVisibleAirports } from '@/lib/airport-render'
import { useOpenSkyData } from '@/hooks/useOpenSkyData'
import { useFlightTrack } from '@/hooks/useFlightTrack'
import { useFlightRoutes } from '@/hooks/useFlightRoutes'
import { useReplayData } from '@/hooks/useReplayData'
import { useRoutesData } from '@/hooks/useRoutesData'
import { filterFlights } from '@/lib/flights'

export default function FlightRadar() {
  const [center, setCenter] = useState<ProjectionCenter>(PREDEFINED_CENTERS[0])
  const [scale, setScale]   = useState<number>(DEFAULT_SCALE)
  const [options, setOptions] = useState<MapOptions>({
    showAirports: true,
    showGraticule: true,
    showCountryBorders: true,
  })
  const [selectedIcao24, setSelectedIcao24]       = useState<string | null>(null)
  const [filterQuery, setFilterQuery]             = useState('')
  const [replayMode, setReplayMode]               = useState(false)
  const [replayDate, setReplayDate]               = useState<Date | null>(null)
  const [replaySelectedIdx, setReplaySelectedIdx] = useState<number | null>(null)
  const [routesMode, setRoutesMode]               = useState(false)
  const [routesSelectedIdx, setRoutesSelectedIdx] = useState<number | null>(null)
  const exportRef = useRef<(() => void) | null>(null)

  // Live data
  const { flightStatesRef, flights, lastUpdate, error: openSkyError } = useOpenSkyData()

  // Full track + route for selected live flight (hooks must always be called)
  const { fullTrack }   = useFlightTrack(replayMode ? null : selectedIcao24)
  const selectedFlight  = replayMode ? null : (flights.find(f => f.icao24 === selectedIcao24) ?? null)
  const { originAirport, destinationAirport } = useFlightRoutes(selectedFlight?.callsign ?? null)

  // Replay data
  const { completedFlights, loading: replayLoading } = useReplayData(replayMode ? replayDate : null)

  // Routes data
  const { corridors } = useRoutesData(routesMode)

  const handleFlightSelect = useCallback((icao24: string | null) => {
    setSelectedIcao24(icao24)
  }, [])

  const handleOptionsChange = useCallback((newOptions: MapOptions) => {
    setOptions(newOptions)
  }, [])

  const visibleAirports = useMemo(() => getVisibleAirports(scale), [scale])

  const displayFlights  = useMemo(
    () => replayMode ? [] : filterFlights(flights, filterQuery),
    [replayMode, flights, filterQuery]
  )
  const displaySource   = routesMode ? ('routes' as const) : replayMode ? ('replay' as const) : ('live' as const)
  const displaySelected = replayMode ? null : selectedIcao24

  // Panel flight: live → selected flight; replay → CompletedFlight at selected index
  const panelFlight: Flight | null = useMemo(() => {
    if (replayMode) {
      if (replaySelectedIdx === null) return null
      const cf = completedFlights[replaySelectedIdx]
      if (!cf) return null
      const lastPos = cf.positions.length > 0 ? cf.positions[cf.positions.length - 1] : [0, 0]
      return {
        icao24: cf.icao24, callsign: cf.callsign, originCountry: '',
        longitude: lastPos[0], latitude: lastPos[1],
        altitude: 0, velocity: 0, heading: cf.lastHeading,
        verticalRate: 0, onGround: false, lastUpdate: cf.lastSeen * 1000,
      }
    }
    return displayFlights.find(f => f.icao24 === selectedIcao24) ?? null
  }, [replayMode, replaySelectedIdx, completedFlights, displayFlights, selectedIcao24])

  // Panel airports: replay gets them from CompletedFlight, live from useFlightRoutes
  const panelOrigin: Airport | undefined = replayMode
    ? (replaySelectedIdx !== null ? completedFlights[replaySelectedIdx]?.departureAirport ?? undefined : undefined)
    : (originAirport ?? undefined)

  const panelDest: Airport | undefined = replayMode
    ? (replaySelectedIdx !== null ? completedFlights[replaySelectedIdx]?.arrivalAirport ?? undefined : undefined)
    : (destinationAirport ?? undefined)

  const flightsWithPositions = useMemo(
    () => completedFlights.filter(cf => cf.positions.length > 0).length,
    [completedFlights]
  )

  return (
    <div className="flex flex-col h-full w-full bg-[#030a14] relative">
      <ControlPanel
        center={center}
        scale={scale}
        options={options}
        filterQuery={filterQuery}
        replayMode={replayMode}
        routesMode={routesMode}
        onCenterChange={setCenter}
        onScaleChange={setScale}
        onOptionsChange={handleOptionsChange}
        onFilterChange={setFilterQuery}
        onExport={() => exportRef.current?.()}
        onReplayToggle={() => {
          setReplayMode(m => { if (!m) { setRoutesMode(false); setRoutesSelectedIdx(null) }; return !m })
          setReplaySelectedIdx(null)
        }}
        onRoutesToggle={() => {
          setRoutesMode(m => { if (!m) { setReplayMode(false); setReplaySelectedIdx(null) }; return !m })
          setRoutesSelectedIdx(null)
        }}
      />
      <MapCanvas
        center={center}
        scale={scale}
        options={options}
        flights={displayFlights}
        airports={visibleAirports}
        trails={new Map()}
        selectedIcao24={displaySelected}
        onScaleChange={setScale}
        onFlightSelect={handleFlightSelect}
        onCenterChange={setCenter}
        flightStatesRef={flightStatesRef}
        dataSource={displaySource}
        exportRef={exportRef}
        fullTrack={replayMode ? null : fullTrack}
        destinationAirport={replayMode ? null : destinationAirport}
        completedFlights={replayMode ? completedFlights : undefined}
        replaySelectedIndex={replayMode ? replaySelectedIdx : null}
        onReplayFlightSelect={replayMode ? setReplaySelectedIdx : undefined}
        corridors={routesMode ? corridors : undefined}
        routesSelectedIndex={routesMode ? routesSelectedIdx : null}
        onRoutesCorridorSelect={routesMode ? setRoutesSelectedIdx : undefined}
      />

      {panelFlight && (
        <FlightInfoPanel
          flight={panelFlight}
          origin={panelOrigin}
          destination={panelDest}
          onClose={() => replayMode ? setReplaySelectedIdx(null) : handleFlightSelect(null)}
        />
      )}

      {routesMode && routesSelectedIdx !== null && corridors[routesSelectedIdx] && (
        <CorridorInfoPanel
          corridor={corridors[routesSelectedIdx]}
          onClose={() => setRoutesSelectedIdx(null)}
        />
      )}

      {replayMode && (
        <ReplayControls
          replayDate={replayDate}
          flightCount={completedFlights.length}
          flightsWithPositions={flightsWithPositions}
          loading={replayLoading}
          onDateChange={date => { setReplayDate(date); setReplaySelectedIdx(null) }}
          onClose={() => setReplayMode(false)}
        />
      )}

      <StatsBar
        center={center}
        scale={scale}
        flightCount={routesMode ? corridors.length : replayMode ? completedFlights.length : displayFlights.length}
        lastUpdate={lastUpdate}
        dataSource={displaySource}
        replayMode={replayMode}
        replayTime={null}
        openSkyError={replayMode ? null : openSkyError}
      />
    </div>
  )
}
