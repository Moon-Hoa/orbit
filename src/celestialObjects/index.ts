import type { CentralBodyId } from '../engine'
import { MOON_ORBITERS, MOON_SURFACE_OBJECT_CATEGORIES } from './moon'
import { MARS_ORBITERS, MARS_SURFACE_OBJECT_CATEGORIES } from './mars'
import type { Orbiter, SurfaceObjectCategory } from './types'

export * from './types'

/** Surface object categories per central body. Earth has none - this is a Moon/Mars-only layer; the other newer bodies have no catalog either (see their view issues). */
export const CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES: Record<CentralBodyId, SurfaceObjectCategory[]> = {
  earth: [],
  moon: MOON_SURFACE_OBJECT_CATEGORIES,
  mars: MARS_SURFACE_OBJECT_CATEGORIES,
  mercury: [],
  venus: [],
  jupiter: [],
  uranus: [],
  neptune: [],
}

/** Active/notable orbiters per central body. Earth has none - this is a Moon/Mars-only layer; the other newer bodies have no catalog either (see their view issues). */
export const CENTRAL_BODY_ORBITERS: Record<CentralBodyId, Orbiter[]> = {
  earth: [],
  moon: MOON_ORBITERS,
  mars: MARS_ORBITERS,
  mercury: [],
  venus: [],
  jupiter: [],
  uranus: [],
  neptune: [],
}
