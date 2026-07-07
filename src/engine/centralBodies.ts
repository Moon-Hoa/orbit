import {
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  JUPITER_MU_KM3_S2,
  JUPITER_RADIUS_KM,
  MARS_MU_KM3_S2,
  MARS_RADIUS_KM,
  MERCURY_MU_KM3_S2,
  MERCURY_RADIUS_KM,
  MOON_MU_KM3_S2,
  MOON_RADIUS_KM,
  NEPTUNE_MU_KM3_S2,
  NEPTUNE_RADIUS_KM,
  URANUS_MU_KM3_S2,
  URANUS_RADIUS_KM,
  VENUS_MU_KM3_S2,
  VENUS_RADIUS_KM,
} from './constants'

export type CentralBodyId = 'earth' | 'moon' | 'mars' | 'mercury' | 'venus' | 'jupiter' | 'uranus' | 'neptune'

export interface CentralBodyInfo {
  id: CentralBodyId
  label: string
  muKm3S2: number
  radiusKm: number
  /**
   * Whether Earth-specific features (real-satellite tracking via Celestrak,
   * ground track/ground stations, the Hohmann planner, ephemeris export) are
   * meaningful for this body. False for every body but Earth in v1 - see the
   * "Moon view" issue for what's explicitly out of scope.
   */
  hasEarthOnlyFeatures: boolean
}

export const CENTRAL_BODIES: Record<CentralBodyId, CentralBodyInfo> = {
  earth: {
    id: 'earth',
    label: 'Earth',
    muKm3S2: EARTH_MU_KM3_S2,
    radiusKm: EARTH_RADIUS_KM,
    hasEarthOnlyFeatures: true,
  },
  moon: {
    id: 'moon',
    label: 'Moon',
    muKm3S2: MOON_MU_KM3_S2,
    radiusKm: MOON_RADIUS_KM,
    hasEarthOnlyFeatures: false,
  },
  mars: {
    id: 'mars',
    label: 'Mars',
    muKm3S2: MARS_MU_KM3_S2,
    radiusKm: MARS_RADIUS_KM,
    hasEarthOnlyFeatures: false,
  },
  mercury: {
    id: 'mercury',
    label: 'Mercury',
    muKm3S2: MERCURY_MU_KM3_S2,
    radiusKm: MERCURY_RADIUS_KM,
    hasEarthOnlyFeatures: false,
  },
  venus: {
    id: 'venus',
    label: 'Venus',
    muKm3S2: VENUS_MU_KM3_S2,
    radiusKm: VENUS_RADIUS_KM,
    hasEarthOnlyFeatures: false,
  },
  jupiter: {
    id: 'jupiter',
    label: 'Jupiter',
    muKm3S2: JUPITER_MU_KM3_S2,
    radiusKm: JUPITER_RADIUS_KM,
    hasEarthOnlyFeatures: false,
  },
  uranus: {
    id: 'uranus',
    label: 'Uranus',
    muKm3S2: URANUS_MU_KM3_S2,
    radiusKm: URANUS_RADIUS_KM,
    hasEarthOnlyFeatures: false,
  },
  neptune: {
    id: 'neptune',
    label: 'Neptune',
    muKm3S2: NEPTUNE_MU_KM3_S2,
    radiusKm: NEPTUNE_RADIUS_KM,
    hasEarthOnlyFeatures: false,
  },
}

export const CENTRAL_BODY_IDS = Object.keys(CENTRAL_BODIES) as CentralBodyId[]

export const DEFAULT_CENTRAL_BODY_ID: CentralBodyId = 'earth'

/** Type guard for decoding a central body id from an untrusted source (e.g. a URL param). */
export function isCentralBodyId(value: string | null): value is CentralBodyId {
  return value !== null && Object.hasOwn(CENTRAL_BODIES, value)
}
