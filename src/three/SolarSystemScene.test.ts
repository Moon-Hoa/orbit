import { describe, expect, it } from 'vitest'
import { PLANET_IDS } from '../engine'
import { FOCUS_CAMERA_MIN_DISTANCE, PLANET_FOCUS_DISTANCE_MULTIPLIER } from './SolarSystemScene'
import { PLANET_SCENE_RADII } from './solarSystemConstants'

// Purely numeric checks against the exported constants - not instantiating
// SolarSystemScene itself, since that requires a real WebGL context (see
// OrbitScene/CentralBodySelector's identical lack of a dedicated test file
// for the same reason).
describe('per-planet focus framing distance', () => {
  it.each(PLANET_IDS)(
    "clears the camera's configured minimum distance for %s",
    (planet) => {
      // If this weren't true, OrbitControls' own distance clamp (applied on
      // every controls.update()) would silently override the intended
      // close-up framing the moment it's reached, undoing the whole feature
      // for that planet - see FOCUS_CAMERA_MIN_DISTANCE's doc comment.
      const focusDistance = PLANET_SCENE_RADII[planet] * PLANET_FOCUS_DISTANCE_MULTIPLIER
      expect(focusDistance).toBeGreaterThan(FOCUS_CAMERA_MIN_DISTANCE)
    },
  )
})
