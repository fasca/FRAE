import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ControlPanel from '@/components/ControlPanel'
import { PREDEFINED_CENTERS, DEFAULT_SCALE } from '@/lib/projection'
import type { MapOptions } from '@/types/index'

const defaultOptions: MapOptions = {
  showAirports: true,
  showGraticule: true,
  showCountryBorders: true,
  showFlightPaths: false,
}

describe('ControlPanel', () => {
  it('should_render_all_predefined_center_buttons', () => {
    render(
      <ControlPanel
        center={PREDEFINED_CENTERS[0]}
        scale={DEFAULT_SCALE}
        options={defaultOptions}
        onCenterChange={vi.fn()}
        onScaleChange={vi.fn()}
        onOptionsChange={vi.fn()}
      />
    )
    for (const c of PREDEFINED_CENTERS) {
      expect(screen.getByText(c.label)).toBeDefined()
    }
  })

  it('should_call_onCenterChange_when_center_button_clicked', () => {
    const onCenterChange = vi.fn()
    render(
      <ControlPanel
        center={PREDEFINED_CENTERS[0]}
        scale={DEFAULT_SCALE}
        options={defaultOptions}
        onCenterChange={onCenterChange}
        onScaleChange={vi.fn()}
        onOptionsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Paris'))
    expect(onCenterChange).toHaveBeenCalledWith(PREDEFINED_CENTERS[1])
  })

  it('should_render_zoom_in_and_zoom_out_buttons', () => {
    render(
      <ControlPanel
        center={PREDEFINED_CENTERS[0]}
        scale={DEFAULT_SCALE}
        options={defaultOptions}
        onCenterChange={vi.fn()}
        onScaleChange={vi.fn()}
        onOptionsChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Zoom in')).toBeDefined()
    expect(screen.getByLabelText('Zoom out')).toBeDefined()
  })

  it('should_call_onScaleChange_with_increased_scale_when_zoom_in_clicked', () => {
    const onScaleChange = vi.fn()
    render(
      <ControlPanel
        center={PREDEFINED_CENTERS[0]}
        scale={250}
        options={defaultOptions}
        onCenterChange={vi.fn()}
        onScaleChange={onScaleChange}
        onOptionsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Zoom in'))
    expect(onScaleChange).toHaveBeenCalled()
    const newScale = onScaleChange.mock.calls[0][0] as number
    expect(newScale).toBeGreaterThan(250)
  })

  it('should_call_onScaleChange_with_decreased_scale_when_zoom_out_clicked', () => {
    const onScaleChange = vi.fn()
    render(
      <ControlPanel
        center={PREDEFINED_CENTERS[0]}
        scale={250}
        options={defaultOptions}
        onCenterChange={vi.fn()}
        onScaleChange={onScaleChange}
        onOptionsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Zoom out'))
    expect(onScaleChange).toHaveBeenCalled()
    const newScale = onScaleChange.mock.calls[0][0] as number
    expect(newScale).toBeLessThan(250)
  })
})
