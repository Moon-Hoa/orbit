import * as THREE from 'three'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/**
 * Shared geometry for every ground station pin, across all categories -
 * there can be a few hundred of these, so sharing one small geometry (and,
 * per category, one material - see `createGroundStationPinMaterial`) keeps
 * that cheap instead of allocating unique GPU resources per pin. Sized a bit
 * larger than the minimum visually-sensible dot, since this sphere's own
 * geometry is what the raycaster hit-tests against (see the mobile-friendly
 * issue's touch-target note) - there's no separate, larger invisible hit-box.
 */
const PIN_GEOMETRY = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS * 0.02, 8, 8)

/** Builds the (shareable, one-per-category) material for a category's pins. */
export function createGroundStationPinMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color })
}

/** Builds a single ground station pin mesh, sharing geometry/material with the rest of its category. */
export function createGroundStationPin(material: THREE.MeshBasicMaterial): THREE.Mesh {
  const pin = new THREE.Mesh(PIN_GEOMETRY, material)
  pin.name = 'ground-station-pin'
  return pin
}
