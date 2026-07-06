import {
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  MARS_MU_KM3_S2,
  MARS_RADIUS_KM,
  MOON_MU_KM3_S2,
  MOON_RADIUS_KM,
} from './constants'

export type CentralBodyId = 'earth' | 'moon' | 'mars'

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
}

export const CENTRAL_BODY_IDS = Object.keys(CENTRAL_BODIES) as CentralBodyId[]

export const DEFAULT_CENTRAL_BODY_ID: CentralBodyId = 'earth'

/** Type guard for decoding a central body id from an untrusted source (e.g. a URL param). */
export function isCentralBodyId(value: string | null): value is CentralBodyId {
  return value !== null && Object.hasOwn(CENTRAL_BODIES, value)
}
