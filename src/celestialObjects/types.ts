import type { OrbitalElements } from '../engine'

export type CelestialObjectStatus = 'active' | 'inactive'

/** A human-made object resting on a body's surface (a lander, rover, or impact/crash site). */
export interface SurfaceObject {
  id: string
  name: string
  mission: string
  agency: string
  /** Landing (or impact) date, human-readable (e.g. "1969-07-20"). */
  date: string
  status: CelestialObjectStatus
  /** One-line summary shown in the info panel. */
  description: string
  latitudeDeg: number
  longitudeDeg: number
}

/** One independently-toggleable group of surface objects, shown as its own category of pins. */
export interface SurfaceObjectCategory {
  id: string
  label: string
  /** One-line attribution, shown in the category toggle UI (mirrors GroundStationCategory.sourceNote). */
  note: string
  /** Scene marker color (Three.js numeric hex). */
  color: number
  objects: SurfaceObject[]
}

/**
 * An active/notable spacecraft orbiting a body, rendered as a moving marker
 * distinct from the static surface pins. `elements` are hand-entered
 * approximate osculating elements from published mission parameters, not a
 * live/precise ephemeris - consistent with this app's "100% static, no
 * backend" constraint (see the ground station/satellite data sourcing notes
 * elsewhere in this app).
 */
export interface Orbiter {
  id: string
  name: string
  mission: string
  agency: string
  /** Launch (or orbit insertion) date, human-readable. */
  date: string
  status: CelestialObjectStatus
  description: string
  elements: OrbitalElements
}
