import { describe, expect, it } from 'vitest'
import {
  PLANET_IDS,
  type PlanetId,
  julianCenturiesSinceJ2000,
  planetHeliocentricPositionAu,
  planetOrbitalPeriodDays,
} from './ephemeris'
import { magnitude } from './vector'

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
  // AU e=0.0068, Earth a=1.000 AU e=0.0167, Mars a=1.524 AU e=0.0934. These
  // ranges don't overlap, which the "ordering" test below relies on.
  const DISTANCE_BOUNDS_AU: Record<PlanetId, [min: number, max: number]> = {
    mercury: [0.3, 0.48],
    venus: [0.71, 0.735],
    earth: [0.98, 1.02],
    mars: [1.37, 1.68],
  }

  it.each(PLANET_IDS)('keeps %s within its known perihelion/aphelion range at every sample date', (planet) => {
    const [min, max] = DISTANCE_BOUNDS_AU[planet]
    for (const date of SAMPLE_DATES) {
      const distanceAu = heliocentricDistanceAu(planet, date)
      expect(distanceAu, `${planet} at ${date.toISOString()}`).toBeGreaterThanOrEqual(min)
      expect(distanceAu, `${planet} at ${date.toISOString()}`).toBeLessThanOrEqual(max)
    }
  })

  it('orders the planets by heliocentric distance (Mercury < Venus < Earth < Mars) at every sample date, since their distance ranges never overlap', () => {
    for (const date of SAMPLE_DATES) {
      const distances = PLANET_IDS.map((planet) => heliocentricDistanceAu(planet, date))
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i], date.toISOString()).toBeGreaterThan(distances[i - 1])
      }
    }
  })

  it.each(PLANET_IDS)("returns to ~the same position after one full orbital period (%s)", (planet) => {
    const start = new Date('2026-07-06T00:00:00Z')
    const periodMs = planetOrbitalPeriodDays(planet) * 24 * 60 * 60 * 1000
    const later = new Date(start.getTime() + periodMs)

    const startPosition = planetHeliocentricPositionAu(planet, start)
    const laterPosition = planetHeliocentricPositionAu(planet, later)

    expect(laterPosition.x).toBeCloseTo(startPosition.x, 3)
    expect(laterPosition.y).toBeCloseTo(startPosition.y, 3)
    expect(laterPosition.z).toBeCloseTo(startPosition.z, 3)
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
})
