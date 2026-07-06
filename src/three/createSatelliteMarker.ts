import * as THREE from 'three'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Default (primary-object) marker color. */
export const DEFAULT_MARKER_COLOR = 0xffffff

/** Builds a small marker mesh representing the satellite's current position. */
export function createSatelliteMarker(color = DEFAULT_MARKER_COLOR): THREE.Mesh {
  const radius = CENTRAL_BODY_RADIUS_SCENE_UNITS * 0.025
  const geometry = new THREE.SphereGeometry(radius, 16, 16)
  const material = new THREE.MeshBasicMaterial({ color })

  const marker = new THREE.Mesh(geometry, material)
  marker.name = 'satellite-marker'
  return marker
}
