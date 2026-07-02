import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM } from './constants'
import { orbitalPeriodSeconds } from './derived'
import { sampleGroundTrack } from './groundTrack'
import type { OrbitalElements } from './types'

const degToRad = (deg: number) => (deg * Math.PI) / 180

const issLike: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
  inclinationRad: degToRad(51.6),
  raanRad: 0,
  argOfPerigeeRad: 0,
  trueAnomalyRad: 0,
}

describe('sampleGroundTrack', () => {
  it('returns evenly spaced samples across the requested window', () => {
    const points = sampleGroundTrack(issLike, 1000, 500, 100)
    // From t=500 to t=1000 inclusive, stepping by 100 -> 6 samples.
    expect(points).toHaveLength(6)
  })

  it('reports altitude consistent with the orbit (roughly the ISS altitude band)', () => {
    const points = sampleGroundTrack(issLike, 0, 0, 1)
    expect(points[0].altitudeKm).toBeGreaterThan(400)
    expect(points[0].altitudeKm).toBeLessThan(415)
  })

  it('traces the classic ISS ground track sinusoid: latitude oscillates within +/- inclination', () => {
    const period = orbitalPeriodSeconds(issLike.semiMajorAxisKm)
    const points = sampleGroundTrack(issLike, period, period, period / 500)
    const latitudesDeg = points.map((p) => (p.latitudeRad * 180) / Math.PI)

    const maxLat = Math.max(...latitudesDeg)
    const minLat = Math.min(...latitudesDeg)

    // Peaks should reach close to the orbit's inclination (51.6 deg), not
    // wildly over/under it - this is the signature shape of an inclined
    // orbit's ground track.
    expect(maxLat).toBeGreaterThan(50)
    expect(maxLat).toBeLessThanOrEqual(51.7)
    expect(minLat).toBeLessThan(-50)
    expect(minLat).toBeGreaterThanOrEqual(-51.7)
  })

  it('crosses the equator going both north-to-south and south-to-north (genuine oscillation)', () => {
    const period = orbitalPeriodSeconds(issLike.semiMajorAxisKm)
    // A little over one period, so both crossings are comfortably inside the
    // window regardless of exactly where the fixed-step sampling lands.
    const windowSeconds = period * 1.2
    const points = sampleGroundTrack(issLike, windowSeconds, windowSeconds, period / 500)
    const latitudes = points.map((p) => p.latitudeRad)

    let ascendingCrossings = 0
    let descendingCrossings = 0
    for (let i = 1; i < latitudes.length; i++) {
      if (latitudes[i - 1] < 0 && latitudes[i] >= 0) ascendingCrossings++
      if (latitudes[i - 1] >= 0 && latitudes[i] < 0) descendingCrossings++
    }

    expect(ascendingCrossings).toBeGreaterThanOrEqual(1)
    expect(descendingCrossings).toBeGreaterThanOrEqual(1)
  })

  it('sweeps a wide range of longitudes rather than sitting still (equatorial-orbit sanity)', () => {
    const equatorial: OrbitalElements = { ...issLike, inclinationRad: 0 }
    const period = orbitalPeriodSeconds(equatorial.semiMajorAxisKm)
    const points = sampleGroundTrack(equatorial, period, period, period / 100)
    const longitudesDeg = points.map((p) => (p.longitudeRad * 180) / Math.PI)

    // All points should sit on the equator for a 0-inclination orbit.
    for (const p of points) {
      expect(p.latitudeRad).toBeCloseTo(0, 6)
    }
    expect(Math.max(...longitudesDeg) - Math.min(...longitudesDeg)).toBeGreaterThan(90)
  })
})
