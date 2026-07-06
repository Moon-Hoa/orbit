import * as THREE from 'three'
import { SUN_SCENE_RADIUS } from './solarSystemConstants'

/**
 * Builds the Sun mesh: a plain bright sphere. Deliberately unlit (as are the
 * planets - see `createPlanet.ts`) rather than wired up with a point light -
 * this is a schematic "basic" view, not a lighting demo, and skipping a
 * light source avoids needing every other mesh to use a light-responsive
 * material just for this one.
 */
export function createSun(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(SUN_SCENE_RADIUS, 32, 32)
  const material = new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
  const sun = new THREE.Mesh(geometry, material)
  sun.name = 'sun'
  return sun
}
