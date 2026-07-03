import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  it('hides the unit toggle until opened', () => {
    render(<SettingsPanel unitSystem="metric" onUnitSystemChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Metric' })).not.toBeInTheDocument()
  })

  it('reveals the metric/imperial toggle when opened', () => {
    render(<SettingsPanel unitSystem="metric" onUnitSystemChange={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Settings'))

    expect(screen.getByRole('button', { name: 'Metric' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Imperial' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onUnitSystemChange when a unit is picked', () => {
    const onUnitSystemChange = vi.fn()
    render(<SettingsPanel unitSystem="metric" onUnitSystemChange={onUnitSystemChange} />)
    fireEvent.click(screen.getByLabelText('Settings'))

    fireEvent.click(screen.getByRole('button', { name: 'Imperial' }))
    expect(onUnitSystemChange).toHaveBeenCalledWith('imperial')
  })
})
