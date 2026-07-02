import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const startMock = vi.fn()
const disposeMock = vi.fn()

vi.mock('../three/OrbitScene', () => ({
  OrbitScene: vi.fn().mockImplementation(function MockOrbitScene(this: object) {
    return Object.assign(this, { start: startMock, dispose: disposeMock })
  }),
}))

const { OrbitViewer } = await import('./OrbitViewer')

describe('OrbitViewer', () => {
  it('mounts an OrbitScene and starts its render loop, disposing on unmount', () => {
    const { unmount } = render(<OrbitViewer />)
    expect(startMock).toHaveBeenCalledTimes(1)

    unmount()
    expect(disposeMock).toHaveBeenCalledTimes(1)
  })
})
