import * as THREE from 'three'
import { type TleRecord, propagateAt, toSatRec } from '../satellite'
import { eciToScene } from './coordinates'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'

/** Dim, neutral color (Tailwind slate-400) - reads as a background layer, not a tracked object. */
const POINT_COLOR = 0x94a3b8
const POINT_SIZE = EARTH_RADIUS_SCENE_UNITS * 0.01

/**
 * Roughly how many `update()` calls (~animation frames, while active) it takes to refresh every
 * satellite's position once. Propagating the whole swarm every single frame is too expensive at
 * this scale (benchmarked: ~10ms for a full SGP4 pass over ~16,000 satellites, warm) for a
 * 16.7ms/frame budget once everything else competing for the main thread is accounted for -
 * refreshing a slice per call instead spreads that cost thin enough to be unnoticeable, at the
 * cost of any single satellite's position being up to this many frames stale (well under a
 * second - imperceptible for a swarm overview, even for fast-moving LEO objects).
 */
const FRAMES_PER_REFRESH_CYCLE = 45

/**
 * A lightweight "swarm" of many real satellites rendered as a single `THREE.Points` cloud - a
 * background layer, not individually trackable the way the companion system in `OrbitScene` is
 * (which gives each object its own mesh, orbit path, and stats, and is capped at
 * `MAX_COMPANIONS` for exactly that reason). `Points` (one shared position buffer) is lighter
 * than `InstancedMesh` (a 4x4 matrix per instance) for something that's just a dot with no
 * orientation.
 */
export class SatelliteSwarm {
  readonly points: THREE.Points
  private readonly satrecs: ReturnType<typeof toSatRec>[]
  private readonly positions: Float32Array
  private readonly chunkSize: number
  private cursor = 0

  constructor(tles: TleRecord[], initialDate: Date) {
    this.satrecs = tles.map((tle) => toSatRec(tle))
    this.positions = new Float32Array(this.satrecs.length * 3)
    this.chunkSize = Math.max(1, Math.ceil(this.satrecs.length / FRAMES_PER_REFRESH_CYCLE))

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    const material = new THREE.PointsMaterial({
      color: POINT_COLOR,
      size: POINT_SIZE,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geometry, material)
    this.points.name = 'satellite-swarm'

    // A full one-time pass up front, so every point starts at its real position rather than at
    // the scene origin (Earth's center) waiting for its first round-robin turn.
    for (let index = 0; index < this.satrecs.length; index++) {
      this.refreshOne(index, initialDate)
    }
    this.markPositionsDirty()
  }

  private refreshOne(index: number, date: Date): void {
    try {
      const { position } = propagateAt(this.satrecs[index], date)
      const scenePosition = eciToScene(position)
      this.positions[index * 3] = scenePosition.x
      this.positions[index * 3 + 1] = scenePosition.y
      this.positions[index * 3 + 2] = scenePosition.z
    } catch {
      // SGP4 failure (e.g. a decayed orbit or bad elements) - leave this satellite at its
      // last-known position rather than letting one bad object stall the whole batch.
    }
  }

  private markPositionsDirty(): void {
    const positionAttribute = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    positionAttribute.needsUpdate = true
  }

  /** Advances the round-robin cursor by one chunk, re-propagating and repositioning just that slice. */
  update(currentDate: Date): void {
    const total = this.satrecs.length
    if (total === 0) return

    for (let i = 0; i < this.chunkSize; i++) {
      this.refreshOne((this.cursor + i) % total, currentDate)
    }
    this.cursor = (this.cursor + this.chunkSize) % total
    this.markPositionsDirty()
  }

  setVisible(visible: boolean): void {
    this.points.visible = visible
  }

  dispose(): void {
    this.points.geometry.dispose()
    ;(this.points.material as THREE.Material).dispose()
  }
}
