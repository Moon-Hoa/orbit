import { EARTH_MU_KM3_S2, EARTH_RADIUS_KM, TWO_PI } from './constants'

/** Mean motion (average angular rate), rad/s. */
export function meanMotionRadPerSec(semiMajorAxisKm: number, mu = EARTH_MU_KM3_S2): number {
  return Math.sqrt(mu / semiMajorAxisKm ** 3)
}

/** Orbital period, seconds. */
export function orbitalPeriodSeconds(semiMajorAxisKm: number, mu = EARTH_MU_KM3_S2): number {
  return TWO_PI / meanMotionRadPerSec(semiMajorAxisKm, mu)
}

/** Apogee (farthest point) radius from the body's center, km. */
export function apogeeRadiusKm(semiMajorAxisKm: number, eccentricity: number): number {
  return semiMajorAxisKm * (1 + eccentricity)
}

/** Perigee (nearest point) radius from the body's center, km. */
export function perigeeRadiusKm(semiMajorAxisKm: number, eccentricity: number): number {
  return semiMajorAxisKm * (1 - eccentricity)
}

/** Apogee altitude above the body's surface, km. */
export function apogeeAltitudeKm(
  semiMajorAxisKm: number,
  eccentricity: number,
  bodyRadiusKm = EARTH_RADIUS_KM,
): number {
  return apogeeRadiusKm(semiMajorAxisKm, eccentricity) - bodyRadiusKm
}

/** Perigee altitude above the body's surface, km. */
export function perigeeAltitudeKm(
  semiMajorAxisKm: number,
  eccentricity: number,
  bodyRadiusKm = EARTH_RADIUS_KM,
): number {
  return perigeeRadiusKm(semiMajorAxisKm, eccentricity) - bodyRadiusKm
}

/** Orbital speed at a given radius, via the vis-viva equation, km/s. */
export function velocityAtRadiusKmS(
  radiusKm: number,
  semiMajorAxisKm: number,
  mu = EARTH_MU_KM3_S2,
): number {
  return Math.sqrt(mu * (2 / radiusKm - 1 / semiMajorAxisKm))
}
