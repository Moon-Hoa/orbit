import { describe, expect, it } from 'vitest'
import {
  CENTRAL_BODIES,
  CENTRAL_BODY_IDS,
  DEFAULT_CENTRAL_BODY_ID,
  isCentralBodyId,
} from './centralBodies'
import {
  JUPITER_MU_KM3_S2,
  JUPITER_RADIUS_KM,
  MARS_MU_KM3_S2,
  MARS_RADIUS_KM,
  MERCURY_MU_KM3_S2,
  MERCURY_RADIUS_KM,
  MOON_MU_KM3_S2,
  MOON_RADIUS_KM,
  NEPTUNE_MU_KM3_S2,
  NEPTUNE_RADIUS_KM,
  URANUS_MU_KM3_S2,
  URANUS_RADIUS_KM,
  VENUS_MU_KM3_S2,
  VENUS_RADIUS_KM,
} from './constants'
import { orbitalPeriodSeconds } from './derived'

describe('CENTRAL_BODIES registry', () => {
  it('defaults to Earth', () => {
    expect(DEFAULT_CENTRAL_BODY_ID).toBe('earth')
  })

  it('lists exactly earth, moon, mars, mercury, venus, jupiter, uranus, and neptune', () => {
    expect(new Set(CENTRAL_BODY_IDS)).toEqual(
      new Set(['earth', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'uranus', 'neptune']),
    )
  })

  it('only marks Earth as supporting Earth-only features', () => {
    for (const id of CENTRAL_BODY_IDS) {
      expect(CENTRAL_BODIES[id].hasEarthOnlyFeatures, id).toBe(id === 'earth')
    }
  })

  it('wires every non-Earth entry to its engine constants', () => {
    expect(CENTRAL_BODIES.moon.muKm3S2).toBe(MOON_MU_KM3_S2)
    expect(CENTRAL_BODIES.moon.radiusKm).toBe(MOON_RADIUS_KM)
    expect(CENTRAL_BODIES.mars.muKm3S2).toBe(MARS_MU_KM3_S2)
    expect(CENTRAL_BODIES.mars.radiusKm).toBe(MARS_RADIUS_KM)
    expect(CENTRAL_BODIES.mercury.muKm3S2).toBe(MERCURY_MU_KM3_S2)
    expect(CENTRAL_BODIES.mercury.radiusKm).toBe(MERCURY_RADIUS_KM)
    expect(CENTRAL_BODIES.venus.muKm3S2).toBe(VENUS_MU_KM3_S2)
    expect(CENTRAL_BODIES.venus.radiusKm).toBe(VENUS_RADIUS_KM)
    expect(CENTRAL_BODIES.jupiter.muKm3S2).toBe(JUPITER_MU_KM3_S2)
    expect(CENTRAL_BODIES.jupiter.radiusKm).toBe(JUPITER_RADIUS_KM)
    expect(CENTRAL_BODIES.uranus.muKm3S2).toBe(URANUS_MU_KM3_S2)
    expect(CENTRAL_BODIES.uranus.radiusKm).toBe(URANUS_RADIUS_KM)
    expect(CENTRAL_BODIES.neptune.muKm3S2).toBe(NEPTUNE_MU_KM3_S2)
    expect(CENTRAL_BODIES.neptune.radiusKm).toBe(NEPTUNE_RADIUS_KM)
  })
})

describe('isCentralBodyId', () => {
  it('accepts known ids and rejects everything else', () => {
    expect(isCentralBodyId('earth')).toBe(true)
    expect(isCentralBodyId('moon')).toBe(true)
    expect(isCentralBodyId('mars')).toBe(true)
    expect(isCentralBodyId('mercury')).toBe(true)
    expect(isCentralBodyId('venus')).toBe(true)
    expect(isCentralBodyId('jupiter')).toBe(true)
    expect(isCentralBodyId('uranus')).toBe(true)
    expect(isCentralBodyId('neptune')).toBe(true)
    expect(isCentralBodyId('saturn')).toBe(false)
    expect(isCentralBodyId(null)).toBe(false)
    expect(isCentralBodyId('')).toBe(false)
  })
})

describe('known-answer physical sanity checks (see Moon/Mars view issues)', () => {
  it('a ~100 km altitude low lunar orbit has a period of roughly 2 hours', () => {
    const semiMajorAxisKm = MOON_RADIUS_KM + 100
    const periodMinutes = orbitalPeriodSeconds(semiMajorAxisKm, MOON_MU_KM3_S2) / 60
    expect(periodMinutes).toBeCloseTo(117.8, 1)
  })

  it('the Mars areostationary altitude yields a period matching one Martian sidereal day (~24h37m)', () => {
    const marsSiderealDaySeconds = 24 * 3600 + 37 * 60 + 22
    const areostationarySemiMajorAxisKm = Math.cbrt(
      MARS_MU_KM3_S2 * (marsSiderealDaySeconds / (2 * Math.PI)) ** 2,
    )
    const periodSeconds = orbitalPeriodSeconds(areostationarySemiMajorAxisKm, MARS_MU_KM3_S2)
    expect(periodSeconds).toBeCloseTo(marsSiderealDaySeconds, 0)
  })

  // A 200 km altitude circular orbit's period, cross-checked against the
  // vis-viva-derived value for each body's real mu/radius - not tied to any
  // real mission, just a sanity check that mu/radius are wired correctly and
  // in the right units (a units mistake here would be off by orders of
  // magnitude, not a rounding error).
  it.each([
    ['mercury', MERCURY_MU_KM3_S2, MERCURY_RADIUS_KM, 95.7],
    ['venus', VENUS_MU_KM3_S2, VENUS_RADIUS_KM, 90.8],
    ['jupiter', JUPITER_MU_KM3_S2, JUPITER_RADIUS_KM, 172.7],
    ['uranus', URANUS_MU_KM3_S2, URANUS_RADIUS_KM, 177.8],
    ['neptune', NEPTUNE_MU_KM3_S2, NEPTUNE_RADIUS_KM, 156.6],
  ] as const)('a 200 km altitude circular orbit around %s has the expected period', (_name, mu, radiusKm, expectedMinutes) => {
    const periodMinutes = orbitalPeriodSeconds(radiusKm + 200, mu) / 60
    expect(periodMinutes).toBeCloseTo(expectedMinutes, 1)
  })
})
