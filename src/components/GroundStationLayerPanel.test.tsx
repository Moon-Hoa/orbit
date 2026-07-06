import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GROUND_STATION_CATEGORIES } from '../groundStations'
import { GroundStationLayerPanel } from './GroundStationLayerPanel'

describe('GroundStationLayerPanel', () => {
  it('lists every ground station category, unchecked by default', () => {
    render(<GroundStationLayerPanel visibleCategoryIds={new Set()} onToggleCategory={vi.fn()} />)

    for (const category of GROUND_STATION_CATEGORIES) {
      expect(screen.getByText(category.label)).toBeInTheDocument()
    }
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked()
    }
  })

  it('reflects visibleCategoryIds as checked', () => {
    render(
      <GroundStationLayerPanel visibleCategoryIds={new Set(['estrack'])} onToggleCategory={vi.fn()} />,
    )

    const estrackRow = screen.getByText('ESA Estrack').closest('label')
    expect(estrackRow?.querySelector('input[type="checkbox"]')).toBeChecked()
  })

  it('calls onToggleCategory when a checkbox is clicked', () => {
    const onToggleCategory = vi.fn()
    render(<GroundStationLayerPanel visibleCategoryIds={new Set()} onToggleCategory={onToggleCategory} />)

    const estrackRow = screen.getByText('ESA Estrack').closest('label')
    fireEvent.click(estrackRow!.querySelector('input[type="checkbox"]')!)

    expect(onToggleCategory).toHaveBeenCalledWith('estrack', true)
  })
})
