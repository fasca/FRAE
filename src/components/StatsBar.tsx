import type { ProjectionCenter, DataSource } from '@/types/index'

interface StatsBarProps {
  center: ProjectionCenter
  scale: number
  flightCount: number
  lastUpdate: number | null
  dataSource: DataSource
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

export default function StatsBar({ center, scale, flightCount, lastUpdate, dataSource }: StatsBarProps) {
  const isLive = dataSource === 'live'

  return (
    <div className="flex items-center gap-6 px-4 py-1 bg-[#0a1628] border-t border-[#1a3a5c] shrink-0 text-xs text-[#4a7a9f]">
      <span>
        Centre: <span className="text-[#c0d8f0]">{center.label}</span>
        {' '}({center.lat.toFixed(2)}°, {center.lon.toFixed(2)}°)
      </span>
      <span>
        Zoom: <span className="text-[#c0d8f0]">{scale}</span>
      </span>
      <span>
        Vols: <span className="text-[#c0d8f0]">{flightCount}</span>
      </span>
      <span className="flex items-center gap-1">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-orange-400'}`}
        />
        <span className={isLive ? 'text-green-400' : 'text-orange-400'}>
          {isLive ? 'LIVE' : 'SIM'}
        </span>
      </span>
      <span>
        MAJ: <span className="text-[#c0d8f0]">{lastUpdate !== null ? formatTime(lastUpdate) : '---'}</span>
      </span>
      <span className="ml-auto text-[#1a3a5c]">
        AE FLIGHT RADAR — Phase 4
      </span>
    </div>
  )
}
