'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import MapCanvas from './MapCanvas'
import ControlPanel from './ControlPanel'
import StatsBar from './StatsBar'
import FlightInfoPanel from './FlightInfoPanel'
import type { ProjectionCenter, MapOptions, Flight, SimulatedFlight } from '@/types/index'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'
import { AIRPORTS } from '@/lib/airports'
import {
  generateSimulatedFlights,
  updateSimulatedFlights,
  simulatedFlightToFlight,
  interpolatePosition,
} from '@/lib/flights'
import { TRAIL_LENGTH } from '@/lib/renderer'

const FLIGHT_COUNT = 80
const UPDATE_INTERVAL_MS = 1000

export default function FlightRadar() {
  const [center, setCenter] = useState<ProjectionCenter>(PREDEFINED_CENTERS[0])
  const [scale, setScale] = useState<number>(DEFAULT_SCALE)
  const [options, setOptions] = useState<MapOptions>({
    showAirports: true,
    showGraticule: true,
    showCountryBorders: true,
    showFlightPaths: false,
  })
  const [flights, setFlights] = useState<readonly Flight[]>([])
  const [selectedIcao24, setSelectedIcao24] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<{ origin: SimulatedFlight['origin']; destination: SimulatedFlight['destination'] } | null>(null)

  const simulatedFlightsRef = useRef<SimulatedFlight[]>([])
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map())

  // Initialize simulation on mount
  useEffect(() => {
    simulatedFlightsRef.current = generateSimulatedFlights(FLIGHT_COUNT)
    const converted = simulatedFlightsRef.current.map(simulatedFlightToFlight)
    setFlights(converted)
  }, [])

  // Update simulation every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      simulatedFlightsRef.current = updateSimulatedFlights(
        simulatedFlightsRef.current,
        now
      )
      // Accumulate trails (push new position, trim to TRAIL_LENGTH)
      for (const sim of simulatedFlightsRef.current) {
        const pos = interpolatePosition(sim.origin, sim.destination, sim.progress)
        const trail = trailsRef.current.get(sim.icao24) ?? []
        trail.push(pos)
        if (trail.length > TRAIL_LENGTH) trail.shift()
        trailsRef.current.set(sim.icao24, trail)
      }
      const converted = simulatedFlightsRef.current.map(simulatedFlightToFlight)
      setFlights(converted)
    }, UPDATE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleFlightSelect = useCallback((icao24: string | null) => {
    setSelectedIcao24(icao24)
    if (icao24) {
      const sim = simulatedFlightsRef.current.find(s => s.icao24 === icao24)
      setSelectedRoute(sim ? { origin: sim.origin, destination: sim.destination } : null)
    } else {
      setSelectedRoute(null)
    }
  }, [])

  const handleOptionsChange = useCallback((newOptions: MapOptions) => {
    setOptions(newOptions)
  }, [])

  const selectedFlight = flights.find(f => f.icao24 === selectedIcao24)

  // Snapshot trails ref outside JSX to satisfy react-hooks/refs lint rule.
  // Trails are intentionally stored in a ref (not state) to avoid re-renders on every trail update.
  // eslint-disable-next-line react-hooks/refs -- trails are mutable ref data read once per render
  const trails = trailsRef.current

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
        trails={trails}
        selectedIcao24={selectedIcao24}
        onScaleChange={setScale}
        onFlightSelect={handleFlightSelect}
      />
      {selectedFlight && selectedIcao24 && (
        <FlightInfoPanel
          flight={selectedFlight}
          origin={selectedRoute?.origin}
          destination={selectedRoute?.destination}
          onClose={() => setSelectedIcao24(null)}
        />
      )}
      <StatsBar
        center={center}
        scale={scale}
        flightCount={flights.length}
      />
    </div>
  )
}
