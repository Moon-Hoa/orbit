import { EARTH_MU_KM3_S2, TWO_PI } from './constants'
import type { OrbitalElements, StateVector } from './types'
import { type Vector3, clampUnit, cross, dot, magnitude, scale, subtract } from './vector'

const Z_AXIS: Vector3 = { x: 0, y: 0, z: 1 }

/** Tolerance below which eccentricity/inclination are treated as circular/equatorial. */
const SINGULARITY_TOLERANCE = 1e-11

/** Converts classical orbital elements to a position/velocity state vector in the ECI frame. */
export function elementsToStateVector(
  elements: OrbitalElements,
  mu = EARTH_MU_KM3_S2,
): StateVector {
  const {
    semiMajorAxisKm: a,
    eccentricity: e,
    inclinationRad: i,
    raanRad: raan,
    argOfPerigeeRad: argp,
    trueAnomalyRad: nu,
  } = elements

  const semiLatusRectum = a * (1 - e * e)
  const radius = semiLatusRectum / (1 + e * Math.cos(nu))

  // Position and velocity in the perifocal (PQW) frame.
  const positionPqw = { x: radius * Math.cos(nu), y: radius * Math.sin(nu) }
  const h = Math.sqrt(mu * semiLatusRectum)
  const velocityPqw = {
    x: -(mu / h) * Math.sin(nu),
    y: (mu / h) * (e + Math.cos(nu)),
  }

  // Perifocal -> ECI rotation matrix, R3(-raan) * R1(-i) * R3(-argp). Only the
  // first two columns are needed since PQW vectors always have a zero z-component.
  const cosO = Math.cos(raan)
  const sinO = Math.sin(raan)
  const cosI = Math.cos(i)
  const sinI = Math.sin(i)
  const cosW = Math.cos(argp)
  const sinW = Math.sin(argp)

  const r11 = cosO * cosW - sinO * sinW * cosI
  const r12 = -cosO * sinW - sinO * cosW * cosI
  const r21 = sinO * cosW + cosO * sinW * cosI
  const r22 = -sinO * sinW + cosO * cosW * cosI
  const r31 = sinW * sinI
  const r32 = cosW * sinI

  const rotate = (v: { x: number; y: number }): Vector3 => ({
    x: r11 * v.x + r12 * v.y,
    y: r21 * v.x + r22 * v.y,
    z: r31 * v.x + r32 * v.y,
  })

  return {
    position: rotate(positionPqw),
    velocity: rotate(velocityPqw),
  }
}

/**
 * Converts a position/velocity state vector in the ECI frame to classical orbital
 * elements. Handles the circular and/or equatorial singularities: when eccentricity
 * or inclination is (numerically) zero, argument of perigee and/or RAAN are undefined,
 * so they're conventionally set to zero and the true anomaly is measured from the
 * reference direction that remains well-defined (argument of latitude, true longitude,
 * or longitude of periapsis).
 */
export function stateVectorToElements(
  state: StateVector,
  mu = EARTH_MU_KM3_S2,
): OrbitalElements {
  const { position: r, velocity: v } = state
  const rMag = magnitude(r)
  const vMag = magnitude(v)

  const angularMomentum = cross(r, v)
  const h = magnitude(angularMomentum)

  const nodeVector = cross(Z_AXIS, angularMomentum)
  const n = magnitude(nodeVector)

  const eVec = scale(
    subtract(scale(r, vMag * vMag - mu / rMag), scale(v, dot(r, v))),
    1 / mu,
  )
  const e = magnitude(eVec)

  const specificEnergy = (vMag * vMag) / 2 - mu / rMag
  const a = -mu / (2 * specificEnergy)

  const i = Math.acos(clampUnit(angularMomentum.z / h))

  const isEquatorial = n < SINGULARITY_TOLERANCE
  const isCircular = e < SINGULARITY_TOLERANCE

  let raan = 0
  if (!isEquatorial) {
    raan = Math.acos(clampUnit(nodeVector.x / n))
    if (nodeVector.y < 0) raan = TWO_PI - raan
  }

  let argOfPerigee = 0
  if (!isEquatorial && !isCircular) {
    argOfPerigee = Math.acos(clampUnit(dot(nodeVector, eVec) / (n * e)))
    if (eVec.z < 0) argOfPerigee = TWO_PI - argOfPerigee
  } else if (isEquatorial && !isCircular) {
    // Longitude of periapsis, measured from the x-axis.
    argOfPerigee = Math.acos(clampUnit(eVec.x / e))
    if (eVec.y < 0) argOfPerigee = TWO_PI - argOfPerigee
  }

  let trueAnomaly: number
  if (!isCircular) {
    trueAnomaly = Math.acos(clampUnit(dot(eVec, r) / (e * rMag)))
    if (dot(r, v) < 0) trueAnomaly = TWO_PI - trueAnomaly
  } else if (!isEquatorial) {
    // Argument of latitude, measured from the ascending node.
    trueAnomaly = Math.acos(clampUnit(dot(nodeVector, r) / (n * rMag)))
    if (r.z < 0) trueAnomaly = TWO_PI - trueAnomaly
  } else {
    // True longitude, measured from the x-axis.
    trueAnomaly = Math.acos(clampUnit(r.x / rMag))
    if (r.y < 0) trueAnomaly = TWO_PI - trueAnomaly
  }

  return {
    semiMajorAxisKm: a,
    eccentricity: e,
    inclinationRad: i,
    raanRad: raan,
    argOfPerigeeRad: argOfPerigee,
    trueAnomalyRad: trueAnomaly,
  }
}
