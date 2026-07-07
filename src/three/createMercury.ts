import * as THREE from 'three'
import mercurySurfaceUrl from '../assets/mercury-surface.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Builds a textured Mercury sphere, using the bundled surface map as a static build-time asset (see the README credits section). */
export function createMercury(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(mercurySurfaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const mercury = new THREE.Mesh(geometry, material)
  mercury.name = 'mercury'
  return mercury
}
