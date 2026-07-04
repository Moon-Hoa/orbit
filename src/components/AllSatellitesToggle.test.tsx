import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AllSatellitesToggle } from './AllSatellitesToggle'

describe('AllSatellitesToggle', () => {
  it('renders off by default', () => {
    render(<AllSatellitesToggle onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'All satellites' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onToggle(true) and switches on once it resolves', async () => {
    let resolveToggle: () => void = () => {}
    const onToggle = vi.fn(() => new Promise<void>((resolve) => (resolveToggle = resolve)))
    render(<AllSatellitesToggle onToggle={onToggle} />)

    fireEvent.click(screen.getByRole('button', { name: 'All satellites' }))
    expect(onToggle).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled()

    await act(async () => {
      resolveToggle()
    })

    expect(screen.getByRole('button', { name: 'All satellites' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('calls onToggle(false) and switches off immediately, no loading state', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined)
    render(<AllSatellitesToggle onToggle={onToggle} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'All satellites' }))
    })
    onToggle.mockClear()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'All satellites' }))
    })

    expect(onToggle).toHaveBeenCalledWith(false)
    expect(screen.getByRole('button', { name: 'All satellites' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows an error and stays off if the load fails', async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error('network down'))
    render(<AllSatellitesToggle onToggle={onToggle} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'All satellites' }))
    })

    expect(screen.getByText('Could not load satellite data - try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All satellites' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
