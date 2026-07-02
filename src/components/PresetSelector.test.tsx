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
})
