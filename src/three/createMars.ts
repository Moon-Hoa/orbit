import * as THREE from 'three'
import marsSurfaceUrl from '../assets/mars-surface.svg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/**
 * Builds a textured Mars sphere. The bundled texture is a procedurally
 * generated placeholder (basaltic regions/craters/polar caps, not a
 * photographic map) - see the README credits section for a pointer to a real
 * licensed texture to swap in later.
 */
export function createMars(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(marsSurfaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const mars = new THREE.Mesh(geometry, material)
  mars.name = 'mars'
  return mars
}
