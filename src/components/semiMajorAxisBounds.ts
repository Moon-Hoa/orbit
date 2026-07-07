import { SUN_RADIUS_KM } from '../engine'

/**
 * The semi-major-axis slider's ceiling was a flat 50,000 km regardless of
 * body - fine for Earth (~7.8x its own radius) but for Jupiter (radius
 * 69,911 km) and Saturn (58,232 km) that ceiling sat *inside* the planet,
 * making it impossible to design a non-intersecting orbit at all. Scaling
 * with the body's own radius (at the same ~7x multiple Earth already gets)
 * fixes every body at once, while leaving Earth's tuned range untouched -
 * 6378 * 7 = 44,646, still below the 50,000 km floor.
 */
const MAX_SEMI_MAJOR_AXIS_RADIUS_MULTIPLIER = 7
const MAX_SEMI_MAJOR_AXIS_FLOOR_KM = 50_000

/**
 * The Sun gets its own explicit ceiling instead of the radius-multiple
 * formula above. A meaningful heliocentric orbit - Mercury's real ~57.9
 * million km, or a circular 1 AU orbit at ~150 million km - is 3+ orders of
 * magnitude farther than the Sun's own radius (696,000 km), a far wider
 * range than any planet needs. Stretching every body's multiplier to 200x+
 * just to cover this one case would make the slider uselessly coarse for
 * everyone else, so the Sun is a deliberate special case instead - see the
 * "Sun as a central body" issue, and the orbit-designer-slider-bounds issue
 * this one depends on.
 */
const SUN_MAX_SEMI_MAJOR_AXIS_KM = 200_000_000

/** The `a` slider's ceiling for a body of this radius, km - see the constants above. */
export function maxSemiMajorAxisKm(bodyRadiusKm: number): number {
  if (bodyRadiusKm === SUN_RADIUS_KM) return SUN_MAX_SEMI_MAJOR_AXIS_KM
  return Math.max(MAX_SEMI_MAJOR_AXIS_FLOOR_KM, bodyRadiusKm * MAX_SEMI_MAJOR_AXIS_RADIUS_MULTIPLIER)
}
