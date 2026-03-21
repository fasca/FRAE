'use client'

/**
 * ReplayControls — UI panel for the historical replay player.
 * Shows date picker, time slider, play/pause, speed selector, and flight count.
 */

interface ReplayControlsProps {
  replayDate: Date | null
  replayTime: number       // Unix timestamp (seconds)
  isPlaying: boolean
  speed: number
  flightCount: number
  loading: boolean
  onDateChange: (date: Date | null) => void
  onTimeChange: (time: number) => void
  onPlay: () => void
  onPause: () => void
  onSpeedChange: (speed: number) => void
  onClose: () => void
}

const SPEEDS = [1, 5, 10, 50] as const

function formatTimestamp(unixSec: number): string {
  if (unixSec === 0) return '--:--:--'
  const d = new Date(unixSec * 1000)
  return d.toUTCString().slice(17, 25)  // HH:MM:SS UTC
}

function getStartOfDay(date: Date): number {
  return Math.floor(
    new Date(date.toISOString().slice(0, 10) + 'T00:00:00Z').getTime() / 1000
  )
}

export default function ReplayControls({
  replayDate,
  replayTime,
  isPlaying,
  speed,
  flightCount,
  loading,
  onDateChange,
  onTimeChange,
  onPlay,
  onPause,
  onSpeedChange,
  onClose,
}: ReplayControlsProps) {
  const startOfDay = replayDate ? getStartOfDay(replayDate) : 0
  const sliderMax  = 86400  // seconds in a day
  const sliderVal  = replayDate ? replayTime - startOfDay : 0

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offset = parseInt(e.target.value, 10)
    if (replayDate) onTimeChange(startOfDay + offset)
  }

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) { onDateChange(null); return }
    onDateChange(new Date(val + 'T00:00:00Z'))
  }

  const dateStr = replayDate ? replayDate.toISOString().slice(0, 10) : ''

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[480px] bg-[#0a1628]/95 border border-[#00e5ff]/40 rounded text-xs font-mono text-[#c0d8f0] pointer-events-auto z-20 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a3a5c]">
        <span className="text-[#00e5ff] font-bold tracking-widest">⏪ REPLAY</span>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-[#4a7a9f] animate-pulse">loading…</span>
          )}
          <span className="text-[#4a7a9f]">
            {flightCount} vol{flightCount !== 1 ? 's' : ''}
          </span>
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
        {/* Date picker + time display */}
        <div className="flex items-center gap-3">
          <label className="text-[#4a7a9f]">Date:</label>
          <input
            type="date"
            value={dateStr}
            max={new Date().toISOString().slice(0, 10)}
            onChange={handleDateInput}
            className="bg-[#0d2a40] border border-[#1a3a5c] rounded px-2 py-0.5 text-[#c0d8f0] focus:outline-none focus:border-[#00e5ff]"
          />
          <span className="ml-auto text-[#ffcc00] tracking-widest">
            {formatTimestamp(replayTime)} UTC
          </span>
        </div>

        {/* Time slider */}
        <div className="flex items-center gap-2">
          <span className="text-[#4a7a9f] w-8">00:00</span>
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={60}
            value={sliderVal}
            disabled={!replayDate}
            onChange={handleSlider}
            className="flex-1 accent-[#00e5ff] cursor-pointer disabled:opacity-30"
          />
          <span className="text-[#4a7a9f] w-8">24:00</span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <button
            aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            disabled={!replayDate}
            onClick={isPlaying ? onPause : onPlay}
            className="px-3 py-1 rounded border border-[#00e5ff]/50 text-[#00e5ff] hover:bg-[#0d2a40] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <span className="text-[#4a7a9f] ml-2">Vitesse:</span>
          {SPEEDS.map(s => (
            <button
              key={s}
              aria-label={`${s}x speed`}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                speed === s
                  ? 'border-[#00e5ff] text-[#00e5ff] bg-[#0d2a40]'
                  : 'border-transparent text-[#4a7a9f] hover:text-[#c0d8f0] hover:border-[#1a3a5c]'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
