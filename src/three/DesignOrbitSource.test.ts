import { describe, expect, it } from 'vitest'
import { EARTH_MU_KM3_S2, EARTH_RADIUS_KM, MOON_MU_KM3_S2, type OrbitalElements } from '../engine'
import { DesignOrbitSource } from './DesignOrbitSource'

const circularElements: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0,
  inclinationRad: 0,
  raanRad: 0,
  argOfPerigeeRad: 0,
  trueAnomalyRad: 0,
}

describe('DesignOrbitSource mu threading (see Moon/Mars view issues)', () => {
  it('defaults to Earth mu when none is given', () => {
    const earthDefault = new DesignOrbitSource(circularElements)
    const earthExplicit = new DesignOrbitSource(circularElements, false, EARTH_MU_KM3_S2)
    expect(earthDefault.getPeriodSeconds()).toBeCloseTo(earthExplicit.getPeriodSeconds(), 6)
  })

  it('exposes the elements/enableJ2 it was constructed with, for re-anchoring to a new body', () => {
    const source = new DesignOrbitSource(circularElements, true, MOON_MU_KM3_S2)
    expect(source.getElements()).toEqual(circularElements)
    expect(source.getEnableJ2()).toBe(true)
  })

  it('a smaller mu (e.g. the Moon) yields a longer period at the same semi-major axis', () => {
    const aroundEarth = new DesignOrbitSource(circularElements, false, EARTH_MU_KM3_S2)
    const aroundMoon = new DesignOrbitSource(circularElements, false, MOON_MU_KM3_S2)
    expect(aroundMoon.getPeriodSeconds()).toBeGreaterThan(aroundEarth.getPeriodSeconds())
  })

  it('mu changes velocity but not the drawn orbit path shape', () => {
    const aroundEarth = new DesignOrbitSource(circularElements, false, EARTH_MU_KM3_S2)
    const aroundMoon = new DesignOrbitSource(circularElements, false, MOON_MU_KM3_S2)

    const earthState = aroundEarth.getStateAt(0)
    const moonState = aroundMoon.getStateAt(0)
    // Same instant, same elements -> same position (mu doesn't affect where the
    // point on the ellipse is at t=0 for a freshly-defined true anomaly), but
    // different speed since mu changes mean motion / vis-viva velocity.
    expect(moonState.position).toEqual(earthState.position)
    expect(Math.hypot(moonState.velocity.x, moonState.velocity.y, moonState.velocity.z)).toBeLessThan(
      Math.hypot(earthState.velocity.x, earthState.velocity.y, earthState.velocity.z),
    )

    const earthPath = aroundEarth.getOrbitPathPoints()
    const moonPath = aroundMoon.getOrbitPathPoints()
    for (let i = 0; i < earthPath.length; i++) {
      expect(moonPath[i].distanceTo(earthPath[i])).toBeCloseTo(0, 9)
    }
  })
})
