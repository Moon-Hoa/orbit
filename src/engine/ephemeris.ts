import { rotatePerifocalToInertial } from './elements'
import { solveKeplerEquation, trueAnomalyFromEccentric } from './kepler'
import type { Vector3 } from './vector'

/** Kilometers per astronomical unit (IAU-defined, exact). */
export const AU_KM = 149_597_870.7

/**
 * The Sun's standard gravitational parameter, expressed in AU^3/day^2 (the
 * Gaussian gravitational constant k, squared - k = 0.01720209895). Not
 * currently consumed (only planet *positions* are needed for the solar
 * system view, and position is a pure function of the elements themselves,
 * independent of mu - see `elementsToStateVector`'s doc comment), but kept
 * here, correctly, for whichever future feature needs heliocentric velocity.
 */
export const SUN_MU_AU3_PER_DAY2 = 2.959122082855911e-4

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'

export const PLANET_IDS: PlanetId[] = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]

/** Display name per planet, for UI labels. */
export const PLANET_LABELS: Record<PlanetId, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
}

/** A value at the J2000.0 epoch, and its linear rate of change per Julian century. */
export type RatedValue = readonly [atJ2000: number, perCentury: number]

/**
 * The 6 classical orbital elements, plus each one's linear secular rate per
 * Julian century - the shape JPL's planetary table uses (see
 * `PLANETARY_ELEMENTS`'s doc comment), also reused as-is by
 * `otherBodies.ts` for dwarf planets/comets, via
 * {@link heliocentricPositionFromElementRates}.
 */
export interface PlanetaryElementRates {
  /** Semi-major axis, AU. */
  semiMajorAxisAu: RatedValue
  eccentricity: RatedValue
  /** Inclination to the J2000 ecliptic, degrees. */
  inclinationDeg: RatedValue
  /** Mean longitude L = M + ϖ, degrees. */
  meanLongitudeDeg: RatedValue
  /** Longitude of perihelion ϖ = ω + Ω, degrees. */
  longitudeOfPerihelionDeg: RatedValue
  /** Longitude of the ascending node Ω, degrees. */
  longitudeOfAscendingNodeDeg: RatedValue
}

/**
 * Low-precision Keplerian elements (plus linear secular rates, per Julian
 * century past J2000.0) for all eight planets, valid ~1800-2050 AD to within
 * a few arcminutes (a bit less for the outer planets, whose much longer
 * periods mean this window is a smaller fraction of one orbit) - Standish,
 * JPL Solar System Dynamics, "Keplerian Elements for Approximate Positions of
 * the Major Planets" (https://ssd.jpl.nasa.gov/planets/approx_pos.html). This
 * deliberately ignores planetary perturbations (Jupiter's pull on Mars, etc.)
 * - the same "two-body only" simplification the rest of this app's orbit
 * engine makes (see Phase 1) - appropriate for a "basic" solar system view,
 * not mission-planning precision. See the Moon/Mars view issues for the same
 * philosophy applied to central-body orbits.
 */
const PLANETARY_ELEMENTS: Record<PlanetId, PlanetaryElementRates> = {
  mercury: {
    semiMajorAxisAu: [0.38709927, 0.00000037],
    eccentricity: [0.20563593, 0.00001906],
    inclinationDeg: [7.00497902, -0.00594749],
    meanLongitudeDeg: [252.2503235, 149472.67411175],
    longitudeOfPerihelionDeg: [77.45779628, 0.16047689],
    longitudeOfAscendingNodeDeg: [48.33076593, -0.12534081],
  },
  venus: {
    semiMajorAxisAu: [0.72333566, 0.0000039],
    eccentricity: [0.00677672, -0.00004107],
    inclinationDeg: [3.39467605, -0.0007889],
    meanLongitudeDeg: [181.9790995, 58517.81538729],
    longitudeOfPerihelionDeg: [131.60246718, 0.00268329],
    longitudeOfAscendingNodeDeg: [76.67984255, -0.27769418],
  },
  earth: {
    semiMajorAxisAu: [1.00000261, 0.00000562],
    eccentricity: [0.01671123, -0.00004392],
    inclinationDeg: [-0.00001531, -0.01294668],
    meanLongitudeDeg: [100.46457166, 35999.37244981],
    longitudeOfPerihelionDeg: [102.93768193, 0.32327364],
    // Earth's inclination to its own defining plane (the ecliptic) is ~0, so
    // the ascending node is conventionally undefined/zero - same convention
    // JPL's source table uses.
    longitudeOfAscendingNodeDeg: [0, 0],
  },
  mars: {
    semiMajorAxisAu: [1.52371034, 0.00001847],
    eccentricity: [0.0933941, 0.00007882],
    inclinationDeg: [1.84969142, -0.00813131],
    meanLongitudeDeg: [-4.55343205, 19140.30268499],
    longitudeOfPerihelionDeg: [-23.94362959, 0.44441088],
    longitudeOfAscendingNodeDeg: [49.55953891, -0.29257343],
  },
  jupiter: {
    semiMajorAxisAu: [5.202887, -0.00011607],
    eccentricity: [0.04838624, -0.00013253],
    inclinationDeg: [1.30439695, -0.00183714],
    meanLongitudeDeg: [34.39644051, 3034.74612775],
    longitudeOfPerihelionDeg: [14.72847983, 0.21252668],
    longitudeOfAscendingNodeDeg: [100.47390909, 0.20469106],
  },
  saturn: {
    semiMajorAxisAu: [9.53667594, -0.0012506],
    eccentricity: [0.05386179, -0.00050991],
    inclinationDeg: [2.48599187, 0.00193609],
    meanLongitudeDeg: [49.95424423, 1222.49362201],
    longitudeOfPerihelionDeg: [92.59887831, -0.41897216],
    longitudeOfAscendingNodeDeg: [113.66242448, -0.28867794],
  },
  uranus: {
    semiMajorAxisAu: [19.18916464, -0.00196176],
    eccentricity: [0.04725744, -0.00004397],
    inclinationDeg: [0.77263783, -0.00242939],
    meanLongitudeDeg: [313.23810451, 428.48202785],
    longitudeOfPerihelionDeg: [170.9542763, 0.40805281],
    longitudeOfAscendingNodeDeg: [74.01692503, 0.04240589],
  },
  neptune: {
    semiMajorAxisAu: [30.06992276, 0.00026291],
    eccentricity: [0.00859048, 0.00005105],
    inclinationDeg: [1.77004347, 0.00035372],
    meanLongitudeDeg: [-55.12002969, 218.45945325],
    longitudeOfPerihelionDeg: [44.96476227, -0.32241464],
    longitudeOfAscendingNodeDeg: [131.78422574, -0.00508664],
  },
}

const J2000_JULIAN_DATE = 2451545.0
const JULIAN_DAYS_PER_CENTURY = 36525
/** Julian date of the Unix epoch (1970-01-01T00:00:00Z). */
const UNIX_EPOCH_JULIAN_DATE = 2440587.5
const MS_PER_DAY = 86_400_000

const degToRad = (deg: number) => (deg * Math.PI) / 180

/** Julian centuries past J2000.0. Treats UTC as TT, which is fine at this precision (the difference is under two minutes). */
export function julianCenturiesSinceJ2000(date: Date): number {
  const julianDate = date.getTime() / MS_PER_DAY + UNIX_EPOCH_JULIAN_DATE
  return (julianDate - J2000_JULIAN_DATE) / JULIAN_DAYS_PER_CENTURY
}

function valueAtCenturies([atJ2000, perCentury]: RatedValue, centuries: number): number {
  return atJ2000 + perCentury * centuries
}

/**
 * A heliocentric position at `date`, AU, in the J2000 ecliptic frame, from a
 * set of rated Keplerian elements - the shared math behind
 * `planetHeliocentricPositionAu` (and, via `otherBodies.ts`,
 * `otherBodyHeliocentricPositionAu`), factored out so it's implemented once.
 */
export function heliocentricPositionFromElementRates(
  rates: PlanetaryElementRates,
  date: Date,
): Vector3 {
  const centuries = julianCenturiesSinceJ2000(date)

  const semiMajorAxisAu = valueAtCenturies(rates.semiMajorAxisAu, centuries)
  const eccentricity = valueAtCenturies(rates.eccentricity, centuries)
  const inclinationRad = degToRad(valueAtCenturies(rates.inclinationDeg, centuries))
  const meanLongitudeDeg = valueAtCenturies(rates.meanLongitudeDeg, centuries)
  const longitudeOfPerihelionDeg = valueAtCenturies(rates.longitudeOfPerihelionDeg, centuries)
  const longitudeOfAscendingNodeDeg = valueAtCenturies(rates.longitudeOfAscendingNodeDeg, centuries)

  const ascendingNodeRad = degToRad(longitudeOfAscendingNodeDeg)
  const argOfPeriapsisRad = degToRad(longitudeOfPerihelionDeg - longitudeOfAscendingNodeDeg)
  const meanAnomalyRad = degToRad(meanLongitudeDeg - longitudeOfPerihelionDeg)

  const eccentricAnomalyRad = solveKeplerEquation(meanAnomalyRad, eccentricity)
  const trueAnomalyRad = trueAnomalyFromEccentric(eccentricAnomalyRad, eccentricity)

  const semiLatusRectum = semiMajorAxisAu * (1 - eccentricity * eccentricity)
  const radiusAu = semiLatusRectum / (1 + eccentricity * Math.cos(trueAnomalyRad))
  const positionPqw = { x: radiusAu * Math.cos(trueAnomalyRad), y: radiusAu * Math.sin(trueAnomalyRad) }

  return rotatePerifocalToInertial(positionPqw, ascendingNodeRad, inclinationRad, argOfPeriapsisRad)
}

/** A planet's heliocentric position at `date`, in the J2000 ecliptic frame, AU. */
export function planetHeliocentricPositionAu(planet: PlanetId, date: Date): Vector3 {
  return heliocentricPositionFromElementRates(PLANETARY_ELEMENTS[planet], date)
}

/** This planet's orbital period, in days - derived from its mean-longitude rate (360 deg / rate). */
export function planetOrbitalPeriodDays(planet: PlanetId): number {
  const degPerCentury = PLANETARY_ELEMENTS[planet].meanLongitudeDeg[1]
  const degPerDay = degPerCentury / JULIAN_DAYS_PER_CENTURY
  return 360 / degPerDay
}
