import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM, type OrbitalElements, velocityAtRadiusKmS } from '../engine'
import { findClosestApproach } from './closestApproach'
import { DesignOrbitSource } from './DesignOrbitSource'

function circularCoplanarElements(radiusKm: number): OrbitalElements {
  return {
    semiMajorAxisKm: radiusKm,
    eccentricity: 0,
    inclinationRad: 0,
    raanRad: 0,
    argOfPerigeeRad: 0,
    trueAnomalyRad: 0,
  }
}

describe('findClosestApproach', () => {
  // Two circular, coplanar orbits, both starting at true anomaly = 0 (i.e.
  // angularly aligned). Since they share a plane and start at the same
  // angle, their squared separation is r1^2 + r2^2 - 2*r1*r2*cos(dTheta),
  // which is minimized exactly when dTheta = 0 - true at t=0, and nowhere
  // else until dTheta wraps back around a full 2*pi (the synodic period).
  // So the hand-computable answer is: min distance = |r1 - r2|, at t~=0,
  // with relative velocity = |v1 - v2| (both moving the same tangential
  // direction at t=0).
  const r1 = EARTH_RADIUS_KM + 400
  const r2 = EARTH_RADIUS_KM + 800

  const sourceA = new DesignOrbitSource(circularCoplanarElements(r1))
  const sourceB = new DesignOrbitSource(circularCoplanarElements(r2))

  it('finds the closest approach at t~=0 with distance |r1 - r2|', () => {
    const result = findClosestApproach(sourceA, sourceB, 0)

    expect(result.minDistanceKm).toBeCloseTo(r2 - r1, 1)
    expect(Math.abs(result.timeToClosestApproachSeconds)).toBeLessThan(5)
  })

  it('finds a relative velocity matching |v1 - v2| for two circular orbits at the same angle', () => {
    const result = findClosestApproach(sourceA, sourceB, 0)

    const v1 = velocityAtRadiusKmS(r1, r1)
    const v2 = velocityAtRadiusKmS(r2, r2)
    expect(result.relativeVelocityKmS).toBeCloseTo(Math.abs(v1 - v2), 2)
  })

  it('returns zero separation for two identical orbits', () => {
    const identical = new DesignOrbitSource(circularCoplanarElements(r1))
    const result = findClosestApproach(sourceA, identical, 0)
    expect(result.minDistanceKm).toBeCloseTo(0, 3)
  })

  it('caps the lookahead window so a LEO-vs-GEO pair does not search indefinitely', () => {
    const leo = new DesignOrbitSource(circularCoplanarElements(EARTH_RADIUS_KM + 400))
    const geo = new DesignOrbitSource(circularCoplanarElements(EARTH_RADIUS_KM + 35786))
    // Should complete promptly and return a finite, sane result - the point
    // of this test is the search terminates in bounded time/samples rather
    // than trying to cover the full (very long) synodic period.
    const result = findClosestApproach(leo, geo, 0)
    expect(Number.isFinite(result.minDistanceKm)).toBe(true)
    expect(Number.isFinite(result.timeToClosestApproachSeconds)).toBe(true)
  })
})
