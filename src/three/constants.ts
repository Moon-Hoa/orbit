import { EARTH_RADIUS_KM } from '../engine'

/**
 * Fixed on-screen radius (scene units) for whichever central body is
 * currently selected - Earth, Moon, and Mars all render at this same visual
 * size regardless of their real relative sizes, so camera distances, marker
 * sizes, and orbit-path tube radii (all expressed as multiples of this
 * constant) don't need to change when the central body changes.
 */
export const CENTRAL_BODY_RADIUS_SCENE_UNITS = 2

/**
 * Multiply a value in km by this to get scene units, for the
 * currently-selected central body. Mutable (not derived once at import time)
 * so `OrbitScene.setCentralBody` can repoint it at a new body's real radius
 * without every other module needing to pass the scale around explicitly -
 * see `setCentralBodyRadiusKm`.
 */
export let KM_TO_SCENE_UNITS = CENTRAL_BODY_RADIUS_SCENE_UNITS / EARTH_RADIUS_KM

/**
 * Repoints `KM_TO_SCENE_UNITS` at a new central body's real radius, keeping
 * its on-screen size fixed at `CENTRAL_BODY_RADIUS_SCENE_UNITS`. Every module
 * that imports `KM_TO_SCENE_UNITS` (e.g. `eciToScene`) reads the live
 * binding, so this takes effect immediately without those call sites
 * changing.
 */
export function setCentralBodyRadiusKm(radiusKm: number): void {
  KM_TO_SCENE_UNITS = CENTRAL_BODY_RADIUS_SCENE_UNITS / radiusKm
}
