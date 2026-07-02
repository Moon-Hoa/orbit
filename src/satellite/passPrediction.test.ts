import { describe, expect, it } from 'vitest'
import { findNextPasses, lookAnglesAt } from './passPrediction'
import { tleToGeodetic } from './sgp4'
import type { TleRecord } from './types'

// A real ISS TLE snapshot, hardcoded so this test is deterministic and
// doesn't depend on network access.
const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

const SAN_FRANCISCO = {
  latitudeRad: (37.7749 * Math.PI) / 180,
  longitudeRad: (-122.4194 * Math.PI) / 180,
  altitudeKm: 0,
}

const FIXED_DATE = new Date('2026-07-02T12:00:00Z')

describe('lookAnglesAt', () => {
  it('reports ~90 degrees elevation for an observer directly under the satellite', () => {
    const geo = tleToGeodetic(ISS_TLE, FIXED_DATE)
    const observerUnderSatellite = {
      latitudeRad: geo.latitudeRad,
      longitudeRad: geo.longitudeRad,
      altitudeKm: 0,
    }

    const look = lookAnglesAt(ISS_TLE, observerUnderSatellite, FIXED_DATE)
    expect((look.elevationRad * 180) / Math.PI).toBeGreaterThan(89.9)
    expect(look.rangeKm).toBeCloseTo(geo.altitudeKm, 0)
  })

  it('reports a negative elevation for an observer on the opposite side of the Earth', () => {
    const geo = tleToGeodetic(ISS_TLE, FIXED_DATE)
    const antipodalObserver = {
      latitudeRad: -geo.latitudeRad,
      longitudeRad: geo.longitudeRad + Math.PI,
      altitudeKm: 0,
    }

    const look = lookAnglesAt(ISS_TLE, antipodalObserver, FIXED_DATE)
    expect(look.elevationRad).toBeLessThan(0)
  })
})

describe('findNextPasses', () => {
  const passes = findNextPasses(ISS_TLE, SAN_FRANCISCO, FIXED_DATE, { count: 5 })

  it('finds the requested number of passes within the default search window', () => {
    expect(passes.length).toBe(5)
  })

  it('returns chronologically ordered, non-overlapping passes', () => {
    for (let i = 0; i < passes.length; i++) {
      expect(passes[i].aos.getTime()).toBeLessThan(passes[i].los.getTime())
      if (i > 0) {
        expect(passes[i].aos.getTime()).toBeGreaterThan(passes[i - 1].los.getTime())
      }
    }
  })

  it('has elevation crossing zero in the right direction at AOS and LOS', () => {
    for (const pass of passes) {
      const beforeAos = lookAnglesAt(
        ISS_TLE,
        SAN_FRANCISCO,
        new Date(pass.aos.getTime() - 2000),
      ).elevationRad
      const afterAos = lookAnglesAt(
        ISS_TLE,
        SAN_FRANCISCO,
        new Date(pass.aos.getTime() + 2000),
      ).elevationRad
      expect(beforeAos).toBeLessThan(0)
      expect(afterAos).toBeGreaterThan(0)

      const beforeLos = lookAnglesAt(
        ISS_TLE,
        SAN_FRANCISCO,
        new Date(pass.los.getTime() - 2000),
      ).elevationRad
      const afterLos = lookAnglesAt(
        ISS_TLE,
        SAN_FRANCISCO,
        new Date(pass.los.getTime() + 2000),
      ).elevationRad
      expect(beforeLos).toBeGreaterThan(0)
      expect(afterLos).toBeLessThan(0)
    }
  })

  it('reports a max elevation that is a true local maximum within the pass', () => {
    for (const pass of passes) {
      expect(pass.maxElevationTime.getTime()).toBeGreaterThanOrEqual(pass.aos.getTime())
      expect(pass.maxElevationTime.getTime()).toBeLessThanOrEqual(pass.los.getTime())

      // Sample densely across the pass; nothing should exceed the reported max
      // by more than a tiny numerical margin.
      const durationMs = pass.los.getTime() - pass.aos.getTime()
      for (let f = 0; f <= 1; f += 0.05) {
        const sampleElevation = lookAnglesAt(
          ISS_TLE,
          SAN_FRANCISCO,
          new Date(pass.aos.getTime() + f * durationMs),
        ).elevationRad
        expect(sampleElevation).toBeLessThanOrEqual(pass.maxElevationRad + 1e-6)
      }
    }
  })

  it('reports physically plausible pass durations and elevations for a LEO satellite', () => {
    for (const pass of passes) {
      const durationMinutes = (pass.los.getTime() - pass.aos.getTime()) / 60000
      expect(durationMinutes).toBeGreaterThan(1)
      expect(durationMinutes).toBeLessThan(20)

      const maxElevationDeg = (pass.maxElevationRad * 180) / Math.PI
      expect(maxElevationDeg).toBeGreaterThan(0)
      expect(maxElevationDeg).toBeLessThanOrEqual(90)
    }
  })

  it('treats the search start as AOS when already mid-pass', () => {
    const firstPass = passes[0]
    const midPassStart = new Date((firstPass.aos.getTime() + firstPass.los.getTime()) / 2)

    const [resumed] = findNextPasses(ISS_TLE, SAN_FRANCISCO, midPassStart, { count: 1 })

    expect(resumed.aos.getTime()).toBe(midPassStart.getTime())
    // Both LOS times are independently bisection-refined to within
    // CROSSING_REFINEMENT_TOLERANCE_MS (500ms), so allow a bit more than that.
    expect(Math.abs(resumed.los.getTime() - firstPass.los.getTime())).toBeLessThan(1000)
  })

  it('returns fewer passes (or none) rather than hanging when the search window is too short', () => {
    const shortWindowPasses = findNextPasses(ISS_TLE, SAN_FRANCISCO, FIXED_DATE, {
      count: 5,
      maxSearchSeconds: 60,
    })
    expect(shortWindowPasses.length).toBeLessThanOrEqual(1)
  })
})
