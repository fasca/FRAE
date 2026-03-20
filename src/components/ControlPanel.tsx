'use client'

import { PREDEFINED_CENTERS, clampScale } from '@/lib/projection'
import type { ProjectionCenter, MapOptions } from '@/types/index'

const ZOOM_STEP = 50

interface ControlPanelProps {
  center: ProjectionCenter
  scale: number
  options: MapOptions
  onCenterChange: (center: ProjectionCenter) => void
  onScaleChange: (scale: number) => void
  onOptionsChange: (options: MapOptions) => void
}

export default function ControlPanel({
  center,
  scale,
  options: _options,
  onCenterChange,
  onScaleChange,
  onOptionsChange: _onOptionsChange,
}: ControlPanelProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#0a1628] border-b border-[#1a3a5c] shrink-0">
      <span className="text-[#00e5ff] font-bold mr-4 tracking-widest text-sm">
        ✈ AE FLIGHT RADAR
      </span>

      <div className="flex gap-1">
        {PREDEFINED_CENTERS.map((c) => (
          <button
            key={c.label}
            onClick={() => onCenterChange(c)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              center.label === c.label
                ? 'bg-[#1a3a5c] text-[#00e5ff] border-[#00e5ff]'
                : 'text-[#4a7a9f] border-transparent hover:text-[#c0d8f0] hover:border-[#1a3a5c]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 ml-4">
        <button
          aria-label="Zoom in"
          onClick={() => onScaleChange(clampScale(scale + ZOOM_STEP))}
          className="px-3 py-1 text-sm text-[#c0d8f0] border border-[#1a3a5c] rounded hover:text-[#00e5ff] hover:border-[#00e5ff] transition-colors"
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => onScaleChange(clampScale(scale - ZOOM_STEP))}
          className="px-3 py-1 text-sm text-[#c0d8f0] border border-[#1a3a5c] rounded hover:text-[#00e5ff] hover:border-[#00e5ff] transition-colors"
        >
          −
        </button>
      </div>
    </div>
  )
}
