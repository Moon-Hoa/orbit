import * as THREE from 'three'
import moonSurfaceUrl from '../assets/moon-surface.svg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/**
 * Builds a textured Moon sphere. The bundled texture is a procedurally
 * generated placeholder (maria/crater-like shapes, not a photographic map) -
 * see the README credits section for a pointer to a real licensed texture to
 * swap in later.
 */
export function createMoon(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(moonSurfaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const moon = new THREE.Mesh(geometry, material)
  moon.name = 'moon'
  return moon
}
