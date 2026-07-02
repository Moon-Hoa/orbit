import { Vector3 as ThreeVector3 } from 'three'
import type { Vector3 } from '../engine'
import { KM_TO_SCENE_UNITS } from './constants'

/**
 * Maps an ECI vector (km) to Three.js scene units.
 *
 * The orbit engine's ECI frame has X/Y in the equatorial plane and Z along
 * Earth's spin axis. Three.js uses a Y-up convention, so this maps ECI Z to
 * scene Y (Earth's axis points "up" on screen) and negates the remaining axis
 * to preserve right-handedness (so prograde orbits still wind the same way
 * when viewed from above the north pole).
 */
export function eciToScene(vector: Vector3): ThreeVector3 {
  return new ThreeVector3(
    vector.x * KM_TO_SCENE_UNITS,
    vector.z * KM_TO_SCENE_UNITS,
    -vector.y * KM_TO_SCENE_UNITS,
  )
}
