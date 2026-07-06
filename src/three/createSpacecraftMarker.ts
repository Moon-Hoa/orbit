import * as THREE from 'three'
import { PLANET_SCENE_RADIUS, SPACECRAFT_MARKER_COLOR } from './solarSystemConstants'

/** Builds a marker mesh for an in-transit spacecraft - small relative to a planet, but comfortably clickable. */
export function createSpacecraftMarker(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(PLANET_SCENE_RADIUS * 0.35, 12, 12)
  const material = new THREE.MeshBasicMaterial({ color: SPACECRAFT_MARKER_COLOR })
  const marker = new THREE.Mesh(geometry, material)
  marker.name = 'spacecraft-marker'
  return marker
}
