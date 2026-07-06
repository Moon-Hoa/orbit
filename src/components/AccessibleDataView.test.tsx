import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EARTH_RADIUS_KM, type OrbitalElements } from '../engine'
import type { TleRecord } from '../satellite'
import { AccessibleDataView } from './AccessibleDataView'

const designElements: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
  inclinationRad: (51.6 * Math.PI) / 180,
  raanRad: (45 * Math.PI) / 180,
  argOfPerigeeRad: (30 * Math.PI) / 180,
  trueAnomalyRad: 0,
}

const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

function renderView(overrides: Partial<Parameters<typeof AccessibleDataView>[0]> = {}) {
  return render(
    <AccessibleDataView
      isOpen={false}
      onToggle={vi.fn()}
      mode="design"
      primaryLabel="Design orbit"
      selectedTle={null}
      elements={designElements}
      currentGeodetic={null}
      currentAltitudeRef={createRef()}
      currentSpeedRef={createRef()}
      currentEclipseStatusRef={createRef()}
      showEclipseStatus={false}
      {...overrides}
    />,
  )
}

describe('AccessibleDataView', () => {
  it('hides the table until toggled open', () => {
    renderView()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show data table' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('calls onToggle when the button is clicked', () => {
    const onToggle = vi.fn()
    renderView({ onToggle })
    fireEvent.click(screen.getByRole('button', { name: 'Show data table' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows the table with the six design elements when open in design mode', () => {
    renderView({ isOpen: true })

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('Design orbit')).toHaveLength(2) // Mode row + Tracked object row
    expect(screen.getByText(`${(EARTH_RADIUS_KM + 408).toFixed(3)} km`)).toBeInTheDocument()
    expect(screen.getByText('51.60°')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide data table' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('defaults the central body row to Earth (see Moon/Mars view issues)', () => {
    renderView({ isOpen: true })
    expect(screen.getByRole('rowheader', { name: 'Central body' }).nextSibling).toHaveTextContent(
      'Earth',
    )
  })

  it('reflects an overridden central body label', () => {
    renderView({ isOpen: true, centralBodyLabel: 'Moon' })
    expect(screen.getByRole('rowheader', { name: 'Central body' }).nextSibling).toHaveTextContent(
      'Moon',
    )
  })

  it('shows the tracked satellite identity and NORAD ID, without element sliders, in track-real mode', () => {
    renderView({
      isOpen: true,
      mode: 'track-real',
      primaryLabel: 'ISS (ZARYA)',
      selectedTle: ISS_TLE,
    })

    expect(screen.getByText('ISS (ZARYA) (NORAD 25544)')).toBeInTheDocument()
    expect(screen.queryByText(/Semi-major axis/)).not.toBeInTheDocument()
  })

  it('shows the current geodetic position when available', () => {
    renderView({
      isOpen: true,
      currentGeodetic: { latitudeRad: (12.5 * Math.PI) / 180, longitudeRad: (-45 * Math.PI) / 180, altitudeKm: 408 },
    })

    expect(screen.getByText('12.500°')).toBeInTheDocument()
    expect(screen.getByText('-45.000°')).toBeInTheDocument()
  })

  it('shows a placeholder for position before any ground track has been reported', () => {
    renderView({ isOpen: true, currentGeodetic: null })
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('only shows the eclipse row when showEclipseStatus is true', () => {
    const { rerender } = renderView({ isOpen: true, showEclipseStatus: false })
    expect(screen.queryByText('Sun')).not.toBeInTheDocument()

    rerender(
      <AccessibleDataView
        isOpen={true}
        onToggle={vi.fn()}
        mode="track-real"
        primaryLabel="ISS (ZARYA)"
        selectedTle={ISS_TLE}
        elements={designElements}
        currentGeodetic={null}
        currentAltitudeRef={createRef()}
        currentSpeedRef={createRef()}
        currentEclipseStatusRef={createRef()}
        showEclipseStatus={true}
      />,
    )
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })
})
