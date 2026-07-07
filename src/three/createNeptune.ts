import * as THREE from 'three'
import neptuneUrl from '../assets/neptune.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Builds a textured Neptune sphere, using the bundled surface map as a static build-time asset (see the README credits section). */
export function createNeptune(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(neptuneUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const neptune = new THREE.Mesh(geometry, material)
  neptune.name = 'neptune'
  return neptune
}
