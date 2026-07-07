import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EARTH_RADIUS_KM, type OrbitalElements } from '../engine'
import { SettingsPanel } from './SettingsPanel'

const designElements: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
  inclinationRad: (51.6 * Math.PI) / 180,
  raanRad: 0,
  argOfPerigeeRad: 0,
  trueAnomalyRad: 0,
}

function renderPanel(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  return render(
    <SettingsPanel
      unitSystem="metric"
      onUnitSystemChange={vi.fn()}
      centralBody="earth"
      mode="design"
      onModeChange={vi.fn()}
      onToggleSatelliteSwarm={vi.fn().mockResolvedValue(undefined)}
      visibleGroundStationCategories={new Set()}
      onToggleGroundStationCategory={vi.fn()}
      visibleCelestialCategories={new Set()}
      onToggleCelestialCategory={vi.fn()}
      celestialOrbitersVisible={false}
      onToggleCelestialOrbiters={vi.fn()}
      exportLabel="Design orbit"
      isTrackingReal={false}
      elements={designElements}
      enableJ2={false}
      tle={null}
      {...overrides}
    />,
  )
}

function openSettings() {
  fireEvent.click(screen.getByLabelText('Settings'))
}

describe('SettingsPanel', () => {
  it('hides everything until opened', () => {
    renderPanel()
    expect(screen.queryByRole('button', { name: 'Metric' })).not.toBeInTheDocument()
    expect(screen.queryByText('Ground stations')).not.toBeInTheDocument()
  })

  it('reveals the metric/imperial toggle when opened', () => {
    renderPanel()
    openSettings()

    expect(screen.getByRole('button', { name: 'Metric' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Imperial' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onUnitSystemChange when a unit is picked', () => {
    const onUnitSystemChange = vi.fn()
    renderPanel({ onUnitSystemChange })
    openSettings()

    fireEvent.click(screen.getByRole('button', { name: 'Imperial' }))
    expect(onUnitSystemChange).toHaveBeenCalledWith('imperial')
  })

  it('shows the all-satellites toggle and ground station section on Earth', () => {
    renderPanel({ centralBody: 'earth' })
    openSettings()

    expect(screen.getByRole('button', { name: 'All satellites' })).toBeInTheDocument()
    expect(screen.getByText('Ground stations')).toBeInTheDocument()
    expect(screen.queryByText('Surface objects')).not.toBeInTheDocument()
  })

  it('shows the surface-object section instead, on the Moon or Mars', () => {
    renderPanel({ centralBody: 'moon' })
    openSettings()

    expect(screen.getByText('Surface objects')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'All satellites' })).not.toBeInTheDocument()
    expect(screen.queryByText('Ground stations')).not.toBeInTheDocument()
  })

  it('forwards ground-station category toggles to the caller', () => {
    const onToggleGroundStationCategory = vi.fn()
    renderPanel({ centralBody: 'earth', onToggleGroundStationCategory })
    openSettings()

    const row = screen.getByText('ESA Estrack').closest('label')
    fireEvent.click(row!.querySelector('input[type="checkbox"]')!)

    expect(onToggleGroundStationCategory).toHaveBeenCalledWith('estrack', true)
  })

  it('forwards surface-object category toggles to the caller', () => {
    const onToggleCelestialCategory = vi.fn()
    renderPanel({ centralBody: 'mars', onToggleCelestialCategory })
    openSettings()

    const row = screen.getByText('Landers & rovers').closest('label')
    fireEvent.click(row!.querySelector('input[type="checkbox"]')!)

    expect(onToggleCelestialCategory).toHaveBeenCalledWith('mars-landers', true)
  })

  describe('Mode section', () => {
    it('shows the design/track-real toggle on Earth', () => {
      renderPanel({ centralBody: 'earth' })
      openSettings()

      expect(screen.getByRole('button', { name: 'Design orbit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Track real satellite' })).toBeInTheDocument()
    })

    it('hides the mode toggle entirely on non-Earth bodies', () => {
      renderPanel({ centralBody: 'moon' })
      openSettings()

      expect(screen.queryByRole('button', { name: 'Track real satellite' })).not.toBeInTheDocument()
    })

    it('calls onModeChange when a mode is picked', () => {
      const onModeChange = vi.fn()
      renderPanel({ centralBody: 'earth', onModeChange })
      openSettings()

      fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
      expect(onModeChange).toHaveBeenCalledWith('track-real')
    })
  })

  describe('Export section', () => {
    it('shows both Export KML and Export CSV on Earth', () => {
      renderPanel({ centralBody: 'earth' })
      openSettings()

      expect(screen.getByRole('button', { name: 'Export KML' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument()
    })

    it('shows only Export CSV on a non-Earth body', () => {
      renderPanel({ centralBody: 'moon' })
      openSettings()

      expect(screen.queryByRole('button', { name: 'Export KML' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument()
    })
  })
})
