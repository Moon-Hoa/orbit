export type UnitSystem = 'metric' | 'imperial'

const KM_PER_MILE = 1.609344

/** Converts km to miles. */
export const kmToMiles = (km: number): number => km / KM_PER_MILE

/** Converts km/s to mph. */
export const kmPerSecToMph = (kmPerSec: number): number => (kmPerSec / KM_PER_MILE) * 3600

/** Formats a distance (given in km) in the chosen unit system, e.g. "408.0 km" or "253.5 mi". */
export function formatDistanceKm(km: number, unitSystem: UnitSystem, fractionDigits = 1): string {
  if (unitSystem === 'imperial') return `${kmToMiles(km).toFixed(fractionDigits)} mi`
  return `${km.toFixed(fractionDigits)} km`
}

/** Formats a speed (given in km/s) in the chosen unit system, e.g. "7.66 km/s" or "17,148 mph". */
export function formatSpeedKmS(kmPerSec: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'imperial') return `${kmPerSecToMph(kmPerSec).toFixed(0)} mph`
  return `${kmPerSec.toFixed(2)} km/s`
}
