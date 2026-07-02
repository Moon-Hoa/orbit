import { EARTH_MU_KM3_S2 } from './constants'
import { elementsToStateVector } from './elements'
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
 * Advances a set of orbital elements forward (or backward) by `deltaTimeSeconds`
 * under unperturbed two-body (Keplerian) motion. Only the true anomaly changes;
 * a, e, i, RAAN, and argument of perigee are constants of two-body motion.
 */
export function propagateElements(
  elements: OrbitalElements,
  deltaTimeSeconds: number,
  mu = EARTH_MU_KM3_S2,
): OrbitalElements {
  const { semiMajorAxisKm: a, eccentricity: e, trueAnomalyRad: nu0 } = elements
  const meanMotion = meanMotionRadPerSec(a, mu)

  const eccentricAnomaly0 = eccentricAnomalyFromTrue(nu0, e)
  const meanAnomaly0 = meanAnomalyFromEccentric(eccentricAnomaly0, e)
  const meanAnomaly1 = normalizeAngle(meanAnomaly0 + meanMotion * deltaTimeSeconds)
  const eccentricAnomaly1 = solveKeplerEquation(meanAnomaly1, e)
  const trueAnomaly1 = normalizeAngle(trueAnomalyFromEccentric(eccentricAnomaly1, e))

  return { ...elements, trueAnomalyRad: trueAnomaly1 }
}

/** Propagates elements forward by `deltaTimeSeconds` and returns the resulting state vector. */
export function propagateToStateVector(
  elements: OrbitalElements,
  deltaTimeSeconds: number,
  mu = EARTH_MU_KM3_S2,
): StateVector {
  return elementsToStateVector(propagateElements(elements, deltaTimeSeconds, mu), mu)
}
