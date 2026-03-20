import type { ProjectionCenter } from '@/types/index'

interface StatsBarProps {
  center: ProjectionCenter
  scale: number
}

export default function StatsBar({ center, scale }: StatsBarProps) {
  return (
    <div className="flex items-center gap-6 px-4 py-1 bg-[#0a1628] border-t border-[#1a3a5c] shrink-0 text-xs text-[#4a7a9f]">
      <span>
        Centre: <span className="text-[#c0d8f0]">{center.label}</span>
        {' '}({center.lat.toFixed(2)}°, {center.lon.toFixed(2)}°)
      </span>
      <span>
        Zoom: <span className="text-[#c0d8f0]">{scale}</span>
      </span>
      <span className="ml-auto text-[#1a3a5c]">
        AE FLIGHT RADAR — Phase 1
      </span>
    </div>
  )
}
