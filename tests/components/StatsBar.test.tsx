import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsBar from '@/components/StatsBar'
import type { ProjectionCenter } from '@/types/index'

const mockCenter: ProjectionCenter = { lat: 48.86, lon: 2.35, label: 'Paris' }

describe('StatsBar', () => {
  it('should_render_center_label_and_coordinates', () => {
    render(<StatsBar center={mockCenter} scale={250} flightCount={0} />)
    expect(screen.getByText(/Paris/)).toBeDefined()
  })

  it('should_render_zoom_value', () => {
    render(<StatsBar center={mockCenter} scale={250} flightCount={0} />)
    expect(screen.getByText(/250/)).toBeDefined()
  })

  it('should_render_flight_count', () => {
    render(<StatsBar center={mockCenter} scale={250} flightCount={80} />)
    expect(screen.getByText(/80/)).toBeDefined()
  })

  it('should_render_phase_2_indicator', () => {
    render(<StatsBar center={mockCenter} scale={250} flightCount={0} />)
    expect(screen.getByText(/Phase 2/i)).toBeDefined()
  })
})
