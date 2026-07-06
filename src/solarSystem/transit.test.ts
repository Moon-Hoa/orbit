import { describe, expect, it } from 'vitest'
import { magnitude, planetHeliocentricPositionAu, subtract } from '../engine'
import { idealizedTransitPositionAu, isInTransitAt, transitProgress } from './transit'
import type { SpacecraftTransit } from './types'

const sample: SpacecraftTransit = {
  id: 'sample',
  name: 'Sample Probe',
  agency: 'Test Agency',
  departureBody: 'earth',
  arrivalBody: 'mars',
  departureDate: '2020-07-30',
  arrivalDate: '2021-02-18',
  isIdealizedTransfer: true,
  description: 'A sample transit for testing.',
}

describe('isInTransitAt', () => {
  it('is false before departure', () => {
    expect(isInTransitAt(sample, new Date('2020-01-01'))).toBe(false)
  })

  it('is true at the exact departure and arrival instants (inclusive)', () => {
    expect(isInTransitAt(sample, new Date(sample.departureDate))).toBe(true)
    expect(isInTransitAt(sample, new Date(sample.arrivalDate))).toBe(true)
  })

  it('is true partway through the cruise', () => {
    expect(isInTransitAt(sample, new Date('2020-10-01'))).toBe(true)
  })

  it('is false after arrival', () => {
    expect(isInTransitAt(sample, new Date('2026-07-06'))).toBe(false)
  })
})

describe('transitProgress', () => {
  it('is 0 at departure and 1 at arrival', () => {
    expect(transitProgress(sample, new Date(sample.departureDate))).toBeCloseTo(0, 6)
    expect(transitProgress(sample, new Date(sample.arrivalDate))).toBeCloseTo(1, 6)
  })

  it('is 0.5 exactly halfway through, by elapsed time', () => {
    const start = new Date(sample.departureDate).getTime()
    const end = new Date(sample.arrivalDate).getTime()
    const midpoint = new Date(start + (end - start) / 2)
    expect(transitProgress(sample, midpoint)).toBeCloseTo(0.5, 6)
  })

  it('clamps outside the transit window rather than going negative or past 1', () => {
    expect(transitProgress(sample, new Date('2019-01-01'))).toBe(0)
    expect(transitProgress(sample, new Date('2026-07-06'))).toBe(1)
  })
})

describe('idealizedTransitPositionAu', () => {
  it('matches the departure body position at departure, and the arrival body position at arrival', () => {
    const departurePlanetPos = planetHeliocentricPositionAu('earth', new Date(sample.departureDate))
    const arrivalPlanetPos = planetHeliocentricPositionAu('mars', new Date(sample.arrivalDate))

    const atDeparture = idealizedTransitPositionAu(sample, new Date(sample.departureDate))
    const atArrival = idealizedTransitPositionAu(sample, new Date(sample.arrivalDate))

    expect(magnitude(subtract(atDeparture, departurePlanetPos))).toBeLessThan(1e-6)
    expect(magnitude(subtract(atArrival, arrivalPlanetPos))).toBeLessThan(1e-6)
  })

  it('stays at a plausible heliocentric distance (between Earth and Mars) partway through', () => {
    const midpoint = new Date(
      (new Date(sample.departureDate).getTime() + new Date(sample.arrivalDate).getTime()) / 2,
    )
    const position = idealizedTransitPositionAu(sample, midpoint)
    expect(magnitude(position)).toBeGreaterThan(0.9)
    expect(magnitude(position)).toBeLessThan(1.7)
  })
})
