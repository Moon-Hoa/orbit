import { describe, expect, it } from 'vitest'
import { magnitude, normalize, slerp } from './vector'

describe('normalize', () => {
  it('scales a vector to unit length without changing its direction', () => {
    const v = normalize({ x: 3, y: 4, z: 0 })
    expect(magnitude(v)).toBeCloseTo(1, 10)
    expect(v.x).toBeCloseTo(0.6, 10)
    expect(v.y).toBeCloseTo(0.8, 10)
  })
})

describe('slerp', () => {
  it('returns a at t=0 and b at t=1', () => {
    const a = { x: 1, y: 0, z: 0 }
    const b = { x: 0, y: 2, z: 0 }
    const start = slerp(a, b, 0)
    const end = slerp(a, b, 1)
    expect(start.x).toBeCloseTo(a.x, 9)
    expect(start.y).toBeCloseTo(a.y, 9)
    expect(end.x).toBeCloseTo(b.x, 9)
    expect(end.y).toBeCloseTo(b.y, 9)
  })

  it('sweeps a quarter-circle exactly through the halfway point at t=0.5', () => {
    // Two perpendicular unit vectors: the great-circle midpoint is the
    // (normalized) sum, at 45 degrees between them.
    const a = { x: 1, y: 0, z: 0 }
    const b = { x: 0, y: 1, z: 0 }
    const mid = slerp(a, b, 0.5)
    expect(mid.x).toBeCloseTo(Math.SQRT1_2, 9)
    expect(mid.y).toBeCloseTo(Math.SQRT1_2, 9)
    expect(magnitude(mid)).toBeCloseTo(1, 9)
  })

  it('linearly interpolates magnitude alongside direction', () => {
    const a = { x: 1, y: 0, z: 0 } // magnitude 1
    const b = { x: 0, y: 3, z: 0 } // magnitude 3
    const mid = slerp(a, b, 0.5)
    expect(magnitude(mid)).toBeCloseTo(2, 9)
  })

  it('falls back gracefully when the two vectors point in the same direction', () => {
    const a = { x: 2, y: 0, z: 0 }
    const b = { x: 5, y: 0, z: 0 }
    const mid = slerp(a, b, 0.5)
    expect(mid.x).toBeCloseTo(3.5, 9)
    expect(mid.y).toBeCloseTo(0, 9)
  })

  it('falls back gracefully (no NaNs) when the two vectors point in exactly opposite directions', () => {
    const a = { x: 1, y: 0, z: 0 }
    const b = { x: -1, y: 0, z: 0 }
    const mid = slerp(a, b, 0.5)
    expect(Number.isNaN(mid.x)).toBe(false)
    expect(Number.isNaN(mid.y)).toBe(false)
    expect(Number.isNaN(mid.z)).toBe(false)
    expect(magnitude(mid)).toBeCloseTo(1, 9)
  })
})
