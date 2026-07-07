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

/** The `a` slider's ceiling for a body of this radius, km - see the constants above. */
export function maxSemiMajorAxisKm(bodyRadiusKm: number): number {
  return Math.max(MAX_SEMI_MAJOR_AXIS_FLOOR_KM, bodyRadiusKm * MAX_SEMI_MAJOR_AXIS_RADIUS_MULTIPLIER)
}
