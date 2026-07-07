import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EARTH_RADIUS_KM, MOON_MU_KM3_S2, MOON_RADIUS_KM, type OrbitalElements } from '../engine'
import type { TleRecord } from '../satellite'
import { PRIMARY_OBJECT_ID } from '../three/OrbitScene'
import type { CompanionEntry } from './companions'
import { StatsPanel, type OrbitShape } from './StatsPanel'

const issLikeShape: OrbitShape = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
}

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
      mode="design"
      elements={designElements}
      selectedTle={null}
      currentGeodetic={null}
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

  it('uses the given mu/body radius for a non-Earth body (see Moon/Mars view issues)', () => {
    const lowLunarOrbit: OrbitShape = { semiMajorAxisKm: MOON_RADIUS_KM + 100, eccentricity: 0 }
    renderPanel({ orbitShape: lowLunarOrbit, muKm3S2: MOON_MU_KM3_S2, bodyRadiusKm: MOON_RADIUS_KM })
    expect(screen.getByText('117.8 min')).toBeInTheDocument()
    expect(screen.getAllByText('100 km')).toHaveLength(2)
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
      // "Design orbit" legitimately appears more than once now (Mode row,
      // Tracked object row, and the primary's own chip label).
      expect(screen.getAllByText('Design orbit').length).toBeGreaterThanOrEqual(1)
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

  // Ported from the now-removed, always-visible-toggle AccessibleDataView -
  // merged into this single panel per the settings-overhaul issue.
  describe('merged accessible-data content', () => {
    it('defaults the central body row to Earth (see Moon/Mars view issues)', () => {
      renderPanel()
      expect(screen.getByText('Earth')).toBeInTheDocument()
    })

    it('reflects an overridden central body label', () => {
      renderPanel({ centralBodyLabel: 'Moon' })
      expect(screen.getByText('Moon')).toBeInTheDocument()
    })

    it('shows the design elements in design mode', () => {
      renderPanel({ mode: 'design', elements: designElements })
      expect(screen.getByText(`${(EARTH_RADIUS_KM + 408).toFixed(3)} km`)).toBeInTheDocument()
      expect(screen.getByText('51.60°')).toBeInTheDocument()
    })

    it('shows the tracked satellite identity and NORAD ID, without element rows, in track-real mode', () => {
      renderPanel({
        mode: 'track-real',
        primaryLabel: 'ISS (ZARYA)',
        selectedTle: ISS_TLE,
      })

      expect(screen.getByText('ISS (ZARYA) (NORAD 25544)')).toBeInTheDocument()
      expect(screen.queryByText('51.60°')).not.toBeInTheDocument()
    })

    it('shows the current geodetic position when available', () => {
      renderPanel({
        currentGeodetic: { latitudeRad: (12.5 * Math.PI) / 180, longitudeRad: (-45 * Math.PI) / 180, altitudeKm: 408 },
      })

      expect(screen.getByText('12.500°')).toBeInTheDocument()
      expect(screen.getByText('-45.000°')).toBeInTheDocument()
    })

    it('omits the latitude/longitude rows when no geodetic position is available', () => {
      renderPanel({ currentGeodetic: null })
      expect(screen.queryByText('Latitude')).not.toBeInTheDocument()
      expect(screen.queryByText('Longitude')).not.toBeInTheDocument()
    })
  })

  describe('Hohmann transfer subsection', () => {
    it('is hidden by default', () => {
      renderPanel()
      expect(screen.queryByText('Hohmann transfer')).not.toBeInTheDocument()
    })

    it('shows when showHohmannPlanner is true', () => {
      renderPanel({ showHohmannPlanner: true })
      expect(screen.getByText('Hohmann transfer')).toBeInTheDocument()
      expect(screen.getByLabelText('From altitude')).toBeInTheDocument()
    })
  })
})
