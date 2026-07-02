import * as satellite from 'satellite.js'
import { propagateAt, toSatRec } from './sgp4'
import type { TleRecord } from './types'

/** An observer's position on the ground. */
export interface ObserverLocation {
  latitudeRad: number
  longitudeRad: number
  altitudeKm: number
}

/** Topocentric look angles from an observer to a satellite. */
export interface LookAngles {
  azimuthRad: number
  elevationRad: number
  rangeKm: number
}

/** A single visible pass: rises above the horizon (AOS), peaks, then sets (LOS). */
export interface SatellitePass {
  aos: Date
  los: Date
  maxElevationTime: Date
  maxElevationRad: number
}

/** How finely to coarse-scan for elevation sign changes, seconds. */
const DEFAULT_COARSE_STEP_SECONDS = 15
/** How far ahead to search before giving up (some ground tracks never rise for a given observer). */
const DEFAULT_MAX_SEARCH_SECONDS = 3 * 24 * 60 * 60
/** How precisely to pin down AOS/LOS crossing times. */
const CROSSING_REFINEMENT_TOLERANCE_MS = 500

/** Azimuth/elevation/range from an observer to a TLE-propagated satellite at a given date. */
export function lookAnglesAt(tle: TleRecord, observer: ObserverLocation, date: Date): LookAngles {
  const { position } = propagateAt(toSatRec(tle), date)
  const gmst = satellite.gstime(date)
  const positionEcf = satellite.eciToEcf(position, gmst)
  const look = satellite.ecfToLookAngles(
    {
      latitude: observer.latitudeRad,
      longitude: observer.longitudeRad,
      height: observer.altitudeKm,
    },
    positionEcf,
  )
  return { azimuthRad: look.azimuth, elevationRad: look.elevation, rangeKm: look.rangeSat }
}

function elevationAt(tle: TleRecord, observer: ObserverLocation, date: Date): number {
  return lookAnglesAt(tle, observer, date).elevationRad
}

/**
 * Bisects between two chronologically-ordered instants that straddle an
 * elevation sign change (horizon crossing), converging on the crossing time.
 */
function refineCrossing(
  tle: TleRecord,
  observer: ObserverLocation,
  earlierMs: number,
  laterMs: number,
): Date {
  let lowMs = earlierMs
  let highMs = laterMs
  let lowIsAboveHorizon = elevationAt(tle, observer, new Date(lowMs)) >= 0

  while (highMs - lowMs > CROSSING_REFINEMENT_TOLERANCE_MS) {
    const midMs = (lowMs + highMs) / 2
    const midIsAboveHorizon = elevationAt(tle, observer, new Date(midMs)) >= 0
    if (midIsAboveHorizon === lowIsAboveHorizon) {
      lowMs = midMs
    } else {
      highMs = midMs
    }
  }
  return new Date((lowMs + highMs) / 2)
}

/** Ternary-searches for the elevation maximum within [startMs, endMs] (unimodal within one pass). */
function refineMaxElevation(
  tle: TleRecord,
  observer: ObserverLocation,
  startMs: number,
  endMs: number,
): { time: Date; elevationRad: number } {
  let lowMs = startMs
  let highMs = endMs

  for (let i = 0; i < 40; i++) {
    const m1 = lowMs + (highMs - lowMs) / 3
    const m2 = highMs - (highMs - lowMs) / 3
    const e1 = elevationAt(tle, observer, new Date(m1))
    const e2 = elevationAt(tle, observer, new Date(m2))
    if (e1 < e2) {
      lowMs = m1
    } else {
      highMs = m2
    }
  }

  const time = new Date((lowMs + highMs) / 2)
  return { time, elevationRad: elevationAt(tle, observer, time) }
}

export interface FindPassesOptions {
  count?: number
  coarseStepSeconds?: number
  maxSearchSeconds?: number
}

/**
 * Finds the next visible passes of a real satellite over an observer,
 * scanning forward from `startDate`. Stops once `count` passes are found or
 * `maxSearchSeconds` elapses (some ground tracks never rise for a given
 * observer, so this can legitimately return fewer than `count`, including 0).
 */
export function findNextPasses(
  tle: TleRecord,
  observer: ObserverLocation,
  startDate: Date,
  options: FindPassesOptions = {},
): SatellitePass[] {
  const count = options.count ?? 5
  const stepMs = (options.coarseStepSeconds ?? DEFAULT_COARSE_STEP_SECONDS) * 1000
  const searchEndMs =
    startDate.getTime() + (options.maxSearchSeconds ?? DEFAULT_MAX_SEARCH_SECONDS) * 1000

  const passes: SatellitePass[] = []

  let prevMs = startDate.getTime()
  let prevElevation = elevationAt(tle, observer, new Date(prevMs))

  // If already visible at the search start, treat "now" as the AOS of the in-progress pass.
  let aosMs: number | null = prevElevation >= 0 ? prevMs : null

  for (let ms = prevMs + stepMs; ms <= searchEndMs && passes.length < count; ms += stepMs) {
    const elevation = elevationAt(tle, observer, new Date(ms))

    if (aosMs === null && prevElevation < 0 && elevation >= 0) {
      aosMs = refineCrossing(tle, observer, prevMs, ms).getTime()
    } else if (aosMs !== null && prevElevation >= 0 && elevation < 0) {
      const los = refineCrossing(tle, observer, prevMs, ms)
      const max = refineMaxElevation(tle, observer, aosMs, los.getTime())
      passes.push({
        aos: new Date(aosMs),
        los,
        maxElevationTime: max.time,
        maxElevationRad: max.elevationRad,
      })
      aosMs = null
    }

    prevMs = ms
    prevElevation = elevation
  }

  return passes
}
