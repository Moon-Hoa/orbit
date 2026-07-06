import { planetHeliocentricPositionAu, slerp, type Vector3 } from '../engine'
import type { SpacecraftTransit } from './types'

/** Whether `transit` is underway (departed but not yet arrived) at `date`. */
export function isInTransitAt(transit: SpacecraftTransit, date: Date): boolean {
  const time = date.getTime()
  return time >= new Date(transit.departureDate).getTime() && time <= new Date(transit.arrivalDate).getTime()
}

/** How far through its cruise `transit` is at `date`, in [0, 1]. Clamped, so it's safe to call even slightly outside the transit window. */
export function transitProgress(transit: SpacecraftTransit, date: Date): number {
  const start = new Date(transit.departureDate).getTime()
  const end = new Date(transit.arrivalDate).getTime()
  const fraction = (date.getTime() - start) / (end - start)
  return Math.max(0, Math.min(1, fraction))
}

/**
 * `transit`'s idealized heliocentric position at `date`, AU: a spherical
 * interpolation (see `engine/vector.ts#slerp`) between the departure body's
 * position at the departure date and the arrival body's position at the
 * arrival date. This traces a smooth, physically-plausible-looking arc
 * (radius eases between the two endpoints' distances from the Sun, sweeping
 * along the great circle between their directions) rather than either a
 * straight line through the Sun's vicinity or a true solved transfer orbit
 * (a Lambert's-problem solve, out of scope for this "basic" view - see
 * `SpacecraftTransit`'s doc comment on why every entry is idealized).
 */
export function idealizedTransitPositionAu(transit: SpacecraftTransit, date: Date): Vector3 {
  const departurePosition = planetHeliocentricPositionAu(
    transit.departureBody,
    new Date(transit.departureDate),
  )
  const arrivalPosition = planetHeliocentricPositionAu(transit.arrivalBody, new Date(transit.arrivalDate))
  return slerp(departurePosition, arrivalPosition, transitProgress(transit, date))
}
