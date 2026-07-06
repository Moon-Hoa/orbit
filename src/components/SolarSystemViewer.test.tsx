import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SolarSystemSceneOptions } from '../three/SolarSystemScene'
import { SolarSystemViewer } from './SolarSystemViewer'

const startMock = vi.fn()
const disposeMock = vi.fn()
const playMock = vi.fn()
const pauseMock = vi.fn()
const setSpeedDaysPerSecondMock = vi.fn()
const setDateMock = vi.fn()
const syncToNowMock = vi.fn()
const clearSelectionMock = vi.fn()

let capturedOptions: SolarSystemSceneOptions | null = null

vi.mock('../three/SolarSystemScene', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../three/SolarSystemScene')>()
  return {
    ...actual,
    SolarSystemScene: vi.fn().mockImplementation(function MockSolarSystemScene(
      this: object,
      _container: HTMLElement,
      options: SolarSystemSceneOptions,
    ) {
      capturedOptions = options
      return Object.assign(this, {
        start: startMock,
        dispose: disposeMock,
        play: playMock,
        pause: pauseMock,
        setSpeedDaysPerSecond: setSpeedDaysPerSecondMock,
        setDate: setDateMock,
        syncToNow: syncToNowMock,
        clearSelection: clearSelectionMock,
      })
    }),
  }
})

const perseverance = {
  id: 'mars-2020-perseverance',
  name: 'Perseverance (Mars 2020)',
  agency: 'NASA',
  departureBody: 'earth' as const,
  arrivalBody: 'mars' as const,
  departureDate: '2020-07-30',
  arrivalDate: '2021-02-18',
  isIdealizedTransfer: true as const,
  description: 'Rover that landed in Jezero Crater alongside the Ingenuity helicopter.',
}

describe('SolarSystemViewer', () => {
  it('mounts a SolarSystemScene and starts it, disposing on unmount', () => {
    const { unmount } = render(<SolarSystemViewer />)
    expect(startMock).toHaveBeenCalledTimes(1)
    unmount()
    expect(disposeMock).toHaveBeenCalledTimes(1)
  })

  it('toggles play/pause', () => {
    render(<SolarSystemViewer />)
    // Mount settles first (React StrictMode double-invokes the mount effect);
    // clear so only clicks below are being measured.
    playMock.mockClear()
    pauseMock.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(playMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(pauseMock).toHaveBeenCalledTimes(1)
  })

  it('pushes a speed change through to scene.setSpeedDaysPerSecond', () => {
    render(<SolarSystemViewer />)
    setSpeedDaysPerSecondMock.mockClear() // clear the initial-mount call
    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '365' } })
    expect(setSpeedDaysPerSecondMock).toHaveBeenLastCalledWith(365)
  })

  it('calls scene.syncToNow on "Sync to now"', () => {
    render(<SolarSystemViewer />)
    fireEvent.click(screen.getByRole('button', { name: 'Sync to now' }))
    expect(syncToNowMock).toHaveBeenCalledTimes(1)
  })

  it('calls scene.setDate with a local-midnight date when a date is picked', () => {
    render(<SolarSystemViewer />)
    fireEvent.change(screen.getByLabelText('Jump to date'), { target: { value: '2020-10-01' } })

    expect(setDateMock).toHaveBeenCalledTimes(1)
    const passedDate: Date = setDateMock.mock.calls[0][0]
    expect(passedDate.getFullYear()).toBe(2020)
    expect(passedDate.getMonth()).toBe(9) // October, 0-indexed
    expect(passedDate.getDate()).toBe(1)
    expect(passedDate.getHours()).toBe(0)
  })

  it('updates the date readout via the scene\'s onTick callback', () => {
    render(<SolarSystemViewer />)
    act(() => {
      capturedOptions?.onTick?.(new Date('2020-10-01T12:00:00Z'))
    })
    expect(screen.getByTestId('date-readout')).not.toHaveTextContent(/^\s*$/)
  })

  it('shows "no spacecraft currently in transit" by default', () => {
    render(<SolarSystemViewer />)
    expect(screen.getByText('No spacecraft currently in transit at this date.')).toBeInTheDocument()
  })

  it('lists in-transit spacecraft reported via onInTransitUpdate', () => {
    render(<SolarSystemViewer />)
    act(() => {
      capturedOptions?.onInTransitUpdate?.([perseverance])
    })

    expect(screen.getByText('Perseverance (Mars 2020)')).toBeInTheDocument()
    expect(screen.getByText('(Earth → Mars)')).toBeInTheDocument()
    expect(
      screen.queryByText('No spacecraft currently in transit at this date.'),
    ).not.toBeInTheDocument()
  })

  it('shows a tooltip once a spacecraft is selected and its screen position is reported', () => {
    render(<SolarSystemViewer />)
    act(() => {
      capturedOptions?.onSpacecraftSelect?.(perseverance)
      capturedOptions?.onSelectedMarkerPositionUpdate?.({ xPx: 200, yPx: 100, occluded: false })
    })

    expect(screen.getByText('Perseverance (Mars 2020)')).toBeInTheDocument()
    expect(screen.getByText('NASA')).toBeInTheDocument()
  })

  it('calls scene.clearSelection when the tooltip is dismissed', () => {
    render(<SolarSystemViewer />)
    act(() => {
      capturedOptions?.onSpacecraftSelect?.(perseverance)
      capturedOptions?.onSelectedMarkerPositionUpdate?.({ xPx: 200, yPx: 100, occluded: false })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(clearSelectionMock).toHaveBeenCalledTimes(1)
  })

  it('clears the tooltip when the scene reports the selection cleared', () => {
    render(<SolarSystemViewer />)
    act(() => {
      capturedOptions?.onSpacecraftSelect?.(perseverance)
      capturedOptions?.onSelectedMarkerPositionUpdate?.({ xPx: 200, yPx: 100, occluded: false })
    })
    expect(screen.getByText('Perseverance (Mars 2020)')).toBeInTheDocument()

    act(() => {
      capturedOptions?.onSelectionClear?.()
    })
    expect(screen.queryByText('NASA')).not.toBeInTheDocument()
  })

  it('calls onViewModeChange when "Body view" is clicked', () => {
    const onViewModeChange = vi.fn()
    render(<SolarSystemViewer onViewModeChange={onViewModeChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Body view' }))
    expect(onViewModeChange).toHaveBeenCalledWith('body')
  })
})
