import { EARTH_RADIUS_KM, type OrbitalElements } from '../engine'

const degToRad = (deg: number) => (deg * Math.PI) / 180

/** ISS-like elements: ~408 km altitude, 51.6° inclination (matches Phase 1's known-answer tests). */
export const ISS_LIKE_ELEMENTS: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
  inclinationRad: degToRad(51.6),
  raanRad: degToRad(45),
  argOfPerigeeRad: degToRad(30),
  trueAnomalyRad: 0,
}
