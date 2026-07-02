import { EARTH_RADIUS_KM } from '../engine'

/** Earth's radius in scene units. Chosen so 1 scene unit is a convenient camera-friendly scale. */
export const EARTH_RADIUS_SCENE_UNITS = 2

/** Multiply a value in km by this to get scene units. */
export const KM_TO_SCENE_UNITS = EARTH_RADIUS_SCENE_UNITS / EARTH_RADIUS_KM
