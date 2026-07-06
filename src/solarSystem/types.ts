import type { PlanetId } from '../engine'

/**
 * A real interplanetary mission's cruise phase, modeled as an idealized
 * transfer between its departure and arrival body's heliocentric position at
 * the given dates (see `transit.ts`) - not a real published trajectory/state
 * vector. This app has no source of real spacecraft ephemeris (no live
 * backend, matching the "100% static" constraint noted throughout this
 * project - see the ground-station/Celestrak notes in the README), so every
 * entry here is currently idealized; the field exists so a future data
 * source could add real trajectory-backed entries without a shape change.
 */
export interface SpacecraftTransit {
  id: string
  name: string
  agency: string
  departureBody: PlanetId
  arrivalBody: PlanetId
  /** ISO date of departure (approximated as the launch date). */
  departureDate: string
  /** ISO date of arrival (orbit insertion or landing). */
  arrivalDate: string
  isIdealizedTransfer: true
  description: string
}
