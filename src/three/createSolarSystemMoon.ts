import * as THREE from 'three'
import type { MoonId } from '../engine'

/**
 * A flat, plausible-but-not-photographic color per moon - unlike the
 * planets and Earth's own Moon (in the body view), there's no readily
 * available real equirectangular texture for these in the same licensed set
 * this app already uses, so (consistent with this app's practice of clearly
 * flagging reduced-fidelity pieces rather than faking authority) these stay
 * flat-colored rather than guessing at a texture source.
 */
const MOON_COLORS: Record<MoonId, number> = {
  moon: 0xb8b3ad,
  phobos: 0x8a7d6e,
  deimos: 0x9c8f7e,
  io: 0xe8d44d,
  europa: 0xd9c9a8,
  ganymede: 0x8c8579,
  callisto: 0x5f5a52,
  titan: 0xd9a44d,
}

/** A moon's rendered radius, scene units - small and uniform, since real relative moon sizes (Ganymede vs Deimos is a >100x radius difference) would make most of them imperceptible next to their planet. */
const MOON_SCENE_RADIUS = 0.18

/** Builds a moon marker mesh - small, flat-colored (see `MOON_COLORS`), one shared geometry per instance since there are only ever a handful of these. */
export function createSolarSystemMoon(moon: MoonId): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(MOON_SCENE_RADIUS, 12, 12)
  const material = new THREE.MeshBasicMaterial({ color: MOON_COLORS[moon] })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `moon-${moon}`
  return mesh
}
