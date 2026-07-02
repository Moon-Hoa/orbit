import type { Vector3 } from './vector'

/** Classical (Keplerian) orbital elements. */
export interface OrbitalElements {
  /** Semi-major axis, km. */
  semiMajorAxisKm: number
  /** Eccentricity, dimensionless, [0, 1). */
  eccentricity: number
  /** Inclination, radians, [0, π]. */
  inclinationRad: number
  /** Right ascension of the ascending node, radians, [0, 2π). */
  raanRad: number
  /** Argument of perigee, radians, [0, 2π). */
  argOfPerigeeRad: number
  /** True anomaly, radians, [0, 2π). */
  trueAnomalyRad: number
}

/** Position and velocity in the Earth-Centered Inertial (ECI) frame. */
export interface StateVector {
  /** Position, km. */
  position: Vector3
  /** Velocity, km/s. */
  velocity: Vector3
}
