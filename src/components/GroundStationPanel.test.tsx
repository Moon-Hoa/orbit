import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TleRecord } from '../satellite'

const findNextPassesMock = vi.fn()

vi.mock('../satellite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../satellite')>()
  return { ...actual, findNextPasses: findNextPassesMock }
})

const { GroundStationPanel } = await import('./GroundStationPanel')

const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

const SAMPLE_PASS = {
  aos: new Date('2026-07-03T04:32:51.662Z'),
  los: new Date('2026-07-03T04:38:07.600Z'),
  maxElevationTime: new Date('2026-07-03T04:35:30.000Z'),
  maxElevationRad: (46.7 * Math.PI) / 180,
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  findNextPassesMock.mockReturnValue([SAMPLE_PASS])
})

describe('GroundStationPanel', () => {
  it('prompts for a location before any coordinates are entered', () => {
    render(<GroundStationPanel tle={ISS_TLE} />)
    expect(screen.getByText(/Enter a latitude and longitude/)).toBeInTheDocument()
    expect(findNextPassesMock).not.toHaveBeenCalled()
  })

  it('computes and lists passes once valid coordinates are entered', async () => {
    render(<GroundStationPanel tle={ISS_TLE} />)

    fireEvent.change(screen.getByLabelText('Observer latitude'), { target: { value: '37.7749' } })
    fireEvent.change(screen.getByLabelText('Observer longitude'), {
      target: { value: '-122.4194' },
    })

    await waitFor(() => expect(findNextPassesMock).toHaveBeenCalledTimes(1))
    expect(findNextPassesMock).toHaveBeenCalledWith(
      ISS_TLE,
      expect.objectContaining({
        latitudeRad: expect.closeTo((37.7749 * Math.PI) / 180, 6),
        longitudeRad: expect.closeTo((-122.4194 * Math.PI) / 180, 6),
      }),
      expect.any(Date),
    )
    expect(await screen.findByText('47°')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('shows a friendly message when no passes are found', async () => {
    findNextPassesMock.mockReturnValue([])
    render(<GroundStationPanel tle={ISS_TLE} />)

    fireEvent.change(screen.getByLabelText('Observer latitude'), { target: { value: '89' } })
    fireEvent.change(screen.getByLabelText('Observer longitude'), { target: { value: '0' } })

    expect(await screen.findByText(/No passes found/)).toBeInTheDocument()
  })

  it('shows an error message if pass computation throws', async () => {
    findNextPassesMock.mockImplementation(() => {
      throw new Error('propagation failed')
    })
    render(<GroundStationPanel tle={ISS_TLE} />)

    fireEvent.change(screen.getByLabelText('Observer latitude'), { target: { value: '37.7749' } })
    fireEvent.change(screen.getByLabelText('Observer longitude'), {
      target: { value: '-122.4194' },
    })

    expect(await screen.findByText(/Could not compute passes/)).toBeInTheDocument()
  })

  it('does not compute passes for out-of-range coordinates', () => {
    render(<GroundStationPanel tle={ISS_TLE} />)

    fireEvent.change(screen.getByLabelText('Observer latitude'), { target: { value: '200' } })
    fireEvent.change(screen.getByLabelText('Observer longitude'), { target: { value: '0' } })

    expect(findNextPassesMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Enter a latitude and longitude/)).toBeInTheDocument()
  })

  it('persists the entered location and restores it on remount', () => {
    const { unmount } = render(<GroundStationPanel tle={ISS_TLE} />)
    fireEvent.change(screen.getByLabelText('Observer latitude'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Observer longitude'), { target: { value: '20' } })
    unmount()

    render(<GroundStationPanel tle={ISS_TLE} />)
    expect(screen.getByLabelText('Observer latitude')).toHaveValue(10)
    expect(screen.getByLabelText('Observer longitude')).toHaveValue(20)
  })

  it('fills in coordinates from the Geolocation API on "Use my location"', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: { latitude: 51.5074, longitude: -0.1278, altitude: 35 },
          } as GeolocationPosition)
        },
      },
    })

    render(<GroundStationPanel tle={ISS_TLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    await waitFor(() => expect(screen.getByLabelText('Observer latitude')).toHaveValue(51.5074))
    expect(screen.getByLabelText('Observer longitude')).toHaveValue(-0.1278)
  })

  it('shows a denied message when geolocation permission is refused', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: 'denied' } as GeolocationPositionError)
        },
      },
    })

    render(<GroundStationPanel tle={ISS_TLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(await screen.findByText(/Location permission denied/)).toBeInTheDocument()
  })

  it('shows an unavailable message when the Geolocation API does not exist', () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: undefined })

    render(<GroundStationPanel tle={ISS_TLE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(screen.getByText(/Geolocation isn't available/)).toBeInTheDocument()
  })

  it('applies a presetLocation (e.g. from clicking a ground station pin)', async () => {
    render(
      <GroundStationPanel
        tle={ISS_TLE}
        presetLocation={{ latitudeDeg: 78.2298, longitudeDeg: 15.4078, nonce: 1 }}
      />,
    )

    await waitFor(() => expect(screen.getByLabelText('Observer latitude')).toHaveValue(78.2298))
    expect(screen.getByLabelText('Observer longitude')).toHaveValue(15.4078)
  })

  it('re-applies presetLocation when the nonce changes, even to the same coordinates', async () => {
    const { rerender } = render(
      <GroundStationPanel
        tle={ISS_TLE}
        presetLocation={{ latitudeDeg: 78.2298, longitudeDeg: 15.4078, nonce: 1 }}
      />,
    )
    await waitFor(() => expect(screen.getByLabelText('Observer latitude')).toHaveValue(78.2298))

    fireEvent.change(screen.getByLabelText('Observer latitude'), { target: { value: '0' } })
    expect(screen.getByLabelText('Observer latitude')).toHaveValue(0)

    rerender(
      <GroundStationPanel
        tle={ISS_TLE}
        presetLocation={{ latitudeDeg: 78.2298, longitudeDeg: 15.4078, nonce: 2 }}
      />,
    )
    await waitFor(() => expect(screen.getByLabelText('Observer latitude')).toHaveValue(78.2298))
  })
})
