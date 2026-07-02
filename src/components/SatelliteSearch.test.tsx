import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TleRecord } from '../satellite'

const searchByNameMock = vi.fn()

vi.mock('../satellite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../satellite')>()
  return { ...actual, searchByName: searchByNameMock }
})

const { SatelliteSearch } = await import('./SatelliteSearch')

const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SatelliteSearch', () => {
  it('searches by the typed query and lists results', async () => {
    searchByNameMock.mockResolvedValue([ISS_TLE])
    render(<SatelliteSearch selectedTle={null} onSelect={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'iss' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText(/ISS \(ZARYA\)/)).toBeInTheDocument()
    expect(searchByNameMock).toHaveBeenCalledWith('iss')
  })

  it('calls onSelect when a result is clicked', async () => {
    searchByNameMock.mockResolvedValue([ISS_TLE])
    const onSelect = vi.fn()
    render(<SatelliteSearch selectedTle={null} onSelect={onSelect} />)

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'iss' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    const result = await screen.findByRole('button', { name: /ISS \(ZARYA\)/ })
    fireEvent.click(result)

    expect(onSelect).toHaveBeenCalledWith(ISS_TLE)
  })

  it('shows a message when no results are found', async () => {
    searchByNameMock.mockResolvedValue([])
    render(<SatelliteSearch selectedTle={null} onSelect={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'xyzzy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('No satellites found.')).toBeInTheDocument()
  })

  it('shows an error message when the search rejects', async () => {
    searchByNameMock.mockRejectedValue(new Error('network down'))
    render(<SatelliteSearch selectedTle={null} onSelect={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'iss' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Search failed - try again.')).toBeInTheDocument()
  })

  it('shows which satellite is currently selected', () => {
    render(<SatelliteSearch selectedTle={ISS_TLE} onSelect={vi.fn()} />)
    expect(screen.getByText('ISS (ZARYA)')).toBeInTheDocument()
  })

  it('does not search on submit with a blank query', () => {
    render(<SatelliteSearch selectedTle={null} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(searchByNameMock).not.toHaveBeenCalled()
  })
})
