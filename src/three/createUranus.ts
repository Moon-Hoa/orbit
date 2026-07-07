import * as THREE from 'three'
import uranusUrl from '../assets/uranus.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Builds a textured Uranus sphere, using the bundled surface map as a static build-time asset (see the README credits section). Rendered upright, like every other body's rotation in this app - Uranus's extreme axial tilt is out of scope. */
export function createUranus(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(uranusUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const uranus = new THREE.Mesh(geometry, material)
  uranus.name = 'uranus'
  return uranus
}
