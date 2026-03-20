import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import MapCanvas from '@/components/MapCanvas'
import type { ProjectionCenter, MapOptions, Flight, Airport } from '@/types/index'

// jsdom doesn't have ResizeObserver — provide a no-op stub
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

// jsdom doesn't support canvas — provide minimal stubs
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue({
    scale: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    clip: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    font: '',
  }),
  configurable: true,
})

const mockCenter: ProjectionCenter = { lat: 90, lon: 0, label: 'Pôle Nord' }
const mockOptions: MapOptions = {
  showAirports: true,
  showGraticule: true,
  showCountryBorders: true,
  showFlightPaths: false,
}
const mockFlights: readonly Flight[] = []
const mockAirports: readonly Airport[] = []
const mockTrails = new Map<string, [number, number][]>()

afterEach(() => {
  cleanup()
})

describe('MapCanvas', () => {
  it('should_render_a_canvas_element', () => {
    const { container } = render(
      <MapCanvas
        center={mockCenter}
        scale={250}
        options={mockOptions}
        flights={mockFlights}
        airports={mockAirports}
        trails={mockTrails}
        selectedIcao24={null}
        onScaleChange={vi.fn()}
        onFlightSelect={vi.fn()}
      />
    )
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('should_have_crosshair_cursor', () => {
    const { container } = render(
      <MapCanvas
        center={mockCenter}
        scale={250}
        options={mockOptions}
        flights={mockFlights}
        airports={mockAirports}
        trails={mockTrails}
        selectedIcao24={null}
        onScaleChange={vi.fn()}
        onFlightSelect={vi.fn()}
      />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas?.className).toContain('cursor-crosshair')
  })

  it('should_cancel_animation_frame_on_unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const { unmount } = render(
      <MapCanvas
        center={mockCenter}
        scale={250}
        options={mockOptions}
        flights={mockFlights}
        airports={mockAirports}
        trails={mockTrails}
        selectedIcao24={null}
        onScaleChange={vi.fn()}
        onFlightSelect={vi.fn()}
      />
    )
    unmount()
    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })

  it('should_accept_all_new_props_without_error', () => {
    const mockFlight: Flight = {
      icao24: 'abc123',
      callsign: 'AF1234',
      originCountry: 'France',
      longitude: 2.55,
      latitude: 49.01,
      altitude: 10000,
      velocity: 250,
      heading: 90,
      verticalRate: 0,
      onGround: false,
      lastUpdate: Date.now(),
    }
    const mockAirport: Airport = { code: 'CDG', name: 'Paris Charles de Gaulle', lat: 49.01, lon: 2.55 }
    const trails = new Map<string, [number, number][]>([['abc123', [[2.55, 49.01]]]])

    expect(() => {
      render(
        <MapCanvas
          center={{ lat: 90, lon: 0, label: 'Pôle Nord' }}
          scale={250}
          options={{ showAirports: true, showGraticule: true, showCountryBorders: true, showFlightPaths: false }}
          flights={[mockFlight]}
          airports={[mockAirport]}
          trails={trails}
          selectedIcao24="abc123"
          onScaleChange={vi.fn()}
          onFlightSelect={vi.fn()}
        />
      )
    }).not.toThrow()
  })
})
