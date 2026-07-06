import * as THREE from 'three'
import saturnRingUrl from '../assets/saturn-ring.png'
import { SATURN_RING_INNER_RADIUS, SATURN_RING_OUTER_RADIUS } from './solarSystemConstants'

/**
 * Builds Saturn's ring: a flat annulus with the bundled radial-gradient ring
 * texture (real ring banding/transparency, encoded as a thin left-to-right
 * strip - same Solar System Scope/Wikimedia source as the planet textures).
 * `THREE.RingGeometry`'s default UVs are based on raw vertex position, not
 * radial distance, which looks wrong with a texture like this one - so the
 * UVs are remapped here to run from 0 (inner edge) to 1 (outer edge).
 * Meant to be added as a child of Saturn's own mesh, so it moves with it for
 * free rather than needing its own position updates in the scene's tick.
 */
export function createSaturnRing(): THREE.Mesh {
  const geometry = new THREE.RingGeometry(SATURN_RING_INNER_RADIUS, SATURN_RING_OUTER_RADIUS, 64, 1)

  const positions = geometry.attributes.position
  const uvs = geometry.attributes.uv
  const vertex = new THREE.Vector3()
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i)
    const radius = vertex.length()
    const u = (radius - SATURN_RING_INNER_RADIUS) / (SATURN_RING_OUTER_RADIUS - SATURN_RING_INNER_RADIUS)
    uvs.setXY(i, u, 1)
  }
  uvs.needsUpdate = true

  const texture = new THREE.TextureLoader().load(saturnRingUrl)
  texture.colorSpace = THREE.SRGBColorSpace

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  })

  const ring = new THREE.Mesh(geometry, material)
  ring.name = 'saturn-ring'
  // Lie flat in Saturn's equatorial plane - RingGeometry is built in the XY
  // plane by default, so tip it into XZ (the scene's "equatorial"/ecliptic
  // plane, per `auToScene`'s axis convention).
  ring.rotation.x = Math.PI / 2
  return ring
}
