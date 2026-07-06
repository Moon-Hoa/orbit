import * as THREE from 'three'
import { auToScene } from './auToScene'

/** The main asteroid belt's real, well-known radial extent, AU - inside Jupiter's orbit but not filling the whole Mars-Jupiter gap. */
const BELT_INNER_RADIUS_AU = 2.2
const BELT_OUTER_RADIUS_AU = 3.2
/** How far asteroids scatter above/below the ecliptic plane, AU - the real belt has a few degrees of inclination scatter, not a razor-thin ring. */
const BELT_HALF_THICKNESS_AU = 0.15

const ASTEROID_COUNT = 3000
/** Dim, neutral color (Tailwind stone-400-ish) - a background texture, not individually-identified objects. */
const POINT_COLOR = 0xa8a29e
const POINT_SIZE = 0.3

/**
 * Builds a static `THREE.Points` cloud for the main asteroid belt - a purely
 * visual band (same lightweight-cloud technique the body view's
 * `SatelliteSwarm` uses for "all satellites currently in orbit"), not
 * individually tracked asteroids with real orbital elements: unlike the
 * planets/moons, this never needs repositioning after creation, since a
 * "basic" solar system view has no need to simulate any specific asteroid's
 * motion, only to show that the belt is there.
 */
export function createAsteroidBelt(): THREE.Points {
  const positions = new Float32Array(ASTEROID_COUNT * 3)

  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const radiusAu = BELT_INNER_RADIUS_AU + Math.random() * (BELT_OUTER_RADIUS_AU - BELT_INNER_RADIUS_AU)
    const angleRad = Math.random() * 2 * Math.PI
    const heightAu = (Math.random() - 0.5) * 2 * BELT_HALF_THICKNESS_AU

    const scenePosition = auToScene({
      x: radiusAu * Math.cos(angleRad),
      y: radiusAu * Math.sin(angleRad),
      z: heightAu,
    })
    positions[i * 3] = scenePosition.x
    positions[i * 3 + 1] = scenePosition.y
    positions[i * 3 + 2] = scenePosition.z
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ color: POINT_COLOR, size: POINT_SIZE, sizeAttenuation: true })

  const belt = new THREE.Points(geometry, material)
  belt.name = 'asteroid-belt'
  return belt
}
