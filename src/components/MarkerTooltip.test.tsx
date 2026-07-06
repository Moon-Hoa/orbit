import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MarkerScreenPosition } from '../three/markerScreenPosition'
import type { CelestialObjectSelection, GroundStationSelection } from '../three/OrbitScene'
import { MarkerTooltip } from './MarkerTooltip'

const visiblePosition: MarkerScreenPosition = { xPx: 400, yPx: 80, occluded: false }

const svalbardSelection: GroundStationSelection = {
  station: { id: 'ksat-svalbard', name: 'Svalbard (SvalSat)', latitudeDeg: 78.2298, longitudeDeg: 15.4078 },
  categoryId: 'ksat',
  categoryLabel: 'KSAT',
}

const apollo11Selection: CelestialObjectSelection = {
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
}

const lroSelection: CelestialObjectSelection = {
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
}

function renderTooltip(overrides: Partial<Parameters<typeof MarkerTooltip>[0]> = {}) {
  return render(
    <MarkerTooltip
      position={visiblePosition}
      groundStationSelection={null}
      celestialObjectSelection={null}
      onDismiss={vi.fn()}
      {...overrides}
    />,
  )
}

describe('MarkerTooltip', () => {
  it('renders nothing when position is null', () => {
    const { container } = renderTooltip({ position: null, groundStationSelection: svalbardSelection })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the marker is occluded', () => {
    const { container } = renderTooltip({
      position: { ...visiblePosition, occluded: true },
      groundStationSelection: svalbardSelection,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when nothing is selected', () => {
    const { container } = renderTooltip()
    expect(container).toBeEmptyDOMElement()
  })

  it('positions itself at the given screen coordinates', () => {
    renderTooltip({ groundStationSelection: svalbardSelection })
    const name = screen.getByText('Svalbard (SvalSat)')
    const popup = name.closest('div')!
    expect(popup).toHaveStyle({ left: '400px', top: '80px' })
  })

  it('clamps horizontally so it stays on-screen when the marker is near the viewport edge', () => {
    renderTooltip({
      position: { xPx: 5, yPx: 80, occluded: false },
      groundStationSelection: svalbardSelection,
    })
    const name = screen.getByText('Svalbard (SvalSat)')
    const popup = name.closest('div')!
    expect(popup).not.toHaveStyle({ left: '5px' })
    expect(Number.parseFloat(getComputedStyle(popup).left)).toBeGreaterThan(5)
  })

  it('shows the selected ground station and lets it be used for pass prediction', () => {
    const onUseForPassPrediction = vi.fn()
    renderTooltip({ groundStationSelection: svalbardSelection, onUseForPassPrediction })

    expect(screen.getByText('Svalbard (SvalSat)')).toBeInTheDocument()
    expect(screen.getByText('KSAT · 78.23°, 15.41°')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Use for pass prediction' }))
    expect(onUseForPassPrediction).toHaveBeenCalledTimes(1)
  })

  it('omits the "use for pass prediction" button when the callback is not provided (e.g. design mode)', () => {
    renderTooltip({ groundStationSelection: svalbardSelection })
    expect(screen.queryByRole('button', { name: 'Use for pass prediction' })).not.toBeInTheDocument()
  })

  it('shows full info for a selected surface object, including its category and coordinates', () => {
    renderTooltip({ celestialObjectSelection: apollo11Selection })

    expect(screen.getByText('Apollo 11 (Tranquility Base)')).toBeInTheDocument()
    expect(screen.getByText('Apollo 11 · NASA')).toBeInTheDocument()
    expect(screen.getByText('1969-07-20 · Inactive · 0.69°, 23.43°')).toBeInTheDocument()
    expect(screen.getByText('First crewed Moon landing.')).toBeInTheDocument()
  })

  it('shows info for a selected orbiter without coordinates', () => {
    renderTooltip({ celestialObjectSelection: lroSelection })

    expect(screen.getByText('Lunar Reconnaissance Orbiter')).toBeInTheDocument()
    expect(screen.getByText('2009-06-18 · Active')).toBeInTheDocument()
  })

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn()
    renderTooltip({ groundStationSelection: svalbardSelection, onDismiss })

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when Escape is pressed', () => {
    const onDismiss = vi.fn()
    renderTooltip({ groundStationSelection: svalbardSelection, onDismiss })

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not listen for Escape while closed', () => {
    const onDismiss = vi.fn()
    renderTooltip({ position: null, onDismiss })

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
