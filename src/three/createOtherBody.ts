import * as THREE from 'three'
import type { OtherBodyId } from '../engine'
import { SMALL_BODY_SCENE_RADIUS } from './solarSystemConstants'

/** A flat, plausible color per body - see `createSolarSystemMoon.ts`'s doc comment on why these stay flat-colored rather than textured. */
const OTHER_BODY_COLORS: Record<OtherBodyId, number> = {
  pluto: 0xcbb99c,
  ceres: 0x9c9691,
  eris: 0xe0ddd6,
  halley: 0x7a8c99,
}

/** Builds a marker mesh for a dwarf planet or comet in the toggleable "other bodies" layer. */
export function createOtherBody(body: OtherBodyId): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(SMALL_BODY_SCENE_RADIUS, 12, 12)
  const material = new THREE.MeshBasicMaterial({ color: OTHER_BODY_COLORS[body] })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `other-body-${body}`
  return mesh
}
