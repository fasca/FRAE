'use client'

import type { RouteCorridor } from '@/types/index'

interface CorridorInfoPanelProps {
  corridor: RouteCorridor
  onClose: () => void
}

export default function CorridorInfoPanel({ corridor, onClose }: CorridorInfoPanelProps) {
  const { departureAirport, arrivalAirport, departureIcao, arrivalIcao, flightCount, callsigns, sampleTracks } = corridor

  return (
    <div className="absolute bottom-8 right-4 w-64 bg-[#0a1628]/90 border border-[#c8dcff]/30 rounded text-xs font-mono text-[#c0d8f0] pointer-events-auto z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a3a5c]">
        <span className="text-[#c8dcff] text-sm font-bold tracking-widest">
          {departureIcao} → {arrivalIcao}
        </span>
        <button
          aria-label="Close corridor info"
          onClick={onClose}
          className="text-[#4a7a9f] hover:text-[#c0d8f0] transition-colors ml-2"
        >
          ×
        </button>
      </div>

      {/* Airport names */}
      <div className="px-3 py-2 space-y-1 border-b border-[#1a3a5c]">
        <div>
          <span className="text-[#4a7a9f]">Départ: </span>
          {departureAirport
            ? <>{departureAirport.code} — {departureAirport.name}</>
            : departureIcao}
        </div>
        <div>
          <span className="text-[#4a7a9f]">Arrivée: </span>
          {arrivalAirport
            ? <>{arrivalAirport.code} — {arrivalAirport.name}</>
            : arrivalIcao}
        </div>
      </div>

      {/* Stats */}
      <div className="px-3 py-2 space-y-1">
        <div>
          <span className="text-[#4a7a9f]">Vols: </span>
          <span className="text-[#c8dcff] font-bold">{flightCount}</span>
        </div>
        {sampleTracks.length > 0 && (
          <div>
            <span className="text-[#4a7a9f]">Traces: </span>
            {sampleTracks.length} trajectoire{sampleTracks.length > 1 ? 's' : ''}
          </div>
        )}
        {callsigns.length > 0 && (
          <div>
            <span className="text-[#4a7a9f]">Callsigns: </span>
            <span className="text-[#8aa0bc]">{callsigns.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
