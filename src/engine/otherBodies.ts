import { heliocentricPositionFromElementRates, type PlanetaryElementRates } from './ephemeris'
import type { Vector3 } from './vector'

export type OtherBodyId = 'pluto' | 'ceres' | 'eris' | 'halley'

export const OTHER_BODY_IDS: OtherBodyId[] = ['pluto', 'ceres', 'eris', 'halley']

/** Display name per body, for UI labels. */
export const OTHER_BODY_LABELS: Record<OtherBodyId, string> = {
  pluto: 'Pluto',
  ceres: 'Ceres',
  eris: 'Eris',
  halley: "Halley's Comet",
}

/**
 * Real (semi-major axis/eccentricity/inclination/node/perihelion) but
 * *static* elements - all rates are zero, unlike `PLANETARY_ELEMENTS`, whose
 * secular rates come from the same authoritative JPL table as everything
 * else. These bodies' precession is real but small over the few centuries
 * this app's date range ever spans, so holding the ellipse itself fixed and
 * only advancing the mean anomaly along it is a reasonable simplification
 * for a toggleable, secondary layer - not the same standard of accuracy as
 * the 8 planets. Comet Halley's mean longitude is derived from its
 * well-documented last perihelion (1986-02-09); the other three bodies move
 * slowly enough (Ceres aside) or are new enough additions here that their
 * J2000 starting point is an illustrative placement (perihelion at J2000),
 * not a value looked up from an ephemeris - the same "flagged approximation"
 * spirit as `engine/moons.ts`'s epoch phases.
 */
const OTHER_BODY_ELEMENTS: Record<OtherBodyId, PlanetaryElementRates> = {
  pluto: {
    semiMajorAxisAu: [39.482, 0],
    eccentricity: [0.2488, 0],
    inclinationDeg: [17.16, 0],
    // Perihelion at J2000 (L = ϖ): illustrative, not Pluto's real 1989 perihelion phase.
    meanLongitudeDeg: [224.06, 0],
    longitudeOfPerihelionDeg: [224.06, 0],
    longitudeOfAscendingNodeDeg: [110.3, 0],
  },
  ceres: {
    semiMajorAxisAu: [2.7658, 0],
    eccentricity: [0.0758, 0],
    inclinationDeg: [10.594, 0],
    meanLongitudeDeg: [153.9, 0],
    longitudeOfPerihelionDeg: [153.9, 0],
    longitudeOfAscendingNodeDeg: [80.305, 0],
  },
  eris: {
    semiMajorAxisAu: [67.78, 0],
    eccentricity: [0.44068, 0],
    inclinationDeg: [44.04, 0],
    meanLongitudeDeg: [187.23, 0],
    longitudeOfPerihelionDeg: [187.23, 0],
    longitudeOfAscendingNodeDeg: [35.95, 0],
  },
  halley: {
    semiMajorAxisAu: [17.8, 0],
    eccentricity: [0.967, 0],
    // Retrograde (>90 degrees) - handled the same way as any other
    // inclination by the shared rotation math, no special-casing needed.
    inclinationDeg: [162.3, 0],
    // Mean anomaly at J2000 derived from the real 1986-02-09 perihelion and
    // the ~75.3-year period: 360 * (13.9 years since perihelion) / 75.3 =
    // ~66.4 degrees past perihelion.
    meanLongitudeDeg: [169.75 + 66.4, 0],
    longitudeOfPerihelionDeg: [169.75, 0],
    longitudeOfAscendingNodeDeg: [58.42, 0],
  },
}

/** An "other body"'s heliocentric position at `date`, in the J2000 ecliptic frame, AU. */
export function otherBodyHeliocentricPositionAu(body: OtherBodyId, date: Date): Vector3 {
  return heliocentricPositionFromElementRates(OTHER_BODY_ELEMENTS[body], date)
}
