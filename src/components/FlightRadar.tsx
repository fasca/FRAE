'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import MapCanvas from './MapCanvas'
import ControlPanel from './ControlPanel'
import StatsBar from './StatsBar'
import FlightInfoPanel from './FlightInfoPanel'
import ReplayControls from './ReplayControls'
import type { ProjectionCenter, MapOptions, Flight } from '@/types/index'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'
import { AIRPORTS } from '@/lib/airports'
import { useOpenSkyData } from '@/hooks/useOpenSkyData'
import { useFlightTrack } from '@/hooks/useFlightTrack'
import { useFlightRoutes } from '@/hooks/useFlightRoutes'
import { useReplayData, replayFlightToFlight } from '@/hooks/useReplayData'
import { filterFlights } from '@/lib/flights'

export default function FlightRadar() {
  const [center, setCenter] = useState<ProjectionCenter>(PREDEFINED_CENTERS[0])
  const [scale, setScale]   = useState<number>(DEFAULT_SCALE)
  const [options, setOptions] = useState<MapOptions>({
    showAirports: true,
    showGraticule: true,
    showCountryBorders: true,
    showFlightPaths: false,
  })
  const [selectedIcao24, setSelectedIcao24] = useState<string | null>(null)
  const [filterQuery, setFilterQuery]       = useState('')
  const [replayMode, setReplayMode]         = useState(false)
  const [replayDate, setReplayDate]         = useState<Date | null>(null)
  const exportRef = useRef<(() => void) | null>(null)

  // Live data
  const { flightStatesRef, flights, trailsRef, dataSource, lastUpdate } = useOpenSkyData()

  // Full track from DB / OpenSky /tracks when a flight is selected
  const { fullTrack } = useFlightTrack(selectedIcao24)

  // Route lookup (origin + destination airports)
  const selectedFlight = flights.find(f => f.icao24 === selectedIcao24) ?? null
  const { originAirport, destinationAirport } = useFlightRoutes(
    selectedFlight?.callsign ?? null
  )

  // Replay data
  const {
    replayFlights,
    replayTime,
    isPlaying,
    speed,
    loading: replayLoading,
    setReplayTime,
    play,
    pause,
    setSpeed,
  } = useReplayData(replayMode ? replayDate : null)

  const handleFlightSelect = useCallback((icao24: string | null) => {
    setSelectedIcao24(icao24)
  }, [])

  const handleOptionsChange = useCallback((newOptions: MapOptions) => {
    setOptions(newOptions)
  }, [])

  // In replay mode: convert ReplayFlight → Flight for renderer compatibility
  const replayAsFlights: readonly Flight[] = useMemo(
    () => replayFlights.map(replayFlightToFlight),
    [replayFlights]
  )

  // Build replay trails map (useMemo avoids creating a new Map every render)
  const replayTrails = useMemo(
    () => new Map(replayFlights.map(rf => [rf.icao24, rf.trail])),
    [replayFlights]
  )

  const displayFlights = replayMode ? replayAsFlights : filterFlights(flights, filterQuery)
  const displaySource   = replayMode ? 'replay' : dataSource
  const displaySelected = replayMode ? null : selectedIcao24

  const panelFlight = replayMode
    ? null
    : (displayFlights.find(f => f.icao24 === selectedIcao24) ?? null)

  return (
    <div className="flex flex-col h-full w-full bg-[#030a14] relative">
      <ControlPanel
        center={center}
        scale={scale}
        options={options}
        filterQuery={filterQuery}
        replayMode={replayMode}
        onCenterChange={setCenter}
        onScaleChange={setScale}
        onOptionsChange={handleOptionsChange}
        onFilterChange={setFilterQuery}
        onExport={() => exportRef.current?.()}
        onReplayToggle={() => setReplayMode(m => !m)}
      />
      <MapCanvas
        center={center}
        scale={scale}
        options={options}
        flights={displayFlights}
        airports={AIRPORTS}
        // eslint-disable-next-line react-hooks/refs
        trails={replayMode ? replayTrails : trailsRef.current}
        selectedIcao24={displaySelected}
        onScaleChange={setScale}
        onFlightSelect={handleFlightSelect}
        onCenterChange={setCenter}
        flightStatesRef={flightStatesRef}
        dataSource={displaySource}
        exportRef={exportRef}
        fullTrack={replayMode ? null : fullTrack}
        destinationAirport={replayMode ? null : destinationAirport}
      />

      {panelFlight && selectedIcao24 && (
        <FlightInfoPanel
          flight={panelFlight}
          origin={originAirport ?? undefined}
          destination={destinationAirport ?? undefined}
          onClose={() => handleFlightSelect(null)}
        />
      )}

      {replayMode && (
        <ReplayControls
          replayDate={replayDate}
          replayTime={replayTime}
          isPlaying={isPlaying}
          speed={speed}
          flightCount={replayFlights.length}
          loading={replayLoading}
          onDateChange={setReplayDate}
          onTimeChange={setReplayTime}
          onPlay={play}
          onPause={pause}
          onSpeedChange={setSpeed}
          onClose={() => setReplayMode(false)}
        />
      )}

      <StatsBar
        center={center}
        scale={scale}
        flightCount={displayFlights.length}
        lastUpdate={lastUpdate}
        dataSource={displaySource}
        replayMode={replayMode}
        replayTime={replayMode ? replayTime : null}
      />
    </div>
  )
}
