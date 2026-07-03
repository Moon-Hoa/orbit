import {
  type GeodeticCoordinates,
  type OrbitalElements,
  type Vector3,
  eciToGeodetic,
  orbitalPeriodSeconds,
  propagateToStateVector,
} from '../engine'
import {
  type TleRecord,
  orbitalPeriodSecondsFromTle,
  propagateTle,
  tleToGeodetic,
} from '../satellite'

/** One time-tagged sample of a trajectory: ECI state vector plus its geodetic subpoint. */
export interface EphemerisRow {
  /** Seconds elapsed since the start of the exported window. */
  elapsedSeconds: number
  /** Absolute UTC timestamp, when a real calendar epoch is known (track-real mode); null in design mode. */
  timestampIso: string | null
  position: Vector3
  velocity: Vector3
  geodetic: GeodeticCoordinates
}

export type ExportWindow = 'next-orbit' | 'next-24h'

const SAMPLE_COUNT = 200
const DAY_SECONDS = 86400

function windowSeconds(exportWindow: ExportWindow, periodSeconds: number): number {
  return exportWindow === 'next-orbit' ? periodSeconds : DAY_SECONDS
}

/**
 * Samples a design-mode (two-body) orbit's ephemeris over `exportWindow`,
 * starting at its reference epoch (elapsed time = 0) - design mode has no
 * real calendar date, so `timestampIso` is always null.
 */
export function sampleDesignEphemeris(
  elements: OrbitalElements,
  exportWindow: ExportWindow,
  enableJ2 = false,
): EphemerisRow[] {
  const totalSeconds = windowSeconds(exportWindow, orbitalPeriodSeconds(elements.semiMajorAxisKm))
  const rows: EphemerisRow[] = []

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const t = (i / SAMPLE_COUNT) * totalSeconds
    const state = propagateToStateVector(elements, t, undefined, enableJ2)
    rows.push({
      elapsedSeconds: t,
      timestampIso: null,
      position: state.position,
      velocity: state.velocity,
      geodetic: eciToGeodetic(state.position, t),
    })
  }

  return rows
}

/** Samples a real (SGP4-propagated) satellite's ephemeris over `exportWindow`, starting at `referenceDate`. */
export function sampleRealEphemeris(
  tle: TleRecord,
  referenceDate: Date,
  exportWindow: ExportWindow,
): EphemerisRow[] {
  const totalSeconds = windowSeconds(exportWindow, orbitalPeriodSecondsFromTle(tle, referenceDate))
  const rows: EphemerisRow[] = []

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const t = (i / SAMPLE_COUNT) * totalSeconds
    const date = new Date(referenceDate.getTime() + t * 1000)
    const { position, velocity } = propagateTle(tle, date)
    rows.push({
      elapsedSeconds: t,
      timestampIso: date.toISOString(),
      position,
      velocity,
      geodetic: tleToGeodetic(tle, date),
    })
  }

  return rows
}
