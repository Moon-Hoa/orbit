import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EARTH_RADIUS_KM } from '../engine'
import { PRIMARY_OBJECT_ID } from '../three/OrbitScene'
import type { CompanionEntry } from './companions'
import { StatsPanel, type OrbitShape } from './StatsPanel'

const issLikeShape: OrbitShape = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
}

const DUMMY_SOURCE: CompanionEntry['source'] = {
  type: 'design',
  elements: {
    semiMajorAxisKm: EARTH_RADIUS_KM + 35786,
    eccentricity: 0,
    inclinationRad: 0,
    raanRad: 0,
    argOfPerigeeRad: 0,
    trueAnomalyRad: 0,
  },
}

function renderPanel(overrides: Partial<Parameters<typeof StatsPanel>[0]> = {}) {
  return render(
    <StatsPanel
      orbitShape={issLikeShape}
      currentAltitudeRef={createRef()}
      currentSpeedRef={createRef()}
      currentEclipseStatusRef={createRef()}
      showEclipseStatus={false}
      unitSystem="metric"
      primaryLabel="Design orbit"
      companions={[]}
      focusedId={PRIMARY_OBJECT_ID}
      onFocus={vi.fn()}
      onRemoveCompanion={vi.fn()}
      {...overrides}
    />,
  )
}

describe('StatsPanel', () => {
  it('computes period and apogee/perigee altitude from orbit shape', () => {
    renderPanel()
    expect(screen.getByText('92.7 min')).toBeInTheDocument()
    expect(screen.getByText('413 km')).toBeInTheDocument()
    expect(screen.getByText('403 km')).toBeInTheDocument()
  })

  it('shows a placeholder for the live altitude/speed readouts before any tick', () => {
    renderPanel()
    expect(screen.getByTestId('current-altitude')).toHaveTextContent('—')
    expect(screen.getByTestId('current-speed')).toHaveTextContent('—')
  })

  it('does not show the tracked-object list when there are no companions', () => {
    renderPanel()
    expect(screen.queryByText('ISS (ZARYA)')).not.toBeInTheDocument()
  })

  it('shows apogee/perigee in km by default', () => {
    renderPanel()
    expect(screen.getByText('413 km')).toBeInTheDocument()
    expect(screen.getByText('403 km')).toBeInTheDocument()
  })

  it('converts apogee/perigee to miles in imperial mode', () => {
    renderPanel({ unitSystem: 'imperial' })
    expect(screen.getByText('256 mi')).toBeInTheDocument()
    expect(screen.getByText('251 mi')).toBeInTheDocument()
  })

  it('hides the eclipse indicator by default (design mode)', () => {
    renderPanel()
    expect(screen.queryByTestId('current-eclipse-status')).not.toBeInTheDocument()
  })

  it('shows the eclipse indicator when tracking a real satellite', () => {
    renderPanel({ showEclipseStatus: true })
    expect(screen.getByTestId('current-eclipse-status')).toBeInTheDocument()
  })

  describe('with companions', () => {
    const companions: CompanionEntry[] = [
      { id: 'real:25544', label: 'ISS (ZARYA)', color: 0xf97316, source: DUMMY_SOURCE },
      { id: 'design:geo', label: 'GEO', color: 0xa855f7, source: DUMMY_SOURCE },
    ]

    it('lists the primary object and every companion', () => {
      renderPanel({ companions })
      expect(screen.getByText('Design orbit')).toBeInTheDocument()
      expect(screen.getByText('ISS (ZARYA)')).toBeInTheDocument()
      expect(screen.getByText('GEO')).toBeInTheDocument()
    })

    it('marks the focused entry as pressed', () => {
      renderPanel({ companions, focusedId: 'design:geo' })
      expect(screen.getByRole('button', { name: 'Focus GEO' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Focus Design orbit' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    it('calls onFocus with the clicked entry id', () => {
      const onFocus = vi.fn()
      renderPanel({ companions, onFocus })

      fireEvent.click(screen.getByRole('button', { name: 'Focus GEO' }))
      expect(onFocus).toHaveBeenCalledWith('design:geo')

      fireEvent.click(screen.getByRole('button', { name: 'Focus Design orbit' }))
      expect(onFocus).toHaveBeenCalledWith(PRIMARY_OBJECT_ID)
    })

    it('calls onRemoveCompanion when a companion is removed, but has no remove button for the primary', () => {
      const onRemoveCompanion = vi.fn()
      renderPanel({ companions, onRemoveCompanion })

      expect(screen.queryByLabelText('Stop tracking Design orbit')).not.toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('Stop tracking GEO'))
      expect(onRemoveCompanion).toHaveBeenCalledWith('design:geo')
    })
  })
})
