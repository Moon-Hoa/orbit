import { describe, expect, it } from 'vitest'
import {
  PLANET_IDS,
  type PlanetId,
  julianCenturiesSinceJ2000,
  planetHeliocentricPositionAu,
  planetOrbitalPeriodDays,
} from './ephemeris'
import { magnitude, subtract } from './vector'

const heliocentricDistanceAu = (planet: PlanetId, date: Date) =>
  magnitude(planetHeliocentricPositionAu(planet, date))

// Sample dates spread across the ~1800-2050 validity window of the low-precision elements.
const SAMPLE_DATES = [
  new Date('1900-03-15T00:00:00Z'),
  new Date('1975-11-02T00:00:00Z'),
  new Date('2000-01-01T00:00:00Z'),
  new Date('2026-07-06T00:00:00Z'),
  new Date('2049-06-30T00:00:00Z'),
]

describe('julianCenturiesSinceJ2000', () => {
  it('is exactly zero at the J2000.0 epoch (2000-01-01T12:00:00Z)', () => {
    expect(julianCenturiesSinceJ2000(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(0, 9)
  })

  it('is positive after J2000 and negative before it', () => {
    expect(julianCenturiesSinceJ2000(new Date('2001-01-01T12:00:00Z'))).toBeGreaterThan(0)
    expect(julianCenturiesSinceJ2000(new Date('1999-01-01T12:00:00Z'))).toBeLessThan(0)
  })
})

describe('planetHeliocentricPositionAu known-answer checks', () => {
  // Perihelion/aphelion bounds (a(1-e)/a(1+e)) from the planets' well-known
  // semi-major axis/eccentricity: Mercury a=0.387 AU e=0.206, Venus a=0.723
  // AU e=0.0068, Earth a=1.000 AU e=0.0167, Mars a=1.524 AU e=0.0934, Jupiter
  // a=5.203 AU e=0.0484, Saturn a=9.537 AU e=0.0539, Uranus a=19.189 AU
  // e=0.0473, Neptune a=30.070 AU e=0.0086. These ranges don't overlap, which
  // the "ordering" test below relies on.
  const DISTANCE_BOUNDS_AU: Record<PlanetId, [min: number, max: number]> = {
    mercury: [0.3, 0.48],
    venus: [0.71, 0.735],
    earth: [0.98, 1.02],
    mars: [1.37, 1.68],
    jupiter: [4.9, 5.5],
    saturn: [9.0, 10.1],
    uranus: [18.2, 20.2],
    neptune: [29.7, 30.4],
  }

  it.each(PLANET_IDS)('keeps %s within its known perihelion/aphelion range at every sample date', (planet) => {
    const [min, max] = DISTANCE_BOUNDS_AU[planet]
    for (const date of SAMPLE_DATES) {
      const distanceAu = heliocentricDistanceAu(planet, date)
      expect(distanceAu, `${planet} at ${date.toISOString()}`).toBeGreaterThanOrEqual(min)
      expect(distanceAu, `${planet} at ${date.toISOString()}`).toBeLessThanOrEqual(max)
    }
  })

  it('orders the planets by heliocentric distance (Mercury < Venus < Earth < Mars < Jupiter < Saturn < Uranus < Neptune) at every sample date, since their distance ranges never overlap', () => {
    for (const date of SAMPLE_DATES) {
      const distances = PLANET_IDS.map((planet) => heliocentricDistanceAu(planet, date))
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i], date.toISOString()).toBeGreaterThan(distances[i - 1])
      }
    }
  })

  it.each(PLANET_IDS)('returns to ~the same position after one full orbital period (%s)', (planet) => {
    const start = new Date('2026-07-06T00:00:00Z')
    const periodMs = planetOrbitalPeriodDays(planet) * 24 * 60 * 60 * 1000
    const later = new Date(start.getTime() + periodMs)

    const startPosition = planetHeliocentricPositionAu(planet, start)
    const laterPosition = planetHeliocentricPositionAu(planet, later)

    // Tolerance is relative to orbital radius, not a fixed absolute AU value:
    // the model's secular rates (a/e/etc. all drift slowly over time, not
    // just true anomaly) mean "one period later" isn't an *exact* return to
    // the start for a planet whose period is decades long (Saturn/Uranus/
    // Neptune) - the elements themselves have moved on a little in the
    // meantime, which is the model correctly doing its job, not a bug. A
    // fixed absolute tolerance that works for Mercury's 88-day period is far
    // too tight for Neptune's 165-year one.
    const driftAu = magnitude(subtract(laterPosition, startPosition))
    const orbitalRadiusAu = magnitude(startPosition)
    expect(driftAu / orbitalRadiusAu, planet).toBeLessThan(0.001)
  })
})

describe('planetOrbitalPeriodDays', () => {
  // Well-known real orbital periods, to within the precision this low-order model targets.
  it('matches the well-known real orbital periods within a day', () => {
    expect(planetOrbitalPeriodDays('mercury')).toBeCloseTo(87.97, 0)
    expect(planetOrbitalPeriodDays('venus')).toBeCloseTo(224.7, 0)
    expect(planetOrbitalPeriodDays('earth')).toBeCloseTo(365.25, 0)
    expect(planetOrbitalPeriodDays('mars')).toBeCloseTo(686.98, 0)
  })

  // The outer planets' periods run from ~12 to ~165 years - checked in years,
  // to a tolerance appropriate for a linear-rate low-precision model rather
  // than to the day.
  it('matches the well-known real orbital periods (outer planets) within a fraction of a year', () => {
    const daysPerYear = 365.25
    expect(planetOrbitalPeriodDays('jupiter') / daysPerYear).toBeCloseTo(11.86, 1)
    expect(planetOrbitalPeriodDays('saturn') / daysPerYear).toBeCloseTo(29.45, 1)
    expect(planetOrbitalPeriodDays('uranus') / daysPerYear).toBeCloseTo(84.02, 0)
    expect(planetOrbitalPeriodDays('neptune') / daysPerYear).toBeCloseTo(164.8, 0)
  })
})
