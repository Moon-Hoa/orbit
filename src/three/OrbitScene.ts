import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  EARTH_RADIUS_KM,
  type GeodeticCoordinates,
  type OrbitalElements,
  type Vector3,
  magnitude,
} from '../engine'
import { type TleRecord, shadowFractionAt, solarSubpointAt } from '../satellite'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'
import { eciToScene } from './coordinates'
import { createEarth } from './createEarth'
import { DEFAULT_ORBIT_PATH_COLOR, createOrbitPath } from './createOrbitPath'
import { DEFAULT_MARKER_COLOR, createSatelliteMarker } from './createSatelliteMarker'
import { DesignOrbitSource } from './DesignOrbitSource'
import { disposeObject3D } from './disposeObject3D'
import type { OrbitSource } from './OrbitSource'
import { RealSatelliteSource } from './RealSatelliteSource'

/** The id of the always-present, fully-editable object driven by setDesignElements/setRealSatellite. */
export const PRIMARY_OBJECT_ID = 'primary'

export interface TickInfo {
  /** Elapsed sim time, wrapped to [0, orbital period). */
  simTimeSeconds: number
  /** Current altitude above Earth's surface, km. */
  altitudeKm: number
  /** Current orbital speed, km/s. */
  speedKmS: number
  /**
   * Fraction of the primary object's sunlit disc obscured by Earth (0 = lit,
   * 1 = eclipsed). Null when the primary isn't tied to a real calendar date
   * (design mode has no notion of "real" sun position).
   */
  shadowFraction: number | null
}

/** Camera position and orbit-controls look-at target, both in scene units. */
export interface CameraState {
  position: Vector3
  target: Vector3
}

/** One tracked object's ground track, reported alongside its id so the UI can color-match it. */
export interface GroundTrackForObject {
  id: string
  points: GeodeticCoordinates[]
}

/** How often (wall-clock ms) ground tracks are recomputed and reported. */
const GROUND_TRACK_REPORT_INTERVAL_MS = 200
/** How many trailing orbital periods the ground track window covers. */
const GROUND_TRACK_WINDOW_PERIODS = 1.5
/** How many points are sampled across the ground track window. */
const GROUND_TRACK_SAMPLE_COUNT = 200

export interface OrbitSceneOptions {
  initialElements: OrbitalElements
  /** Whether the initial design orbit starts with J2 secular drift enabled. Defaults to false. */
  initialEnableJ2?: boolean
  initialCamera?: CameraState
  onTick?: (info: TickInfo) => void
  onGroundTrackUpdate?: (tracks: GroundTrackForObject[]) => void
  /** Reported alongside ground tracks (same throttling): the subsolar point, or null in design mode. */
  onSolarUpdate?: (subsolarPoint: GeodeticCoordinates | null) => void
}

interface TrackedObject {
  source: OrbitSource
  orbitPath: THREE.Mesh
  satelliteMarker: THREE.Mesh
}

/**
 * Owns the Three.js scene, camera, renderer, controls, and render loop.
 * Deliberately kept free of React so the render loop stays under direct
 * control; the React side only mounts/unmounts an instance and calls its
 * imperative methods (setDesignElements/setRealSatellite/play/pause/seek/...).
 *
 * Tracks a collection of objects, each just an `OrbitSource` (see
 * OrbitSource.ts) plus a color - so it doesn't care whether any given one is
 * a designed two-body orbit or a real SGP4-propagated satellite. There's
 * always exactly one "primary" object (driven by setDesignElements/
 * setRealSatellite, the same API this class has always had); additional
 * "companion" objects can be added/removed independently for side-by-side
 * comparison. One shared sim clock drives all of them. Stats/ground-track
 * reporting focuses on a single "focused" object at a time (default:
 * primary), switchable via setFocusedObject.
 */
export class OrbitScene {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private readonly onTick?: (info: TickInfo) => void
  private readonly onGroundTrackUpdate?: (tracks: GroundTrackForObject[]) => void
  private readonly onSolarUpdate?: (subsolarPoint: GeodeticCoordinates | null) => void

  private readonly objects = new Map<string, TrackedObject>()
  private focusedObjectId: string = PRIMARY_OBJECT_ID
  private simTimeSeconds = 0
  private isPlaying = false
  private speedMultiplier = 60
  private animationFrameId: number | null = null
  private lastFrameTime: number | null = null
  private lastGroundTrackReportTime: number | null = null

  constructor(container: HTMLElement, options: OrbitSceneOptions) {
    this.container = container
    this.onTick = options.onTick
    this.onGroundTrackUpdate = options.onGroundTrackUpdate
    this.onSolarUpdate = options.onSolarUpdate
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

    this.objects.set(
      PRIMARY_OBJECT_ID,
      this.createTrackedObject(
        new DesignOrbitSource(options.initialElements, options.initialEnableJ2 ?? false),
        DEFAULT_ORBIT_PATH_COLOR,
        DEFAULT_MARKER_COLOR,
      ),
    )
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

  private createTrackedObject(
    source: OrbitSource,
    pathColor: number,
    markerColor: number,
  ): TrackedObject {
    const orbitPath = createOrbitPath(source.getOrbitPathPoints(), pathColor)
    const satelliteMarker = createSatelliteMarker(markerColor)
    this.scene.add(orbitPath)
    this.scene.add(satelliteMarker)
    return { source, orbitPath, satelliteMarker }
  }

  private disposeTrackedObject(object: TrackedObject): void {
    this.scene.remove(object.orbitPath)
    this.scene.remove(object.satelliteMarker)
    disposeObject3D(object.orbitPath)
    disposeObject3D(object.satelliteMarker)
  }

  private replacePrimary(source: OrbitSource, resetTime: boolean): void {
    const existing = this.objects.get(PRIMARY_OBJECT_ID)
    if (existing) this.disposeTrackedObject(existing)
    this.objects.set(
      PRIMARY_OBJECT_ID,
      this.createTrackedObject(source, DEFAULT_ORBIT_PATH_COLOR, DEFAULT_MARKER_COLOR),
    )
    if (resetTime) this.simTimeSeconds = 0
    this.focusedObjectId = PRIMARY_OBJECT_ID
    this.syncToCurrentState(true)
  }

  /** Switches to (or updates) the primary user-designed two-body orbit. Keeps the current sim time. */
  setDesignElements(elements: OrbitalElements, enableJ2 = false): void {
    this.replacePrimary(new DesignOrbitSource(elements, enableJ2), false)
  }

  /** Switches the primary object to tracking a real satellite via its TLE, starting the clock fresh at "now". */
  setRealSatellite(tle: TleRecord): void {
    this.replacePrimary(new RealSatelliteSource(tle, new Date()), true)
  }

  /** Adds an additional real satellite alongside the primary object. No-ops if `id` is already tracked. */
  addRealSatelliteCompanion(id: string, tle: TleRecord, color: number): void {
    if (this.objects.has(id)) return
    this.objects.set(id, this.createTrackedObject(new RealSatelliteSource(tle, new Date()), color, color))
    this.syncToCurrentState(true)
  }

  /** Adds an additional design orbit alongside the primary object. No-ops if `id` is already tracked. */
  addDesignCompanion(id: string, elements: OrbitalElements, color: number): void {
    if (this.objects.has(id)) return
    this.objects.set(id, this.createTrackedObject(new DesignOrbitSource(elements), color, color))
    this.syncToCurrentState(true)
  }

  /** Stops tracking a companion object. No-ops for the primary object or an unknown id. */
  removeObject(id: string): void {
    if (id === PRIMARY_OBJECT_ID) return
    const object = this.objects.get(id)
    if (!object) return

    this.disposeTrackedObject(object)
    this.objects.delete(id)
    if (this.focusedObjectId === id) {
      this.focusedObjectId = PRIMARY_OBJECT_ID
    }
    this.syncToCurrentState(true)
  }

  /** Switches which tracked object's stats are reported via onTick. No-ops for an unknown id. */
  setFocusedObject(id: string): void {
    if (!this.objects.has(id)) return
    this.focusedObjectId = id
    this.syncToCurrentState(true)
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

  /** Seeks to a given elapsed sim time (seconds since epoch) and repositions every tracked object. */
  seek(simTimeSeconds: number): void {
    this.simTimeSeconds = simTimeSeconds
    this.syncToCurrentState(true)
  }

  /** Repositions every tracked object at the current sim time, and reports focused-object stats/ground tracks. */
  private syncToCurrentState(forceGroundTrack: boolean): void {
    let focusedAltitudeKm: number | null = null
    let focusedSpeedKmS: number | null = null
    let focusedWrappedSimTime = 0
    let primaryPositionEciKm: Vector3 | null = null
    let primaryCurrentDate: Date | null = null

    for (const [id, object] of this.objects) {
      const state = object.source.getStateAt(this.simTimeSeconds)
      object.satelliteMarker.position.copy(eciToScene(state.position))

      if (id === this.focusedObjectId) {
        const period = object.source.getPeriodSeconds()
        focusedWrappedSimTime = ((this.simTimeSeconds % period) + period) % period
        focusedAltitudeKm = magnitude(state.position) - EARTH_RADIUS_KM
        focusedSpeedKmS = magnitude(state.velocity)
      }

      if (id === PRIMARY_OBJECT_ID) {
        primaryPositionEciKm = state.position
        primaryCurrentDate = object.source.getCurrentDate?.(this.simTimeSeconds) ?? null
      }
    }

    const shadowFraction =
      primaryCurrentDate && primaryPositionEciKm
        ? shadowFractionAt(primaryCurrentDate, primaryPositionEciKm)
        : null

    if (focusedAltitudeKm !== null && focusedSpeedKmS !== null) {
      this.onTick?.({
        simTimeSeconds: focusedWrappedSimTime,
        altitudeKm: focusedAltitudeKm,
        speedKmS: focusedSpeedKmS,
        shadowFraction,
      })
    }

    const now = performance.now()
    const dueForReport =
      forceGroundTrack ||
      this.lastGroundTrackReportTime === null ||
      now - this.lastGroundTrackReportTime >= GROUND_TRACK_REPORT_INTERVAL_MS
    if (dueForReport) {
      this.lastGroundTrackReportTime = now
      this.onSolarUpdate?.(primaryCurrentDate ? solarSubpointAt(primaryCurrentDate) : null)
    }
    if (dueForReport && this.onGroundTrackUpdate) {
      const tracks: GroundTrackForObject[] = []
      for (const [id, object] of this.objects) {
        const period = object.source.getPeriodSeconds()
        const windowSeconds = period * GROUND_TRACK_WINDOW_PERIODS
        const sampleIntervalSeconds = windowSeconds / GROUND_TRACK_SAMPLE_COUNT
        tracks.push({
          id,
          points: object.source.getGroundTrack(
            this.simTimeSeconds,
            windowSeconds,
            sampleIntervalSeconds,
          ),
        })
      }
      this.onGroundTrackUpdate(tracks)
    }
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
