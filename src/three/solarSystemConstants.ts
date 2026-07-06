import type { PlanetId } from '../engine'

/**
 * Scene units per AU. Chosen (like `CENTRAL_BODY_RADIUS_SCENE_UNITS` for the
 * body view) purely for a camera-friendly scale - not related to the body
 * view's km-based scale, since this is a different scene/camera entirely.
 */
export const AU_TO_SCENE_UNITS = 50

/** The Sun's rendered radius, scene units. Not to scale (see `PLANET_SCENE_RADIUS`). */
export const SUN_SCENE_RADIUS = 3

/**
 * Every planet's rendered radius, scene units - deliberately uniform and not
 * to scale (a real-scale Earth next to a real-scale Sun at this distance
 * would be a handful of pixels), matching this app's existing precedent of
 * rendering every central body at the same fixed on-screen radius (see
 * `CENTRAL_BODY_RADIUS_SCENE_UNITS`).
 */
export const PLANET_SCENE_RADIUS = 0.8

/** A simple, flat display color per planet - a photographic texture would be imperceptible at this render size. */
export const PLANET_COLORS: Record<PlanetId, number> = {
  mercury: 0x9e9e94,
  venus: 0xd9c27e,
  earth: 0x4a90d9,
  mars: 0xc1440e,
}

/** Marker color for an in-transit spacecraft, distinct from the planet palette. */
export const SPACECRAFT_MARKER_COLOR = 0xf8fafc
