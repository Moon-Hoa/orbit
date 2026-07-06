import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SpacecraftTransit } from '../solarSystem'
import type { MarkerScreenPosition } from '../three/markerScreenPosition'
import { SpacecraftTooltip } from './SpacecraftTooltip'

const visiblePosition: MarkerScreenPosition = { xPx: 120, yPx: 80, occluded: false }

const perseverance: SpacecraftTransit = {
  id: 'mars-2020-perseverance',
  name: 'Perseverance (Mars 2020)',
  agency: 'NASA',
  departureBody: 'earth',
  arrivalBody: 'mars',
  departureDate: '2020-07-30',
  arrivalDate: '2021-02-18',
  isIdealizedTransfer: true,
  description: 'Rover that landed in Jezero Crater alongside the Ingenuity helicopter.',
}

function renderTooltip(overrides: Partial<Parameters<typeof SpacecraftTooltip>[0]> = {}) {
  return render(
    <SpacecraftTooltip position={visiblePosition} selection={perseverance} onDismiss={vi.fn()} {...overrides} />,
  )
}

describe('SpacecraftTooltip', () => {
  it('renders nothing when position is null', () => {
    const { container } = renderTooltip({ position: null })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when nothing is selected', () => {
    const { container } = renderTooltip({ selection: null })
    expect(container).toBeEmptyDOMElement()
  })

  it('positions itself at the given screen coordinates', () => {
    renderTooltip()
    const name = screen.getByText('Perseverance (Mars 2020)')
    const popup = name.closest('div')!
    expect(popup).toHaveStyle({ left: '120px', top: '80px' })
  })

  it('shows the mission name, agency, transit dates (in UTC, matching the plain calendar-date data), and description', () => {
    renderTooltip()
    expect(screen.getByText('Perseverance (Mars 2020)')).toBeInTheDocument()
    expect(screen.getByText('NASA')).toBeInTheDocument()
    expect(screen.getByText('Earth → Mars: Jul 30, 2020 – Feb 18, 2021')).toBeInTheDocument()
    expect(
      screen.getByText('Rover that landed in Jezero Crater alongside the Ingenuity helicopter.'),
    ).toBeInTheDocument()
  })

  it('flags the transfer as idealized, not a published trajectory', () => {
    renderTooltip()
    expect(screen.getByText(/Idealized transfer path/)).toBeInTheDocument()
  })

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn()
    renderTooltip({ onDismiss })

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when Escape is pressed', () => {
    const onDismiss = vi.fn()
    renderTooltip({ onDismiss })

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
