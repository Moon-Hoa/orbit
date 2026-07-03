import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../scenario'
import { PresetSelector } from './PresetSelector'

describe('PresetSelector', () => {
  it('renders a button for every preset', () => {
    render(<PresetSelector onSelect={vi.fn()} />)
    for (const preset of PRESETS) {
      expect(screen.getByRole('button', { name: preset.label })).toBeInTheDocument()
    }
  })

  it('calls onSelect with the preset elements when clicked', () => {
    const onSelect = vi.fn()
    render(<PresetSelector onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Molniya' }))

    const molniya = PRESETS.find((p) => p.id === 'molniya')
    expect(onSelect).toHaveBeenCalledWith(molniya?.elements)
  })

  it('does not render companion buttons when onAddCompanion is omitted', () => {
    render(<PresetSelector onSelect={vi.fn()} />)
    expect(screen.queryByLabelText(/Add .* as companion/)).not.toBeInTheDocument()
  })

  it('calls onAddCompanion with the whole preset, without also calling onSelect', () => {
    const onSelect = vi.fn()
    const onAddCompanion = vi.fn()
    render(<PresetSelector onSelect={onSelect} onAddCompanion={onAddCompanion} />)

    fireEvent.click(screen.getByLabelText('Add Molniya as companion'))

    const molniya = PRESETS.find((p) => p.id === 'molniya')
    expect(onAddCompanion).toHaveBeenCalledWith(molniya)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
