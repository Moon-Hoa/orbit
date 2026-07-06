import { Vector3 as ThreeVector3 } from 'three'
import type { Vector3 } from '../engine'
import { AU_TO_SCENE_UNITS } from './solarSystemConstants'

/**
 * Maps a heliocentric ecliptic vector (AU, from `engine/ephemeris.ts`) to
 * Three.js scene units, for the solar system view.
 *
 * Mirrors `coordinates.ts#eciToScene`'s axis convention for the same reason:
 * the ephemeris frame's Z is the ecliptic-normal axis ("north" of the plane
 * every planet roughly orbits in), and Three.js is Y-up, so ecliptic Z maps
 * to scene Y; the remaining axis is negated to preserve right-handedness
 * (planets still orbit the same way when viewed from "above" the ecliptic).
 */
export function auToScene(vector: Vector3): ThreeVector3 {
  return new ThreeVector3(
    vector.x * AU_TO_SCENE_UNITS,
    vector.z * AU_TO_SCENE_UNITS,
    -vector.y * AU_TO_SCENE_UNITS,
  )
}
