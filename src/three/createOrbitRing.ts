import * as THREE from 'three'

/** Default orbit-ring color - a dim neutral so it reads as a reference guide, not a focal element. */
export const DEFAULT_ORBIT_RING_COLOR = 0x475569

/** Builds a closed line loop tracing the given (already scene-space) points - a lightweight reference ring, not a clickable/tubed path like `createOrbitPath.ts`'s. */
export function createOrbitRing(points: THREE.Vector3[], color = DEFAULT_ORBIT_RING_COLOR): THREE.LineLoop {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
  const ring = new THREE.LineLoop(geometry, material)
  ring.name = 'orbit-ring'
  return ring
}
