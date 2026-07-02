import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM, type OrbitalElements } from '../engine'
import { StatsPanel } from './StatsPanel'

const issLike: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
  inclinationRad: (51.6 * Math.PI) / 180,
  raanRad: 0,
  argOfPerigeeRad: 0,
  trueAnomalyRad: 0,
}

describe('StatsPanel', () => {
  it('computes period and apogee/perigee altitude from elements', () => {
    render(
      <StatsPanel elements={issLike} currentAltitudeRef={createRef()} currentSpeedRef={createRef()} />,
    )

    expect(screen.getByText('92.7 min')).toBeInTheDocument()
    expect(screen.getByText('413 km')).toBeInTheDocument()
    expect(screen.getByText('403 km')).toBeInTheDocument()
  })

  it('shows a placeholder for the live altitude/speed readouts before any tick', () => {
    render(
      <StatsPanel elements={issLike} currentAltitudeRef={createRef()} currentSpeedRef={createRef()} />,
    )

    expect(screen.getByTestId('current-altitude')).toHaveTextContent('—')
    expect(screen.getByTestId('current-speed')).toHaveTextContent('—')
  })
})
