import * as THREE from 'three'
import sunUrl from '../assets/sun.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/**
 * Builds a textured Sun sphere for the body view, at the same
 * `CENTRAL_BODY_RADIUS_SCENE_UNITS` scale every other central body uses (not
 * the solar-system view's `SUN_SCENE_RADIUS` - a different, unrelated scene
 * entirely - see `createSun.ts`, which this deliberately doesn't reuse or
 * rename-clash with).
 *
 * Unlike every other body-view central body, this uses an unlit
 * `MeshBasicMaterial` rather than the light-responsive `MeshPhongMaterial`
 * `createMars.ts`/etc. use - a deliberate exception, not an oversight. Every
 * other central body is lit because it's physically lit: the scene's
 * `AmbientLight`/`DirectionalLight` stand in for real sunlight reflecting
 * off a planet's surface. The Sun is the light source, not something lit
 * *by* one - rendering it with a directional-light-responsive material
 * would leave one hemisphere rendered dark, which is wrong for a
 * self-luminous body regardless of which way the scene's light happens to
 * be facing. This matches the solar-system view's own Sun, which is unlit
 * for the identical reason (see `createSun.ts`'s doc comment).
 */
export function createSunBody(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(sunUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshBasicMaterial({ map: texture })

  const sun = new THREE.Mesh(geometry, material)
  sun.name = 'sun-body'
  return sun
}
