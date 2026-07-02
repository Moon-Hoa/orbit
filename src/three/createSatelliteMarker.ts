import * as THREE from 'three'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'

/** Builds a small marker mesh representing the satellite's current position. */
export function createSatelliteMarker(): THREE.Mesh {
  const radius = EARTH_RADIUS_SCENE_UNITS * 0.025
  const geometry = new THREE.SphereGeometry(radius, 16, 16)
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff })

  const marker = new THREE.Mesh(geometry, material)
  marker.name = 'satellite-marker'
  return marker
}
