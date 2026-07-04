import { describe, expect, it } from 'vitest'
import { type TleRecord, propagateAt, toSatRec } from '../satellite'
import { eciToScene } from './coordinates'
import { SatelliteSwarm } from './SatelliteSwarm'

const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

/** Builds `count` fake TLE records, all with the ISS's real orbital data - fine here since these tests only care about *which index* gets refreshed on which `update()` call, not distinct per-satellite positions. */
function fakeTles(count: number): TleRecord[] {
  return Array.from({ length: count }, (_, i) => ({ ...ISS_TLE, noradId: String(i) }))
}

function expectedScenePosition(date: Date) {
  const { position } = propagateAt(toSatRec(ISS_TLE), date)
  return eciToScene(position)
}

function positionAt(swarm: SatelliteSwarm, index: number): [number, number, number] {
  const attr = swarm.points.geometry.getAttribute('position')
  return [attr.getX(index), attr.getY(index), attr.getZ(index)]
}

describe('SatelliteSwarm', () => {
  it('computes every satellite\'s real position up front, rather than starting at the origin', () => {
    const initialDate = new Date('2026-07-04T00:00:00Z')
    const swarm = new SatelliteSwarm(fakeTles(10), initialDate)
    const expected = expectedScenePosition(initialDate)

    for (let i = 0; i < 10; i++) {
      const [x, y, z] = positionAt(swarm, i)
      expect(x).toBeCloseTo(expected.x, 6)
      expect(y).toBeCloseTo(expected.y, 6)
      expect(z).toBeCloseTo(expected.z, 6)
    }
  })

  it('refreshes exactly one satellite per update() call when the swarm is small (chunk size 1)', () => {
    const t0 = new Date('2026-07-04T00:00:00Z')
    const swarm = new SatelliteSwarm(fakeTles(10), t0)

    const t1 = new Date('2026-07-04T00:10:00Z')
    const expectedT0 = expectedScenePosition(t0)
    const expectedT1 = expectedScenePosition(t1)

    swarm.update(t1)

    // Only index 0 (the start of the round-robin cursor) should reflect t1 now.
    const [x0] = positionAt(swarm, 0)
    expect(x0).toBeCloseTo(expectedT1.x, 6)
    for (let i = 1; i < 10; i++) {
      const [x] = positionAt(swarm, i)
      expect(x).toBeCloseTo(expectedT0.x, 6)
    }
  })

  it('cycles through every satellite exactly once over a full refresh cycle, then wraps around', () => {
    const t0 = new Date('2026-07-04T00:00:00Z')
    const swarm = new SatelliteSwarm(fakeTles(10), t0)
    const t1 = new Date('2026-07-04T00:10:00Z')
    const expectedT1 = expectedScenePosition(t1)

    for (let call = 0; call < 10; call++) {
      swarm.update(t1)
    }

    for (let i = 0; i < 10; i++) {
      const [x, y, z] = positionAt(swarm, i)
      expect(x).toBeCloseTo(expectedT1.x, 6)
      expect(y).toBeCloseTo(expectedT1.y, 6)
      expect(z).toBeCloseTo(expectedT1.z, 6)
    }

    // Wraps around: the 11th call should refresh index 0 again (to t2), not stop or throw.
    const t2 = new Date('2026-07-04T00:20:00Z')
    const expectedT2 = expectedScenePosition(t2)
    swarm.update(t2)
    const [x0] = positionAt(swarm, 0)
    expect(x0).toBeCloseTo(expectedT2.x, 6)
    const [x1] = positionAt(swarm, 1)
    expect(x1).toBeCloseTo(expectedT1.x, 6) // not yet its turn again
  })

  it('refreshes a proportionally larger chunk per call for a larger swarm', () => {
    // FRAMES_PER_REFRESH_CYCLE is 45, so 450 satellites -> chunk size 10.
    const t0 = new Date('2026-07-04T00:00:00Z')
    const swarm = new SatelliteSwarm(fakeTles(450), t0)
    const t1 = new Date('2026-07-04T00:10:00Z')
    const expectedT1 = expectedScenePosition(t1)
    const expectedT0 = expectedScenePosition(t0)

    swarm.update(t1)

    for (let i = 0; i < 10; i++) {
      const [x] = positionAt(swarm, i)
      expect(x).toBeCloseTo(expectedT1.x, 6)
    }
    const [x10] = positionAt(swarm, 10)
    expect(x10).toBeCloseTo(expectedT0.x, 6)
  })

  it('does nothing (no error) when updated with an empty swarm', () => {
    const swarm = new SatelliteSwarm([], new Date())
    expect(() => swarm.update(new Date())).not.toThrow()
  })

  it('toggles visibility on the underlying Points object', () => {
    const swarm = new SatelliteSwarm(fakeTles(3), new Date())
    expect(swarm.points.visible).toBe(true)
    swarm.setVisible(false)
    expect(swarm.points.visible).toBe(false)
  })

  it('disposes its geometry and material without throwing', () => {
    const swarm = new SatelliteSwarm(fakeTles(3), new Date())
    expect(() => swarm.dispose()).not.toThrow()
  })
})
