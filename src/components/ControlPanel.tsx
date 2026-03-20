'use client'

import { PREDEFINED_CENTERS, clampScale } from '@/lib/projection'
import type { ProjectionCenter, MapOptions } from '@/types/index'

const ZOOM_STEP = 50

interface ControlPanelProps {
  center: ProjectionCenter
  scale: number
  options: MapOptions
  filterQuery: string
  onCenterChange: (center: ProjectionCenter) => void
  onScaleChange: (scale: number) => void
  onOptionsChange: (options: MapOptions) => void
  onFilterChange: (query: string) => void
  onExport?: () => void
}

interface ToggleButtonProps {
  active: boolean
  label: string
  ariaLabel: string
  onClick: () => void
}

function ToggleButton({ active, label, ariaLabel, onClick }: ToggleButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded border transition-colors ${
        active
          ? 'bg-[#0d2a40] text-[#00e5ff] border-[#00e5ff]'
          : 'text-[#4a7a9f] border-transparent hover:text-[#c0d8f0] hover:border-[#1a3a5c]'
      }`}
    >
      {label}
    </button>
  )
}

export default function ControlPanel({
  center,
  scale,
  options,
  filterQuery,
  onCenterChange,
  onScaleChange,
  onOptionsChange,
  onFilterChange,
  onExport,
}: ControlPanelProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#0a1628] border-b border-[#1a3a5c] shrink-0 flex-wrap">
      <span className="text-[#00e5ff] font-bold mr-2 tracking-widest text-sm">
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

      <div className="flex gap-1 ml-2">
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

      <div className="flex gap-1 ml-2 border-l border-[#1a3a5c] pl-2">
        <ToggleButton
          active={options.showAirports}
          label="Aéro"
          ariaLabel="Toggle airports"
          onClick={() => onOptionsChange({ ...options, showAirports: !options.showAirports })}
        />
        <ToggleButton
          active={options.showGraticule}
          label="Grille"
          ariaLabel="Toggle graticule"
          onClick={() => onOptionsChange({ ...options, showGraticule: !options.showGraticule })}
        />
        <ToggleButton
          active={options.showCountryBorders}
          label="Pays"
          ariaLabel="Toggle country borders"
          onClick={() => onOptionsChange({ ...options, showCountryBorders: !options.showCountryBorders })}
        />
        <ToggleButton
          active={options.showFlightPaths}
          label="Traînées"
          ariaLabel="Toggle flight trails"
          onClick={() => onOptionsChange({ ...options, showFlightPaths: !options.showFlightPaths })}
        />
      </div>

      <div className="flex items-center gap-2 ml-2 border-l border-[#1a3a5c] pl-2">
        <input
          type="text"
          aria-label="Filter flights"
          placeholder="Filtrer callsign / pays..."
          value={filterQuery}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-2 py-1 text-xs bg-[#0a1628] border border-[#1a3a5c] rounded text-[#c0d8f0] placeholder-[#4a7a9f] focus:outline-none focus:border-[#00e5ff] w-40"
        />
        {onExport && (
          <button
            aria-label="Export PNG"
            onClick={onExport}
            className="px-2 py-1 text-xs text-[#4a7a9f] border border-transparent rounded hover:text-[#c0d8f0] hover:border-[#1a3a5c] transition-colors"
          >
            PNG
          </button>
        )}
      </div>
    </div>
  )
}
