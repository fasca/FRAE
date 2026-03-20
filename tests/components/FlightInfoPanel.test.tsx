import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FlightInfoPanel from '@/components/FlightInfoPanel'
import type { Flight, Airport } from '@/types/index'

const mockFlight: Flight = {
  icao24: 'abc123',
  callsign: 'AF1234',
  originCountry: 'France',
  longitude: 2.55,
  latitude: 49.01,
  altitude: 10500,
  velocity: 245,
  heading: 285,
  verticalRate: 0,
  onGround: false,
  lastUpdate: Date.now(),
}

const mockOrigin: Airport = { code: 'CDG', name: 'Paris Charles de Gaulle', lat: 49.01, lon: 2.55 }
const mockDestination: Airport = { code: 'JFK', name: 'New York JFK', lat: 40.64, lon: -73.78 }

describe('FlightInfoPanel', () => {
  it('should_render_callsign', () => {
    render(<FlightInfoPanel flight={mockFlight} onClose={vi.fn()} />)
    expect(screen.getByText('AF1234')).toBeDefined()
  })

  it('should_render_altitude_in_meters', () => {
    render(<FlightInfoPanel flight={mockFlight} onClose={vi.fn()} />)
    // Should display altitude in some form (meters or feet)
    expect(screen.getByText(/10500|10,500/)).toBeDefined()
  })

  it('should_render_origin_and_destination_when_provided', () => {
    render(
      <FlightInfoPanel
        flight={mockFlight}
        origin={mockOrigin}
        destination={mockDestination}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/CDG/)).toBeDefined()
    expect(screen.getByText(/JFK/)).toBeDefined()
  })

  it('should_show_unknown_when_origin_or_destination_missing', () => {
    render(<FlightInfoPanel flight={mockFlight} onClose={vi.fn()} />)
    const unknownElements = screen.getAllByText(/Unknown/i)
    expect(unknownElements.length).toBeGreaterThan(0)
  })

  it('should_call_onClose_when_close_button_clicked', () => {
    const onClose = vi.fn()
    render(<FlightInfoPanel flight={mockFlight} onClose={onClose} />)
    const closeButton = screen.getByRole('button', { name: /close|×|x/i })
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
