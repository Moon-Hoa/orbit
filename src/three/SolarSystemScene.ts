import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  MOON_IDS,
  type MoonId,
  OTHER_BODY_IDS,
  type OtherBodyId,
  PLANET_IDS,
  type PlanetId,
  moonParent,
  moonPositionRelativeToParentAu,
  otherBodyHeliocentricPositionAu,
  planetHeliocentricPositionAu,
  planetOrbitalPeriodDays,
} from '../engine'
import {
  SPACECRAFT_TRANSITS,
  idealizedTransitPositionAu,
  isInTransitAt,
  type SpacecraftTransit,
} from '../solarSystem'
import { auToScene } from './auToScene'
import { createAsteroidBelt } from './createAsteroidBelt'
import { createOrbitRing } from './createOrbitRing'
import { createOtherBody } from './createOtherBody'
import { createPlanet } from './createPlanet'
import { createSaturnRing } from './createSaturnRing'
import { createSolarSystemMoon } from './createSolarSystemMoon'
import { createSpacecraftMarker } from './createSpacecraftMarker'
import { createSun } from './createSun'
import { disposeObject3D } from './disposeObject3D'
import { type MarkerScreenPosition, projectMarkerToScreen } from './markerScreenPosition'
import {
  MOON_DISPLAY_ORBIT_RADII,
  OUTERMOST_PLANET_SCENE_RADIUS,
  SCENE_UNITS_PER_SQRT_AU,
} from './solarSystemConstants'

/** How many points trace each planet's orbit ring. */
const ORBIT_RING_SEGMENTS = 128
/** How far the pointer can move between down/up and still count as a click (not a camera drag), in CSS pixels - same threshold `OrbitScene` uses. */
const CLICK_MOVEMENT_THRESHOLD_PX = 5

/** The default camera's elevation angle above the ecliptic plane, as a (height, horizontal-distance) ratio - purely a pleasant viewing angle, unrelated to any real inclination. */
const CAMERA_ELEVATION_RATIO = { height: 6, horizontal: 9 }
/** Extra headroom past the tightest fit, so planets don't sit flush against the viewport edge. */
const CAMERA_FRAMING_MARGIN = 1.15

export interface SolarSystemSceneOptions {
  /** The sim date to start at. Defaults to "now". */
  initialDate?: Date
  /** Called every frame with the current sim date. */
  onTick?: (date: Date) => void
  /** Called whenever the set of currently-in-transit spacecraft changes. */
  onInTransitUpdate?: (transits: SpacecraftTransit[]) => void
  /** Called when the user clicks a visible spacecraft marker. */
  onSpacecraftSelect?: (transit: SpacecraftTransit) => void
  /** Called whenever the current selection is dismissed (see `OrbitScene`'s identical callback). */
  onSelectionClear?: () => void
  /** Called every frame with the selected marker's screen position, or `null` when nothing is selected. */
  onSelectedMarkerPositionUpdate?: (position: MarkerScreenPosition | null) => void
}

interface PlanetState {
  mesh: THREE.Mesh
}

interface MoonState {
  mesh: THREE.Mesh
}

interface OtherBodyState {
  mesh: THREE.Mesh
}

interface SpacecraftMarkerState {
  transit: SpacecraftTransit
  marker: THREE.Mesh
}

/**
 * Owns the heliocentric solar-system scene: the Sun, the terrestrial
 * planets (positioned via the low-precision analytical ephemeris in
 * `engine/ephemeris.ts`) on their orbit rings, and markers for whichever
 * hand-curated interplanetary missions (`solarSystem/missions.ts`) are
 * currently in transit at the current sim date. A separate, independent
 * scene/scale from `OrbitScene` (see the solar-system-view issue) - not a
 * central-body view, so there's no notion of a single tracked satellite,
 * companions, or ground tracks here.
 */
export class SolarSystemScene {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private readonly raycaster = new THREE.Raycaster()

  private readonly onTick?: (date: Date) => void
  private readonly onInTransitUpdate?: (transits: SpacecraftTransit[]) => void
  private readonly onSpacecraftSelect?: (transit: SpacecraftTransit) => void
  private readonly onSelectionClear?: () => void
  private readonly onSelectedMarkerPositionUpdate?: (position: MarkerScreenPosition | null) => void

  private readonly planets = new Map<PlanetId, PlanetState>()
  private readonly moons = new Map<MoonId, MoonState>()
  private readonly otherBodies = new Map<OtherBodyId, OtherBodyState>()
  private otherBodiesVisible = false
  private readonly spacecraftMarkers = new Map<string, SpacecraftMarkerState>()
  private selectedTransitId: string | null = null
  private lastReportedInTransitIds = ''

  private currentDate: Date
  private isPlaying = false
  private speedDaysPerSecond = 1
  private animationFrameId: number | null = null
  private lastFrameTime: number | null = null
  private pointerDownPosition: { x: number; y: number } | null = null

  constructor(container: HTMLElement, options: SolarSystemSceneOptions = {}) {
    this.container = container
    this.currentDate = options.initialDate ?? new Date()
    this.onTick = options.onTick
    this.onInTransitUpdate = options.onInTransitUpdate
    this.onSpacecraftSelect = options.onSpacecraftSelect
    this.onSelectionClear = options.onSelectionClear
    this.onSelectedMarkerPositionUpdate = options.onSelectedMarkerPositionUpdate

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(50, this.aspectRatio, 0.1, 5000)
    // Framed to comfortably show all 8 planets out to Neptune's orbit by
    // default - the distance needed to do that depends heavily on the
    // viewport's aspect ratio (a tall/narrow mobile screen has a much
    // narrower horizontal field of view than a wide desktop one, so it needs
    // a much farther camera to fit the same orbital radius), so this is
    // solved for at construction time rather than a fixed multiple. See
    // `initialCameraDistance`'s doc comment.
    const initialDistance = this.initialCameraDistance()
    const elevationMagnitude = Math.hypot(CAMERA_ELEVATION_RATIO.height, CAMERA_ELEVATION_RATIO.horizontal)
    this.camera.position.set(
      0,
      (initialDistance * CAMERA_ELEVATION_RATIO.height) / elevationMagnitude,
      (initialDistance * CAMERA_ELEVATION_RATIO.horizontal) / elevationMagnitude,
    )

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = SCENE_UNITS_PER_SQRT_AU * 0.5
    // At least 3x the initial framing distance, so there's always room to
    // zoom out further to the toggleable "other bodies" layer (Eris reaches
    // past 90 AU) regardless of how far the initial framing itself already
    // had to pull back for a narrow viewport.
    this.controls.maxDistance = Math.max(SCENE_UNITS_PER_SQRT_AU * 12, initialDistance * 3)

    this.scene.add(new THREE.AmbientLight(0xffffff, 1))
    this.scene.add(createSun())
    this.scene.add(createAsteroidBelt())

    for (const planet of PLANET_IDS) {
      const mesh = createPlanet(planet)
      if (planet === 'saturn') mesh.add(createSaturnRing())
      this.scene.add(mesh)
      this.planets.set(planet, { mesh })
      this.scene.add(createOrbitRing(this.sampleOrbitRingPoints(planet)))
    }

    for (const moon of MOON_IDS) {
      const mesh = createSolarSystemMoon(moon)
      this.scene.add(mesh)
      this.moons.set(moon, { mesh })
    }

    for (const body of OTHER_BODY_IDS) {
      const mesh = createOtherBody(body)
      mesh.visible = this.otherBodiesVisible
      this.scene.add(mesh)
      this.otherBodies.set(body, { mesh })
    }

    for (const transit of SPACECRAFT_TRANSITS) {
      const marker = createSpacecraftMarker()
      marker.visible = false
      this.scene.add(marker)
      this.spacecraftMarkers.set(transit.id, { transit, marker })
    }

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp)

    this.syncToCurrentDate()

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(container)
  }

  private get aspectRatio(): number {
    return this.container.clientWidth / this.container.clientHeight
  }

  /**
   * The camera distance (straight-line, not axis-aligned) needed to fit
   * `OUTERMOST_PLANET_SCENE_RADIUS` within the *narrower* of the camera's
   * horizontal/vertical fields of view, plus a margin - i.e. "how far back
   * do we need to be so Neptune's orbit isn't clipped off the edge of the
   * screen." A portrait viewport (aspect < 1) has a much narrower horizontal
   * FOV than vertical for the same lens, so it needs a proportionally
   * farther camera to fit the same radius - a fixed distance tuned for a
   * typical wide desktop window left Neptune (and Saturn) clipped off-screen
   * on a phone-sized viewport.
   */
  private initialCameraDistance(): number {
    const verticalHalfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const horizontalHalfFovRad = Math.atan(Math.tan(verticalHalfFovRad) * this.aspectRatio)
    const limitingHalfFovRad = Math.min(verticalHalfFovRad, horizontalHalfFovRad)
    return (OUTERMOST_PLANET_SCENE_RADIUS * CAMERA_FRAMING_MARGIN) / Math.tan(limitingHalfFovRad)
  }

  private handleResize(): void {
    this.camera.aspect = this.aspectRatio
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private sampleOrbitRingPoints(planet: PlanetId): THREE.Vector3[] {
    const periodDays = planetOrbitalPeriodDays(planet)
    const points: THREE.Vector3[] = []
    for (let i = 0; i < ORBIT_RING_SEGMENTS; i++) {
      const date = new Date(this.currentDate.getTime() + (i / ORBIT_RING_SEGMENTS) * periodDays * 86_400_000)
      points.push(auToScene(planetHeliocentricPositionAu(planet, date)))
    }
    return points
  }

  play(): void {
    this.isPlaying = true
  }

  pause(): void {
    this.isPlaying = false
  }

  setSpeedDaysPerSecond(speedDaysPerSecond: number): void {
    this.speedDaysPerSecond = speedDaysPerSecond
  }

  /** Jumps directly to a date (e.g. "sync to now", or a manual date picker). */
  setDate(date: Date): void {
    this.currentDate = date
    this.syncToCurrentDate()
  }

  /** Re-anchors to the current wall-clock moment. */
  syncToNow(): void {
    this.setDate(new Date())
  }

  /** Shows/hides the "other bodies" layer (Pluto, Ceres, Eris, Halley's Comet) - hidden by default. */
  setOtherBodiesVisible(visible: boolean): void {
    this.otherBodiesVisible = visible
    for (const state of this.otherBodies.values()) {
      state.mesh.visible = visible
    }
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

    const visibleMarkers = Array.from(this.spacecraftMarkers.values())
      .filter((state) => state.marker.visible)
      .map((state) => state.marker)

    const hit =
      visibleMarkers.length > 0
        ? (() => {
            const rect = this.renderer.domElement.getBoundingClientRect()
            const ndc = new THREE.Vector2(
              ((event.clientX - rect.left) / rect.width) * 2 - 1,
              -((event.clientY - rect.top) / rect.height) * 2 + 1,
            )
            this.raycaster.setFromCamera(ndc, this.camera)
            return this.raycaster.intersectObjects(visibleMarkers, false)[0]
          })()
        : undefined

    if (!hit) {
      this.clearSelection()
      return
    }
    for (const state of this.spacecraftMarkers.values()) {
      if (state.marker !== hit.object) continue
      if (this.selectedTransitId === state.transit.id) {
        this.clearSelection() // clicking the already-selected marker again dismisses it
        return
      }
      this.selectedTransitId = state.transit.id
      this.onSpacecraftSelect?.(state.transit)
      this.reportSelectedMarkerPosition()
      return
    }
  }

  private reportSelectedMarkerPosition(): void {
    if (!this.selectedTransitId) return
    const state = this.spacecraftMarkers.get(this.selectedTransitId)
    if (!state || !state.marker.visible) {
      this.clearSelection() // the mission's transit window ended since it was selected
      return
    }
    this.onSelectedMarkerPositionUpdate?.(
      projectMarkerToScreen(
        state.marker.position,
        this.camera,
        this.container.clientWidth,
        this.container.clientHeight,
        0, // no central body to be occluded by in this scene
      ),
    )
  }

  /** Dismisses the current spacecraft selection. No-ops if nothing is selected. */
  clearSelection(): void {
    if (!this.selectedTransitId) return
    this.selectedTransitId = null
    this.onSelectionClear?.()
    this.onSelectedMarkerPositionUpdate?.(null)
  }

  /** Repositions every planet/moon/spacecraft marker for `currentDate`, and reports in-transit changes. */
  private syncToCurrentDate(): void {
    for (const [planet, state] of this.planets) {
      state.mesh.position.copy(auToScene(planetHeliocentricPositionAu(planet, this.currentDate)))
    }

    for (const [moon, state] of this.moons) {
      const parentMesh = this.planets.get(moonParent(moon))!.mesh
      // The moon's real orbital *direction* (the axis-remapped unit vector,
      // from its actual Kepler-solved position relative to its parent), but
      // at a hand-picked *display* distance from the parent - see
      // `MOON_DISPLAY_ORBIT_RADII`'s doc comment on why the real AU-scaled
      // distance would render inside the parent planet's own (already
      // not-to-scale) sphere.
      const direction = auToScene(moonPositionRelativeToParentAu(moon, this.currentDate)).normalize()
      state.mesh.position.copy(parentMesh.position).addScaledVector(direction, MOON_DISPLAY_ORBIT_RADII[moon])
    }

    for (const [body, state] of this.otherBodies) {
      state.mesh.position.copy(auToScene(otherBodyHeliocentricPositionAu(body, this.currentDate)))
    }

    const inTransit: SpacecraftTransit[] = []
    for (const state of this.spacecraftMarkers.values()) {
      const visible = isInTransitAt(state.transit, this.currentDate)
      state.marker.visible = visible
      if (visible) {
        state.marker.position.copy(auToScene(idealizedTransitPositionAu(state.transit, this.currentDate)))
        inTransit.push(state.transit)
      }
    }

    const inTransitIds = inTransit
      .map((transit) => transit.id)
      .sort()
      .join(',')
    if (inTransitIds !== this.lastReportedInTransitIds) {
      this.lastReportedInTransitIds = inTransitIds
      this.onInTransitUpdate?.(inTransit)
    }

    this.onTick?.(this.currentDate)
  }

  start(): void {
    const tick = (now: number) => {
      const deltaSeconds = this.lastFrameTime === null ? 0 : (now - this.lastFrameTime) / 1000
      this.lastFrameTime = now

      if (this.isPlaying) {
        this.currentDate = new Date(
          this.currentDate.getTime() + deltaSeconds * this.speedDaysPerSecond * 86_400_000,
        )
        this.syncToCurrentDate()
      }

      this.controls.update()
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
    disposeObject3D(this.scene)
  }
}
