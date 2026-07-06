import * as THREE from 'three'
import moonSurfaceUrl from '../assets/moon-surface.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Builds a textured Moon sphere, using the bundled surface map as a static build-time asset (see the README credits section). */
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
