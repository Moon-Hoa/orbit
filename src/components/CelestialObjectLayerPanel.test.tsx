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
      selection={null}
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

  it('shows nothing about a selection until an object has been clicked', () => {
    const { container } = renderPanel()
    expect(container.querySelector('.border-t')).not.toBeInTheDocument()
  })

  it('shows full info for a selected surface object, including its category and coordinates', () => {
    renderPanel({
      selection: {
        kind: 'surface',
        object: {
          id: 'apollo-11',
          name: 'Apollo 11 (Tranquility Base)',
          mission: 'Apollo 11',
          agency: 'NASA',
          date: '1969-07-20',
          status: 'inactive',
          description: 'First crewed Moon landing.',
          latitudeDeg: 0.6875,
          longitudeDeg: 23.4333,
        },
        categoryId: 'moon-apollo',
        categoryLabel: 'Apollo landings',
      },
    })

    expect(screen.getByText('Apollo 11 (Tranquility Base)')).toBeInTheDocument()
    expect(screen.getByText('Apollo 11 · NASA')).toBeInTheDocument()
    expect(screen.getByText('1969-07-20 · Inactive · 0.69°, 23.43°')).toBeInTheDocument()
    expect(screen.getByText('First crewed Moon landing.')).toBeInTheDocument()
  })

  it('shows info for a selected orbiter without coordinates', () => {
    renderPanel({
      selection: {
        kind: 'orbiter',
        object: {
          id: 'lro',
          name: 'Lunar Reconnaissance Orbiter',
          mission: 'LRO',
          agency: 'NASA',
          date: '2009-06-18',
          status: 'active',
          description: 'Polar mapping orbiter.',
          elements: {
            semiMajorAxisKm: 1787.4,
            eccentricity: 0,
            inclinationRad: 0,
            raanRad: 0,
            argOfPerigeeRad: 0,
            trueAnomalyRad: 0,
          },
        },
      },
    })

    expect(screen.getByText('Lunar Reconnaissance Orbiter')).toBeInTheDocument()
    expect(screen.getByText('2009-06-18 · Active')).toBeInTheDocument()
  })
})
