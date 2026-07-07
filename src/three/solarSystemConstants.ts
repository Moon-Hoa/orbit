import type { MoonId, PlanetId } from '../engine'

/**
 * Scene units per sqrt(AU) - see `auToScene`'s doc comment for why distance
 * is compressed by a square root rather than mapped linearly (Neptune is
 * ~77x farther out than Mercury; a linear factor that keeps Mercury clear of
 * the Sun puts Neptune, let alone the toggleable "other bodies" whose orbits
 * reach past 90 AU, absurdly far outside any usable camera range). Chosen
 * (like `CENTRAL_BODY_RADIUS_SCENE_UNITS` for the body view) purely for a
 * camera-friendly scale - not related to the body view's km-based scale,
 * since this is a different scene/camera entirely.
 */
export const SCENE_UNITS_PER_SQRT_AU = 15

/**
 * Roughly Neptune's orbital radius in scene units (semi-major axis 30.07 AU,
 * via the same sqrt compression as `auToScene`) - not used to position any
 * body, only as the target radius the default camera framing solves for, so
 * all 8 planets stay in view regardless of viewport aspect ratio (see
 * `SolarSystemScene`'s constructor). Deliberately independent of the live
 * ephemeris - the framing only needs to be roughly right, not exact.
 */
export const OUTERMOST_PLANET_SCENE_RADIUS = SCENE_UNITS_PER_SQRT_AU * Math.sqrt(30.07)

/** The Sun's rendered radius, scene units. Not to scale (see `PLANET_SCENE_RADII`). */
export const SUN_SCENE_RADIUS = 3

/** A small, fixed reference size for markers that aren't planets (spacecraft, moons) - independent of any one planet's tiered radius below. */
export const SMALL_BODY_SCENE_RADIUS = 0.28

/**
 * Each planet's rendered radius, scene units - tiered (terrestrial planets
 * smaller, gas/ice giants bigger) so Jupiter and Saturn read as visibly
 * larger worlds, but deliberately *not* to real scale (a real-scale Jupiter
 * at this distance would dwarf the inner planets into invisibility, and a
 * real-scale Earth next to a real-scale Sun would be a handful of pixels) -
 * still following this app's existing precedent of a fixed, camera-friendly
 * on-screen size rather than a literal one (see `CENTRAL_BODY_RADIUS_SCENE_UNITS`).
 */
export const PLANET_SCENE_RADII: Record<PlanetId, number> = {
  mercury: 0.5,
  venus: 0.75,
  earth: 0.8,
  mars: 0.6,
  jupiter: 2.2,
  saturn: 1.9,
  uranus: 1.3,
  neptune: 1.3,
}

/**
 * Each moon's *displayed* orbital radius, scene units - real moon orbits
 * (converted via the same `auToScene` as the planets) are a tiny
 * fraction of a scene unit, since they're ~1000-10000x smaller than
 * interplanetary distances, so at this scale they'd render inside their own
 * (already not-to-scale) parent planet. These are hand-picked to clear the
 * parent's rendered radius (and, for Titan, Saturn's rings) with some
 * separation between siblings, in real-distance order - not a literal
 * physical conversion, the same kind of legibility-over-realism choice
 * `PLANET_SCENE_RADII` already makes. Only the *distance* is display-scaled
 * like this; the *direction* each moon sits in still comes from its real
 * orbital mechanics (see `SolarSystemScene`).
 */
export const MOON_DISPLAY_ORBIT_RADII: Record<MoonId, number> = {
  moon: 1.2,
  phobos: 0.85,
  deimos: 1.05,
  io: 2.7,
  europa: 3.0,
  ganymede: 3.3,
  callisto: 3.6,
  titan: 4.8,
}

/** Marker color for an in-transit spacecraft, distinct from the planet palette. */
export const SPACECRAFT_MARKER_COLOR = 0xf8fafc
