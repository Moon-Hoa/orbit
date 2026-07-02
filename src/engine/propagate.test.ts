import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM, SIDEREAL_DAY_S, TWO_PI } from './constants'
import { elementsToStateVector } from './elements'
import { propagateElements, propagateToStateVector } from './propagate'
import { apogeeRadiusKm, orbitalPeriodSeconds, perigeeRadiusKm } from './derived'
import type { OrbitalElements } from './types'
import { magnitude } from './vector'

const degToRad = (deg: number) => (deg * Math.PI) / 180

/** Smallest signed angular difference a - b, wrapped to (-π, π]. */
function angularDifference(a: number, b: number): number {
  const diff = (a - b) % TWO_PI
  if (diff > Math.PI) return diff - TWO_PI
  if (diff < -Math.PI) return diff + TWO_PI
  return diff
}

describe('known-answer orbital periods', () => {
  it('an ISS-like orbit (~408 km altitude) has a period of ~92.68 minutes', () => {
    const semiMajorAxisKm = EARTH_RADIUS_KM + 408
    const periodMinutes = orbitalPeriodSeconds(semiMajorAxisKm) / 60
    expect(periodMinutes).toBeCloseTo(92.68, 0)
  })

  it('a 35,786 km circular equatorial (geostationary) orbit has a ~sidereal-day period', () => {
    const semiMajorAxisKm = EARTH_RADIUS_KM + 35786
    const periodSeconds = orbitalPeriodSeconds(semiMajorAxisKm)
    expect(periodSeconds).toBeCloseTo(SIDEREAL_DAY_S, 0)
  })
})

describe('propagateElements', () => {
  const issLike: OrbitalElements = {
    semiMajorAxisKm: EARTH_RADIUS_KM + 408,
    eccentricity: 0.0007,
    inclinationRad: degToRad(51.6),
    raanRad: degToRad(45),
    argOfPerigeeRad: degToRad(30),
    trueAnomalyRad: 0,
  }

  it('returns to the same true anomaly after exactly one full period', () => {
    const period = orbitalPeriodSeconds(issLike.semiMajorAxisKm)
    const propagated = propagateElements(issLike, period)
    expect(
      Math.abs(angularDifference(propagated.trueAnomalyRad, issLike.trueAnomalyRad)),
    ).toBeLessThan(1e-6)
  })

  it('leaves a, e, i, RAAN, and argument of perigee unchanged (two-body invariants)', () => {
    const propagated = propagateElements(issLike, 1234.5)
    expect(propagated.semiMajorAxisKm).toBe(issLike.semiMajorAxisKm)
    expect(propagated.eccentricity).toBe(issLike.eccentricity)
    expect(propagated.inclinationRad).toBe(issLike.inclinationRad)
    expect(propagated.raanRad).toBe(issLike.raanRad)
    expect(propagated.argOfPerigeeRad).toBe(issLike.argOfPerigeeRad)
  })

  it('keeps propagated position within [perigee, apogee] radius bounds', () => {
    const perigee = perigeeRadiusKm(issLike.semiMajorAxisKm, issLike.eccentricity)
    const apogee = apogeeRadiusKm(issLike.semiMajorAxisKm, issLike.eccentricity)
    const period = orbitalPeriodSeconds(issLike.semiMajorAxisKm)

    for (const fraction of [0, 0.1, 0.25, 0.5, 0.75, 0.9]) {
      const state = propagateToStateVector(issLike, fraction * period)
      const radius = magnitude(state.position)
      expect(radius).toBeGreaterThanOrEqual(perigee - 1e-6)
      expect(radius).toBeLessThanOrEqual(apogee + 1e-6)
    }
  })

  it('agrees with directly building the state vector at true anomaly = 0', () => {
    const direct = elementsToStateVector(issLike)
    const propagated = propagateToStateVector(issLike, 0)
    expect(propagated.position.x).toBeCloseTo(direct.position.x, 9)
    expect(propagated.position.y).toBeCloseTo(direct.position.y, 9)
    expect(propagated.position.z).toBeCloseTo(direct.position.z, 9)
  })
})
