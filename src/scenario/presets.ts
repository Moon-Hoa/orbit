import {
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  SIDEREAL_DAY_S,
  type OrbitalElements,
} from '../engine'

const degToRad = (deg: number) => (deg * Math.PI) / 180

export interface Preset {
  id: string
  label: string
  elements: OrbitalElements
}

/** Semi-major axis for an orbit with exactly this period, via Kepler's third law. */
const semiMajorAxisFromPeriodSeconds = (periodSeconds: number, mu = EARTH_MU_KM3_S2) =>
  Math.cbrt(mu * (periodSeconds / (2 * Math.PI)) ** 2)

/** Repeats twice per sidereal day - the design period for both Molniya and GPS orbits. */
const HALF_SIDEREAL_DAY_S = SIDEREAL_DAY_S / 2
const SEMI_SYNCHRONOUS_SEMI_MAJOR_AXIS_KM = semiMajorAxisFromPeriodSeconds(HALF_SIDEREAL_DAY_S)

export const PRESETS: Preset[] = [
  {
    id: 'iss',
    label: 'ISS',
    elements: {
      semiMajorAxisKm: EARTH_RADIUS_KM + 408,
      eccentricity: 0.0007,
      inclinationRad: degToRad(51.6),
      raanRad: degToRad(45),
      argOfPerigeeRad: degToRad(30),
      trueAnomalyRad: 0,
    },
  },
  {
    id: 'geo',
    label: 'GEO',
    elements: {
      semiMajorAxisKm: EARTH_RADIUS_KM + 35786,
      eccentricity: 0,
      inclinationRad: 0,
      raanRad: 0,
      argOfPerigeeRad: 0,
      trueAnomalyRad: 0,
    },
  },
  {
    id: 'molniya',
    label: 'Molniya',
    elements: {
      // Half-sidereal-day period gives a ground track that repeats daily -
      // the defining feature of a real Molniya orbit.
      semiMajorAxisKm: SEMI_SYNCHRONOUS_SEMI_MAJOR_AXIS_KM,
      eccentricity: 0.74,
      // The "critical inclination": at 63.4 degrees, apsidal precession
      // vanishes, so apogee stays fixed over high northern latitudes.
      inclinationRad: degToRad(63.4),
      raanRad: 0,
      argOfPerigeeRad: degToRad(270),
      trueAnomalyRad: 0,
    },
  },
  {
    id: 'sun-synchronous',
    label: 'Sun-synchronous',
    elements: {
      // Landsat-8-like: ~705 km altitude, ~98.2 degree retrograde inclination.
      // This engine is two-body only (no J2), so the real sun-synchronous
      // nodal precession isn't modeled - these are realistic reference
      // elements, not a claim that this simulation precesses correctly.
      semiMajorAxisKm: EARTH_RADIUS_KM + 705,
      eccentricity: 0.0001,
      inclinationRad: degToRad(98.2),
      raanRad: 0,
      argOfPerigeeRad: 0,
      trueAnomalyRad: 0,
    },
  },
  {
    id: 'gps',
    label: 'GPS',
    elements: {
      semiMajorAxisKm: SEMI_SYNCHRONOUS_SEMI_MAJOR_AXIS_KM,
      eccentricity: 0.01,
      inclinationRad: degToRad(55),
      raanRad: 0,
      argOfPerigeeRad: 0,
      trueAnomalyRad: 0,
    },
  },
]
