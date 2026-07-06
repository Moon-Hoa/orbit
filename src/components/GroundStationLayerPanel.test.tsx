import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GROUND_STATION_CATEGORIES } from '../groundStations'
import { GroundStationLayerPanel } from './GroundStationLayerPanel'

describe('GroundStationLayerPanel', () => {
  it('lists every ground station category, unchecked by default', () => {
    render(
      <GroundStationLayerPanel
        visibleCategoryIds={new Set()}
        onToggleCategory={vi.fn()}
        selection={null}
      />,
    )

    for (const category of GROUND_STATION_CATEGORIES) {
      expect(screen.getByText(category.label)).toBeInTheDocument()
    }
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked()
    }
  })

  it('reflects visibleCategoryIds as checked', () => {
    render(
      <GroundStationLayerPanel
        visibleCategoryIds={new Set(['estrack'])}
        onToggleCategory={vi.fn()}
        selection={null}
      />,
    )

    const estrackRow = screen.getByText('ESA Estrack').closest('label')
    expect(estrackRow?.querySelector('input[type="checkbox"]')).toBeChecked()
  })

  it('calls onToggleCategory when a checkbox is clicked', () => {
    const onToggleCategory = vi.fn()
    render(
      <GroundStationLayerPanel
        visibleCategoryIds={new Set()}
        onToggleCategory={onToggleCategory}
        selection={null}
      />,
    )

    const estrackRow = screen.getByText('ESA Estrack').closest('label')
    fireEvent.click(estrackRow!.querySelector('input[type="checkbox"]')!)

    expect(onToggleCategory).toHaveBeenCalledWith('estrack', true)
  })

  it('shows nothing about a selection until a pin has been clicked', () => {
    render(
      <GroundStationLayerPanel
        visibleCategoryIds={new Set()}
        onToggleCategory={vi.fn()}
        selection={null}
      />,
    )
    expect(screen.queryByText(/Use for pass prediction/)).not.toBeInTheDocument()
  })

  it('shows the selected station and lets it be used for pass prediction', () => {
    const onUseForPassPrediction = vi.fn()
    render(
      <GroundStationLayerPanel
        visibleCategoryIds={new Set(['ksat'])}
        onToggleCategory={vi.fn()}
        selection={{
          station: { id: 'ksat-svalbard', name: 'Svalbard (SvalSat)', latitudeDeg: 78.2298, longitudeDeg: 15.4078 },
          categoryId: 'ksat',
          categoryLabel: 'KSAT',
        }}
        onUseForPassPrediction={onUseForPassPrediction}
      />,
    )

    const nameElement = screen.getByText('Svalbard (SvalSat)')
    expect(nameElement).toBeInTheDocument()
    expect(nameElement.nextElementSibling).toHaveTextContent('KSAT · 78.23°, 15.41°')

    fireEvent.click(screen.getByRole('button', { name: 'Use for pass prediction' }))
    expect(onUseForPassPrediction).toHaveBeenCalledTimes(1)
  })

  it('omits the "use for pass prediction" button when the callback is not provided (e.g. design mode)', () => {
    render(
      <GroundStationLayerPanel
        visibleCategoryIds={new Set(['ksat'])}
        onToggleCategory={vi.fn()}
        selection={{
          station: { id: 'ksat-svalbard', name: 'Svalbard (SvalSat)', latitudeDeg: 78.2298, longitudeDeg: 15.4078 },
          categoryId: 'ksat',
          categoryLabel: 'KSAT',
        }}
      />,
    )

    expect(screen.getByText('Svalbard (SvalSat)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use for pass prediction' })).not.toBeInTheDocument()
  })
})
