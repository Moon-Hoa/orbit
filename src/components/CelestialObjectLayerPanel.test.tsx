import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES } from '../celestialObjects'
import { CelestialObjectLayerPanel } from './CelestialObjectLayerPanel'

function renderPanel(overrides: Partial<Parameters<typeof CelestialObjectLayerPanel>[0]> = {}) {
  return render(
    <CelestialObjectLayerPanel
      centralBody="moon"
      visibleCategoryIds={new Set()}
      onToggleCategory={vi.fn()}
      orbitersVisible={false}
      onToggleOrbiters={vi.fn()}
      {...overrides}
    />,
  )
}

describe('CelestialObjectLayerPanel', () => {
  it('lists every category for the given body, plus an orbiters toggle, unchecked by default', () => {
    renderPanel()

    for (const category of CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES.moon) {
      expect(screen.getByText(category.label)).toBeInTheDocument()
    }
    expect(screen.getByText('Active orbiters')).toBeInTheDocument()
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked()
    }
  })

  it('lists Mars categories instead when centralBody is mars', () => {
    renderPanel({ centralBody: 'mars' })

    for (const category of CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES.mars) {
      expect(screen.getByText(category.label)).toBeInTheDocument()
    }
    expect(screen.queryByText('Apollo landings')).not.toBeInTheDocument()
  })

  it('reflects visibleCategoryIds as checked', () => {
    renderPanel({ visibleCategoryIds: new Set(['moon-apollo']) })

    const row = screen.getByText('Apollo landings').closest('label')
    expect(row?.querySelector('input[type="checkbox"]')).toBeChecked()
  })

  it('calls onToggleCategory when a category checkbox is clicked', () => {
    const onToggleCategory = vi.fn()
    renderPanel({ onToggleCategory })

    const row = screen.getByText('Apollo landings').closest('label')
    fireEvent.click(row!.querySelector('input[type="checkbox"]')!)

    expect(onToggleCategory).toHaveBeenCalledWith('moon-apollo', true)
  })

  it('reflects orbitersVisible and calls onToggleOrbiters when clicked', () => {
    const onToggleOrbiters = vi.fn()
    renderPanel({ orbitersVisible: true, onToggleOrbiters })

    const row = screen.getByText('Active orbiters').closest('label')
    expect(row?.querySelector('input[type="checkbox"]')).toBeChecked()

    fireEvent.click(row!.querySelector('input[type="checkbox"]')!)
    expect(onToggleOrbiters).toHaveBeenCalledWith(false)
  })
})
