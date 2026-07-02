import { EARTH_MU_KM3_S2 } from './constants'
import { eciToGeodetic } from './geodetic'
import { propagateToStateVector } from './propagate'
import type { GeodeticCoordinates, OrbitalElements } from './types'

/**
 * Samples the satellite's ground track (subpoint) over a trailing time
 * window ending at `centerTimeSeconds`, at fixed intervals. A pure function
 * of (elements, time) - recomputed fresh each call rather than incrementally
 * accumulated, since propagation is cheap (closed-form Kepler solve).
 */
export function sampleGroundTrack(
  elements: OrbitalElements,
  centerTimeSeconds: number,
  windowSeconds: number,
  sampleIntervalSeconds: number,
  mu = EARTH_MU_KM3_S2,
): GeodeticCoordinates[] {
  const startTimeSeconds = centerTimeSeconds - windowSeconds
  const points: GeodeticCoordinates[] = []

  for (let t = startTimeSeconds; t <= centerTimeSeconds; t += sampleIntervalSeconds) {
    const state = propagateToStateVector(elements, t, mu)
    points.push(eciToGeodetic(state.position, t))
  }

  return points
}
