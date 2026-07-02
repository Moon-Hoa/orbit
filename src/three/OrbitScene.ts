import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  EARTH_RADIUS_KM,
  type GeodeticCoordinates,
  type OrbitalElements,
  type Vector3,
  magnitude,
} from '../engine'
import type { TleRecord } from '../satellite'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'
import { eciToScene } from './coordinates'
import { createEarth } from './createEarth'
import { createOrbitPath } from './createOrbitPath'
import { createSatelliteMarker } from './createSatelliteMarker'
import { DesignOrbitSource } from './DesignOrbitSource'
import { disposeObject3D } from './disposeObject3D'
import type { OrbitSource } from './OrbitSource'
import { RealSatelliteSource } from './RealSatelliteSource'

export interface TickInfo {
  /** Elapsed sim time, wrapped to [0, orbital period). */
  simTimeSeconds: number
  /** Current altitude above Earth's surface, km. */
  altitudeKm: number
  /** Current orbital speed, km/s. */
  speedKmS: number
}

/** Camera position and orbit-controls look-at target, both in scene units. */
export interface CameraState {
  position: Vector3
  target: Vector3
}

/** How often (wall-clock ms) the ground track is recomputed and reported. */
const GROUND_TRACK_REPORT_INTERVAL_MS = 200
/** How many trailing orbital periods the ground track window covers. */
const GROUND_TRACK_WINDOW_PERIODS = 1.5
/** How many points are sampled across the ground track window. */
const GROUND_TRACK_SAMPLE_COUNT = 200

export interface OrbitSceneOptions {
  initialElements: OrbitalElements
  initialCamera?: CameraState
  onTick?: (info: TickInfo) => void
  onGroundTrackUpdate?: (points: GeodeticCoordinates[]) => void
}

/**
 * Owns the Three.js scene, camera, renderer, controls, and render loop.
 * Deliberately kept free of React so the render loop stays under direct
 * control; the React side only mounts/unmounts an instance and calls its
 * imperative methods (setDesignElements/setRealSatellite/play/pause/seek/...).
 *
 * The satellite marker/ground track/orbit-path-line logic doesn't care
 * whether it's driven by a designed two-body orbit or a real SGP4-propagated
 * satellite - both are just an `OrbitSource` (see OrbitSource.ts).
 */
export class OrbitScene {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private readonly satelliteMarker: THREE.Mesh
  private readonly onTick?: (info: TickInfo) => void
  private readonly onGroundTrackUpdate?: (points: GeodeticCoordinates[]) => void

  private orbitPath: THREE.Mesh
  private source: OrbitSource
  private simTimeSeconds = 0
  private isPlaying = false
  private speedMultiplier = 60
  private animationFrameId: number | null = null
  private lastFrameTime: number | null = null
  private lastGroundTrackReportTime: number | null = null

  constructor(container: HTMLElement, options: OrbitSceneOptions) {
    this.container = container
    this.source = new DesignOrbitSource(options.initialElements)
    this.onTick = options.onTick
    this.onGroundTrackUpdate = options.onGroundTrackUpdate
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(50, this.aspectRatio, 0.1, 1000)
    const initialCameraPosition = options.initialCamera?.position
    if (initialCameraPosition) {
      this.camera.position.set(
        initialCameraPosition.x,
        initialCameraPosition.y,
        initialCameraPosition.z,
      )
    } else {
      this.camera.position.set(0, EARTH_RADIUS_SCENE_UNITS * 2, EARTH_RADIUS_SCENE_UNITS * 5)
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = EARTH_RADIUS_SCENE_UNITS * 1.2
    this.controls.maxDistance = EARTH_RADIUS_SCENE_UNITS * 15
    const initialCameraTarget = options.initialCamera?.target
    if (initialCameraTarget) {
      this.controls.target.set(initialCameraTarget.x, initialCameraTarget.y, initialCameraTarget.z)
      this.controls.update()
    }

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.position.set(5, 3, 5)
    this.scene.add(sun)

    this.scene.add(createEarth())

    this.orbitPath = createOrbitPath(this.source.getOrbitPathPoints())
    this.scene.add(this.orbitPath)

    this.satelliteMarker = createSatelliteMarker()
    this.scene.add(this.satelliteMarker)
    this.syncToCurrentState(true)

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(container)
  }

  private get aspectRatio(): number {
    return this.container.clientWidth / this.container.clientHeight
  }

  private handleResize(): void {
    this.camera.aspect = this.aspectRatio
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  /** Recomputes the current state vector once and applies it everywhere it's needed. */
  private syncToCurrentState(forceGroundTrack: boolean): void {
    const state = this.source.getStateAt(this.simTimeSeconds)
    this.satelliteMarker.position.copy(eciToScene(state.position))

    const period = this.source.getPeriodSeconds()
    const wrappedSimTime = ((this.simTimeSeconds % period) + period) % period
    this.onTick?.({
      simTimeSeconds: wrappedSimTime,
      altitudeKm: magnitude(state.position) - EARTH_RADIUS_KM,
      speedKmS: magnitude(state.velocity),
    })

    const now = performance.now()
    const dueForReport =
      forceGroundTrack ||
      this.lastGroundTrackReportTime === null ||
      now - this.lastGroundTrackReportTime >= GROUND_TRACK_REPORT_INTERVAL_MS
    if (dueForReport && this.onGroundTrackUpdate) {
      this.lastGroundTrackReportTime = now
      const windowSeconds = period * GROUND_TRACK_WINDOW_PERIODS
      const sampleIntervalSeconds = windowSeconds / GROUND_TRACK_SAMPLE_COUNT
      this.onGroundTrackUpdate(
        this.source.getGroundTrack(this.simTimeSeconds, windowSeconds, sampleIntervalSeconds),
      )
    }
  }

  /** Swaps the active orbit source, rebuilding the path and repositioning the satellite. */
  private setSource(source: OrbitSource, resetTime: boolean): void {
    this.source = source
    if (resetTime) this.simTimeSeconds = 0

    this.scene.remove(this.orbitPath)
    disposeObject3D(this.orbitPath)
    this.orbitPath = createOrbitPath(source.getOrbitPathPoints())
    this.scene.add(this.orbitPath)

    this.syncToCurrentState(true)
  }

  /** Switches to (or updates) a user-designed two-body orbit. Keeps the current sim time. */
  setDesignElements(elements: OrbitalElements): void {
    this.setSource(new DesignOrbitSource(elements), false)
  }

  /** Switches to tracking a real satellite via its TLE, starting the clock fresh at "now". */
  setRealSatellite(tle: TleRecord): void {
    this.setSource(new RealSatelliteSource(tle, new Date()), true)
  }

  play(): void {
    this.isPlaying = true
  }

  pause(): void {
    this.isPlaying = false
  }

  setSpeedMultiplier(speedMultiplier: number): void {
    this.speedMultiplier = speedMultiplier
  }

  /** Reads the current camera position and orbit-controls target, for sharing/URL state. */
  getCameraState(): CameraState {
    return {
      position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      target: { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z },
    }
  }

  /** Restores a previously-captured camera position/target (e.g. from a shared URL). */
  setCameraState(state: CameraState): void {
    this.camera.position.set(state.position.x, state.position.y, state.position.z)
    this.controls.target.set(state.target.x, state.target.y, state.target.z)
    this.controls.update()
  }

  /** Seeks to a given elapsed sim time (seconds since epoch) and repositions the satellite. */
  seek(simTimeSeconds: number): void {
    this.simTimeSeconds = simTimeSeconds
    this.syncToCurrentState(true)
  }

  start(): void {
    const tick = (now: number) => {
      const deltaSeconds = this.lastFrameTime === null ? 0 : (now - this.lastFrameTime) / 1000
      this.lastFrameTime = now

      if (this.isPlaying) {
        this.simTimeSeconds += deltaSeconds * this.speedMultiplier
        this.syncToCurrentState(false)
      }

      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.animationFrameId = requestAnimationFrame(tick)
    }
    this.animationFrameId = requestAnimationFrame(tick)
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
    disposeObject3D(this.scene)
  }
}
