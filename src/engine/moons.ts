import { AU_KM, julianCenturiesSinceJ2000 } from './ephemeris'
import { rotatePerifocalToInertial } from './elements'
import { solveKeplerEquation, trueAnomalyFromEccentric } from './kepler'
import type { PlanetId } from './ephemeris'
import type { Vector3 } from './vector'
import { add, scale } from './vector'

export type MoonId =
  | 'moon'
  | 'phobos'
  | 'deimos'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'titan'

export const MOON_IDS: MoonId[] = [
  'moon',
  'phobos',
  'deimos',
  'io',
  'europa',
  'ganymede',
  'callisto',
  'titan',
]

/** Display name per moon, for UI labels. */
export const MOON_LABELS: Record<MoonId, string> = {
  moon: 'Moon',
  phobos: 'Phobos',
  deimos: 'Deimos',
  io: 'Io',
  europa: 'Europa',
  ganymede: 'Ganymede',
  callisto: 'Callisto',
  titan: 'Titan',
}

interface MoonOrbit {
  parent: PlanetId
  semiMajorAxisKm: number
  eccentricity: number
  /**
   * Inclination, degrees - approximated as relative to the J2000 ecliptic
   * (matching `engine/ephemeris.ts`'s planet frame) rather than the real
   * reference plane (usually the parent's equator, or its Laplace plane for
   * outer moons). Real values are all small angles, so this stand-in reads
   * fine visually without needing each parent's own equatorial orientation
   * modeled.
   */
  inclinationDeg: number
  /** Sidereal orbital period, days. */
  periodDays: number
  /**
   * Mean anomaly at J2000, degrees - unlike the planets in `ephemeris.ts`
   * (whose J2000 phase comes from the same authoritative JPL table as their
   * other elements), this is an arbitrary illustrative starting angle, not a
   * real observed epoch value: getting "where is Io right now" exactly right
   * isn't a goal for a basic solar-system view the way "where is Mars right
   * now" is. Staggered arbitrarily so moons don't all start lined up.
   */
  epochMeanAnomalyDeg: number
}

/**
 * Circular-orbit-family approximation (real eccentricities, but treated via
 * the same Kepler solve as the planets rather than assuming perfectly
 * circular) for each moon's orbit around its *parent planet* - real
 * semi-major axis/eccentricity/period, all well-known NASA planetary fact
 * sheet values. See `MoonOrbit.epochMeanAnomalyDeg` and `inclinationDeg` for
 * the two simplifications this makes.
 */
const MOON_ORBITS: Record<MoonId, MoonOrbit> = {
  moon: {
    parent: 'earth',
    semiMajorAxisKm: 384400,
    eccentricity: 0.0549,
    inclinationDeg: 5.145,
    periodDays: 27.321661,
    epochMeanAnomalyDeg: 0,
  },
  phobos: {
    parent: 'mars',
    semiMajorAxisKm: 9376,
    eccentricity: 0.0151,
    inclinationDeg: 1.093,
    periodDays: 0.31891023,
    epochMeanAnomalyDeg: 45,
  },
  deimos: {
    parent: 'mars',
    semiMajorAxisKm: 23463.2,
    eccentricity: 0.00033,
    inclinationDeg: 0.93,
    periodDays: 1.263,
    epochMeanAnomalyDeg: 200,
  },
  io: {
    parent: 'jupiter',
    semiMajorAxisKm: 421800,
    eccentricity: 0.0041,
    inclinationDeg: 0.036,
    periodDays: 1.769138,
    epochMeanAnomalyDeg: 0,
  },
  europa: {
    parent: 'jupiter',
    semiMajorAxisKm: 671100,
    eccentricity: 0.009,
    inclinationDeg: 0.466,
    periodDays: 3.551181,
    epochMeanAnomalyDeg: 90,
  },
  ganymede: {
    parent: 'jupiter',
    semiMajorAxisKm: 1070400,
    eccentricity: 0.0013,
    inclinationDeg: 0.177,
    periodDays: 7.154553,
    epochMeanAnomalyDeg: 180,
  },
  callisto: {
    parent: 'jupiter',
    semiMajorAxisKm: 1882700,
    eccentricity: 0.0074,
    inclinationDeg: 0.192,
    periodDays: 16.689018,
    epochMeanAnomalyDeg: 270,
  },
  titan: {
    parent: 'saturn',
    semiMajorAxisKm: 1221870,
    eccentricity: 0.0288,
    inclinationDeg: 0.348,
    periodDays: 15.945,
    epochMeanAnomalyDeg: 0,
  },
}

/** Julian days per century - same constant `ephemeris.ts` uses internally, needed here to turn its centuries back into days. */
const JULIAN_DAYS_PER_CENTURY = 36525
const degToRad = (deg: number) => (deg * Math.PI) / 180

/** Which planet this moon orbits. */
export function moonParent(moon: MoonId): PlanetId {
  return MOON_ORBITS[moon].parent
}

/** A moon's position relative to its parent planet at `date`, AU (so it can be added directly to the parent's heliocentric position). */
export function moonPositionRelativeToParentAu(moon: MoonId, date: Date): Vector3 {
  const orbit = MOON_ORBITS[moon]
  // Reuses ephemeris.ts's J2000 reference (via julianCenturiesSinceJ2000) so
  // "J2000" means exactly the same instant throughout the engine, rather
  // than defining a second, subtly different epoch constant here.
  const daysSinceJ2000 = julianCenturiesSinceJ2000(date) * JULIAN_DAYS_PER_CENTURY
  const meanAnomalyRad = degToRad(
    orbit.epochMeanAnomalyDeg + (360 * daysSinceJ2000) / orbit.periodDays,
  )

  const eccentricAnomalyRad = solveKeplerEquation(meanAnomalyRad, orbit.eccentricity)
  const trueAnomalyRad = trueAnomalyFromEccentric(eccentricAnomalyRad, orbit.eccentricity)

  const semiLatusRectumKm = orbit.semiMajorAxisKm * (1 - orbit.eccentricity * orbit.eccentricity)
  const radiusKm = semiLatusRectumKm / (1 + orbit.eccentricity * Math.cos(trueAnomalyRad))
  const positionPqwKm = { x: radiusKm * Math.cos(trueAnomalyRad), y: radiusKm * Math.sin(trueAnomalyRad) }

  const positionKm = rotatePerifocalToInertial(positionPqwKm, 0, degToRad(orbit.inclinationDeg), 0)
  return scale(positionKm, 1 / AU_KM)
}

/** A moon's heliocentric position at `date`, AU - its parent planet's heliocentric position plus its own planet-centered orbit. */
export function moonHeliocentricPositionAu(
  moon: MoonId,
  date: Date,
  parentHeliocentricPositionAu: Vector3,
): Vector3 {
  return add(parentHeliocentricPositionAu, moonPositionRelativeToParentAu(moon, date))
}
