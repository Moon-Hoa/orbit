import * as THREE from 'three'
import type { PlanetId } from '../engine'
import { PLANET_COLORS, PLANET_SCENE_RADIUS } from './solarSystemConstants'

/** Builds a planet mesh: a plain, flat-colored sphere (see `solarSystemConstants.ts` on why not a photographic texture). */
export function createPlanet(planet: PlanetId): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(PLANET_SCENE_RADIUS, 24, 24)
  const material = new THREE.MeshBasicMaterial({ color: PLANET_COLORS[planet] })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `planet-${planet}`
  return mesh
}
