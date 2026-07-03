import { EARTH_MU_KM3_S2 } from './constants'
import { orbitalPeriodSeconds, velocityAtRadiusKmS } from './derived'

export interface HohmannTransfer {
  /** Semi-major axis of the transfer ellipse, km. */
  transferSemiMajorAxisKm: number
  /** Departure burn magnitude (circular -> transfer ellipse at r1), km/s. */
  departureDeltaVKmS: number
  /** Arrival burn magnitude (transfer ellipse -> circular at r2), km/s. */
  arrivalDeltaVKmS: number
  /** Total delta-v budget for the transfer, km/s. */
  totalDeltaVKmS: number
  /** Transfer duration - half the transfer ellipse's orbital period, seconds. */
  transferTimeSeconds: number
}

/**
 * Two-impulse Hohmann transfer between two circular, coplanar orbits, at
 * radii `departureRadiusKm` (r1) and `arrivalRadiusKm` (r2) - the classical
 * minimum-energy transfer between circular orbits.
 *
 * Deliberately scoped to circular, coplanar orbits only: no plane-change
 * delta-v, no eccentric "from"/"to" orbits. General (eccentric,
 * non-coplanar) transfer optimization is out of scope - this is the
 * textbook two-impulse case, not a general transfer solver.
 */
export function hohmannTransfer(
  departureRadiusKm: number,
  arrivalRadiusKm: number,
  mu = EARTH_MU_KM3_S2,
): HohmannTransfer {
  const transferSemiMajorAxisKm = (departureRadiusKm + arrivalRadiusKm) / 2

  const departureCircularSpeedKmS = velocityAtRadiusKmS(departureRadiusKm, departureRadiusKm, mu)
  const departureTransferSpeedKmS = velocityAtRadiusKmS(
    departureRadiusKm,
    transferSemiMajorAxisKm,
    mu,
  )
  const departureDeltaVKmS = Math.abs(departureTransferSpeedKmS - departureCircularSpeedKmS)

  const arrivalTransferSpeedKmS = velocityAtRadiusKmS(arrivalRadiusKm, transferSemiMajorAxisKm, mu)
  const arrivalCircularSpeedKmS = velocityAtRadiusKmS(arrivalRadiusKm, arrivalRadiusKm, mu)
  const arrivalDeltaVKmS = Math.abs(arrivalCircularSpeedKmS - arrivalTransferSpeedKmS)

  const transferTimeSeconds = orbitalPeriodSeconds(transferSemiMajorAxisKm, mu) / 2

  return {
    transferSemiMajorAxisKm,
    departureDeltaVKmS,
    arrivalDeltaVKmS,
    totalDeltaVKmS: departureDeltaVKmS + arrivalDeltaVKmS,
    transferTimeSeconds,
  }
}
