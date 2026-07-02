import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { OrbitalElements } from '../engine'
import { ElementPanel } from './ElementPanel'

const baseElements: OrbitalElements = {
  semiMajorAxisKm: 6786.137,
  eccentricity: 0.0007,
  inclinationRad: (51.6 * Math.PI) / 180,
  raanRad: (45 * Math.PI) / 180,
  argOfPerigeeRad: (30 * Math.PI) / 180,
  trueAnomalyRad: 0,
}

describe('ElementPanel', () => {
  it('displays angular elements in degrees', () => {
    render(<ElementPanel elements={baseElements} onChange={vi.fn()} onSelectPreset={vi.fn()} />)
    expect(screen.getByLabelText('i value')).toHaveValue(51.6)
    expect(screen.getByLabelText('Ω value')).toHaveValue(45)
    expect(screen.getByLabelText('ω value')).toHaveValue(30)
  })

  it('converts a degree input change back to radians', () => {
    const onChange = vi.fn()
    render(<ElementPanel elements={baseElements} onChange={onChange} onSelectPreset={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('i value'), { target: { value: '98.6' } })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ inclinationRad: expect.closeTo((98.6 * Math.PI) / 180, 10) }),
    )
  })

  it('warns when perigee altitude is negative', () => {
    const decayedElements: OrbitalElements = { ...baseElements, semiMajorAxisKm: 3000 }
    render(<ElementPanel elements={decayedElements} onChange={vi.fn()} onSelectPreset={vi.fn()} />)
    expect(screen.getByText(/orbit intersects Earth/)).toBeInTheDocument()
  })

  it('does not warn for a healthy orbit', () => {
    render(<ElementPanel elements={baseElements} onChange={vi.fn()} onSelectPreset={vi.fn()} />)
    expect(screen.queryByText(/orbit intersects Earth/)).not.toBeInTheDocument()
  })
})
