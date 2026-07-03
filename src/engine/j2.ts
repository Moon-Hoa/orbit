import { EARTH_J2, EARTH_MU_KM3_S2, EARTH_RADIUS_KM } from './constants'
import { meanMotionRadPerSec } from './derived'

/** Semi-latus rectum, km: a(1 - e^2). */
function semiLatusRectumKm(semiMajorAxisKm: number, eccentricity: number): number {
  return semiMajorAxisKm * (1 - eccentricity ** 2)
}

/**
 * RAAN secular drift rate (nodal regression) from Earth's J2 oblateness, rad/s.
 * Standard first-order secular perturbation result (e.g. Curtis, *Orbital
 * Mechanics for Engineering Students*, eq. 4.53):
 *
 *   dOmega/dt = -1.5 * n * J2 * (Re/p)^2 * cos(i)
 */
export function raanDriftRadPerSec(
  semiMajorAxisKm: number,
  eccentricity: number,
  inclinationRad: number,
  mu = EARTH_MU_KM3_S2,
  j2 = EARTH_J2,
  bodyRadiusKm = EARTH_RADIUS_KM,
): number {
  const n = meanMotionRadPerSec(semiMajorAxisKm, mu)
  const p = semiLatusRectumKm(semiMajorAxisKm, eccentricity)
  return -1.5 * n * j2 * (bodyRadiusKm / p) ** 2 * Math.cos(inclinationRad)
}

/**
 * Argument-of-perigee secular drift rate (apsidal precession) from Earth's
 * J2 oblateness, rad/s (Curtis, eq. 4.55, expanded to the equivalent
 * (5cos^2(i) - 1) form):
 *
 *   domega/dt = 0.75 * n * J2 * (Re/p)^2 * (5*cos^2(i) - 1)
 *
 * Vanishes at the "critical inclination" i = arccos(1/sqrt(5)) ~= 63.43 deg,
 * which is why Molniya-type orbits are designed at that inclination.
 */
export function argOfPerigeeDriftRadPerSec(
  semiMajorAxisKm: number,
  eccentricity: number,
  inclinationRad: number,
  mu = EARTH_MU_KM3_S2,
  j2 = EARTH_J2,
  bodyRadiusKm = EARTH_RADIUS_KM,
): number {
  const n = meanMotionRadPerSec(semiMajorAxisKm, mu)
  const p = semiLatusRectumKm(semiMajorAxisKm, eccentricity)
  return 0.75 * n * j2 * (bodyRadiusKm / p) ** 2 * (5 * Math.cos(inclinationRad) ** 2 - 1)
}
