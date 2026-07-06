import * as THREE from 'three'
import type { PlanetId } from '../engine'
import { PLANET_SCENE_RADII } from './solarSystemConstants'
import { PLANET_TEXTURE_URLS } from './planetTextures'

/** Builds a planet mesh: a real (bundled build-time) photographic texture, same approach as the body view's `createEarth.ts`. */
export function createPlanet(planet: PlanetId): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(PLANET_SCENE_RADII[planet], 32, 32)

  const texture = new THREE.TextureLoader().load(PLANET_TEXTURE_URLS[planet])
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshBasicMaterial({ map: texture })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `planet-${planet}`
  return mesh
}
