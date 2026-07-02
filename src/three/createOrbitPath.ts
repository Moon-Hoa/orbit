import * as THREE from 'three'
import { type OrbitalElements, TWO_PI, elementsToStateVector } from '../engine'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'
import { eciToScene } from './coordinates'

/** Points sampled uniformly in true anomaly around one full orbit. */
const PATH_SEGMENTS = 256

/** Builds a closed tube tracing one full orbit, from Phase 1's orbit engine. */
export function createOrbitPath(elements: OrbitalElements): THREE.Mesh {
  const points: THREE.Vector3[] = []
  for (let i = 0; i < PATH_SEGMENTS; i++) {
    const trueAnomalyRad = (i / PATH_SEGMENTS) * TWO_PI
    const state = elementsToStateVector({ ...elements, trueAnomalyRad })
    points.push(eciToScene(state.position))
  }

  const curve = new THREE.CatmullRomCurve3(points, true)
  const tubeRadius = EARTH_RADIUS_SCENE_UNITS * 0.006
  const geometry = new THREE.TubeGeometry(curve, PATH_SEGMENTS * 2, tubeRadius, 8, true)
  const material = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })

  const orbitPath = new THREE.Mesh(geometry, material)
  orbitPath.name = 'orbit-path'
  return orbitPath
}
