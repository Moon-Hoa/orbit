import * as satellite from 'satellite.js'
import { describe, expect, it } from 'vitest'
import {
  approximateElementsFromTle,
  orbitalPeriodSecondsFromTle,
  propagateTle,
  sampleRealGroundTrack,
  sampleRealOrbitEci,
  tleToGeodetic,
} from './sgp4'
import type { TleRecord } from './types'

// A real ISS TLE snapshot, hardcoded so this test is deterministic and
// doesn't depend on network access.
const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

const FIXED_DATE = new Date('2026-07-02T12:00:00Z')

describe('propagateTle', () => {
  it('matches calling satellite.js directly (isolates wrapper bugs from SGP4 math)', () => {
    const satrec = satellite.twoline2satrec(ISS_TLE.line1, ISS_TLE.line2)
    const direct = satellite.propagate(satrec, FIXED_DATE)
    if (!direct?.position || !direct.velocity) throw new Error('direct propagation failed')

    const wrapped = propagateTle(ISS_TLE, FIXED_DATE)

    expect(wrapped.position).toEqual(direct.position)
    expect(wrapped.velocity).toEqual(direct.velocity)
  })

  it('reports a plausible ISS altitude', () => {
    const state = propagateTle(ISS_TLE, FIXED_DATE)
    const radius = Math.hypot(state.position.x, state.position.y, state.position.z)
    const altitude = radius - satellite.constants.earthRadius
    expect(altitude).toBeGreaterThan(300)
    expect(altitude).toBeLessThan(500)
  })
})

describe('tleToGeodetic', () => {
  it('matches calling satellite.js eciToGeodetic/gstime directly', () => {
    const satrec = satellite.twoline2satrec(ISS_TLE.line1, ISS_TLE.line2)
    const direct = satellite.propagate(satrec, FIXED_DATE)
    if (!direct?.position) throw new Error('direct propagation failed')
    const gmst = satellite.gstime(FIXED_DATE)
    const directGeo = satellite.eciToGeodetic(direct.position, gmst)

    const wrapped = tleToGeodetic(ISS_TLE, FIXED_DATE)

    expect(wrapped.latitudeRad).toBeCloseTo(directGeo.latitude, 12)
    expect(wrapped.longitudeRad).toBeCloseTo(directGeo.longitude, 12)
    expect(wrapped.altitudeKm).toBeCloseTo(directGeo.height, 9)
  })

  it('reports a latitude within the ISS orbit inclination band', () => {
    const geo = tleToGeodetic(ISS_TLE, FIXED_DATE)
    const latDeg = (geo.latitudeRad * 180) / Math.PI
    expect(Math.abs(latDeg)).toBeLessThanOrEqual(51.7)
  })
})

describe('approximateElementsFromTle', () => {
  it('matches raw meanElements.am/em from satellite.js', () => {
    const satrec = satellite.twoline2satrec(ISS_TLE.line1, ISS_TLE.line2)
    const direct = satellite.propagate(satrec, FIXED_DATE)
    if (!direct) throw new Error('propagation failed')

    const { semiMajorAxisKm, eccentricity } = approximateElementsFromTle(ISS_TLE, FIXED_DATE)

    expect(semiMajorAxisKm).toBeCloseTo(
      direct.meanElements.am * satellite.constants.earthRadius,
      9,
    )
    expect(eccentricity).toBe(direct.meanElements.em)
  })

  it('reports a semi-major axis consistent with a ~400km LEO orbit', () => {
    const { semiMajorAxisKm } = approximateElementsFromTle(ISS_TLE, FIXED_DATE)
    expect(semiMajorAxisKm).toBeGreaterThan(6700)
    expect(semiMajorAxisKm).toBeLessThan(6900)
  })
})

describe('orbitalPeriodSecondsFromTle', () => {
  it('reports a period close to the known ISS period (~93 min)', () => {
    const periodMinutes = orbitalPeriodSecondsFromTle(ISS_TLE, FIXED_DATE) / 60
    expect(periodMinutes).toBeCloseTo(92.9, 0)
  })
})

describe('sampleRealGroundTrack', () => {
  it('traces a sinusoid within the ISS inclination band', () => {
    const period = orbitalPeriodSecondsFromTle(ISS_TLE, FIXED_DATE)
    const points = sampleRealGroundTrack(ISS_TLE, FIXED_DATE, period, period / 200)
    const latitudesDeg = points.map((p) => (p.latitudeRad * 180) / Math.PI)

    expect(Math.max(...latitudesDeg)).toBeGreaterThan(40)
    expect(Math.min(...latitudesDeg)).toBeLessThan(-40)
  })
})

describe('sampleRealOrbitEci', () => {
  it('returns the requested number of points, all at a plausible LEO radius', () => {
    const period = orbitalPeriodSecondsFromTle(ISS_TLE, FIXED_DATE)
    const points = sampleRealOrbitEci(ISS_TLE, FIXED_DATE, period, 100)

    expect(points).toHaveLength(100)
    for (const point of points) {
      const radius = Math.hypot(point.x, point.y, point.z)
      expect(radius).toBeGreaterThan(6600)
      expect(radius).toBeLessThan(7000)
    }
  })
})
