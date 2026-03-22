'use client'

/**
 * ReplayControls — date picker and stats panel for replay mode.
 * Removed: time slider, play/pause, speed selector.
 */

interface ReplayControlsProps {
  replayDate: Date | null
  flightCount: number
  flightsWithPositions: number
  loading: boolean
  onDateChange: (date: Date | null) => void
  onClose: () => void
}

export default function ReplayControls({
  replayDate,
  flightCount,
  flightsWithPositions,
  loading,
  onDateChange,
  onClose,
}: ReplayControlsProps) {
  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) { onDateChange(null); return }
    onDateChange(new Date(val + 'T00:00:00Z'))
  }

  const dateStr = replayDate ? replayDate.toISOString().slice(0, 10) : ''
  const today   = new Date().toISOString().slice(0, 10)

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[400px] bg-[#0a1628]/95 border border-[#00e5ff]/40 rounded text-xs font-mono text-[#c0d8f0] pointer-events-auto z-20 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a3a5c]">
        <span className="text-[#00e5ff] font-bold tracking-widest">⏪ REPLAY</span>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[#4a7a9f] animate-pulse">chargement…</span>}
          <button
            aria-label="Close replay"
            onClick={onClose}
            className="text-[#4a7a9f] hover:text-[#c0d8f0] transition-colors ml-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Date picker */}
        <div className="flex items-center gap-3">
          <label className="text-[#4a7a9f]">Date:</label>
          <input
            type="date"
            value={dateStr}
            max={today}
            onChange={handleDateInput}
            className="bg-[#0d2a40] border border-[#1a3a5c] rounded px-2 py-0.5 text-[#c0d8f0] focus:outline-none focus:border-[#00e5ff]"
          />
        </div>

        {/* Stats — only shown after a date is selected and loaded */}
        {replayDate && !loading && flightCount > 0 && (
          <div className="text-[#4a7a9f]">
            <span className="text-[#c0d8f0]">{flightsWithPositions}</span> vols avec trajectoire
            {' / '}
            <span className="text-[#c0d8f0]">{flightCount}</span> vols total
          </div>
        )}
        {replayDate && !loading && flightCount === 0 && (
          <div className="text-[#4a7a9f]">Aucun vol enregistré pour cette date.</div>
        )}
      </div>
    </div>
  )
}
