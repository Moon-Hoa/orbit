import { describe, expect, it } from 'vitest'
import { PRESETS } from '../scenario/presets'
import { argOfPerigeeDriftRadPerSec, raanDriftRadPerSec } from './j2'

const SECONDS_PER_DAY = 86400
const radPerSecToDegPerDay = (radPerSec: number) => (radPerSec * SECONDS_PER_DAY * 180) / Math.PI

function presetElements(id: string) {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`no preset named ${id}`)
  return preset.elements
}

describe('raanDriftRadPerSec', () => {
  it('matches the real-world sun-synchronous rate (~0.9856 deg/day) for the sun-synchronous preset', () => {
    const { semiMajorAxisKm, eccentricity, inclinationRad } = presetElements('sun-synchronous')
    const driftDegPerDay = radPerSecToDegPerDay(
      raanDriftRadPerSec(semiMajorAxisKm, eccentricity, inclinationRad),
    )
    // Earth's mean heliocentric angular rate: 360 deg / 365.2422 days.
    expect(driftDegPerDay).toBeCloseTo(360 / 365.2422, 2)
  })

  it('is negative (regresses) for a prograde orbit and positive (advances) for a retrograde one', () => {
    const prograde = raanDriftRadPerSec(7000, 0, (30 * Math.PI) / 180)
    const retrograde = raanDriftRadPerSec(7000, 0, (150 * Math.PI) / 180)
    expect(prograde).toBeLessThan(0)
    expect(retrograde).toBeGreaterThan(0)
  })
})

describe('argOfPerigeeDriftRadPerSec', () => {
  it('is near zero at the Molniya preset\'s critical inclination (63.4 deg)', () => {
    const { semiMajorAxisKm, eccentricity, inclinationRad } = presetElements('molniya')
    const driftDegPerDay = radPerSecToDegPerDay(
      argOfPerigeeDriftRadPerSec(semiMajorAxisKm, eccentricity, inclinationRad),
    )
    expect(Math.abs(driftDegPerDay)).toBeLessThan(0.01)
  })

  it('is exactly zero at the exact critical inclination, arccos(1/sqrt(5))', () => {
    const criticalInclinationRad = Math.acos(1 / Math.sqrt(5))
    const drift = argOfPerigeeDriftRadPerSec(7000, 0.5, criticalInclinationRad)
    expect(drift).toBeCloseTo(0, 10)
  })

  it('is nonzero away from the critical inclination', () => {
    const drift = argOfPerigeeDriftRadPerSec(7000, 0.1, (51.6 * Math.PI) / 180)
    expect(Math.abs(drift)).toBeGreaterThan(0)
  })
})
