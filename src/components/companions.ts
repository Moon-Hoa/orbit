import type { OrbitalElements } from '../engine'
import type { TleRecord } from '../satellite'
import { DEFAULT_ORBIT_PATH_COLOR } from '../three/createOrbitPath'
import { DEFAULT_MARKER_COLOR } from '../three/createSatelliteMarker'

/** What a companion is actually tracking - enough to recompute its orbital shape when focused. */
export type CompanionSource =
  | { type: 'design'; elements: OrbitalElements }
  | { type: 'real'; tle: TleRecord }

/** A companion (non-primary) tracked object, as far as the UI needs to know. */
export interface CompanionEntry {
  id: string
  label: string
  color: number
  source: CompanionSource
}

/** What happened when a batch of companions was requested at once, for a summary message. */
export interface BulkAddSummary {
  addedCount: number
  /** Already tracked, or the companion limit (MAX_COMPANIONS) was reached. */
  skippedCount: number
}

/** The primary object's path/marker colors, matching its actual 3D rendering (blue path, white marker). */
export const DEFAULT_PRIMARY_COLOR = DEFAULT_ORBIT_PATH_COLOR
export const DEFAULT_PRIMARY_MARKER_COLOR = DEFAULT_MARKER_COLOR

/** Cycling palette for companion objects; avoids the sky-blue/white already used by the primary object. */
export const COMPANION_COLOR_PALETTE = [
  0xf97316, // orange
  0xa855f7, // purple
  0x22c55e, // green
  0xeab308, // yellow
  0xec4899, // pink
  0x14b8a6, // teal
]

/** Soft cap on companions: well below the "hundreds of objects" scale that would need Three.js instancing. */
export const MAX_COMPANIONS = COMPANION_COLOR_PALETTE.length

export function nextCompanionColor(existingCompanionCount: number): number {
  return COMPANION_COLOR_PALETTE[existingCompanionCount % COMPANION_COLOR_PALETTE.length]
}

/** Converts a Three.js numeric hex color (e.g. 0xf97316) to a CSS hex string ("#f97316"). */
export function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
