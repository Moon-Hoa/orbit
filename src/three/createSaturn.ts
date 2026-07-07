import * as THREE from 'three'
import saturnUrl from '../assets/saturn.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'
import { createSaturnRing } from './createSaturnRing'

/** Builds a textured Saturn sphere with its ring attached as a child mesh, using the bundled surface/ring maps as static build-time assets (see the README credits section). */
export function createSaturn(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(saturnUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const saturn = new THREE.Mesh(geometry, material)
  saturn.name = 'saturn'
  saturn.add(createSaturnRing(CENTRAL_BODY_RADIUS_SCENE_UNITS))
  return saturn
}
