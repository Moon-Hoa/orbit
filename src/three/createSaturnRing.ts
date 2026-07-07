import * as THREE from 'three'
import saturnRingUrl from '../assets/saturn-ring.png'

/** Saturn's rings, as multiples of whatever radius Saturn's own sphere is rendered at in the calling scene (real rings span ~1.1-2.3 planetary radii). */
const RING_INNER_RADIUS_MULTIPLIER = 1.2
const RING_OUTER_RADIUS_MULTIPLIER = 2.3

/**
 * Builds Saturn's ring: a flat annulus with the bundled radial-gradient ring
 * texture (real ring banding/transparency, encoded as a thin left-to-right
 * strip - same Solar System Scope/Wikimedia source as the planet textures).
 * `THREE.RingGeometry`'s default UVs are based on raw vertex position, not
 * radial distance, which looks wrong with a texture like this one - so the
 * UVs are remapped here to run from 0 (inner edge) to 1 (outer edge).
 * Meant to be added as a child of Saturn's own mesh, so it moves with it for
 * free rather than needing its own position updates in the scene's tick.
 *
 * Takes `planetRadius` (Saturn's own rendered sphere radius, in whatever
 * scene units the caller uses) rather than hardcoding a scale, since the
 * solar system view and the single-body "Design orbit" view render Saturn
 * at two entirely different fixed radii (`solarSystemConstants.ts`'s tiered
 * `PLANET_SCENE_RADII` vs. the body view's uniform `CENTRAL_BODY_RADIUS_SCENE_UNITS`)
 * - the ring needs to stay proportional to whichever sphere it's attached to.
 */
export function createSaturnRing(planetRadius: number): THREE.Mesh {
  const innerRadius = planetRadius * RING_INNER_RADIUS_MULTIPLIER
  const outerRadius = planetRadius * RING_OUTER_RADIUS_MULTIPLIER
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64, 1)

  const positions = geometry.attributes.position
  const uvs = geometry.attributes.uv
  const vertex = new THREE.Vector3()
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i)
    const radius = vertex.length()
    const u = (radius - innerRadius) / (outerRadius - innerRadius)
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
