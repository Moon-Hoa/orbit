import { TWO_PI } from './constants'

/** Wraps an angle in radians to [0, 2π). */
export function normalizeAngle(radians: number): number {
  const wrapped = radians % TWO_PI
  return wrapped < 0 ? wrapped + TWO_PI : wrapped
}

/** Mean anomaly from eccentric anomaly (Kepler's equation): M = E - e sin(E). */
export function meanAnomalyFromEccentric(
  eccentricAnomalyRad: number,
  eccentricity: number,
): number {
  return eccentricAnomalyRad - eccentricity * Math.sin(eccentricAnomalyRad)
}

/** Eccentric anomaly from true anomaly, via the numerically stable half-angle form. */
export function eccentricAnomalyFromTrue(
  trueAnomalyRad: number,
  eccentricity: number,
): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 - eccentricity) * Math.sin(trueAnomalyRad / 2),
      Math.sqrt(1 + eccentricity) * Math.cos(trueAnomalyRad / 2),
    )
  )
}

/** True anomaly from eccentric anomaly, the inverse of {@link eccentricAnomalyFromTrue}. */
export function trueAnomalyFromEccentric(
  eccentricAnomalyRad: number,
  eccentricity: number,
): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomalyRad / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomalyRad / 2),
    )
  )
}

/**
 * Solves Kepler's equation M = E - e sin(E) for the eccentric anomaly E, given
 * the mean anomaly M, via Newton-Raphson iteration.
 */
export function solveKeplerEquation(
  meanAnomalyRad: number,
  eccentricity: number,
  tolerance = 1e-12,
  maxIterations = 100,
): number {
  const m = normalizeAngle(meanAnomalyRad)
  let e = eccentricity < 0.8 ? m : Math.PI

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const delta = (e - eccentricity * Math.sin(e) - m) / (1 - eccentricity * Math.cos(e))
    e -= delta
    if (Math.abs(delta) < tolerance) {
      return e
    }
  }

  throw new Error(
    `solveKeplerEquation did not converge after ${maxIterations} iterations (M=${meanAnomalyRad}, e=${eccentricity})`,
  )
}
