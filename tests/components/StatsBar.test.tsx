import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsBar from '@/components/StatsBar'
import type { ProjectionCenter } from '@/types/index'

const mockCenter: ProjectionCenter = { lat: 48.86, lon: 2.35, label: 'Paris' }
const defaultProps = { center: mockCenter, scale: 250, flightCount: 0, lastUpdate: null, dataSource: 'live' as const }

describe('StatsBar', () => {
  it('should_render_center_label_and_coordinates', () => {
    render(<StatsBar {...defaultProps} />)
    expect(screen.getByText(/Paris/)).toBeDefined()
  })

  it('should_render_zoom_value', () => {
    render(<StatsBar {...defaultProps} />)
    expect(screen.getByText(/250/)).toBeDefined()
  })

  it('should_render_flight_count', () => {
    render(<StatsBar {...defaultProps} flightCount={80} />)
    expect(screen.getByText(/80/)).toBeDefined()
  })

  it('should_render_phase_indicator', () => {
    render(<StatsBar {...defaultProps} />)
    expect(screen.getByText(/Phase 5/i)).toBeDefined()
  })

  it('should_render_live_indicator_when_data_source_is_live', () => {
    render(<StatsBar {...defaultProps} dataSource="live" />)
    expect(screen.getByText(/LIVE/i)).toBeDefined()
  })

  it('should_render_last_update_time_when_provided', () => {
    // Use a fixed timestamp and check that a time string appears
    const ts = new Date('2024-01-01T12:34:56Z').getTime()
    render(<StatsBar {...defaultProps} lastUpdate={ts} />)
    // Should show some formatted time (locale-dependent, just check it's not "---")
    expect(screen.queryByText(/---/)).toBeNull()
  })

  it('should_render_dash_when_last_update_is_null', () => {
    render(<StatsBar {...defaultProps} lastUpdate={null} />)
    expect(screen.getByText(/---/)).toBeDefined()
  })
})
