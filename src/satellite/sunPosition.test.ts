import * as satelliteJs from 'satellite.js'
import { describe, expect, it } from 'vitest'
import { radToDeg } from '../components/angleUnits'
import { propagateTle } from './sgp4'
import { shadowFractionAt, solarSubpointAt } from './sunPosition'
import type { TleRecord } from './types'

// A real ISS TLE snapshot, hardcoded so this test is deterministic and
// doesn't depend on network access.
const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

describe('solarSubpointAt', () => {
  it('reports a subsolar latitude near the northern tropic at the June solstice', () => {
    const subpoint = solarSubpointAt(new Date('2026-06-21T06:00:00Z'))
    expect(radToDeg(subpoint.latitudeRad)).toBeCloseTo(23.4, 0)
  })

  it('reports a subsolar latitude near the southern tropic at the December solstice', () => {
    const subpoint = solarSubpointAt(new Date('2026-12-21T20:00:00Z'))
    expect(radToDeg(subpoint.latitudeRad)).toBeCloseTo(-23.4, 0)
  })

  it('reports a subsolar latitude near the equator at the equinox', () => {
    const subpoint = solarSubpointAt(new Date('2026-03-20T12:00:00Z'))
    expect(Math.abs(radToDeg(subpoint.latitudeRad))).toBeLessThan(1)
  })

  it('keeps longitude within the valid (-pi, pi] range', () => {
    const subpoint = solarSubpointAt(new Date('2026-07-02T12:00:00Z'))
    expect(subpoint.longitudeRad).toBeGreaterThan(-Math.PI)
    expect(subpoint.longitudeRad).toBeLessThanOrEqual(Math.PI)
  })
})

describe('shadowFractionAt', () => {
  const date = new Date('2026-07-02T12:00:00Z')
  const { rsun } = satelliteJs.sunPos(satelliteJs.jday(date))
  const sunDistanceKm = Math.hypot(rsun.x, rsun.y, rsun.z)
  const sunwardUnit = { x: rsun.x / sunDistanceKm, y: rsun.y / sunDistanceKm, z: rsun.z / sunDistanceKm }

  it('reports fully lit (0) for a satellite positioned on the sunward side of Earth', () => {
    const LEO_RADIUS_KM = 6778 // ISS-like altitude above Earth's center
    const sunwardPosition = {
      x: sunwardUnit.x * LEO_RADIUS_KM,
      y: sunwardUnit.y * LEO_RADIUS_KM,
      z: sunwardUnit.z * LEO_RADIUS_KM,
    }
    expect(shadowFractionAt(date, sunwardPosition)).toBe(0)
  })

  it('reports fully eclipsed (1) for a satellite directly behind Earth, opposite the Sun', () => {
    const LEO_RADIUS_KM = 6778
    const antisolarPosition = {
      x: -sunwardUnit.x * LEO_RADIUS_KM,
      y: -sunwardUnit.y * LEO_RADIUS_KM,
      z: -sunwardUnit.z * LEO_RADIUS_KM,
    }
    expect(shadowFractionAt(date, antisolarPosition)).toBe(1)
  })

  it('toggles between fully lit and fully eclipsed as a real LEO satellite orbits', () => {
    const samples = Array.from({ length: 60 }, (_, i) => {
      const sampleDate = new Date(date.getTime() + i * 90 * 1000) // ~90s steps across ~90min period
      const { position } = propagateTle(ISS_TLE, sampleDate)
      return shadowFractionAt(sampleDate, position)
    })
    expect(samples.some((f) => f === 0)).toBe(true)
    expect(samples.some((f) => f > 0)).toBe(true)
  })
})
