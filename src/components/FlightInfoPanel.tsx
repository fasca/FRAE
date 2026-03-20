'use client'

import type { Flight, Airport } from '@/types/index'

interface FlightInfoPanelProps {
  flight: Flight
  origin?: Airport
  destination?: Airport
  onClose: () => void
}

function metersToFeet(m: number): number {
  return Math.round(m * 3.281)
}

function msToKnots(ms: number): number {
  return Math.round(ms * 1.944)
}

export default function FlightInfoPanel({
  flight,
  origin,
  destination,
  onClose,
}: FlightInfoPanelProps) {
  const altFt = metersToFeet(flight.altitude)
  const speedKts = msToKnots(flight.velocity)

  return (
    <div className="absolute bottom-8 right-4 w-64 bg-[#0a1628]/90 border border-[#00e5ff]/30 rounded text-xs font-mono text-[#c0d8f0] pointer-events-auto z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a3a5c]">
        <span className="text-[#00e5ff] text-sm font-bold tracking-widest">
          {flight.callsign}
        </span>
        <button
          aria-label="Close"
          onClick={onClose}
          className="text-[#4a7a9f] hover:text-[#c0d8f0] transition-colors ml-2"
        >
          ×
        </button>
      </div>

      {/* Route */}
      <div className="px-3 py-1 border-b border-[#1a3a5c]">
        <span className="text-[#4a7a9f]">Route: </span>
        <span>{origin?.code ?? 'Unknown'}</span>
        <span className="text-[#4a7a9f]"> → </span>
        <span>{destination?.code ?? 'Unknown'}</span>
      </div>

      {/* Details */}
      <div className="px-3 py-2 space-y-1">
        <div>
          <span className="text-[#4a7a9f]">Alt: </span>
          {flight.altitude.toLocaleString()} m / {altFt.toLocaleString()} ft
        </div>
        <div>
          <span className="text-[#4a7a9f]">Speed: </span>
          {Math.round(flight.velocity)} m/s / {speedKts} kts
        </div>
        <div>
          <span className="text-[#4a7a9f]">Heading: </span>
          {Math.round(flight.heading)}°
        </div>
        <div>
          <span className="text-[#4a7a9f]">Country: </span>
          {flight.originCountry}
        </div>
      </div>
    </div>
  )
}
