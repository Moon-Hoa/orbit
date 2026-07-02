import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TleRecord } from '../satellite'
import type { OrbitSceneOptions } from '../three/OrbitScene'

const startMock = vi.fn()
const disposeMock = vi.fn()
const setDesignElementsMock = vi.fn()
const setRealSatelliteMock = vi.fn()
const playMock = vi.fn()
const pauseMock = vi.fn()
const setSpeedMultiplierMock = vi.fn()
const seekMock = vi.fn()

let capturedOptions: OrbitSceneOptions | null = null

vi.mock('../three/OrbitScene', () => ({
  OrbitScene: vi.fn().mockImplementation(function MockOrbitScene(
    this: object,
    _container: HTMLElement,
    options: OrbitSceneOptions,
  ) {
    capturedOptions = options
    return Object.assign(this, {
      start: startMock,
      dispose: disposeMock,
      setDesignElements: setDesignElementsMock,
      setRealSatellite: setRealSatelliteMock,
      play: playMock,
      pause: pauseMock,
      setSpeedMultiplier: setSpeedMultiplierMock,
      seek: seekMock,
    })
  }),
}))

const fetchByNoradIdMock = vi.fn()
const searchByNameMock = vi.fn()

vi.mock('../satellite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../satellite')>()
  return { ...actual, fetchByNoradId: fetchByNoradIdMock, searchByName: searchByNameMock }
})

const { OrbitViewer } = await import('./OrbitViewer')

// Two real TLE snapshots (hardcoded, no network) so SGP4 propagation inside
// OrbitViewer's stats/period calculations has valid data to work with.
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
  capturedOptions = null
  fetchByNoradIdMock.mockResolvedValue(ISS_TLE)
  searchByNameMock.mockResolvedValue([])
})

describe('OrbitViewer', () => {
  it('mounts an OrbitScene and starts its render loop, disposing on unmount', () => {
    const { unmount } = render(<OrbitViewer />)
    expect(startMock).toHaveBeenCalledTimes(1)

    unmount()
    expect(disposeMock).toHaveBeenCalledTimes(1)
  })

  it('pushes a numeric input change straight through to scene.setDesignElements', () => {
    render(<OrbitViewer />)
    setDesignElementsMock.mockClear()

    const semiMajorAxisInput = screen.getByLabelText('a value')
    fireEvent.change(semiMajorAxisInput, { target: { value: '7000' } })

    expect(setDesignElementsMock).toHaveBeenCalledWith(
      expect.objectContaining({ semiMajorAxisKm: 7000 }),
    )
  })

  it('toggles play/pause', () => {
    render(<OrbitViewer />)
    // Mount settles first (React StrictMode double-invokes the mount effect);
    // clear so only clicks below are being measured.
    playMock.mockClear()
    pauseMock.mockClear()

    const playButton = screen.getByRole('button', { name: 'Play' })
    fireEvent.click(playButton)
    expect(playMock).toHaveBeenCalledTimes(1)

    const pauseButton = screen.getByRole('button', { name: 'Pause' })
    fireEvent.click(pauseButton)
    expect(pauseMock).toHaveBeenCalledTimes(1)
  })

  it('pushes a speed multiplier change through to scene.setSpeedMultiplier', () => {
    render(<OrbitViewer />)

    fireEvent.change(screen.getByLabelText('Speed multiplier'), { target: { value: '300' } })
    expect(setSpeedMultiplierMock).toHaveBeenCalledWith(300)
  })

  it('seeks to zero on "Jump to epoch"', () => {
    render(<OrbitViewer />)
    seekMock.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Jump to epoch' }))
    expect(seekMock).toHaveBeenCalledWith(0)
  })

  it('seeks when the scrub bar is dragged', () => {
    render(<OrbitViewer />)
    seekMock.mockClear()

    fireEvent.change(screen.getByLabelText('Scrub'), { target: { value: '120' } })
    expect(seekMock).toHaveBeenCalledWith(120)
  })

  it('updates the time/altitude/speed readouts via refs when the scene ticks', () => {
    render(<OrbitViewer />)

    capturedOptions?.onTick?.({ simTimeSeconds: 125, altitudeKm: 410.456, speedKmS: 7.6612 })

    expect(screen.getByTestId('time-readout')).toHaveTextContent('T+00:02:05')
    expect(screen.getByTestId('current-altitude')).toHaveTextContent('410.5 km')
    expect(screen.getByTestId('current-speed')).toHaveTextContent('7.66 km/s')
  })

  it('renders the ground track when the scene reports an update', () => {
    render(<OrbitViewer />)

    act(() => {
      capturedOptions?.onGroundTrackUpdate?.([
        { latitudeRad: 0, longitudeRad: 0, altitudeKm: 408 },
        { latitudeRad: 0.1, longitudeRad: 0.1, altitudeKm: 408 },
      ])
    })

    const groundTrack = screen.getByRole('img', { name: 'Ground track' })
    expect(groundTrack.querySelectorAll('polyline')).toHaveLength(1)
    expect(groundTrack.querySelectorAll('circle')).toHaveLength(1)
  })

  it('switches to the satellite search UI and auto-selects the ISS on entering track-real mode', async () => {
    render(<OrbitViewer />)

    expect(screen.getByLabelText('a value')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))

    expect(fetchByNoradIdMock).toHaveBeenCalledWith('25544')
    await screen.findByText('ISS (ZARYA)')

    expect(screen.queryByLabelText('a value')).not.toBeInTheDocument()
    expect(setRealSatelliteMock).toHaveBeenCalledWith(ISS_TLE)
  })

  it('pushes a search result selection through to scene.setRealSatellite', async () => {
    searchByNameMock.mockResolvedValue([NAUKA_TLE])

    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')
    setRealSatelliteMock.mockClear()

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'nauka' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    const resultButton = await screen.findByRole('button', { name: /ISS \(NAUKA\)/ })
    fireEvent.click(resultButton)

    expect(setRealSatelliteMock).toHaveBeenCalledWith(NAUKA_TLE)
  })
})
