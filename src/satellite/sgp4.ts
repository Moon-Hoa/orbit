import * as satellite from 'satellite.js'
import type { GeodeticCoordinates, StateVector, Vector3 } from '../engine'
import type { TleRecord } from './types'

/** Parses a TLE into satellite.js's internal record. Exported for reuse by passPrediction.ts. */
export function toSatRec(tle: TleRecord) {
  return satellite.twoline2satrec(tle.line1, tle.line2)
}

/** Propagates a parsed satrec to an absolute date, throwing on SGP4 failure (e.g. decayed orbit). */
export function propagateAt(satrec: ReturnType<typeof toSatRec>, date: Date) {
  const result = satellite.propagate(satrec, date)
  if (!result?.position || !result.velocity) {
    throw new Error(
      `SGP4 propagation failed at ${date.toISOString()} (satrec error code ${satrec.error})`,
    )
  }
  return result
}

function geodeticAt(date: Date, position: Vector3): GeodeticCoordinates {
  const gmst = satellite.gstime(date)
  const geodetic = satellite.eciToGeodetic(position, gmst)
  return {
    latitudeRad: geodetic.latitude,
    longitudeRad: geodetic.longitude,
    altitudeKm: geodetic.height,
  }
}

/** Propagates a TLE to an absolute date via SGP4/SDP4, returning an ECI state vector. */
export function propagateTle(tle: TleRecord, date: Date): StateVector {
  const { position, velocity } = propagateAt(toSatRec(tle), date)
  return { position, velocity }
}

/** Propagates a TLE to an absolute date and converts the result to geodetic coordinates. */
export function tleToGeodetic(tle: TleRecord, date: Date): GeodeticCoordinates {
  const { position } = propagateAt(toSatRec(tle), date)
  return geodeticAt(date, position)
}

/**
 * Approximate mean semi-major axis/eccentricity at a given date, derived from
 * SGP4's mean elements. Useful for period/apogee/perigee stats displays; not
 * exact since a perturbed orbit isn't a perfect fixed ellipse, but very close
 * over the short term.
 */
export function approximateElementsFromTle(
  tle: TleRecord,
  date: Date,
): { semiMajorAxisKm: number; eccentricity: number } {
  const { meanElements } = propagateAt(toSatRec(tle), date)
  return {
    semiMajorAxisKm: meanElements.am * satellite.constants.earthRadius,
    eccentricity: meanElements.em,
  }
}

/** Orbital period, seconds, derived from the TLE's mean motion at a given date. */
export function orbitalPeriodSecondsFromTle(tle: TleRecord, date: Date): number {
  const { meanElements } = propagateAt(toSatRec(tle), date)
  const meanMotionRadPerSecond = meanElements.nm / 60
  return (2 * Math.PI) / meanMotionRadPerSecond
}

/** Samples the real satellite's ground track over a trailing window ending at `centerDate`. */
export function sampleRealGroundTrack(
  tle: TleRecord,
  centerDate: Date,
  windowSeconds: number,
  sampleIntervalSeconds: number,
): GeodeticCoordinates[] {
  const satrec = toSatRec(tle)
  const startMs = centerDate.getTime() - windowSeconds * 1000
  const endMs = centerDate.getTime()
  const stepMs = sampleIntervalSeconds * 1000

  const points: GeodeticCoordinates[] = []
  for (let t = startMs; t <= endMs; t += stepMs) {
    const date = new Date(t)
    const { position } = propagateAt(satrec, date)
    points.push(geodeticAt(date, position))
  }
  return points
}

/** Samples ECI positions across one orbital period starting at `startDate`, for drawing a closed orbit path. */
export function sampleRealOrbitEci(
  tle: TleRecord,
  startDate: Date,
  periodSeconds: number,
  sampleCount = 256,
): Vector3[] {
  const satrec = toSatRec(tle)
  const stepMs = (periodSeconds * 1000) / sampleCount

  const points: Vector3[] = []
  for (let i = 0; i < sampleCount; i++) {
    const date = new Date(startDate.getTime() + i * stepMs)
    points.push(propagateAt(satrec, date).position)
  }
  return points
}
