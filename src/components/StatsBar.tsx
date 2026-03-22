import type { ProjectionCenter, DataSource } from '@/types/index'

interface StatsBarProps {
  center: ProjectionCenter
  scale: number
  flightCount: number
  lastUpdate: number | null
  dataSource: DataSource
  replayMode?: boolean
  replayTime?: number | null
  openSkyError?: string | null
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

function formatReplayTime(unixSec: number): string {
  if (unixSec === 0) return '--:--:--'
  return new Date(unixSec * 1000).toUTCString().slice(17, 25) + ' UTC'
}

export default function StatsBar({
  center,
  scale,
  flightCount,
  lastUpdate,
  dataSource,
  replayMode = false,
  replayTime = null,
  openSkyError = null,
}: StatsBarProps) {
  const isRoutes  = dataSource === 'routes'
  const isReplay  = !isRoutes && (replayMode || dataSource === 'replay')
  const isOffline = !isReplay && !isRoutes && openSkyError !== null && flightCount === 0

  const sourceLabel = isRoutes ? 'ROUTES' : isReplay ? 'REPLAY' : (isOffline ? 'OFFLINE' : 'LIVE')
  const sourceColor = isRoutes ? 'text-[#c8dcff]' : isReplay ? 'text-[#ffcc00]' : (isOffline ? 'text-red-400' : 'text-green-400')
  const dotColor    = isRoutes ? 'bg-[#c8dcff]'   : isReplay ? 'bg-[#ffcc00]'   : (isOffline ? 'bg-red-400'   : 'bg-green-400')

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
        {isRoutes ? 'Corridors' : 'Vols'}: <span className="text-[#c0d8f0]">{flightCount}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className={sourceColor}>{sourceLabel}</span>
      </span>
      {isReplay && replayTime ? (
        <span>
          ⏱ <span className="text-[#ffcc00]">{formatReplayTime(replayTime)}</span>
        </span>
      ) : (
        <span>
          MAJ: <span className="text-[#c0d8f0]">{lastUpdate !== null ? formatTime(lastUpdate) : '---'}</span>
        </span>
      )}
      <span className="ml-auto text-[#1a3a5c]">
        AE FLIGHT RADAR — Phase 5
      </span>
    </div>
  )
}
