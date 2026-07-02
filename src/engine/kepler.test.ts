import { describe, expect, it } from 'vitest'
import {
  eccentricAnomalyFromTrue,
  meanAnomalyFromEccentric,
  normalizeAngle,
  solveKeplerEquation,
  trueAnomalyFromEccentric,
} from './kepler'

describe('normalizeAngle', () => {
  it('wraps negative angles into [0, 2π)', () => {
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 12)
  })

  it('wraps angles greater than 2π into [0, 2π)', () => {
    expect(normalizeAngle(2.5 * Math.PI)).toBeCloseTo(Math.PI / 2, 12)
  })

  it('leaves angles already in range unchanged', () => {
    expect(normalizeAngle(1)).toBeCloseTo(1, 12)
  })
})

describe('solveKeplerEquation', () => {
  it.each([0, 0.1, 0.5, 0.7, 0.9])('satisfies M = E - e sin(E) for e=%s', (e) => {
    for (const m of [0, 0.5, 1, 2, 3.5, 5, 6]) {
      const E = solveKeplerEquation(m, e)
      expect(meanAnomalyFromEccentric(E, e)).toBeCloseTo(normalizeAngle(m), 10)
    }
  })

  it('returns E = M exactly for a circular orbit (e=0)', () => {
    expect(solveKeplerEquation(1.234, 0)).toBeCloseTo(1.234, 12)
  })

  it('throws if it fails to converge', () => {
    expect(() => solveKeplerEquation(1, 0.5, 1e-15, 1)).toThrow()
  })
})

describe('true anomaly <-> eccentric anomaly', () => {
  it.each([0, 0.1, 0.3, 0.6, 0.9])('round-trips for e=%s', (e) => {
    for (const nu of [0, 0.5, 1.5, Math.PI, 4, 5.5]) {
      const E = eccentricAnomalyFromTrue(nu, e)
      const roundTripped = normalizeAngle(trueAnomalyFromEccentric(E, e))
      expect(roundTripped).toBeCloseTo(normalizeAngle(nu), 10)
    }
  })
})
