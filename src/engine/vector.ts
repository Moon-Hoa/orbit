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
