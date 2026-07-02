import { describe, expect, it } from 'vitest'
import {
  SIDEREAL_DAY_S,
  apogeeAltitudeKm,
  orbitalPeriodSeconds,
  perigeeAltitudeKm,
} from '../engine'
import { PRESETS } from './presets'

const findPreset = (id: string) => {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`missing preset: ${id}`)
  return preset
}

describe('PRESETS', () => {
  it('has one entry per id, no duplicates', () => {
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ISS: ~92.7 min period, ~400 km altitude', () => {
    const { elements } = findPreset('iss')
    expect(orbitalPeriodSeconds(elements.semiMajorAxisKm) / 60).toBeCloseTo(92.7, 0)
    expect(apogeeAltitudeKm(elements.semiMajorAxisKm, elements.eccentricity)).toBeCloseTo(413, 0)
  })

  it('GEO: sidereal-day period, equatorial and circular', () => {
    const { elements } = findPreset('geo')
    expect(orbitalPeriodSeconds(elements.semiMajorAxisKm)).toBeCloseTo(SIDEREAL_DAY_S, 0)
    expect(elements.eccentricity).toBe(0)
    expect(elements.inclinationRad).toBe(0)
  })

  it('Molniya: half-sidereal-day period, critical inclination, LEO perigee + high apogee', () => {
    const { elements } = findPreset('molniya')
    expect(orbitalPeriodSeconds(elements.semiMajorAxisKm)).toBeCloseTo(SIDEREAL_DAY_S / 2, 0)
    expect((elements.inclinationRad * 180) / Math.PI).toBeCloseTo(63.4, 1)

    const perigee = perigeeAltitudeKm(elements.semiMajorAxisKm, elements.eccentricity)
    const apogee = apogeeAltitudeKm(elements.semiMajorAxisKm, elements.eccentricity)
    expect(perigee).toBeGreaterThan(400)
    expect(perigee).toBeLessThan(1000)
    expect(apogee).toBeGreaterThan(38000)
  })

  it('Sun-synchronous: near-circular, retrograde, ~700 km altitude', () => {
    const { elements } = findPreset('sun-synchronous')
    expect(elements.eccentricity).toBeLessThan(0.001)
    expect((elements.inclinationRad * 180) / Math.PI).toBeGreaterThan(90)
    expect(apogeeAltitudeKm(elements.semiMajorAxisKm, elements.eccentricity)).toBeCloseTo(705, -1)
  })

  it('GPS: half-sidereal-day period, near-circular, 55 degree inclination', () => {
    const { elements } = findPreset('gps')
    expect(orbitalPeriodSeconds(elements.semiMajorAxisKm)).toBeCloseTo(SIDEREAL_DAY_S / 2, 0)
    expect(elements.eccentricity).toBeLessThan(0.02)
    expect((elements.inclinationRad * 180) / Math.PI).toBeCloseTo(55, 6)
  })

  it('every preset is a physically valid orbit (perigee above the surface)', () => {
    for (const { id, elements } of PRESETS) {
      const perigee = perigeeAltitudeKm(elements.semiMajorAxisKm, elements.eccentricity)
      expect(perigee, `${id} perigee altitude`).toBeGreaterThan(0)
    }
  })
})
