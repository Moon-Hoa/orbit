import { Vector3 as ThreeVector3 } from 'three'
import { magnitude, type Vector3 } from '../engine'
import { SCENE_UNITS_PER_SQRT_AU } from './solarSystemConstants'

/**
 * Maps a heliocentric ecliptic vector (AU, from `engine/ephemeris.ts`) to
 * Three.js scene units, for the solar system view - compressing *distance*
 * by a square root rather than scaling it linearly, while leaving direction
 * untouched. A linear factor can't serve both ends of this view: it either
 * squeezes Mercury (0.39 AU) against the Sun to leave room for Neptune
 * (30 AU) and the toggleable "other bodies" (Eris ranges past 90 AU), or it
 * pushes the outer planets far outside any usable camera distance.
 * Square-root compression keeps every body correctly ordered by distance (the
 * asteroid belt still sits between Mars and Jupiter, Pluto still sits
 * beyond Neptune) while bringing the whole system into one comfortable
 * camera range - the same "legible over literal" tradeoff already made for
 * planet/moon sizes (see `solarSystemConstants.ts`).
 *
 * Mirrors `coordinates.ts#eciToScene`'s axis convention for the same reason:
 * the ephemeris frame's Z is the ecliptic-normal axis ("north" of the plane
 * every planet roughly orbits in), and Three.js is Y-up, so ecliptic Z maps
 * to scene Y; the remaining axis is negated to preserve right-handedness
 * (planets still orbit the same way when viewed from "above" the ecliptic).
 */
export function auToScene(vector: Vector3): ThreeVector3 {
  const distanceAu = magnitude(vector)
  if (distanceAu === 0) return new ThreeVector3(0, 0, 0)

  const sceneDistance = SCENE_UNITS_PER_SQRT_AU * Math.sqrt(distanceAu)
  const compression = sceneDistance / distanceAu
  return new ThreeVector3(
    vector.x * compression,
    vector.z * compression,
    -vector.y * compression,
  )
}
