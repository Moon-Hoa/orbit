import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClosestApproachPanel } from './ClosestApproachPanel'

describe('ClosestApproachPanel', () => {
  it('renders nothing when there is no result (not exactly two tracked objects)', () => {
    const { container } = render(<ClosestApproachPanel result={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows time to closest approach, minimum distance, and relative velocity', () => {
    render(
      <ClosestApproachPanel
        result={{
          timeToClosestApproachSeconds: 3725,
          minDistanceKm: 42.75,
          relativeVelocityKmS: 1.234,
        }}
      />,
    )

    expect(screen.getByText('01:02:05')).toBeInTheDocument()
    expect(screen.getByText('42.8 km')).toBeInTheDocument()
    expect(screen.getByText('1.234 km/s')).toBeInTheDocument()
  })
})
