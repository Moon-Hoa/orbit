import { describe, expect, it } from 'vitest'
import { EARTH_MU_KM3_S2, EARTH_RADIUS_KM } from './constants'
import {
  apogeeAltitudeKm,
  apogeeRadiusKm,
  orbitalPeriodSeconds,
  perigeeAltitudeKm,
  perigeeRadiusKm,
  velocityAtRadiusKmS,
} from './derived'

describe('apogee/perigee', () => {
  it('computes ISS-like apogee/perigee altitude from a and e', () => {
    const a = EARTH_RADIUS_KM + 420
    const e = 0.0007

    expect(apogeeAltitudeKm(a, e)).toBeCloseTo(420 + a * e, 3)
    expect(perigeeAltitudeKm(a, e)).toBeCloseTo(420 - a * e, 3)
    expect(apogeeRadiusKm(a, e)).toBeGreaterThan(perigeeRadiusKm(a, e))
  })

  it('apogee equals perigee for a circular orbit', () => {
    const a = EARTH_RADIUS_KM + 700
    expect(apogeeRadiusKm(a, 0)).toBeCloseTo(perigeeRadiusKm(a, 0), 9)
  })
})

describe('velocityAtRadiusKmS (vis-viva)', () => {
  it('is faster at perigee than at apogee', () => {
    const a = 24000
    const e = 0.72
    const apogee = apogeeRadiusKm(a, e)
    const perigee = perigeeRadiusKm(a, e)

    const vApogee = velocityAtRadiusKmS(apogee, a)
    const vPerigee = velocityAtRadiusKmS(perigee, a)

    expect(vPerigee).toBeGreaterThan(vApogee)
  })

  it('matches the circular velocity formula sqrt(mu/a) for a circular orbit', () => {
    const a = EARTH_RADIUS_KM + 500
    expect(velocityAtRadiusKmS(a, a)).toBeCloseTo(Math.sqrt(EARTH_MU_KM3_S2 / a), 9)
  })
})

describe('orbitalPeriodSeconds', () => {
  it('increases monotonically with semi-major axis', () => {
    const shorter = orbitalPeriodSeconds(EARTH_RADIUS_KM + 400)
    const longer = orbitalPeriodSeconds(EARTH_RADIUS_KM + 800)
    expect(longer).toBeGreaterThan(shorter)
  })
})
