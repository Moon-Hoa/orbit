import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  CENTRAL_BODIES,
  type CentralBodyId,
  DEFAULT_CENTRAL_BODY_ID,
  EARTH_RADIUS_KM,
  type GeodeticCoordinates,
  type OrbitalElements,
  type Vector3,
  geodeticToEcefDirection,
  magnitude,
  propagateToStateVector,
  scale,
} from '../engine'
import {
  CENTRAL_BODY_ORBITERS,
  CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES,
  type Orbiter,
  type SurfaceObject,
} from '../celestialObjects'
import { GROUND_STATION_CATEGORIES, type GroundStation } from '../groundStations'
import { type TleRecord, fetchActiveSatellites, shadowFractionAt, solarSubpointAt } from '../satellite'
import { type ClosestApproachResult, findClosestApproach } from './closestApproach'
import { CENTRAL_BODY_RADIUS_SCENE_UNITS, setCentralBodyRadiusKm } from './constants'
import { eciToScene } from './coordinates'
import { createEarth } from './createEarth'
import { createJupiter } from './createJupiter'
import { createMars } from './createMars'
import { createMercury } from './createMercury'
import { createMoon } from './createMoon'
import { createNeptune } from './createNeptune'
import { createUranus } from './createUranus'
import { createVenus } from './createVenus'
import { type MarkerScreenPosition, projectMarkerToScreen } from './markerScreenPosition'
import { DEFAULT_ORBIT_PATH_COLOR, createOrbitPath } from './createOrbitPath'
import { DEFAULT_MARKER_COLOR, createSatelliteMarker } from './createSatelliteMarker'
import { createGroundStationPin, createGroundStationPinMaterial } from './createGroundStationPin'
import { DesignOrbitSource } from './DesignOrbitSource'
import { disposeObject3D } from './disposeObject3D'
import type { OrbitSource } from './OrbitSource'
import { RealSatelliteSource } from './RealSatelliteSource'
import { SatelliteSwarm } from './SatelliteSwarm'

/** Marker color for active-orbiter markers (Moon/Mars), distinct from the primary/companion marker palette. */
export const ORBITER_MARKER_COLOR = 0xfacc15

/** Builds the mesh for a given central body id. */
function createCentralBodyMesh(id: CentralBodyId): THREE.Mesh {
  switch (id) {
    case 'earth':
      return createEarth()
    case 'moon':
      return createMoon()
    case 'mars':
      return createMars()
    case 'mercury':
      return createMercury()
    case 'venus':
      return createVenus()
    case 'jupiter':
      return createJupiter()
    case 'uranus':
      return createUranus()
    case 'neptune':
      return createNeptune()
  }
}

const DEG_TO_RAD = Math.PI / 180

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
  /**
   * The real calendar date this instant corresponds to (the scene's
   * wall-clock reference plus elapsed sim time). Always present, in both
   * modes - this is what drives the globe's day/night shading and is
   * re-anchored to "now" by `syncToNow`.
   */
  currentDate: Date
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

/** A ground station pin the user clicked, alongside which category it belongs to. */
export interface GroundStationSelection {
  station: GroundStation
  categoryId: string
  categoryLabel: string
}

/** A celestial surface object or active orbiter the user clicked (Moon/Mars only). */
export type CelestialObjectSelection =
  | { kind: 'surface'; object: SurfaceObject; categoryId: string; categoryLabel: string }
  | { kind: 'orbiter'; object: Orbiter }

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
  /** Which body the scene is centered on. Defaults to Earth. */
  initialCentralBody?: CentralBodyId
  initialCamera?: CameraState
  onTick?: (info: TickInfo) => void
  onGroundTrackUpdate?: (tracks: GroundTrackForObject[]) => void
  /** Reported alongside ground tracks (same throttling): the subsolar point, or null in design mode. */
  onSolarUpdate?: (subsolarPoint: GeodeticCoordinates | null) => void
  /** Reported alongside ground tracks (same throttling): closest-approach between the two tracked objects, or null unless exactly two are tracked. */
  onClosestApproachUpdate?: (result: ClosestApproachResult | null) => void
  /** Called when scene-driven playback (see `setPlaybackCap`) stops itself on reaching its cap, so the UI can mirror the paused state. */
  onAutoPause?: () => void
  /** Called when the user clicks a visible ground station pin. */
  onGroundStationSelect?: (selection: GroundStationSelection) => void
  /** Called when the user clicks a visible celestial surface object pin or orbiter marker. */
  onCelestialObjectSelect?: (selection: CelestialObjectSelection) => void
  /**
   * Called whenever the current selection (from either callback above) is
   * dismissed: clicking empty space, clicking the selected marker again,
   * its layer being hidden, or switching central body.
   */
  onSelectionClear?: () => void
  /**
   * Called every frame with where the selected marker currently projects to
   * on screen (so a tooltip can track it through camera orbit/zoom), or
   * `null` when nothing is selected.
   */
  onSelectedMarkerPositionUpdate?: (position: MarkerScreenPosition | null) => void
}

/** Identifies whichever marker is currently selected, for occlusion/visibility checks and re-clicking to dismiss. */
type SelectedMarker =
  | { kind: 'ground-station'; mesh: THREE.Mesh; categoryId: string }
  | { kind: 'celestial-surface'; mesh: THREE.Mesh; categoryId: string }
  | { kind: 'celestial-orbiter'; mesh: THREE.Mesh }

interface TrackedObject {
  source: OrbitSource
  orbitPath: THREE.Mesh
  satelliteMarker: THREE.Mesh
  pathColor: number
  markerColor: number
}

interface GroundStationCategoryState {
  categoryId: string
  categoryLabel: string
  stationsById: Map<string, GroundStation>
  material: THREE.MeshBasicMaterial
  group: THREE.Group
  pinsByStationId: Map<string, THREE.Mesh>
  visible: boolean
}

interface CelestialSurfaceCategoryState {
  categoryId: string
  categoryLabel: string
  objectsById: Map<string, SurfaceObject>
  material: THREE.MeshBasicMaterial
  group: THREE.Group
  pinsByObjectId: Map<string, THREE.Mesh>
  visible: boolean
}

interface CelestialOrbiterState {
  orbiter: Orbiter
  marker: THREE.Mesh
}

/** How far the pointer can move between down/up and still count as a click (not a camera drag), in CSS pixels. */
const CLICK_MOVEMENT_THRESHOLD_PX = 5

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
  private readonly onClosestApproachUpdate?: (result: ClosestApproachResult | null) => void
  private readonly onAutoPause?: () => void
  private readonly onGroundStationSelect?: (selection: GroundStationSelection) => void
  private readonly onCelestialObjectSelect?: (selection: CelestialObjectSelection) => void
  private readonly onSelectionClear?: () => void
  private readonly onSelectedMarkerPositionUpdate?: (position: MarkerScreenPosition | null) => void
  private readonly sun: THREE.DirectionalLight
  private readonly raycaster = new THREE.Raycaster()
  private readonly groundStationCategories = new Map<string, GroundStationCategoryState>()
  private readonly celestialObjectCategories = new Map<string, CelestialSurfaceCategoryState>()
  private readonly celestialOrbiters = new Map<string, CelestialOrbiterState>()
  private celestialOrbitersVisible = false
  private selectedMarker: SelectedMarker | null = null
  private pointerDownPosition: { x: number; y: number } | null = null
  private satelliteSwarm: SatelliteSwarm | null = null
  private satelliteSwarmVisible = false
  private satelliteSwarmLoadPromise: Promise<void> | null = null

  private readonly objects = new Map<string, TrackedObject>()
  private centralBodyId: CentralBodyId
  private centralBodyMesh: THREE.Mesh
  private centralBodyMuKm3S2: number
  private centralBodyRadiusKm: number
  private focusedObjectId: string = PRIMARY_OBJECT_ID
  private simTimeSeconds = 0
  private isPlaying = false
  private speedMultiplier = 60
  private animationFrameId: number | null = null
  private lastFrameTime: number | null = null
  private lastGroundTrackReportTime: number | null = null
  /** Wall-clock instant that `simTimeSeconds = 0` corresponds to. Drives the globe's day/night shading; re-anchored to "now" by `syncToNow`. */
  private referenceDate = new Date()
  /** When set, playback auto-pauses once `simTimeSeconds` reaches this value (see `setPlaybackCap`). */
  private playbackStopAtSimTimeSeconds: number | null = null

  constructor(container: HTMLElement, options: OrbitSceneOptions) {
    this.container = container
    this.onTick = options.onTick
    this.onGroundTrackUpdate = options.onGroundTrackUpdate
    this.onSolarUpdate = options.onSolarUpdate
    this.onClosestApproachUpdate = options.onClosestApproachUpdate
    this.onAutoPause = options.onAutoPause
    this.onGroundStationSelect = options.onGroundStationSelect
    this.onCelestialObjectSelect = options.onCelestialObjectSelect
    this.onSelectionClear = options.onSelectionClear
    this.onSelectedMarkerPositionUpdate = options.onSelectedMarkerPositionUpdate
    this.scene = new THREE.Scene()

    this.centralBodyId = options.initialCentralBody ?? DEFAULT_CENTRAL_BODY_ID
    const centralBodyInfo = CENTRAL_BODIES[this.centralBodyId]
    this.centralBodyMuKm3S2 = centralBodyInfo.muKm3S2
    this.centralBodyRadiusKm = centralBodyInfo.radiusKm
    setCentralBodyRadiusKm(centralBodyInfo.radiusKm)

    this.camera = new THREE.PerspectiveCamera(50, this.aspectRatio, 0.1, 1000)
    const initialCameraPosition = options.initialCamera?.position
    if (initialCameraPosition) {
      this.camera.position.set(
        initialCameraPosition.x,
        initialCameraPosition.y,
        initialCameraPosition.z,
      )
    } else {
      this.camera.position.set(0, CENTRAL_BODY_RADIUS_SCENE_UNITS * 2, CENTRAL_BODY_RADIUS_SCENE_UNITS * 5)
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = CENTRAL_BODY_RADIUS_SCENE_UNITS * 1.2
    this.controls.maxDistance = CENTRAL_BODY_RADIUS_SCENE_UNITS * 15
    const initialCameraTarget = options.initialCamera?.target
    if (initialCameraTarget) {
      this.controls.target.set(initialCameraTarget.x, initialCameraTarget.y, initialCameraTarget.z)
      this.controls.update()
    }

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5)
    this.sun.position.copy(this.sunDirectionInScene(this.referenceDate))
    this.scene.add(this.sun)

    this.centralBodyMesh = createCentralBodyMesh(this.centralBodyId)
    this.scene.add(this.centralBodyMesh)

    this.rebuildCelestialObjects(this.centralBodyId)

    for (const category of GROUND_STATION_CATEGORIES) {
      const material = createGroundStationPinMaterial(category.color)
      const group = new THREE.Group()
      group.name = `ground-stations-${category.id}`
      group.visible = false

      const stationsById = new Map<string, GroundStation>()
      const pinsByStationId = new Map<string, THREE.Mesh>()
      for (const station of category.stations) {
        const pin = createGroundStationPin(material)
        group.add(pin)
        stationsById.set(station.id, station)
        pinsByStationId.set(station.id, pin)
      }
      this.scene.add(group)

      this.groundStationCategories.set(category.id, {
        categoryId: category.id,
        categoryLabel: category.label,
        stationsById,
        material,
        group,
        pinsByStationId,
        visible: false,
      })
    }

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp)

    this.objects.set(
      PRIMARY_OBJECT_ID,
      this.createTrackedObject(
        new DesignOrbitSource(
          options.initialElements,
          options.initialEnableJ2 ?? false,
          this.centralBodyMuKm3S2,
        ),
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
    return { source, orbitPath, satelliteMarker, pathColor, markerColor }
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
    this.replacePrimary(new DesignOrbitSource(elements, enableJ2, this.centralBodyMuKm3S2), false)
  }

  /**
   * Switches the primary object to tracking a real satellite via its TLE,
   * starting the clock fresh at "now". No-ops when a non-Earth body is
   * selected - Celestrak has no Moon/Mars catalog, so the UI shouldn't call
   * this outside Earth, but this guard keeps the scene consistent even if it
   * does.
   */
  setRealSatellite(tle: TleRecord): void {
    if (this.centralBodyId !== 'earth') return
    this.replacePrimary(new RealSatelliteSource(tle, new Date()), true)
  }

  /** Adds an additional real satellite alongside the primary object. No-ops if `id` is already tracked, or if a non-Earth body is selected (see `setRealSatellite`). */
  addRealSatelliteCompanion(id: string, tle: TleRecord, color: number): void {
    if (this.centralBodyId !== 'earth') return
    if (this.objects.has(id)) return
    this.objects.set(id, this.createTrackedObject(new RealSatelliteSource(tle, new Date()), color, color))
    this.syncToCurrentState(true)
  }

  /** Adds an additional design orbit alongside the primary object. No-ops if `id` is already tracked. */
  addDesignCompanion(id: string, elements: OrbitalElements, color: number): void {
    if (this.objects.has(id)) return
    this.objects.set(
      id,
      this.createTrackedObject(
        new DesignOrbitSource(elements, false, this.centralBodyMuKm3S2),
        color,
        color,
      ),
    )
    this.syncToCurrentState(true)
  }

  /**
   * Switches the scene's central body, swapping its mesh, repointing the
   * scene's km-to-scene-units scale, and re-anchoring every currently-tracked
   * design orbit to the new body's `mu` (so period/velocity reflect it going
   * forward - the drawn path shape doesn't depend on `mu`, so it's unchanged).
   * Real-satellite objects (Earth-only) are left as-is; the UI is expected to
   * only add those while Earth is selected (see `setRealSatellite`).
   */
  setCentralBody(id: CentralBodyId): void {
    if (id === this.centralBodyId) return
    this.clearSelection() // avoid a dangling reference into a mesh rebuildCelestialObjects is about to dispose
    const info = CENTRAL_BODIES[id]
    this.centralBodyId = id
    this.centralBodyMuKm3S2 = info.muKm3S2
    this.centralBodyRadiusKm = info.radiusKm
    setCentralBodyRadiusKm(info.radiusKm)

    this.scene.remove(this.centralBodyMesh)
    disposeObject3D(this.centralBodyMesh)
    this.centralBodyMesh = createCentralBodyMesh(id)
    this.scene.add(this.centralBodyMesh)

    // Surface-object categories always start hidden for a newly-selected body
    // (rebuildCelestialObjects below creates each fresh group with
    // `visible: false`), so orbiters should too - otherwise the *new* body's
    // orbiters would inherit whatever the *previous* body's "active orbiters"
    // toggle was left at, appearing uninvited (e.g. switching from the Moon
    // with orbiters on straight to Mars would show Mars's orbiters too).
    this.celestialOrbitersVisible = false
    this.rebuildCelestialObjects(id)

    // Ground station pins and the satellite swarm are real Earth
    // facilities/objects, positioned using Earth's real km - hide them while
    // away from Earth (otherwise their old scene-space positions, computed
    // under Earth's km-to-scene-units scale, would appear to sit right on
    // whatever body is now rendered at that same on-screen radius). Each
    // category's/the swarm's own `visible` flag is left untouched, so
    // whichever ones the user had chosen are restored automatically on
    // returning to Earth.
    const showEarthOnlyLayers = id === 'earth'
    for (const state of this.groundStationCategories.values()) {
      state.group.visible = showEarthOnlyLayers && state.visible
    }
    if (showEarthOnlyLayers) this.updateGroundStationPins()
    this.satelliteSwarm?.setVisible(showEarthOnlyLayers && this.satelliteSwarmVisible)

    for (const [objectId, object] of this.objects) {
      if (!(object.source instanceof DesignOrbitSource)) continue
      const reanchored = new DesignOrbitSource(
        object.source.getElements(),
        object.source.getEnableJ2(),
        info.muKm3S2,
      )
      this.disposeTrackedObject(object)
      this.objects.set(objectId, this.createTrackedObject(reanchored, object.pathColor, object.markerColor))
    }

    this.syncToCurrentState(true)
  }

  /**
   * Rebuilds the celestial surface-object pins and active-orbiter markers for
   * `bodyId`, disposing whatever the previous body had. Earth has no entries
   * in `CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES`/`CENTRAL_BODY_ORBITERS`, so
   * this is effectively a no-op (beyond clearing) when switching to Earth.
   * Surface pins reuse the same shared-geometry pin as ground stations
   * (`createGroundStationPin`); orbiter markers reuse `createSatelliteMarker`.
   * Must run after `centralBodyRadiusKm` and the scene's km-to-scene-units
   * scale are already updated for `bodyId`, since pin positions are computed
   * here using both.
   */
  private rebuildCelestialObjects(bodyId: CentralBodyId): void {
    for (const state of this.celestialObjectCategories.values()) {
      this.scene.remove(state.group)
      disposeObject3D(state.group)
    }
    this.celestialObjectCategories.clear()

    for (const state of this.celestialOrbiters.values()) {
      this.scene.remove(state.marker)
      disposeObject3D(state.marker)
    }
    this.celestialOrbiters.clear()

    for (const category of CENTRAL_BODY_SURFACE_OBJECT_CATEGORIES[bodyId]) {
      const material = createGroundStationPinMaterial(category.color)
      const group = new THREE.Group()
      group.name = `celestial-objects-${category.id}`
      group.visible = false

      const objectsById = new Map<string, SurfaceObject>()
      const pinsByObjectId = new Map<string, THREE.Mesh>()
      for (const object of category.objects) {
        const pin = createGroundStationPin(material)
        const ecefDirection = geodeticToEcefDirection({
          latitudeRad: object.latitudeDeg * DEG_TO_RAD,
          longitudeRad: object.longitudeDeg * DEG_TO_RAD,
          altitudeKm: 0,
        })
        pin.position.copy(eciToScene(scale(ecefDirection, this.centralBodyRadiusKm)))
        group.add(pin)
        objectsById.set(object.id, object)
        pinsByObjectId.set(object.id, pin)
      }
      this.scene.add(group)

      this.celestialObjectCategories.set(category.id, {
        categoryId: category.id,
        categoryLabel: category.label,
        objectsById,
        material,
        group,
        pinsByObjectId,
        visible: false,
      })
    }

    for (const orbiter of CENTRAL_BODY_ORBITERS[bodyId]) {
      const marker = createSatelliteMarker(ORBITER_MARKER_COLOR)
      marker.visible = this.celestialOrbitersVisible
      this.scene.add(marker)
      this.celestialOrbiters.set(orbiter.id, { orbiter, marker })
    }
    if (this.celestialOrbitersVisible) this.updateCelestialOrbiterPositions()
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

  /**
   * Re-anchors every tracked object, and the globe's day/night reference, to
   * the current wall-clock moment, then resets the sim clock to 0. Real
   * satellites are re-propagated from "now" (their SGP4 state and orbit-path
   * window both depend on their reference date); design orbits have no real
   * epoch, so this is equivalent to `seek(0)` for them. Clears any pending
   * playback cap from a previous `setPlaybackCap` call.
   */
  syncToNow(): void {
    this.referenceDate = new Date()
    for (const [id, object] of this.objects) {
      const reanchored = object.source.reanchorTo?.(this.referenceDate)
      if (!reanchored) continue
      this.disposeTrackedObject(object)
      this.objects.set(
        id,
        this.createTrackedObject(reanchored, object.pathColor, object.markerColor),
      )
    }
    this.simTimeSeconds = 0
    this.playbackStopAtSimTimeSeconds = null
    this.syncToCurrentState(true)
  }

  /**
   * Caps forward playback: once `simTimeSeconds` reaches `simTimeSeconds`
   * (absolute, not a duration) while playing, playback auto-pauses and
   * `onAutoPause` fires. Pass `null` to clear a previously-set cap. Typically
   * called right after `syncToNow()` for a "preview the next 24 hours" flow -
   * combine with the caller setting `isPlaying`/calling `play()`.
   */
  setPlaybackCap(simTimeSeconds: number | null): void {
    this.playbackStopAtSimTimeSeconds = simTimeSeconds
  }

  /**
   * Where the sun should render in scene space: the real subsolar point at
   * `currentDate`.
   *
   * This mesh never rotates to simulate Earth's spin (same as satellite
   * markers, which are placed via plain ECI with no rotation either) - so
   * the globe's fixed orientation is this app's stand-in for the Earth-fixed
   * (ECEF) frame at every instant, not just at some epoch. Earth-fixed
   * things (this, and ground station pins below) therefore map to scene
   * space directly, with no time-dependent rotation: the subsolar point's
   * own real ECEF longitude already sweeps westward as `currentDate`
   * advances (Earth's rotation, via GMST inside `solarSubpointAt`), and that
   * alone is what drags the terminator across the frozen globe. An earlier
   * version of this code additionally rotated the result by
   * simTimeSeconds * EARTH_ROTATION_RATE_RAD_S, meant to compensate for the
   * globe not spinning - but that rotation runs in the same direction the
   * subsolar point is already sweeping, so it nearly exactly cancelled the
   * real motion instead of adding to it, leaving the terminator effectively
   * frozen.
   */
  private sunDirectionInScene(currentDate: Date): THREE.Vector3 {
    return eciToScene(geodeticToEcefDirection(solarSubpointAt(currentDate)))
  }

  /**
   * Ground stations are fixed on the real Earth's surface (geodetic/ECEF).
   * Per `sunDirectionInScene`'s note above, this app's static globe mesh
   * stands in for the ECEF frame at every instant, so - unlike satellites,
   * which move - a station's scene position never changes once computed;
   * it does NOT get re-rotated as sim time advances (an earlier version did,
   * which visibly slid pins across the (non-rotating) globe during
   * playback).
   */
  private updateGroundStationPins(): void {
    for (const state of this.groundStationCategories.values()) {
      if (!state.visible) continue
      for (const [stationId, station] of state.stationsById) {
        const pin = state.pinsByStationId.get(stationId)
        if (!pin) continue
        const ecefDirection = geodeticToEcefDirection({
          latitudeRad: station.latitudeDeg * DEG_TO_RAD,
          longitudeRad: station.longitudeDeg * DEG_TO_RAD,
          altitudeKm: 0,
        })
        const ecefPositionKm = scale(ecefDirection, EARTH_RADIUS_KM)
        pin.position.copy(eciToScene(ecefPositionKm))
      }
    }
  }

  /**
   * Shows or hides every pin in a ground station category. No-ops for an
   * unknown category id, or if a non-Earth body is selected (ground stations
   * are real Earth facilities, meaningless around the Moon/Mars in v1).
   */
  setGroundStationCategoryVisible(categoryId: string, visible: boolean): void {
    if (this.centralBodyId !== 'earth') return
    const state = this.groundStationCategories.get(categoryId)
    if (!state) return
    state.visible = visible
    state.group.visible = visible
    if (visible) this.updateGroundStationPins()
  }

  /** Shows or hides every pin in a celestial surface-object category. No-ops for an unknown category id. */
  setCelestialObjectCategoryVisible(categoryId: string, visible: boolean): void {
    const state = this.celestialObjectCategories.get(categoryId)
    if (!state) return
    state.visible = visible
    state.group.visible = visible
  }

  /** Shows or hides the active-orbiter markers for the currently-selected body. */
  setCelestialOrbitersVisible(visible: boolean): void {
    this.celestialOrbitersVisible = visible
    for (const state of this.celestialOrbiters.values()) {
      state.marker.visible = visible
    }
    if (visible) this.updateCelestialOrbiterPositions()
  }

  /** Repositions every active-orbiter marker at the current sim time, using the current body's `mu`. */
  private updateCelestialOrbiterPositions(): void {
    for (const state of this.celestialOrbiters.values()) {
      const orbiterState = propagateToStateVector(
        state.orbiter.elements,
        this.simTimeSeconds,
        this.centralBodyMuKm3S2,
      )
      state.marker.position.copy(eciToScene(orbiterState.position))
    }
  }

  /**
   * Shows or hides the "all satellites currently in orbit" background swarm - a single
   * `THREE.Points` cloud (see `SatelliteSwarm`), not individually trackable like the companion
   * system above. The first time this is enabled, it fetches and parses the full active-satellite
   * catalog (~16,000 objects as of writing) - callers should show their own loading UI while the
   * returned promise is pending. Rejects (leaving the swarm hidden) if that fetch fails and
   * nothing is cached yet; a later retry (calling this again) will attempt the fetch again.
   * No-ops if a non-Earth body is selected (this catalog is Earth-only).
   */
  async setSatelliteSwarmVisible(visible: boolean): Promise<void> {
    if (this.centralBodyId !== 'earth') return
    this.satelliteSwarmVisible = visible
    if (!visible) {
      this.satelliteSwarm?.setVisible(false)
      return
    }
    if (this.satelliteSwarm) {
      this.satelliteSwarm.setVisible(true)
      return
    }
    if (!this.satelliteSwarmLoadPromise) {
      this.satelliteSwarmLoadPromise = this.loadSatelliteSwarm().catch((error: unknown) => {
        this.satelliteSwarmLoadPromise = null
        throw error
      })
    }
    await this.satelliteSwarmLoadPromise
  }

  private async loadSatelliteSwarm(): Promise<void> {
    const tles = await fetchActiveSatellites()
    const currentDate = new Date(this.referenceDate.getTime() + this.simTimeSeconds * 1000)
    const swarm = new SatelliteSwarm(tles, currentDate)
    this.satelliteSwarm = swarm
    this.scene.add(swarm.points)
    swarm.setVisible(this.satelliteSwarmVisible)
  }

  /** Normalized device coordinates (-1..1) for a pointer event, relative to the canvas. */
  private pointerToNdc(event: PointerEvent): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect()
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownPosition = { x: event.clientX, y: event.clientY }
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const down = this.pointerDownPosition
    this.pointerDownPosition = null
    if (!down) return
    const movedPx = Math.hypot(event.clientX - down.x, event.clientY - down.y)
    if (movedPx > CLICK_MOVEMENT_THRESHOLD_PX) return // was a camera drag, not a click

    const visiblePins: THREE.Mesh[] = []
    for (const state of this.groundStationCategories.values()) {
      if (state.visible) visiblePins.push(...state.pinsByStationId.values())
    }
    for (const state of this.celestialObjectCategories.values()) {
      if (state.visible) visiblePins.push(...state.pinsByObjectId.values())
    }
    if (this.celestialOrbitersVisible) {
      for (const state of this.celestialOrbiters.values()) visiblePins.push(state.marker)
    }

    const hit =
      visiblePins.length > 0
        ? (() => {
            this.raycaster.setFromCamera(this.pointerToNdc(event), this.camera)
            return this.raycaster.intersectObjects(visiblePins, false)[0]
          })()
        : undefined

    if (!hit) {
      this.clearSelection() // a legitimate click on empty space dismisses whatever was selected
      return
    }
    if (this.selectedMarker?.mesh === hit.object) {
      this.clearSelection() // clicking the already-selected marker again dismisses it
      return
    }

    for (const state of this.groundStationCategories.values()) {
      for (const [stationId, pin] of state.pinsByStationId) {
        if (pin !== hit.object) continue
        const station = state.stationsById.get(stationId)
        if (!station) return
        this.selectedMarker = { kind: 'ground-station', mesh: pin, categoryId: state.categoryId }
        this.onGroundStationSelect?.({
          station,
          categoryId: state.categoryId,
          categoryLabel: state.categoryLabel,
        })
        this.reportSelectedMarkerPosition()
        return
      }
    }
    for (const state of this.celestialObjectCategories.values()) {
      for (const [objectId, pin] of state.pinsByObjectId) {
        if (pin !== hit.object) continue
        const object = state.objectsById.get(objectId)
        if (!object) return
        this.selectedMarker = { kind: 'celestial-surface', mesh: pin, categoryId: state.categoryId }
        this.onCelestialObjectSelect?.({
          kind: 'surface',
          object,
          categoryId: state.categoryId,
          categoryLabel: state.categoryLabel,
        })
        this.reportSelectedMarkerPosition()
        return
      }
    }
    for (const state of this.celestialOrbiters.values()) {
      if (state.marker !== hit.object) continue
      this.selectedMarker = { kind: 'celestial-orbiter', mesh: state.marker }
      this.onCelestialObjectSelect?.({ kind: 'orbiter', object: state.orbiter })
      this.reportSelectedMarkerPosition()
      return
    }
  }

  /** Whether the currently-selected marker's layer is still visible (it may have been toggled off since selection). */
  private isSelectedMarkerLayerVisible(): boolean {
    if (!this.selectedMarker) return false
    switch (this.selectedMarker.kind) {
      case 'ground-station':
        return this.groundStationCategories.get(this.selectedMarker.categoryId)?.visible ?? false
      case 'celestial-surface':
        return this.celestialObjectCategories.get(this.selectedMarker.categoryId)?.visible ?? false
      case 'celestial-orbiter':
        return this.celestialOrbitersVisible
    }
  }

  /**
   * Projects the currently-selected marker to screen space and reports it via
   * `onSelectedMarkerPositionUpdate`, so a tooltip can track it through camera
   * orbit/zoom. Auto-clears the selection if its layer has been hidden since
   * it was selected. No-ops (reporting nothing) when nothing is selected.
   */
  private reportSelectedMarkerPosition(): void {
    if (!this.selectedMarker) return
    if (!this.isSelectedMarkerLayerVisible()) {
      this.clearSelection()
      return
    }
    this.onSelectedMarkerPositionUpdate?.(
      projectMarkerToScreen(
        this.selectedMarker.mesh.position,
        this.camera,
        this.container.clientWidth,
        this.container.clientHeight,
        CENTRAL_BODY_RADIUS_SCENE_UNITS,
      ),
    )
  }

  /**
   * Dismisses the current marker selection (ground station pin, celestial
   * surface object pin, or orbiter marker), notifying both the "what's
   * selected" callback (`onSelectionClear`) and the screen-position callback
   * (with `null`). No-ops if nothing is selected.
   */
  clearSelection(): void {
    if (!this.selectedMarker) return
    this.selectedMarker = null
    this.onSelectionClear?.()
    this.onSelectedMarkerPositionUpdate?.(null)
  }

  /** Repositions every tracked object at the current sim time, and reports focused-object stats/ground tracks. */
  private syncToCurrentState(forceGroundTrack: boolean): void {
    const currentDate = new Date(this.referenceDate.getTime() + this.simTimeSeconds * 1000)
    this.sun.position.copy(this.sunDirectionInScene(currentDate))
    if (this.satelliteSwarmVisible && this.centralBodyId === 'earth') this.satelliteSwarm?.update(currentDate)
    if (this.celestialOrbitersVisible) this.updateCelestialOrbiterPositions()

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
        focusedAltitudeKm = magnitude(state.position) - this.centralBodyRadiusKm
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
        currentDate,
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
    if (dueForReport && this.onClosestApproachUpdate) {
      const sources = Array.from(this.objects.values())
      this.onClosestApproachUpdate(
        sources.length === 2
          ? findClosestApproach(sources[0].source, sources[1].source, this.simTimeSeconds)
          : null,
      )
    }
  }

  start(): void {
    const tick = (now: number) => {
      const deltaSeconds = this.lastFrameTime === null ? 0 : (now - this.lastFrameTime) / 1000
      this.lastFrameTime = now

      if (this.isPlaying) {
        this.simTimeSeconds += deltaSeconds * this.speedMultiplier
        if (
          this.playbackStopAtSimTimeSeconds !== null &&
          this.simTimeSeconds >= this.playbackStopAtSimTimeSeconds
        ) {
          this.simTimeSeconds = this.playbackStopAtSimTimeSeconds
          this.playbackStopAtSimTimeSeconds = null
          this.isPlaying = false
          this.onAutoPause?.()
        }
        this.syncToCurrentState(false)
      }

      this.controls.update()
      // Runs every frame, not just while playing: the camera can orbit/zoom
      // (via OrbitControls) even while paused, which alone moves a selected
      // marker's on-screen projection.
      this.reportSelectedMarkerPosition()
      this.renderer.render(this.scene, this.camera)
      this.animationFrameId = requestAnimationFrame(tick)
    }
    this.animationFrameId = requestAnimationFrame(tick)
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
    // THREE.Points (the satellite swarm) isn't a Mesh, so disposeObject3D's traversal below
    // doesn't reach its geometry/material - dispose it explicitly first (safe to double-dispose).
    this.satelliteSwarm?.dispose()
    disposeObject3D(this.scene)
  }
}
