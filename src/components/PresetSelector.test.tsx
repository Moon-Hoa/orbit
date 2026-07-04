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
    expect(onSelect).toHaveBeenCalledWith(molniya?.elements, 'Molniya')
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

  it('does not render bulk-select checkboxes when onAddCompanionMany is omitted', () => {
    render(<PresetSelector onSelect={vi.fn()} />)
    expect(screen.queryByLabelText(/Select .* for bulk add/)).not.toBeInTheDocument()
  })

  it('calls onAddCompanionMany with every checked preset, and clears the checkboxes afterward', () => {
    const onAddCompanionMany = vi.fn().mockReturnValue({ addedCount: 2, skippedCount: 0 })
    render(<PresetSelector onSelect={vi.fn()} onAddCompanionMany={onAddCompanionMany} />)

    fireEvent.click(screen.getByLabelText('Select Molniya for bulk add'))
    fireEvent.click(screen.getByLabelText('Select GPS for bulk add'))
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 selected as companions' }))

    const molniya = PRESETS.find((p) => p.id === 'molniya')
    const gps = PRESETS.find((p) => p.id === 'gps')
    expect(onAddCompanionMany).toHaveBeenCalledWith([molniya, gps])
    expect(screen.getByLabelText('Select Molniya for bulk add')).not.toBeChecked()
  })

  it('disables the bulk-add button until something is checked', () => {
    render(<PresetSelector onSelect={vi.fn()} onAddCompanionMany={vi.fn()} />)
    expect(screen.getByRole('button', { name: /selected as companions/ })).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Select ISS for bulk add'))
    expect(screen.getByRole('button', { name: 'Add 1 selected as companions' })).toBeEnabled()
  })

  it('shows a summary after a bulk add, including how many were skipped', () => {
    const onAddCompanionMany = vi.fn().mockReturnValue({ addedCount: 1, skippedCount: 1 })
    render(<PresetSelector onSelect={vi.fn()} onAddCompanionMany={onAddCompanionMany} />)

    fireEvent.click(screen.getByLabelText('Select ISS for bulk add'))
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 selected as companions' }))

    expect(
      screen.getByText('Added 1, skipped 1 (already tracked or companion limit reached).'),
    ).toBeInTheDocument()
  })
})
