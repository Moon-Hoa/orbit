import type { PlanetId } from '../engine'
import earthDaymapUrl from '../assets/earth-daymap.jpg'
import jupiterUrl from '../assets/jupiter.jpg'
import marsSurfaceUrl from '../assets/mars-surface.jpg'
import mercurySurfaceUrl from '../assets/mercury-surface.jpg'
import neptuneUrl from '../assets/neptune.jpg'
import saturnUrl from '../assets/saturn.jpg'
import uranusUrl from '../assets/uranus.jpg'
import venusAtmosphereUrl from '../assets/venus-atmosphere.jpg'

/**
 * Each planet's surface (or, for the gas/ice giants, cloud-top) texture -
 * the same Solar System Scope set (CC BY 4.0, via Wikimedia Commons) already
 * credited in the README for Earth/Moon/Mars, extended to the rest of the
 * planets. Earth and Mars reuse the exact same bundled assets as the body
 * view rather than duplicating them.
 */
export const PLANET_TEXTURE_URLS: Record<PlanetId, string> = {
  mercury: mercurySurfaceUrl,
  venus: venusAtmosphereUrl,
  earth: earthDaymapUrl,
  mars: marsSurfaceUrl,
  jupiter: jupiterUrl,
  saturn: saturnUrl,
  uranus: uranusUrl,
  neptune: neptuneUrl,
}
