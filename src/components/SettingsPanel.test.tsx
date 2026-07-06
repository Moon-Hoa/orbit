import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel'

function renderPanel(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  return render(
    <SettingsPanel
      unitSystem="metric"
      onUnitSystemChange={vi.fn()}
      centralBody="earth"
      onToggleSatelliteSwarm={vi.fn().mockResolvedValue(undefined)}
      visibleGroundStationCategories={new Set()}
      onToggleGroundStationCategory={vi.fn()}
      visibleCelestialCategories={new Set()}
      onToggleCelestialCategory={vi.fn()}
      celestialOrbitersVisible={false}
      onToggleCelestialOrbiters={vi.fn()}
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
})
