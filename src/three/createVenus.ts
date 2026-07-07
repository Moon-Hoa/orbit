import * as THREE from 'three'
import venusAtmosphereUrl from '../assets/venus-atmosphere.jpg'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS } from './constants'

/** Builds a textured Venus sphere, using the bundled cloud-top map as a static build-time asset (see the README credits section) - there is no visible solid surface from orbit, so this is the correct look. */
export function createVenus(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(CENTRAL_BODY_RADIUS_SCENE_UNITS, 64, 64)

  const texture = new THREE.TextureLoader().load(venusAtmosphereUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const material = new THREE.MeshPhongMaterial({ map: texture })

  const venus = new THREE.Mesh(geometry, material)
  venus.name = 'venus'
  return venus
}
