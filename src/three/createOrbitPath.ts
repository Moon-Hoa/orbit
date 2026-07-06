import * as THREE from 'three'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Default (primary-object) orbit path color, matching the rest of the UI's accent. */
export const DEFAULT_ORBIT_PATH_COLOR = 0x38bdf8

/** Builds a closed tube mesh tracing the given (already scene-space) points. */
export function createOrbitPath(
  points: THREE.Vector3[],
  color = DEFAULT_ORBIT_PATH_COLOR,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, true)
  const tubeRadius = CENTRAL_BODY_RADIUS_SCENE_UNITS * 0.006
  const geometry = new THREE.TubeGeometry(curve, points.length * 2, tubeRadius, 8, true)
  const material = new THREE.MeshBasicMaterial({ color })

  const orbitPath = new THREE.Mesh(geometry, material)
  orbitPath.name = 'orbit-path'
  return orbitPath
}
