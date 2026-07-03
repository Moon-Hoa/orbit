import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
const getCameraStateMock = vi.fn()
const setCameraStateMock = vi.fn()
const addRealSatelliteCompanionMock = vi.fn()
const addDesignCompanionMock = vi.fn()
const removeObjectMock = vi.fn()
const setFocusedObjectMock = vi.fn()

let capturedOptions: OrbitSceneOptions | null = null

vi.mock('../three/OrbitScene', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../three/OrbitScene')>()
  return {
    ...actual,
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
        getCameraState: getCameraStateMock,
        setCameraState: setCameraStateMock,
        addRealSatelliteCompanion: addRealSatelliteCompanionMock,
        addDesignCompanion: addDesignCompanionMock,
        removeObject: removeObjectMock,
        setFocusedObject: setFocusedObjectMock,
      })
    }),
  }
})

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
  getCameraStateMock.mockReturnValue({
    position: { x: 0, y: 4, z: 10 },
    target: { x: 0, y: 0, z: 0 },
  })
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
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
      false,
    )
  })

  it('pushes the J2 toggle through to scene.setDesignElements', () => {
    render(<OrbitViewer />)
    setDesignElementsMock.mockClear()

    fireEvent.click(screen.getByLabelText(/Enable J2 perturbation/))

    expect(setDesignElementsMock).toHaveBeenLastCalledWith(expect.any(Object), true)
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

    capturedOptions?.onTick?.({
      simTimeSeconds: 125,
      altitudeKm: 410.456,
      speedKmS: 7.6612,
      shadowFraction: null,
    })

    expect(screen.getByTestId('time-readout')).toHaveTextContent('T+00:02:05')
    expect(screen.getByTestId('current-altitude')).toHaveTextContent('410.5 km')
    expect(screen.getByTestId('current-speed')).toHaveTextContent('7.66 km/s')
  })

  it('switches the live altitude/speed readouts to imperial once toggled in settings, and persists the choice', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Settings'))
    fireEvent.click(screen.getByRole('button', { name: 'Imperial' }))

    act(() => {
      capturedOptions?.onTick?.({
        simTimeSeconds: 0,
        altitudeKm: 410.456,
        speedKmS: 7.6612,
        shadowFraction: null,
      })
    })

    expect(screen.getByTestId('current-altitude')).toHaveTextContent('255.0 mi')
    expect(screen.getByTestId('current-speed')).toHaveTextContent('17138 mph')
    expect(localStorage.getItem('orbit:unit-system')).toBe('imperial')
  })

  it('does not show an eclipse indicator in design mode', () => {
    render(<OrbitViewer />)

    act(() => {
      capturedOptions?.onTick?.({
        simTimeSeconds: 0,
        altitudeKm: 400,
        speedKmS: 7.6,
        shadowFraction: 1,
      })
    })

    expect(screen.queryByTestId('current-eclipse-status')).not.toBeInTheDocument()
  })

  it('shows in-sunlight/in-eclipse based on shadowFraction once tracking a real satellite', async () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')

    act(() => {
      capturedOptions?.onTick?.({
        simTimeSeconds: 0,
        altitudeKm: 400,
        speedKmS: 7.6,
        shadowFraction: 0,
      })
    })
    expect(screen.getByTestId('current-eclipse-status')).toHaveTextContent('In sunlight')

    act(() => {
      capturedOptions?.onTick?.({
        simTimeSeconds: 0,
        altitudeKm: 400,
        speedKmS: 7.6,
        shadowFraction: 1,
      })
    })
    expect(screen.getByTestId('current-eclipse-status')).toHaveTextContent('In eclipse')
  })

  it('renders the day/night terminator once the scene reports a subsolar point', () => {
    render(<OrbitViewer />)

    act(() => {
      capturedOptions?.onSolarUpdate?.({ latitudeRad: 0.2, longitudeRad: 0.5, altitudeKm: 0 })
    })

    const groundTrack = screen.getByRole('img', { name: 'Ground track' })
    expect(groundTrack.querySelector('polygon')).not.toBeNull()
  })

  it('renders no terminator before the scene reports a subsolar point', () => {
    render(<OrbitViewer />)

    const groundTrack = screen.getByRole('img', { name: 'Ground track' })
    expect(groundTrack.querySelector('polygon')).toBeNull()
  })

  it('does not show a closest-approach panel with only the primary object tracked', () => {
    render(<OrbitViewer />)
    expect(screen.queryByText('Closest approach')).not.toBeInTheDocument()
  })

  it('shows the closest-approach panel once exactly two objects are tracked', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Add GEO as companion'))

    act(() => {
      capturedOptions?.onClosestApproachUpdate?.({
        timeToClosestApproachSeconds: 125,
        minDistanceKm: 1234.5,
        relativeVelocityKmS: 2.5,
      })
    })

    expect(screen.getByText('Closest approach')).toBeInTheDocument()
    expect(screen.getByText('1234.5 km')).toBeInTheDocument()
  })

  it('renders the ground track when the scene reports an update', () => {
    render(<OrbitViewer />)

    act(() => {
      capturedOptions?.onGroundTrackUpdate?.([
        {
          id: 'primary',
          points: [
            { latitudeRad: 0, longitudeRad: 0, altitudeKm: 408 },
            { latitudeRad: 0.1, longitudeRad: 0.1, altitudeKm: 408 },
          ],
        },
      ])
    })

    const groundTrack = screen.getByRole('img', { name: 'Ground track' })
    expect(groundTrack.querySelectorAll('polyline')).toHaveLength(1)
    expect(groundTrack.querySelectorAll('circle')).toHaveLength(1)
  })

  it('renders one track per object once a companion is added', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Add GEO as companion'))

    act(() => {
      capturedOptions?.onGroundTrackUpdate?.([
        { id: 'primary', points: [{ latitudeRad: 0, longitudeRad: 0, altitudeKm: 408 }] },
        { id: 'design:geo', points: [{ latitudeRad: 0, longitudeRad: 1, altitudeKm: 35786 }] },
      ])
    })

    const groundTrack = screen.getByRole('img', { name: 'Ground track' })
    expect(groundTrack.querySelectorAll('circle')).toHaveLength(2)
  })

  it('switches to the satellite search UI and auto-selects the ISS on entering track-real mode', async () => {
    render(<OrbitViewer />)

    expect(screen.getByLabelText('a value')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))

    expect(fetchByNoradIdMock).toHaveBeenCalledWith('25544')
    await screen.findByText('ISS (ZARYA)')

    expect(screen.queryByLabelText('a value')).not.toBeInTheDocument()
    // setRealSatellite fires from an effect keyed off the same setSelectedTle
    // update that findByText just resolved on - it can lag a tick behind in
    // slower CI environments, so poll rather than asserting synchronously.
    await waitFor(() => expect(setRealSatelliteMock).toHaveBeenCalledWith(ISS_TLE))
  })

  it('pushes a search result selection through to scene.setRealSatellite', async () => {
    searchByNameMock.mockResolvedValue([NAUKA_TLE])

    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')
    setRealSatelliteMock.mockClear()

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'nauka' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    const resultButton = await screen.findByRole('button', { name: 'ISS (NAUKA) #49044' })
    fireEvent.click(resultButton)

    await waitFor(() => expect(setRealSatelliteMock).toHaveBeenCalledWith(NAUKA_TLE))
  })
})

describe('OrbitViewer URL scenario sync', () => {
  it('decodes an initial design scenario from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?mode=design&a=7000&e=0.01&i=45&raan=10&argp=20&nu=30&speed=300',
    )
    render(<OrbitViewer />)

    expect(screen.getByLabelText('a value')).toHaveValue(7000)
    expect(screen.getByLabelText('e value')).toHaveValue(0.01)
    expect(screen.getByLabelText('Speed multiplier')).toHaveValue('300')
  })

  it('decodes an initial track-real scenario from the URL, fetching the right satellite', async () => {
    fetchByNoradIdMock.mockResolvedValue(NAUKA_TLE)
    window.history.replaceState(null, '', '/?mode=track-real&norad=49044&speed=60')

    render(<OrbitViewer />)

    expect(fetchByNoradIdMock).toHaveBeenCalledWith('49044')
    await screen.findByText('ISS (NAUKA)')
  })

  it('replaces (does not push) the URL when a slider changes', () => {
    render(<OrbitViewer />)
    const historyLengthBefore = window.history.length

    fireEvent.change(screen.getByLabelText('a value'), { target: { value: '7500' } })

    expect(window.history.length).toBe(historyLengthBefore)
    expect(window.location.search).toContain('a=7500')
  })

  it('pushes a new history entry when a preset is selected', () => {
    render(<OrbitViewer />)
    const historyLengthBefore = window.history.length

    fireEvent.click(screen.getByRole('button', { name: 'GEO' }))

    expect(window.history.length).toBe(historyLengthBefore + 1)
    expect(window.location.search).toContain('a=42164.137')
  })

  it('pushes a new history entry when the mode toggle is switched', async () => {
    render(<OrbitViewer />)
    const historyLengthBefore = window.history.length

    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')

    expect(window.history.length).toBe(historyLengthBefore + 1)
    expect(window.location.search).toContain('mode=track-real')
    expect(window.location.search).toContain('norad=25544')
  })

  it('copies the current scenario as a URL to the clipboard', async () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1))
    const copiedUrl = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0]
    expect(copiedUrl).toContain('mode=design')
    expect(copiedUrl).toMatch(/^http/)
  })

  it('restores a previous design scenario when a popstate event fires (back button)', () => {
    render(<OrbitViewer />)

    // Simulate the browser having navigated back to an earlier GEO scenario.
    window.history.pushState(
      null,
      '',
      '/?mode=design&a=42164.137&e=0&i=0&raan=0&argp=0&nu=0&speed=60',
    )
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(screen.getByLabelText('a value')).toHaveValue(42164.137)
  })

  it('restores a previous track-real scenario when a popstate event fires', async () => {
    render(<OrbitViewer />)
    fetchByNoradIdMock.mockResolvedValue(NAUKA_TLE)

    window.history.pushState(null, '', '/?mode=track-real&norad=49044&speed=60')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(fetchByNoradIdMock).toHaveBeenCalledWith('49044')
    await screen.findByText('ISS (NAUKA)')
  })
})

describe('OrbitViewer companions', () => {
  it('adds a design preset as a companion via its + button, without replacing the primary', () => {
    render(<OrbitViewer />)
    setDesignElementsMock.mockClear()

    fireEvent.click(screen.getByLabelText('Add GEO as companion'))

    expect(addDesignCompanionMock).toHaveBeenCalledWith(
      'design:geo',
      expect.objectContaining({ eccentricity: 0 }),
      expect.any(Number),
    )
    expect(setDesignElementsMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Focus GEO' })).toBeInTheDocument()
  })

  it('does not add the same design companion twice', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Add GEO as companion'))
    addDesignCompanionMock.mockClear()

    fireEvent.click(screen.getByLabelText('Add GEO as companion'))
    expect(addDesignCompanionMock).not.toHaveBeenCalled()
  })

  it('adds a searched satellite as a companion via its + button, without replacing the primary', async () => {
    searchByNameMock.mockResolvedValue([NAUKA_TLE])
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')
    setRealSatelliteMock.mockClear()

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'nauka' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    const addButton = await screen.findByLabelText('Add ISS (NAUKA) as companion')
    fireEvent.click(addButton)

    expect(addRealSatelliteCompanionMock).toHaveBeenCalledWith(
      'real:49044',
      NAUKA_TLE,
      expect.any(Number),
    )
    expect(setRealSatelliteMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Focus ISS (NAUKA)' })).toBeInTheDocument()
  })

  it('removes a companion via its stop-tracking button', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Add GEO as companion'))

    fireEvent.click(screen.getByLabelText('Stop tracking GEO'))

    expect(removeObjectMock).toHaveBeenCalledWith('design:geo')
    expect(screen.queryByRole('button', { name: 'Focus GEO' })).not.toBeInTheDocument()
  })

  it('focuses a companion when clicked, updating displayed stats and calling scene.setFocusedObject', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Add GEO as companion'))

    fireEvent.click(screen.getByRole('button', { name: 'Focus GEO' }))

    expect(setFocusedObjectMock).toHaveBeenCalledWith('design:geo')
    // GEO's period is ~1 sidereal day (~1436.1 min), distinct from the ISS-like primary's ~92.7 min.
    expect(screen.getByText('1436.1 min')).toBeInTheDocument()
  })

  it('resets focus back to the primary object once its elements change', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Add GEO as companion'))
    fireEvent.click(screen.getByRole('button', { name: 'Focus GEO' }))
    expect(screen.getByText('1436.1 min')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('a value'), { target: { value: '7500' } })

    expect(screen.queryByText('1436.1 min')).not.toBeInTheDocument()
  })
})
