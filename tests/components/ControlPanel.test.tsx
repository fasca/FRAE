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

const defaultProps = {
  center: PREDEFINED_CENTERS[0],
  scale: DEFAULT_SCALE,
  options: defaultOptions,
  filterQuery: '',
  onCenterChange: vi.fn(),
  onScaleChange: vi.fn(),
  onOptionsChange: vi.fn(),
  onFilterChange: vi.fn(),
}

describe('ControlPanel', () => {
  it('should_render_all_predefined_center_buttons', () => {
    render(<ControlPanel {...defaultProps} />)
    for (const c of PREDEFINED_CENTERS) {
      expect(screen.getByText(c.label)).toBeDefined()
    }
  })

  it('should_call_onCenterChange_when_center_button_clicked', () => {
    const onCenterChange = vi.fn()
    render(<ControlPanel {...defaultProps} onCenterChange={onCenterChange} />)
    fireEvent.click(screen.getByText('Paris'))
    expect(onCenterChange).toHaveBeenCalledWith(PREDEFINED_CENTERS[1])
  })

  it('should_render_zoom_in_and_zoom_out_buttons', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByLabelText('Zoom in')).toBeDefined()
    expect(screen.getByLabelText('Zoom out')).toBeDefined()
  })

  it('should_call_onScaleChange_with_increased_scale_when_zoom_in_clicked', () => {
    const onScaleChange = vi.fn()
    render(<ControlPanel {...defaultProps} scale={250} onScaleChange={onScaleChange} />)
    fireEvent.click(screen.getByLabelText('Zoom in'))
    expect(onScaleChange).toHaveBeenCalled()
    const newScale = onScaleChange.mock.calls[0][0] as number
    expect(newScale).toBeGreaterThan(250)
  })

  it('should_call_onScaleChange_with_decreased_scale_when_zoom_out_clicked', () => {
    const onScaleChange = vi.fn()
    render(<ControlPanel {...defaultProps} scale={250} onScaleChange={onScaleChange} />)
    fireEvent.click(screen.getByLabelText('Zoom out'))
    expect(onScaleChange).toHaveBeenCalled()
    const newScale = onScaleChange.mock.calls[0][0] as number
    expect(newScale).toBeLessThan(250)
  })

  it('should_render_layer_toggle_buttons', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByLabelText('Toggle airports')).toBeDefined()
    expect(screen.getByLabelText('Toggle graticule')).toBeDefined()
    expect(screen.getByLabelText('Toggle country borders')).toBeDefined()
    expect(screen.getByLabelText('Toggle flight trails')).toBeDefined()
  })

  it('should_call_onOptionsChange_with_toggled_showAirports_when_airports_toggle_clicked', () => {
    const onOptionsChange = vi.fn()
    render(<ControlPanel {...defaultProps} onOptionsChange={onOptionsChange} />)
    fireEvent.click(screen.getByLabelText('Toggle airports'))
    expect(onOptionsChange).toHaveBeenCalledWith({ ...defaultOptions, showAirports: false })
  })

  it('should_render_filter_input', () => {
    render(<ControlPanel {...defaultProps} />)
    expect(screen.getByLabelText('Filter flights')).toBeDefined()
  })

  it('should_call_onFilterChange_when_filter_input_changes', () => {
    const onFilterChange = vi.fn()
    render(<ControlPanel {...defaultProps} onFilterChange={onFilterChange} />)
    fireEvent.change(screen.getByLabelText('Filter flights'), { target: { value: 'AF' } })
    expect(onFilterChange).toHaveBeenCalledWith('AF')
  })

  it('should_render_export_button_when_onExport_provided', () => {
    const onExport = vi.fn()
    render(<ControlPanel {...defaultProps} onExport={onExport} />)
    expect(screen.getByLabelText('Export PNG')).toBeDefined()
  })

  it('should_call_onExport_when_export_button_clicked', () => {
    const onExport = vi.fn()
    render(<ControlPanel {...defaultProps} onExport={onExport} />)
    fireEvent.click(screen.getByLabelText('Export PNG'))
    expect(onExport).toHaveBeenCalled()
  })
})
