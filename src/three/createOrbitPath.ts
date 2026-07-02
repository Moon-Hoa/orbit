import * as THREE from 'three'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'

/** Builds a closed tube mesh tracing the given (already scene-space) points. */
export function createOrbitPath(points: THREE.Vector3[]): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, true)
  const tubeRadius = EARTH_RADIUS_SCENE_UNITS * 0.006
  const geometry = new THREE.TubeGeometry(curve, points.length * 2, tubeRadius, 8, true)
  const material = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })

  const orbitPath = new THREE.Mesh(geometry, material)
  orbitPath.name = 'orbit-path'
  return orbitPath
}
