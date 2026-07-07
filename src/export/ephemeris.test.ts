import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM, MOON_MU_KM3_S2, MOON_RADIUS_KM, orbitalPeriodSeconds, type OrbitalElements } from '../engine'
import type { TleRecord } from '../satellite'
import { sampleDesignEphemeris, sampleDesignEphemerisInertial, sampleRealEphemeris } from './ephemeris'

const degToRad = (deg: number) => (deg * Math.PI) / 180

const issLikeElements: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
  inclinationRad: degToRad(51.6),
  raanRad: degToRad(45),
  argOfPerigeeRad: degToRad(30),
  trueAnomalyRad: 0,
}

const lowLunarOrbitElements: OrbitalElements = {
  semiMajorAxisKm: MOON_RADIUS_KM + 100,
  eccentricity: 0,
  inclinationRad: degToRad(90),
  raanRad: 0,
  argOfPerigeeRad: 0,
  trueAnomalyRad: 0,
}

const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

describe('sampleDesignEphemeris', () => {
  it('spans exactly one orbital period for "next-orbit"', () => {
    const rows = sampleDesignEphemeris(issLikeElements, 'next-orbit')
    const period = orbitalPeriodSeconds(issLikeElements.semiMajorAxisKm)
    expect(rows[0].elapsedSeconds).toBe(0)
    expect(rows.at(-1)?.elapsedSeconds).toBeCloseTo(period, 6)
  })

  it('spans 24 hours for "next-24h"', () => {
    const rows = sampleDesignEphemeris(issLikeElements, 'next-24h')
    expect(rows.at(-1)?.elapsedSeconds).toBeCloseTo(86400, 6)
  })

  it('has no real-calendar timestamp (design mode)', () => {
    const rows = sampleDesignEphemeris(issLikeElements, 'next-orbit')
    expect(rows.every((r) => r.timestampIso === null)).toBe(true)
  })

  it('produces position/velocity vectors and a plausible geodetic subpoint for every row', () => {
    const rows = sampleDesignEphemeris(issLikeElements, 'next-orbit')
    for (const row of rows) {
      expect(Number.isFinite(row.position.x)).toBe(true)
      expect(Number.isFinite(row.velocity.x)).toBe(true)
      expect(row.geodetic.latitudeRad).toBeGreaterThanOrEqual(-Math.PI / 2)
      expect(row.geodetic.latitudeRad).toBeLessThanOrEqual(Math.PI / 2)
    }
  })
})

describe('sampleDesignEphemerisInertial', () => {
  it("spans exactly one orbital period for 'next-orbit', using the given body's mu", () => {
    const rows = sampleDesignEphemerisInertial(lowLunarOrbitElements, 'next-orbit', MOON_MU_KM3_S2)
    const period = orbitalPeriodSeconds(lowLunarOrbitElements.semiMajorAxisKm, MOON_MU_KM3_S2)
    expect(rows[0].elapsedSeconds).toBe(0)
    expect(rows.at(-1)?.elapsedSeconds).toBeCloseTo(period, 6)
  })

  it('has no real-calendar timestamp (design mode)', () => {
    const rows = sampleDesignEphemerisInertial(lowLunarOrbitElements, 'next-orbit', MOON_MU_KM3_S2)
    expect(rows.every((r) => r.timestampIso === null)).toBe(true)
  })

  it('produces finite position/velocity vectors and no geodetic field', () => {
    const rows = sampleDesignEphemerisInertial(lowLunarOrbitElements, 'next-orbit', MOON_MU_KM3_S2)
    for (const row of rows) {
      expect(Number.isFinite(row.position.x)).toBe(true)
      expect(Number.isFinite(row.velocity.x)).toBe(true)
      expect('geodetic' in row).toBe(false)
    }
  })

  it("differs from Earth's sampler given the same elements but a different mu (period scales with mu)", () => {
    const moonRows = sampleDesignEphemerisInertial(issLikeElements, 'next-orbit', MOON_MU_KM3_S2)
    const earthPeriod = orbitalPeriodSeconds(issLikeElements.semiMajorAxisKm)
    // The same semi-major axis around the much-less-massive Moon has a far longer period than around Earth.
    expect(moonRows.at(-1)!.elapsedSeconds).toBeGreaterThan(earthPeriod)
  })
})

describe('sampleRealEphemeris', () => {
  const referenceDate = new Date('2026-07-02T12:00:00Z')

  it('starts at the reference date with a real ISO timestamp', () => {
    const rows = sampleRealEphemeris(ISS_TLE, referenceDate, 'next-orbit')
    expect(rows[0].timestampIso).toBe(referenceDate.toISOString())
  })

  it('spans 24 hours for "next-24h"', () => {
    const rows = sampleRealEphemeris(ISS_TLE, referenceDate, 'next-24h')
    const lastDate = new Date(rows.at(-1)!.timestampIso!)
    expect(lastDate.getTime() - referenceDate.getTime()).toBeCloseTo(86400 * 1000, -2)
  })
})
