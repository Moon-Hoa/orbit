/** A single ground station pin: real-world facility or receiver location. */
export interface GroundStation {
  id: string
  name: string
  latitudeDeg: number
  longitudeDeg: number
}

/** One independently-selectable source of ground stations, shown as its own toggleable category of pins. */
export interface GroundStationCategory {
  id: string
  label: string
  /** One-line attribution, shown in the category toggle UI. */
  sourceNote: string
  /** Scene marker color (Three.js numeric hex). */
  color: number
  stations: GroundStation[]
}
