import * as satellite from 'satellite.js'
import { TWO_PI } from '../engine'
import type { GeodeticCoordinates, Vector3 } from '../engine'

/** Wraps radians to (-pi, pi], matching GeodeticCoordinates' longitude convention. */
function wrapToSignedPi(radians: number): number {
  return (((radians + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI - Math.PI
}

/**
 * The point on Earth directly under the sun (the "subsolar point") at a given instant.
 * Uses `satellite.js`'s low-precision sun position directly: its `decl` (solar declination)
 * *is* the subsolar latitude, and its `rtasc` (right ascension) minus GMST gives the subsolar
 * longitude - no need to round-trip through `eciToGeodetic`, whose WGS84 ellipsoid correction
 * assumes a km-scale position vector and would badly distort the Sun's AU-scale one.
 */
export function solarSubpointAt(date: Date): GeodeticCoordinates {
  const { rtasc, decl } = satellite.sunPos(satellite.jday(date))
  const gmst = satellite.gstime(date)
  return {
    latitudeRad: decl,
    longitudeRad: wrapToSignedPi(rtasc - gmst),
    altitudeKm: 0,
  }
}

/**
 * Fraction of the Sun's disc obscured by Earth as seen from `positionEciKm` at `date`:
 * 0 = fully sunlit, 1 = totally eclipsed (umbra), values in between = penumbra.
 */
export function shadowFractionAt(date: Date, positionEciKm: Vector3): number {
  const { rsun } = satellite.sunPos(satellite.jday(date))
  return satellite.shadowFraction(rsun, positionEciKm)
}
