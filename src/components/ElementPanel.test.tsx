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

function renderPanel(overrides: Partial<Parameters<typeof ElementPanel>[0]> = {}) {
  return render(
    <ElementPanel
      elements={baseElements}
      onChange={vi.fn()}
      onSelectPreset={vi.fn()}
      enableJ2={false}
      onEnableJ2Change={vi.fn()}
      {...overrides}
    />,
  )
}

describe('ElementPanel', () => {
  it('displays angular elements in degrees', () => {
    renderPanel()
    expect(screen.getByLabelText('i value')).toHaveValue(51.6)
    expect(screen.getByLabelText('Ω value')).toHaveValue(45)
    expect(screen.getByLabelText('ω value')).toHaveValue(30)
  })

  it('converts a degree input change back to radians', () => {
    const onChange = vi.fn()
    renderPanel({ onChange })

    fireEvent.change(screen.getByLabelText('i value'), { target: { value: '98.6' } })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ inclinationRad: expect.closeTo((98.6 * Math.PI) / 180, 10) }),
    )
  })

  it('warns when perigee altitude is negative', () => {
    const decayedElements: OrbitalElements = { ...baseElements, semiMajorAxisKm: 3000 }
    renderPanel({ elements: decayedElements })
    expect(screen.getByText(/orbit intersects Earth/)).toBeInTheDocument()
  })

  it('does not warn for a healthy orbit', () => {
    renderPanel()
    expect(screen.queryByText(/orbit intersects Earth/)).not.toBeInTheDocument()
  })

  it('shows the J2 checkbox unchecked by default', () => {
    renderPanel()
    expect(screen.getByLabelText(/Enable J2 perturbation/)).not.toBeChecked()
  })

  it('reflects enableJ2=true as checked', () => {
    renderPanel({ enableJ2: true })
    expect(screen.getByLabelText(/Enable J2 perturbation/)).toBeChecked()
  })

  it('calls onEnableJ2Change when the checkbox is toggled', () => {
    const onEnableJ2Change = vi.fn()
    renderPanel({ onEnableJ2Change })

    fireEvent.click(screen.getByLabelText(/Enable J2 perturbation/))
    expect(onEnableJ2Change).toHaveBeenCalledWith(true)
  })
})
