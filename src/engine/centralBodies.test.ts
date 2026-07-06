import { describe, expect, it } from 'vitest'
import {
  CENTRAL_BODIES,
  CENTRAL_BODY_IDS,
  DEFAULT_CENTRAL_BODY_ID,
  isCentralBodyId,
} from './centralBodies'
import { MARS_MU_KM3_S2, MARS_RADIUS_KM, MOON_MU_KM3_S2, MOON_RADIUS_KM } from './constants'
import { orbitalPeriodSeconds } from './derived'

describe('CENTRAL_BODIES registry', () => {
  it('defaults to Earth', () => {
    expect(DEFAULT_CENTRAL_BODY_ID).toBe('earth')
  })

  it('lists exactly earth, moon, and mars', () => {
    expect(new Set(CENTRAL_BODY_IDS)).toEqual(new Set(['earth', 'moon', 'mars']))
  })

  it('only marks Earth as supporting Earth-only features', () => {
    expect(CENTRAL_BODIES.earth.hasEarthOnlyFeatures).toBe(true)
    expect(CENTRAL_BODIES.moon.hasEarthOnlyFeatures).toBe(false)
    expect(CENTRAL_BODIES.mars.hasEarthOnlyFeatures).toBe(false)
  })

  it('wires the Moon and Mars entries to their engine constants', () => {
    expect(CENTRAL_BODIES.moon.muKm3S2).toBe(MOON_MU_KM3_S2)
    expect(CENTRAL_BODIES.moon.radiusKm).toBe(MOON_RADIUS_KM)
    expect(CENTRAL_BODIES.mars.muKm3S2).toBe(MARS_MU_KM3_S2)
    expect(CENTRAL_BODIES.mars.radiusKm).toBe(MARS_RADIUS_KM)
  })
})

describe('isCentralBodyId', () => {
  it('accepts known ids and rejects everything else', () => {
    expect(isCentralBodyId('earth')).toBe(true)
    expect(isCentralBodyId('moon')).toBe(true)
    expect(isCentralBodyId('mars')).toBe(true)
    expect(isCentralBodyId('jupiter')).toBe(false)
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
})
