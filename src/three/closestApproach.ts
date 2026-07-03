import { magnitude, subtract } from '../engine'
import type { OrbitSource } from './OrbitSource'

export interface ClosestApproachResult {
  /** Seconds from `currentSimTimeSeconds` until closest approach. */
  timeToClosestApproachSeconds: number
  /** Minimum separation distance, km. */
  minDistanceKm: number
  /** Relative velocity magnitude at closest approach, km/s. */
  relativeVelocityKmS: number
}

/** How finely the lookahead window is coarse-sampled before golden-section refinement. */
const COARSE_SAMPLE_COUNT = 500
/** Caps the lookahead window when the two objects' periods differ wildly (e.g. LEO vs GEO). */
const LOOKAHEAD_CAP_SECONDS = 3 * 86400
const GOLDEN_SECTION_ITERATIONS = 60
const INVERSE_GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2

function squaredSeparationAt(a: OrbitSource, b: OrbitSource, simTimeSeconds: number): number {
  const posA = a.getStateAt(simTimeSeconds).position
  const posB = b.getStateAt(simTimeSeconds).position
  const dx = posA.x - posB.x
  const dy = posA.y - posB.y
  const dz = posA.z - posB.z
  return dx * dx + dy * dy + dz * dz
}

/** Minimizes `f` over [lo, hi] via golden-section search (no derivative needed). */
function goldenSectionMinimize(
  f: (t: number) => number,
  lo: number,
  hi: number,
  iterations: number,
): number {
  let a = lo
  let b = hi
  let c = b - INVERSE_GOLDEN_RATIO * (b - a)
  let d = a + INVERSE_GOLDEN_RATIO * (b - a)
  let fc = f(c)
  let fd = f(d)

  for (let i = 0; i < iterations; i++) {
    if (fc < fd) {
      b = d
      d = c
      fd = fc
      c = b - INVERSE_GOLDEN_RATIO * (b - a)
      fc = f(c)
    } else {
      a = c
      c = d
      fc = fd
      d = a + INVERSE_GOLDEN_RATIO * (b - a)
      fd = f(d)
    }
  }

  return (a + b) / 2
}

/**
 * Finds the time and distance of closest approach between two tracked
 * objects, searching forward from `currentSimTimeSeconds`.
 *
 * Lookahead window is the longer of the two objects' periods, capped at
 * `LOOKAHEAD_CAP_SECONDS` (3 days) - a full synodic cycle between two
 * orbits of very different periods can be far longer than either period, so
 * this is a practical bound, not a claim of finding every future approach.
 * Coarse-samples the window at `COARSE_SAMPLE_COUNT` points to locate the
 * neighborhood of the minimum, then refines it via golden-section search
 * (derivative-free, robust for the smooth, unimodal-near-the-minimum
 * separation-vs-time function this produces).
 *
 * This is a numerical minimum-distance search, not a full
 * conjunction-assessment/collision-probability tool - no covariance, no
 * hard-body-radius risk modeling.
 */
export function findClosestApproach(
  a: OrbitSource,
  b: OrbitSource,
  currentSimTimeSeconds: number,
): ClosestApproachResult {
  const lookaheadSeconds = Math.min(
    Math.max(a.getPeriodSeconds(), b.getPeriodSeconds()),
    LOOKAHEAD_CAP_SECONDS,
  )
  const stepSeconds = lookaheadSeconds / COARSE_SAMPLE_COUNT

  let bestIndex = 0
  let bestDistanceSquaredKm2 = Infinity
  for (let i = 0; i <= COARSE_SAMPLE_COUNT; i++) {
    const t = currentSimTimeSeconds + i * stepSeconds
    const distanceSquaredKm2 = squaredSeparationAt(a, b, t)
    if (distanceSquaredKm2 < bestDistanceSquaredKm2) {
      bestDistanceSquaredKm2 = distanceSquaredKm2
      bestIndex = i
    }
  }

  const refineLo = currentSimTimeSeconds + Math.max(bestIndex - 1, 0) * stepSeconds
  const refineHi = currentSimTimeSeconds + Math.min(bestIndex + 1, COARSE_SAMPLE_COUNT) * stepSeconds
  const closestTimeSeconds = goldenSectionMinimize(
    (t) => squaredSeparationAt(a, b, t),
    refineLo,
    refineHi,
    GOLDEN_SECTION_ITERATIONS,
  )

  const stateA = a.getStateAt(closestTimeSeconds)
  const stateB = b.getStateAt(closestTimeSeconds)

  return {
    timeToClosestApproachSeconds: closestTimeSeconds - currentSimTimeSeconds,
    minDistanceKm: magnitude(subtract(stateA.position, stateB.position)),
    relativeVelocityKmS: magnitude(subtract(stateA.velocity, stateB.velocity)),
  }
}
