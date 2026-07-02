import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const startMock = vi.fn()
const disposeMock = vi.fn()
const setElementsMock = vi.fn()
const playMock = vi.fn()
const pauseMock = vi.fn()
const setSpeedMultiplierMock = vi.fn()
const seekMock = vi.fn()

vi.mock('../three/OrbitScene', () => ({
  OrbitScene: vi.fn().mockImplementation(function MockOrbitScene(this: object) {
    return Object.assign(this, {
      start: startMock,
      dispose: disposeMock,
      setElements: setElementsMock,
      play: playMock,
      pause: pauseMock,
      setSpeedMultiplier: setSpeedMultiplierMock,
      seek: seekMock,
    })
  }),
}))

const { OrbitViewer } = await import('./OrbitViewer')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OrbitViewer', () => {
  it('mounts an OrbitScene and starts its render loop, disposing on unmount', () => {
    const { unmount } = render(<OrbitViewer />)
    expect(startMock).toHaveBeenCalledTimes(1)

    unmount()
    expect(disposeMock).toHaveBeenCalledTimes(1)
  })

  it('pushes a numeric input change straight through to scene.setElements', () => {
    render(<OrbitViewer />)
    setElementsMock.mockClear()

    const semiMajorAxisInput = screen.getByLabelText('a value')
    fireEvent.change(semiMajorAxisInput, { target: { value: '7000' } })

    expect(setElementsMock).toHaveBeenCalledWith(
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

  it('shows a Phase 5 placeholder when switching to track-real mode', () => {
    render(<OrbitViewer />)

    expect(screen.queryByText(/Coming in Phase 5/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Track real satellite' }))
    expect(screen.getByText(/Coming in Phase 5/)).toBeInTheDocument()
  })
})
