import * as THREE from 'three'
import jupiterUrl from '../assets/jupiter.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Builds a textured Jupiter sphere, using the bundled cloud-band map as a static build-time asset (see the README credits section). */
export function createJupiter(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(jupiterUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const jupiter = new THREE.Mesh(geometry, material)
  jupiter.name = 'jupiter'
  return jupiter
}
