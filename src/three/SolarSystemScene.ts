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
  PLANET_SCENE_RADII,
  SCENE_UNITS_PER_SQRT_AU,
  SUN_SCENE_RADIUS,
} from './solarSystemConstants'

/** How many points trace each planet's orbit ring. */
const ORBIT_RING_SEGMENTS = 128
/** How far the pointer can move between down/up and still count as a click (not a camera drag), in CSS pixels - same threshold `OrbitScene` uses. */
const CLICK_MOVEMENT_THRESHOLD_PX = 5

/** The default camera's elevation angle above the ecliptic plane, as a (height, horizontal-distance) ratio - purely a pleasant viewing angle, unrelated to any real inclination. */
const CAMERA_ELEVATION_RATIO = { height: 6, horizontal: 9 }
/** Extra headroom past the tightest fit, so planets don't sit flush against the viewport edge. */
const CAMERA_FRAMING_MARGIN = 1.15

/**
 * A focused planet's camera distance, as a multiple of that planet's own
 * rendered radius - exported so `SolarSystemScene.test.ts` can assert every
 * planet's resulting distance clears `FOCUS_CAMERA_MIN_DISTANCE` below
 * (if it didn't, `OrbitControls`' own distance clamp would silently override
 * the framing on `controls.update()`, undoing the whole feature for that
 * planet). 8x comfortably shows the planet - and, for Saturn, its full ring
 * (out to 2.3x its radius) - without feeling either cramped or too distant.
 */
export const PLANET_FOCUS_DISTANCE_MULTIPLIER = 8

/**
 * The camera's minimum allowed distance from whatever `controls.target`
 * currently is - lower than the whole-system view's own default zoom limit
 * would suggest, specifically so the smallest planet's (Mercury's) focus
 * distance isn't clamped back out by `OrbitControls` the moment it's
 * reached. Still comfortably clear of the Sun's own rendered radius for the
 * un-focused, target-at-the-origin case.
 */
export const FOCUS_CAMERA_MIN_DISTANCE = SUN_SCENE_RADIUS + 0.5

/** How long a focus/reset camera transition takes to settle, ms. */
const CAMERA_TRANSITION_DURATION_MS = 450

/** Ease-out cubic - starts fast, settles gently, rather than a linear or hard-cut camera move. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

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
  /** Called whenever the focused planet changes (including to `null`, e.g. on reset or drag-cancel). */
  onFocusChange?: (planet: PlanetId | null) => void
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
  private readonly onFocusChange?: (planet: PlanetId | null) => void

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

  private focusedPlanet: PlanetId | null = null
  /** The unit vector from target to camera, captured once when a focus (or reset) begins, and preserved throughout - see `desiredFocusState`'s doc comment. */
  private focusDirection: THREE.Vector3 | null = null
  private cameraTransition: {
    fromCameraPosition: THREE.Vector3
    fromTarget: THREE.Vector3
    startTime: number
  } | null = null

  constructor(container: HTMLElement, options: SolarSystemSceneOptions = {}) {
    this.container = container
    this.currentDate = options.initialDate ?? new Date()
    this.onTick = options.onTick
    this.onInTransitUpdate = options.onInTransitUpdate
    this.onSpacecraftSelect = options.onSpacecraftSelect
    this.onSelectionClear = options.onSelectionClear
    this.onSelectedMarkerPositionUpdate = options.onSelectedMarkerPositionUpdate
    this.onFocusChange = options.onFocusChange

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(50, this.aspectRatio, 0.1, 5000)
    // Framed to comfortably show all 8 planets out to Neptune's orbit by
    // default - see `desiredOverviewState`'s doc comment.
    const overview = this.desiredOverviewState()
    this.camera.position.copy(overview.cameraPosition)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = FOCUS_CAMERA_MIN_DISTANCE
    // At least 3x the initial framing distance, so there's always room to
    // zoom out further to the toggleable "other bodies" layer (Eris reaches
    // past 90 AU) regardless of how far the initial framing itself already
    // had to pull back for a narrow viewport.
    this.controls.maxDistance = Math.max(SCENE_UNITS_PER_SQRT_AU * 12, this.initialCameraDistance() * 3)

    this.scene.add(new THREE.AmbientLight(0xffffff, 1))
    this.scene.add(createSun())
    this.scene.add(createAsteroidBelt())

    for (const planet of PLANET_IDS) {
      const mesh = createPlanet(planet)
      if (planet === 'saturn') mesh.add(createSaturnRing(PLANET_SCENE_RADII.saturn))
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
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove)
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

  /**
   * The whole-system overview camera/target pair - the Sun at the origin,
   * framed at `initialCameraDistance()` along `CAMERA_ELEVATION_RATIO`'s
   * fixed viewing angle. Shared between construction and `resetView()`,
   * recomputed fresh each call rather than cached, since the right distance
   * depends on the current viewport aspect ratio (which can change via
   * resize between the two).
   */
  private desiredOverviewState(): { target: THREE.Vector3; cameraPosition: THREE.Vector3 } {
    const distance = this.initialCameraDistance()
    const elevationMagnitude = Math.hypot(CAMERA_ELEVATION_RATIO.height, CAMERA_ELEVATION_RATIO.horizontal)
    const cameraPosition = new THREE.Vector3(
      0,
      (distance * CAMERA_ELEVATION_RATIO.height) / elevationMagnitude,
      (distance * CAMERA_ELEVATION_RATIO.horizontal) / elevationMagnitude,
    )
    return { target: new THREE.Vector3(0, 0, 0), cameraPosition }
  }

  /**
   * The focused camera/target pair for `planet`: its current scene position,
   * viewed from `PLANET_FOCUS_DISTANCE_MULTIPLIER` times its own rendered
   * radius away, along `direction` (a unit vector, preserved from whatever
   * angle the camera happened to be viewing from when the focus began,
   * rather than snapping to some unrelated canonical angle - see
   * `focusOnPlanet`). Recomputed fresh from the planet's *current* position
   * every time this is called, so it stays correct through an in-progress
   * transition or while the sim is playing and the planet keeps moving.
   */
  private desiredFocusState(
    planet: PlanetId,
    direction: THREE.Vector3,
  ): { target: THREE.Vector3; cameraPosition: THREE.Vector3 } {
    const target = this.planets.get(planet)!.mesh.position.clone()
    const distance = PLANET_SCENE_RADII[planet] * PLANET_FOCUS_DISTANCE_MULTIPLIER
    const cameraPosition = target.clone().addScaledVector(direction, distance)
    return { target, cameraPosition }
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

  /**
   * Smoothly recenters/reframes the camera on `planet`, then keeps it
   * centered as the planet moves (following it through both real-time
   * playback and date jumps - see `syncToCurrentDate`) until the user either
   * drags the camera themselves (see `handlePointerMove`) or calls
   * `resetView`. Clicking the already-focused planet again is handled by
   * the caller as a toggle back to the overview (mirroring the spacecraft
   * marker's "click again to dismiss" pattern) - this method itself always
   * (re-)focuses.
   */
  focusOnPlanet(planet: PlanetId): void {
    // Preserve whatever angle the camera is currently viewing from, rather
    // than snapping to some unrelated canonical angle - focusing should feel
    // like "zoom into where I'm already looking," not a jump-cut.
    this.focusDirection = this.camera.position.clone().sub(this.controls.target).normalize()
    this.focusedPlanet = planet
    this.beginCameraTransition()
    this.onFocusChange?.(planet)
  }

  /** Smoothly returns to the whole-system overview framing. No-ops harmlessly if already there. */
  resetView(): void {
    this.focusedPlanet = null
    this.focusDirection = null
    this.beginCameraTransition()
    this.onFocusChange?.(null)
  }

  private beginCameraTransition(): void {
    this.cameraTransition = {
      fromCameraPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      startTime: performance.now(),
    }
  }

  /** Advances the in-progress camera transition (if any) by one frame - called unconditionally every render frame, independent of sim playback state, since it runs in real wall-clock time. */
  private stepCameraTransition(): void {
    if (!this.cameraTransition) return

    const elapsedMs = performance.now() - this.cameraTransition.startTime
    const t = Math.min(elapsedMs / CAMERA_TRANSITION_DURATION_MS, 1)
    const eased = easeOutCubic(t)

    const desired =
      this.focusedPlanet && this.focusDirection
        ? this.desiredFocusState(this.focusedPlanet, this.focusDirection)
        : this.desiredOverviewState()

    this.camera.position.lerpVectors(this.cameraTransition.fromCameraPosition, desired.cameraPosition, eased)
    this.controls.target.lerpVectors(this.cameraTransition.fromTarget, desired.target, eased)

    if (t >= 1) this.cameraTransition = null
  }

  /**
   * While focused, keeps the camera's pivot glued to the moving planet:
   * translates both the camera and the orbit-controls target by however far
   * the planet moved since the last sync, preserving whatever relative
   * zoom/angle currently applies (whether that's the just-eased-into default
   * framing, or wherever the user has since manually zoomed to). Skipped
   * while a transition is actively animating, since that already recomputes
   * the live target/camera position itself each step (see
   * `stepCameraTransition`) - applying both would double up.
   */
  private followFocusedPlanet(): void {
    if (!this.focusedPlanet || this.cameraTransition) return
    const newTargetPosition = this.planets.get(this.focusedPlanet)!.mesh.position
    const delta = newTargetPosition.clone().sub(this.controls.target)
    this.camera.position.add(delta)
    this.controls.target.copy(newTargetPosition)
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownPosition = { x: event.clientX, y: event.clientY }
  }

  /**
   * Cancels any active focus/follow (and any in-progress transition) the
   * moment a drag exceeds the click threshold, in real time as the user
   * drags - not just after the fact at pointerup - so a manual drag never
   * fights the automatic follow/transition logic mid-gesture (both would
   * otherwise be repositioning the camera in the same frame).
   */
  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointerDownPosition) return
    if (this.focusedPlanet === null && this.cameraTransition === null) return
    const movedPx = Math.hypot(
      event.clientX - this.pointerDownPosition.x,
      event.clientY - this.pointerDownPosition.y,
    )
    if (movedPx <= CLICK_MOVEMENT_THRESHOLD_PX) return
    this.focusedPlanet = null
    this.focusDirection = null
    this.cameraTransition = null
    this.onFocusChange?.(null)
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
    const planetMeshes = Array.from(this.planets.values()).map((state) => state.mesh)
    const intersectable = [...visibleMarkers, ...planetMeshes]

    const hit =
      intersectable.length > 0
        ? (() => {
            const rect = this.renderer.domElement.getBoundingClientRect()
            const ndc = new THREE.Vector2(
              ((event.clientX - rect.left) / rect.width) * 2 - 1,
              -((event.clientY - rect.top) / rect.height) * 2 + 1,
            )
            this.raycaster.setFromCamera(ndc, this.camera)
            return this.raycaster.intersectObjects(intersectable, false)[0]
          })()
        : undefined

    if (!hit) {
      this.clearSelection()
      if (this.focusedPlanet) this.resetView() // clicking empty space also returns to the overview
      return
    }

    for (const [planet, state] of this.planets) {
      if (state.mesh !== hit.object) continue
      if (this.focusedPlanet === planet) {
        this.resetView() // clicking the already-focused planet again dismisses it
      } else {
        this.focusOnPlanet(planet)
      }
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

    this.followFocusedPlanet()

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

      // Runs in real wall-clock time regardless of sim playback state, so a
      // focus/reset transition still animates smoothly even while paused.
      this.stepCameraTransition()

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
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
    disposeObject3D(this.scene)
  }
}
