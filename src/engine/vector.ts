export interface Vector3 {
  x: number
  y: number
  z: number
}

export const dot = (a: Vector3, b: Vector3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z

export const cross = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})

export const magnitude = (a: Vector3): number => Math.sqrt(dot(a, a))

export const scale = (a: Vector3, s: number): Vector3 => ({
  x: a.x * s,
  y: a.y * s,
  z: a.z * s,
})

export const add = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
})

export const subtract = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})

/** Clamps to [-1, 1] to guard acos/asin against floating-point drift just past the domain edge. */
export const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value))

/** Scales a vector to unit length. */
export const normalize = (a: Vector3): Vector3 => scale(a, 1 / magnitude(a))

/**
 * Spherical linear interpolation: sweeps from `a` to `b` along the great-circle
 * arc between their directions, at `t` (0 = `a`, 1 = `b`), also linearly
 * interpolating magnitude - used for the solar system view's idealized
 * spacecraft-transit paths (see `src/solarSystem/transit.ts`), where it
 * traces a smooth, physically-plausible-looking arc between two heliocentric
 * positions instead of cutting a straight line through the Sun's vicinity.
 * Falls back to plain linear interpolation when `a`/`b` are (near-)parallel,
 * where the great-circle direction is undefined.
 */
export function slerp(a: Vector3, b: Vector3, t: number): Vector3 {
  const magnitudeA = magnitude(a)
  const magnitudeB = magnitude(b)
  const interpolatedMagnitude = magnitudeA + (magnitudeB - magnitudeA) * t

  const cosOmega = clampUnit(dot(a, b) / (magnitudeA * magnitudeB))
  const omega = Math.acos(cosOmega)
  const sinOmega = Math.sin(omega)

  if (sinOmega < 1e-10) {
    const lerped = add(scale(a, 1 - t), scale(b, t))
    if (magnitude(lerped) < 1e-10) {
      // a and b point in exactly opposite directions and t is (near) 0.5: the
      // great-circle "midpoint" is genuinely ambiguous (every direction
      // perpendicular to a is an equally valid one) - pick one arbitrarily.
      const reference = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
      return scale(normalize(cross(a, reference)), interpolatedMagnitude)
    }
    return scale(normalize(lerped), interpolatedMagnitude)
  }

  const weightA = Math.sin((1 - t) * omega) / sinOmega
  const weightB = Math.sin(t * omega) / sinOmega
  const direction = add(scale(a, weightA / magnitudeA), scale(b, weightB / magnitudeB))
  return scale(direction, interpolatedMagnitude)
}
