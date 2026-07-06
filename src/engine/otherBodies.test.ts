import { describe, expect, it } from 'vitest'
import { OTHER_BODY_IDS, type OtherBodyId, otherBodyHeliocentricPositionAu } from './otherBodies'
import { magnitude } from './vector'

const heliocentricDistanceAu = (body: OtherBodyId, date: Date) =>
  magnitude(otherBodyHeliocentricPositionAu(body, date))

const SAMPLE_DATES = [
  new Date('2000-01-01T12:00:00Z'),
  new Date('2026-07-06T00:00:00Z'),
  new Date('2049-06-30T00:00:00Z'),
]

// Perihelion/aphelion bounds (a(1-e)/a(1+e)) from each body's well-known real
// semi-major axis/eccentricity: Pluto a=39.48 AU e=0.249, Ceres a=2.77 AU
// e=0.076, Eris a=67.78 AU e=0.441, Halley a=17.8 AU e=0.967 (a very
// eccentric orbit - perihelion under 1 AU, aphelion beyond Neptune).
const DISTANCE_BOUNDS_AU: Record<OtherBodyId, [min: number, max: number]> = {
  pluto: [29.5, 49.5],
  ceres: [2.5, 3.0],
  eris: [37.5, 98.0],
  halley: [0.5, 35.5],
}

describe('otherBodyHeliocentricPositionAu known-answer checks', () => {
  it.each(OTHER_BODY_IDS)('keeps %s within its known perihelion/aphelion range at every sample date', (body) => {
    const [min, max] = DISTANCE_BOUNDS_AU[body]
    for (const date of SAMPLE_DATES) {
      const distanceAu = heliocentricDistanceAu(body, date)
      expect(distanceAu, `${body} at ${date.toISOString()}`).toBeGreaterThanOrEqual(min)
      expect(distanceAu, `${body} at ${date.toISOString()}`).toBeLessThanOrEqual(max)
    }
  })

  it('keeps Halley (a near-parabolic, retrograde orbit) at a plausible distance rather than producing NaN/Infinity', () => {
    for (const date of SAMPLE_DATES) {
      const distanceAu = heliocentricDistanceAu('halley', date)
      expect(Number.isFinite(distanceAu)).toBe(true)
      expect(distanceAu).toBeGreaterThan(0)
    }
  })
})
