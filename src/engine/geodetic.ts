import { EARTH_RADIUS_KM, EARTH_ROTATION_RATE_RAD_S } from './constants'
import type { GeodeticCoordinates } from './types'
import { type Vector3, clampUnit, magnitude } from './vector'

/**
 * Rotates an ECI (inertial) position into ECEF (Earth-fixed) coordinates.
 *
 * This engine has no notion of a real calendar epoch, so the rotation is
 * defined relative to `simTimeSeconds = 0` (i.e. the ECI and ECEF frames are
 * assumed aligned at the start of the simulation, equivalent to picking an
 * epoch where Greenwich Mean Sidereal Time is zero). ECEF trails the inertial
 * frame as Earth spins prograde, hence the rotation by +theta here (the
 * inverse of the usual ECEF -> ECI rotation).
 */
export function eciToEcef(position: Vector3, simTimeSeconds: number): Vector3 {
  const theta = EARTH_ROTATION_RATE_RAD_S * simTimeSeconds
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)

  return {
    x: position.x * cosTheta + position.y * sinTheta,
    y: -position.x * sinTheta + position.y * cosTheta,
    z: position.z,
  }
}

/**
 * Converts an ECEF position to geodetic latitude/longitude/altitude.
 *
 * The orbit engine models Earth as a sphere (no J2/oblateness - see Phase 1's
 * two-body-only scope), so geodetic latitude here is the same as geocentric
 * latitude; no ellipsoid iteration is needed.
 */
export function ecefToGeodetic(position: Vector3): GeodeticCoordinates {
  const radius = magnitude(position)

  return {
    latitudeRad: Math.asin(clampUnit(position.z / radius)),
    longitudeRad: Math.atan2(position.y, position.x),
    altitudeKm: radius - EARTH_RADIUS_KM,
  }
}

/** Converts an ECI position at a given sim time directly to geodetic coordinates. */
export function eciToGeodetic(position: Vector3, simTimeSeconds: number): GeodeticCoordinates {
  return ecefToGeodetic(eciToEcef(position, simTimeSeconds))
}

/**
 * Inverse of `eciToEcef`: rotates an Earth-fixed (ECEF) position into this
 * engine's inertial (ECI) frame at `simTimeSeconds`. Used to place something
 * defined in real-world (Earth-fixed) terms - e.g. the subsolar point - onto
 * the 3D scene, whose Earth mesh is static and thus represents this same
 * ECI frame rather than spinning to track real Earth rotation.
 */
export function ecefToEci(position: Vector3, simTimeSeconds: number): Vector3 {
  const theta = EARTH_ROTATION_RATE_RAD_S * simTimeSeconds
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)

  return {
    x: position.x * cosTheta - position.y * sinTheta,
    y: position.x * sinTheta + position.y * cosTheta,
    z: position.z,
  }
}

/** Converts geodetic latitude/longitude into a unit-length ECEF direction vector (ignores altitude). */
export function geodeticToEcefDirection(coords: GeodeticCoordinates): Vector3 {
  const cosLat = Math.cos(coords.latitudeRad)
  return {
    x: cosLat * Math.cos(coords.longitudeRad),
    y: cosLat * Math.sin(coords.longitudeRad),
    z: Math.sin(coords.latitudeRad),
  }
}
