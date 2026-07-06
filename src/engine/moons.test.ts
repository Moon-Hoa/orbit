import { describe, expect, it } from 'vitest'
import { AU_KM } from './ephemeris'
import {
  MOON_IDS,
  type MoonId,
  moonHeliocentricPositionAu,
  moonParent,
  moonPositionRelativeToParentAu,
} from './moons'
import { magnitude, subtract } from './vector'

const SAMPLE_DATES = [
  new Date('2000-01-01T12:00:00Z'),
  new Date('2026-07-06T00:00:00Z'),
  new Date('2049-06-30T00:00:00Z'),
]

// Perihelion/aphelion bounds (a(1-e)/a(1+e), km) from each moon's well-known
// real semi-major axis/eccentricity - a genuine check of the Kepler-solve +
// rotation pipeline, not just re-asserting the input table (see the same
// reasoning in ephemeris.test.ts).
const DISTANCE_BOUNDS_KM: Record<MoonId, [min: number, max: number]> = {
  moon: [356_000, 407_000],
  phobos: [9100, 9550],
  deimos: [23_400, 23_530],
  io: [419_000, 424_000],
  europa: [664_000, 678_000],
  ganymede: [1_068_000, 1_073_000],
  callisto: [1_868_000, 1_897_000],
  titan: [1_186_000, 1_258_000],
}

describe('moonParent', () => {
  it('maps each moon to the correct parent planet', () => {
    expect(moonParent('moon')).toBe('earth')
    expect(moonParent('phobos')).toBe('mars')
    expect(moonParent('deimos')).toBe('mars')
    expect(moonParent('io')).toBe('jupiter')
    expect(moonParent('europa')).toBe('jupiter')
    expect(moonParent('ganymede')).toBe('jupiter')
    expect(moonParent('callisto')).toBe('jupiter')
    expect(moonParent('titan')).toBe('saturn')
  })
})

describe('moonPositionRelativeToParentAu known-answer checks', () => {
  it.each(MOON_IDS)('keeps %s within its known perihelion/aphelion distance from its parent', (moon) => {
    const [minKm, maxKm] = DISTANCE_BOUNDS_KM[moon]
    for (const date of SAMPLE_DATES) {
      const distanceAu = magnitude(moonPositionRelativeToParentAu(moon, date))
      const distanceKm = distanceAu * AU_KM
      expect(distanceKm, `${moon} at ${date.toISOString()}`).toBeGreaterThanOrEqual(minKm)
      expect(distanceKm, `${moon} at ${date.toISOString()}`).toBeLessThanOrEqual(maxKm)
    }
  })
})

describe('moonHeliocentricPositionAu', () => {
  it("adds the moon's relative position to the given parent heliocentric position", () => {
    const parentPosition = { x: 1, y: 2, z: 0 }
    const date = new Date('2026-07-06T00:00:00Z')

    const relative = moonPositionRelativeToParentAu('moon', date)
    const heliocentric = moonHeliocentricPositionAu('moon', date, parentPosition)

    expect(heliocentric.x).toBeCloseTo(parentPosition.x + relative.x, 12)
    expect(heliocentric.y).toBeCloseTo(parentPosition.y + relative.y, 12)
    expect(heliocentric.z).toBeCloseTo(parentPosition.z + relative.z, 12)
  })
})

describe('moon orbital periods (self-consistency)', () => {
  const PERIOD_DAYS: Record<MoonId, number> = {
    moon: 27.321661,
    phobos: 0.31891023,
    deimos: 1.263,
    io: 1.769138,
    europa: 3.551181,
    ganymede: 7.154553,
    callisto: 16.689018,
    titan: 15.945,
  }

  it.each(MOON_IDS)('returns to ~the same position relative to its parent after one orbital period (%s)', (moon) => {
    const start = new Date('2026-07-06T00:00:00Z')
    const periodMs = PERIOD_DAYS[moon] * 24 * 60 * 60 * 1000
    const later = new Date(start.getTime() + periodMs)

    const startPosition = moonPositionRelativeToParentAu(moon, start)
    const laterPosition = moonPositionRelativeToParentAu(moon, later)

    const driftAu = magnitude(subtract(laterPosition, startPosition))
    const orbitalRadiusAu = magnitude(startPosition)
    expect(driftAu / orbitalRadiusAu, moon).toBeLessThan(0.001)
  })
})
