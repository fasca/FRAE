import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import MapCanvas from '@/components/MapCanvas'
import type { MutableRefObject } from 'react'
import type { ProjectionCenter, MapOptions, Flight, Airport, FlightState } from '@/types/index'

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

const mockFlightState = (icao24 = 'abc123'): FlightState => ({
  current: {
    icao24, callsign: 'AF1', originCountry: 'France',
    longitude: 2.5, latitude: 49.0, altitude: 11000,
    velocity: 250, heading: 90, verticalRate: 0, onGround: false, lastUpdate: Date.now(),
  },
  previous: null,
  lastFetchTime: Date.now(),
})

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

  it('should_accept_flightStatesRef_and_dataSource_live_without_error', () => {
    const flightStatesRef: MutableRefObject<Map<string, FlightState>> = {
      current: new Map([['abc123', mockFlightState()]]),
    }
    expect(() => {
      render(
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
          flightStatesRef={flightStatesRef}
          dataSource="live"
        />
      )
    }).not.toThrow()
  })

  it('should_accept_dataSource_simulated_without_error', () => {
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
    expect(() => {
      render(
        <MapCanvas
          center={mockCenter}
          scale={250}
          options={mockOptions}
          flights={[mockFlight]}
          airports={mockAirports}
          trails={mockTrails}
          selectedIcao24={null}
          onScaleChange={vi.fn()}
          onFlightSelect={vi.fn()}
          dataSource="simulated"
        />
      )
    }).not.toThrow()
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

  it('should_accept_onCenterChange_prop_without_error', () => {
    expect(() => {
      render(
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
          onCenterChange={vi.fn()}
        />
      )
    }).not.toThrow()
  })

  it('should_accept_exportRef_prop_without_error', () => {
    const exportRef = { current: null }
    expect(() => {
      render(
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
          exportRef={exportRef}
        />
      )
    }).not.toThrow()
  })

  it('should_call_onFlightSelect_with_null_on_pointerup_with_no_nearby_flight', () => {
    const onFlightSelect = vi.fn()
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
        onFlightSelect={onFlightSelect}
      />
    )
    const canvas = container.querySelector('canvas')!
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 100, bubbles: true }))
    expect(onFlightSelect).toHaveBeenCalledWith(null)
  })
})
