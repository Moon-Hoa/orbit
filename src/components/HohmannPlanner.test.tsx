import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HohmannPlanner } from './HohmannPlanner'

describe('HohmannPlanner', () => {
  it('shows the default LEO -> GEO delta-v budget and transfer time', () => {
    render(<HohmannPlanner />)
    expect(screen.getByText('2.426 km/s')).toBeInTheDocument()
    expect(screen.getByText('1.467 km/s')).toBeInTheDocument()
    expect(screen.getByText('3.893 km/s')).toBeInTheDocument()
    expect(screen.getByText('5h 17m')).toBeInTheDocument()
  })

  it('documents the circular/coplanar assumption', () => {
    render(<HohmannPlanner />)
    expect(screen.getByText(/Circular, coplanar orbits only/)).toBeInTheDocument()
  })

  it('recomputes the delta-v budget when altitudes change', () => {
    render(<HohmannPlanner />)

    fireEvent.change(screen.getByLabelText('From altitude'), { target: { value: '35786' } })
    fireEvent.change(screen.getByLabelText('To altitude'), { target: { value: '35786' } })

    expect(screen.getAllByText('0.000 km/s')).toHaveLength(3)
  })

  it('warns instead of showing results for a non-positive altitude', () => {
    render(<HohmannPlanner />)

    fireEvent.change(screen.getByLabelText('From altitude'), { target: { value: '-10000' } })

    expect(screen.getByText(/Enter positive altitudes/)).toBeInTheDocument()
  })
})
