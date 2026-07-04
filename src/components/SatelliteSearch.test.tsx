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

const NAUKA_TLE: TleRecord = {
  name: 'ISS (NAUKA)',
  noradId: '49044',
  line1: '1 49044U 21066A   26182.50817465  .00006185  00000+0  11827-3 0  9992',
  line2: '2 49044  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254608691',
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

  it('does not render companion buttons when onAddCompanion is omitted', async () => {
    searchByNameMock.mockResolvedValue([ISS_TLE])
    render(<SatelliteSearch selectedTle={null} onSelect={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'iss' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await screen.findByRole('button', { name: /ISS \(ZARYA\)/ })
    expect(screen.queryByLabelText(/Add .* as companion/)).not.toBeInTheDocument()
  })

  it('calls onAddCompanion with the TLE, without also calling onSelect', async () => {
    searchByNameMock.mockResolvedValue([ISS_TLE])
    const onSelect = vi.fn()
    const onAddCompanion = vi.fn()
    render(<SatelliteSearch selectedTle={null} onSelect={onSelect} onAddCompanion={onAddCompanion} />)

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'iss' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    const addButton = await screen.findByLabelText('Add ISS (ZARYA) as companion')
    fireEvent.click(addButton)

    expect(onAddCompanion).toHaveBeenCalledWith(ISS_TLE)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not render bulk-select checkboxes when onAddCompanionMany is omitted', async () => {
    searchByNameMock.mockResolvedValue([ISS_TLE])
    render(<SatelliteSearch selectedTle={null} onSelect={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'iss' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await screen.findByRole('button', { name: /ISS \(ZARYA\)/ })
    expect(screen.queryByLabelText(/Select .* for bulk add/)).not.toBeInTheDocument()
  })

  it('calls onAddCompanionMany with every checked search result, and shows the returned summary', async () => {
    searchByNameMock.mockResolvedValue([ISS_TLE, NAUKA_TLE])
    const onAddCompanionMany = vi.fn().mockReturnValue({ addedCount: 1, skippedCount: 1 })
    render(
      <SatelliteSearch selectedTle={null} onSelect={vi.fn()} onAddCompanionMany={onAddCompanionMany} />,
    )

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'iss' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('button', { name: /ISS \(ZARYA\)/ })

    fireEvent.click(screen.getByLabelText('Select ISS (ZARYA) for bulk add'))
    fireEvent.click(screen.getByLabelText('Select ISS (NAUKA) for bulk add'))
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 selected as companions' }))

    expect(onAddCompanionMany).toHaveBeenCalledWith([ISS_TLE, NAUKA_TLE])
    expect(
      screen.getByText('Added 1, skipped 1 (already tracked or companion limit reached).'),
    ).toBeInTheDocument()
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

  describe('paste TLE mode', () => {
    function switchToPasteMode() {
      fireEvent.click(screen.getByRole('button', { name: 'Paste TLE mode' }))
    }

    it('tracks a valid pasted 3-line TLE', () => {
      const onSelect = vi.fn()
      render(<SatelliteSearch selectedTle={null} onSelect={onSelect} />)
      switchToPasteMode()

      fireEvent.change(screen.getByLabelText('Paste TLE'), {
        target: { value: `${ISS_TLE.name}\n${ISS_TLE.line1}\n${ISS_TLE.line2}` },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Track' }))

      expect(onSelect).toHaveBeenCalledWith(ISS_TLE)
    })

    it('tracks a valid pasted 2-line TLE (no name), using a placeholder name', () => {
      const onSelect = vi.fn()
      render(<SatelliteSearch selectedTle={null} onSelect={onSelect} />)
      switchToPasteMode()

      fireEvent.change(screen.getByLabelText('Paste TLE'), {
        target: { value: `${ISS_TLE.line1}\n${ISS_TLE.line2}` },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Track' }))

      expect(onSelect).toHaveBeenCalledWith({ ...ISS_TLE, name: 'Satellite 25544' })
    })

    it('shows a specific inline error for malformed input, without crashing', () => {
      const onSelect = vi.fn()
      render(<SatelliteSearch selectedTle={null} onSelect={onSelect} />)
      switchToPasteMode()

      fireEvent.change(screen.getByLabelText('Paste TLE'), {
        target: { value: 'not a tle at all' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Track' }))

      expect(
        screen.getByText('Expected 2 lines (no name) or 3 lines (with name), got 1.'),
      ).toBeInTheDocument()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('does not render an "add all as companions" button when onAddCompanionMany is omitted', () => {
      render(<SatelliteSearch selectedTle={null} onSelect={vi.fn()} />)
      switchToPasteMode()
      expect(screen.queryByRole('button', { name: 'Add all as companions' })).not.toBeInTheDocument()
    })

    it('adds every valid TLE in a multi-record paste as a companion, reporting parse errors separately', () => {
      const onAddCompanionMany = vi.fn().mockReturnValue({ addedCount: 2, skippedCount: 0 })
      render(
        <SatelliteSearch
          selectedTle={null}
          onSelect={vi.fn()}
          onAddCompanionMany={onAddCompanionMany}
        />,
      )
      switchToPasteMode()

      const badLine1 = `2${ISS_TLE.line1.slice(1)}`
      fireEvent.change(screen.getByLabelText('Paste TLE'), {
        target: {
          value: [
            ISS_TLE.name,
            ISS_TLE.line1,
            ISS_TLE.line2,
            'Broken entry',
            badLine1,
            ISS_TLE.line2,
            NAUKA_TLE.name,
            NAUKA_TLE.line1,
            NAUKA_TLE.line2,
          ].join('\n'),
        },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Add all as companions' }))

      expect(onAddCompanionMany).toHaveBeenCalledWith([ISS_TLE, NAUKA_TLE])
      expect(screen.getByText('Added 2.')).toBeInTheDocument()
      expect(screen.getByText('Broken entry: Line 1 must start with "1 ".')).toBeInTheDocument()
    })

    it('does not call onAddCompanionMany when nothing in the paste parses successfully', () => {
      const onAddCompanionMany = vi.fn()
      render(
        <SatelliteSearch
          selectedTle={null}
          onSelect={vi.fn()}
          onAddCompanionMany={onAddCompanionMany}
        />,
      )
      switchToPasteMode()

      fireEvent.change(screen.getByLabelText('Paste TLE'), { target: { value: 'not a tle at all' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add all as companions' }))

      expect(onAddCompanionMany).not.toHaveBeenCalled()
      expect(screen.getByText('Added 0.')).toBeInTheDocument()
    })
  })
})
