import * as THREE from 'three'
import earthDaymapUrl from '../assets/earth-daymap.jpg'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'

/** Builds a textured Earth sphere, using the bundled daymap as a static build-time asset. */
export function createEarth(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(earthDaymapUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const earth = new THREE.Mesh(geometry, material)
  earth.name = 'earth'
  return earth
}
