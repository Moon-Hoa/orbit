import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OtherBodiesToggle } from './OtherBodiesToggle'

describe('OtherBodiesToggle', () => {
  it('renders off by default', () => {
    render(<OtherBodiesToggle isOn={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Other bodies' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle(true) when clicked while off', () => {
    const onToggle = vi.fn()
    render(<OtherBodiesToggle isOn={false} onToggle={onToggle} />)

    fireEvent.click(screen.getByRole('button', { name: 'Other bodies' }))

    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('calls onToggle(false) when clicked while on', () => {
    const onToggle = vi.fn()
    render(<OtherBodiesToggle isOn={true} onToggle={onToggle} />)

    fireEvent.click(screen.getByRole('button', { name: 'Other bodies' }))

    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('reflects isOn via aria-pressed', () => {
    render(<OtherBodiesToggle isOn={true} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Other bodies' })).toHaveAttribute('aria-pressed', 'true')
  })
})
