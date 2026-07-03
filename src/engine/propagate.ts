import { EARTH_MU_KM3_S2 } from './constants'
import { elementsToStateVector } from './elements'
import { argOfPerigeeDriftRadPerSec, raanDriftRadPerSec } from './j2'
import {
  eccentricAnomalyFromTrue,
  meanAnomalyFromEccentric,
  normalizeAngle,
  solveKeplerEquation,
  trueAnomalyFromEccentric,
} from './kepler'
import { meanMotionRadPerSec } from './derived'
import type { OrbitalElements, StateVector } from './types'

/**
 * Advances a set of orbital elements forward (or backward) by `deltaTimeSeconds`.
 *
 * Under plain two-body (Keplerian) motion (`enableJ2` false, the default),
 * only the true anomaly changes - a, e, i, RAAN, and argument of perigee are
 * constants of two-body motion. With `enableJ2` true, RAAN and argument of
 * perigee additionally advance linearly at their J2 secular drift rates
 * (nodal regression / apsidal precession) - see `engine/j2.ts`. a, e, i, and
 * true-anomaly-vs-time stay two-body either way; this is the single
 * next-order perturbation term, not a general perturbation model.
 */
export function propagateElements(
  elements: OrbitalElements,
  deltaTimeSeconds: number,
  mu = EARTH_MU_KM3_S2,
  enableJ2 = false,
): OrbitalElements {
  const { semiMajorAxisKm: a, eccentricity: e, inclinationRad: i, trueAnomalyRad: nu0 } = elements
  const meanMotion = meanMotionRadPerSec(a, mu)

  const eccentricAnomaly0 = eccentricAnomalyFromTrue(nu0, e)
  const meanAnomaly0 = meanAnomalyFromEccentric(eccentricAnomaly0, e)
  const meanAnomaly1 = normalizeAngle(meanAnomaly0 + meanMotion * deltaTimeSeconds)
  const eccentricAnomaly1 = solveKeplerEquation(meanAnomaly1, e)
  const trueAnomaly1 = normalizeAngle(trueAnomalyFromEccentric(eccentricAnomaly1, e))

  if (!enableJ2) {
    return { ...elements, trueAnomalyRad: trueAnomaly1 }
  }

  const raan1 = normalizeAngle(
    elements.raanRad + raanDriftRadPerSec(a, e, i, mu) * deltaTimeSeconds,
  )
  const argOfPerigee1 = normalizeAngle(
    elements.argOfPerigeeRad + argOfPerigeeDriftRadPerSec(a, e, i, mu) * deltaTimeSeconds,
  )

  return {
    ...elements,
    raanRad: raan1,
    argOfPerigeeRad: argOfPerigee1,
    trueAnomalyRad: trueAnomaly1,
  }
}

/** Propagates elements forward by `deltaTimeSeconds` and returns the resulting state vector. */
export function propagateToStateVector(
  elements: OrbitalElements,
  deltaTimeSeconds: number,
  mu = EARTH_MU_KM3_S2,
  enableJ2 = false,
): StateVector {
  return elementsToStateVector(propagateElements(elements, deltaTimeSeconds, mu, enableJ2), mu)
}
