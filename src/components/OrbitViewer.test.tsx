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
const syncToNowMock = vi.fn()
const setPlaybackCapMock = vi.fn()
const setGroundStationCategoryVisibleMock = vi.fn()
const setSatelliteSwarmVisibleMock = vi.fn()
const setCentralBodyMock = vi.fn()
const setCelestialObjectCategoryVisibleMock = vi.fn()
const setCelestialOrbitersVisibleMock = vi.fn()

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
        syncToNow: syncToNowMock,
        setPlaybackCap: setPlaybackCapMock,
        setGroundStationCategoryVisible: setGroundStationCategoryVisibleMock,
        setSatelliteSwarmVisible: setSatelliteSwarmVisibleMock,
        setCentralBody: setCentralBodyMock,
        setCelestialObjectCategoryVisible: setCelestialObjectCategoryVisibleMock,
        setCelestialOrbitersVisible: setCelestialOrbitersVisibleMock,
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
      currentDate: new Date('2026-07-03T00:02:05Z'),
    })

    expect(screen.getByTestId('time-readout')).toHaveTextContent('T+00:02:05')
    expect(screen.getByTestId('current-altitude')).toHaveTextContent('410.5 km')
    expect(screen.getByTestId('current-speed')).toHaveTextContent('7.66 km/s')
  })

  it('updates the real-time readout via ref when the scene ticks', () => {
    render(<OrbitViewer />)

    act(() => {
      capturedOptions?.onTick?.({
        simTimeSeconds: 0,
        altitudeKm: 400,
        speedKmS: 7.6,
        shadowFraction: null,
        currentDate: new Date('2026-07-03T00:02:05Z'),
      })
    })

    expect(screen.getByTestId('real-time-readout')).toHaveTextContent(
      new Date('2026-07-03T00:02:05Z').toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    )
  })

  it('syncs to now on "Sync to now"', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Sync to now' }))
    expect(syncToNowMock).toHaveBeenCalledTimes(1)
  })

  it('syncs to now and plays forward 24h on "Sync to now, +24h"', () => {
    render(<OrbitViewer />)
    playMock.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Sync to now, +24h' }))
    expect(syncToNowMock).toHaveBeenCalledTimes(1)
    expect(setPlaybackCapMock).toHaveBeenCalledWith(24 * 60 * 60)
    expect(playMock).toHaveBeenCalledTimes(1)
  })

  it('pauses the play/pause UI when the scene auto-pauses (e.g. hitting the +24h cap)', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()

    act(() => {
      capturedOptions?.onAutoPause?.()
    })

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
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
        currentDate: new Date('2026-07-03T00:00:00Z'),
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
        currentDate: new Date('2026-07-03T00:00:00Z'),
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
        currentDate: new Date('2026-07-03T00:00:00Z'),
      })
    })
    expect(screen.getByTestId('current-eclipse-status')).toHaveTextContent('In sunlight')

    act(() => {
      capturedOptions?.onTick?.({
        simTimeSeconds: 0,
        altitudeKm: 400,
        speedKmS: 7.6,
        shadowFraction: 1,
        currentDate: new Date('2026-07-03T00:00:00Z'),
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

  it('announces mode switches in the aria-live region', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    expect(screen.getByRole('status')).toHaveTextContent('Track real satellite mode')

    fireEvent.click(screen.getByRole('button', { name: 'Design orbit' }))
    expect(screen.getByRole('status')).toHaveTextContent('Design orbit mode')
  })

  it('announces the loaded preset in the aria-live region', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'GEO' }))
    expect(screen.getByRole('status')).toHaveTextContent('GEO preset loaded')
  })

  it('announces the auto-selected ISS when entering track-real mode', async () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')

    expect(screen.getByRole('status')).toHaveTextContent('Tracking ISS (ZARYA), NORAD 25544')
  })

  it('toggles the accessible data table via keyboard-operable button', () => {
    render(<OrbitViewer />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show data table' }))
    expect(screen.getByRole('table')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide data table' }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
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

describe('OrbitViewer bulk companions', () => {
  function fakeTle(noradId: string, name: string): TleRecord {
    return {
      name,
      noradId,
      line1: `1 ${noradId}U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996`,
      line2: `2 ${noradId}  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972`,
    }
  }

  it('bulk-adds every checked design preset as a companion in one action', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByLabelText('Select GEO for bulk add'))
    fireEvent.click(screen.getByLabelText('Select Molniya for bulk add'))
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 selected as companions' }))

    expect(addDesignCompanionMock).toHaveBeenCalledWith(
      'design:geo',
      expect.objectContaining({ eccentricity: 0 }),
      expect.any(Number),
    )
    expect(addDesignCompanionMock).toHaveBeenCalledWith(
      'design:molniya',
      expect.objectContaining({ eccentricity: 0.74 }),
      expect.any(Number),
    )
    expect(screen.getByRole('button', { name: 'Focus GEO' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Focus Molniya' })).toBeInTheDocument()
    expect(screen.getByText('Added 2.')).toBeInTheDocument()
  })

  it('assigns each bulk-added companion a distinct color, in sequence', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByLabelText('Select GEO for bulk add'))
    fireEvent.click(screen.getByLabelText('Select Molniya for bulk add'))
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 selected as companions' }))

    const geoColor = addDesignCompanionMock.mock.calls.find((call) => call[0] === 'design:geo')?.[2]
    const molniyaColor = addDesignCompanionMock.mock.calls.find(
      (call) => call[0] === 'design:molniya',
    )?.[2]
    expect(geoColor).not.toBe(molniyaColor)
  })

  it('skips a preset already tracked when bulk-adding, without erroring', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Add GEO as companion'))
    addDesignCompanionMock.mockClear()

    fireEvent.click(screen.getByLabelText('Select GEO for bulk add'))
    fireEvent.click(screen.getByLabelText('Select Molniya for bulk add'))
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 selected as companions' }))

    expect(addDesignCompanionMock).toHaveBeenCalledTimes(1)
    expect(addDesignCompanionMock).toHaveBeenCalledWith(
      'design:molniya',
      expect.any(Object),
      expect.any(Number),
    )
    expect(
      screen.getByText('Added 1, skipped 1 (already tracked or companion limit reached).'),
    ).toBeInTheDocument()
  })

  it('stops bulk-adding once MAX_COMPANIONS is reached and reports the rest as skipped', async () => {
    searchByNameMock.mockResolvedValue([
      fakeTle('10001', 'Sat A'),
      fakeTle('10002', 'Sat B'),
      fakeTle('10003', 'Sat C'),
      fakeTle('10004', 'Sat D'),
      fakeTle('10005', 'Sat E'),
      fakeTle('10006', 'Sat F'),
      fakeTle('10007', 'Sat G'),
    ])
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')

    fireEvent.change(screen.getByLabelText('Satellite search'), { target: { value: 'sat' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByLabelText('Select Sat A for bulk add')

    for (const name of ['Sat A', 'Sat B', 'Sat C', 'Sat D', 'Sat E', 'Sat F', 'Sat G']) {
      fireEvent.click(screen.getByLabelText(`Select ${name} for bulk add`))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Add 7 selected as companions' }))

    // MAX_COMPANIONS is 6 (COMPANION_COLOR_PALETTE.length): all 7 requested, only 6 fit.
    expect(addRealSatelliteCompanionMock).toHaveBeenCalledTimes(6)
    expect(
      screen.getByText('Added 6, skipped 1 (already tracked or companion limit reached).'),
    ).toBeInTheDocument()
  })

  it('bulk-adds every valid TLE from a pasted multi-record block as a companion', async () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')

    fireEvent.click(screen.getByRole('button', { name: 'Paste TLE mode' }))
    fireEvent.change(screen.getByLabelText('Paste TLE'), {
      target: { value: `${NAUKA_TLE.name}\n${NAUKA_TLE.line1}\n${NAUKA_TLE.line2}` },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add all as companions' }))

    expect(addRealSatelliteCompanionMock).toHaveBeenCalledWith(
      'real:49044',
      NAUKA_TLE,
      expect.any(Number),
    )
    expect(screen.getByRole('button', { name: 'Focus ISS (NAUKA)' })).toBeInTheDocument()
  })
})

describe('OrbitViewer ground stations', () => {
  it('toggles a ground station category through to scene.setGroundStationCategoryVisible', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Settings'))

    fireEvent.click(screen.getByLabelText(/ESA Estrack/))

    expect(setGroundStationCategoryVisibleMock).toHaveBeenCalledWith('estrack', true)
  })

  it('does not show a "use for pass prediction" button in design mode', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Settings'))

    act(() => {
      capturedOptions?.onGroundStationSelect?.({
        station: { id: 'ksat-svalbard', name: 'Svalbard (SvalSat)', latitudeDeg: 78.2298, longitudeDeg: 15.4078 },
        categoryId: 'ksat',
        categoryLabel: 'KSAT',
      })
    })

    expect(screen.getByText('Svalbard (SvalSat)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use for pass prediction' })).not.toBeInTheDocument()
  })

  it('feeds a selected ground station into GroundStationPanel once "Use for pass prediction" is clicked, in track-real mode', async () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')

    fireEvent.click(screen.getByLabelText('Settings'))
    act(() => {
      capturedOptions?.onGroundStationSelect?.({
        station: { id: 'ksat-svalbard', name: 'Svalbard (SvalSat)', latitudeDeg: 78.2298, longitudeDeg: 15.4078 },
        categoryId: 'ksat',
        categoryLabel: 'KSAT',
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Use for pass prediction' }))

    await waitFor(() => expect(screen.getByLabelText('Observer latitude')).toHaveValue(78.2298))
    expect(screen.getByLabelText('Observer longitude')).toHaveValue(15.4078)
  })
})

describe('OrbitViewer all satellites', () => {
  it('calls scene.setSatelliteSwarmVisible(true) when the toggle is clicked on', async () => {
    setSatelliteSwarmVisibleMock.mockResolvedValue(undefined)
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Settings'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'All satellites' }))
    })

    expect(setSatelliteSwarmVisibleMock).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'All satellites' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('calls scene.setSatelliteSwarmVisible(false) when toggled back off', async () => {
    setSatelliteSwarmVisibleMock.mockResolvedValue(undefined)
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Settings'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'All satellites' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'All satellites' }))
    })

    expect(setSatelliteSwarmVisibleMock).toHaveBeenLastCalledWith(false)
    expect(screen.getByRole('button', { name: 'All satellites' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows an error and stays off if the scene rejects (e.g. the Celestrak fetch failed)', async () => {
    setSatelliteSwarmVisibleMock.mockRejectedValue(new Error('fetch failed'))
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Settings'))

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

describe('OrbitViewer central body (see Moon/Mars view issues)', () => {
  it('calls scene.setCentralBody when a different body is selected', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))

    expect(setCentralBodyMock).toHaveBeenCalledWith('moon')
    expect(screen.getByRole('button', { name: 'Moon' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Moon selected')
  })

  it('hides Earth-only presets and shows the body radius in the perigee warning once a non-Earth body is selected', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))

    expect(screen.queryByRole('button', { name: 'ISS' })).not.toBeInTheDocument()
  })

  it('disables "Track real satellite" once a non-Earth body is selected', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))

    expect(screen.getByRole('button', { name: 'Track real satellite' })).toBeDisabled()
  })

  it('falls back to design mode when switching away from Earth while tracking a real satellite', async () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    await screen.findByText('ISS (ZARYA)')
    expect(screen.getByRole('button', { name: 'Track real satellite' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))

    expect(screen.getByRole('button', { name: 'Design orbit' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides ground-station/all-satellites/ground-track/export controls once a non-Earth body is selected', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))
    fireEvent.click(screen.getByLabelText('Settings'))

    expect(screen.queryByRole('button', { name: 'All satellites' })).not.toBeInTheDocument()
    expect(screen.queryByText('Ground stations')).not.toBeInTheDocument()
    expect(screen.queryByText('Ground track')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export KML' })).not.toBeInTheDocument()
  })

  it('re-shows Earth-only controls when switching back to Earth', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))
    fireEvent.click(screen.getByRole('button', { name: 'Earth' }))
    fireEvent.click(screen.getByLabelText('Settings'))

    expect(screen.getByRole('button', { name: 'All satellites' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ISS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Track real satellite' })).not.toBeDisabled()
  })
})

describe('OrbitViewer celestial object catalogs (see Moon/Mars surface catalog issues)', () => {
  it('shows the "Surface objects" section instead of ground-station controls once a non-Earth body is selected', () => {
    render(<OrbitViewer />)

    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))
    fireEvent.click(screen.getByLabelText('Settings'))

    expect(screen.getByText('Surface objects')).toBeInTheDocument()
    expect(screen.queryByText('Ground stations')).not.toBeInTheDocument()
  })

  it('hides the "Surface objects" section on Earth', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByLabelText('Settings'))
    expect(screen.queryByText('Surface objects')).not.toBeInTheDocument()
  })

  it('lists Moon categories and calls scene.setCelestialObjectCategoryVisible when one is toggled', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))
    fireEvent.click(screen.getByLabelText('Settings'))

    const row = screen.getByText('Apollo landings').closest('label')
    fireEvent.click(row!.querySelector('input[type="checkbox"]')!)

    expect(setCelestialObjectCategoryVisibleMock).toHaveBeenCalledWith('moon-apollo', true)
  })

  it('lists Mars categories once Mars is selected', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Mars' }))
    fireEvent.click(screen.getByLabelText('Settings'))

    expect(screen.getByText('Landers & rovers')).toBeInTheDocument()
    expect(screen.queryByText('Apollo landings')).not.toBeInTheDocument()
  })

  it('calls scene.setCelestialOrbitersVisible when the orbiters checkbox is toggled', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))
    fireEvent.click(screen.getByLabelText('Settings'))

    const row = screen.getByText('Active orbiters').closest('label')
    fireEvent.click(row!.querySelector('input[type="checkbox"]')!)

    expect(setCelestialOrbitersVisibleMock).toHaveBeenCalledWith(true)
  })

  it('resets category visibility and the selected object when switching bodies', () => {
    render(<OrbitViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Moon' }))
    fireEvent.click(screen.getByLabelText('Settings'))
    fireEvent.click(screen.getByText('Apollo landings').closest('label')!.querySelector('input')!)

    fireEvent.click(screen.getByRole('button', { name: 'Mars' }))

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked()
    }
  })
})
