import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PLANET_IDS, type PlanetId, planetHeliocentricPositionAu, planetOrbitalPeriodDays } from '../engine'
import {
  SPACECRAFT_TRANSITS,
  idealizedTransitPositionAu,
  isInTransitAt,
  type SpacecraftTransit,
} from '../solarSystem'
import { auToScene } from './auToScene'
import { createOrbitRing } from './createOrbitRing'
import { createPlanet } from './createPlanet'
import { createSpacecraftMarker } from './createSpacecraftMarker'
import { createSun } from './createSun'
import { disposeObject3D } from './disposeObject3D'
import { type MarkerScreenPosition, projectMarkerToScreen } from './markerScreenPosition'
import { AU_TO_SCENE_UNITS } from './solarSystemConstants'

/** How many points trace each planet's orbit ring. */
const ORBIT_RING_SEGMENTS = 128
/** How far the pointer can move between down/up and still count as a click (not a camera drag), in CSS pixels - same threshold `OrbitScene` uses. */
const CLICK_MOVEMENT_THRESHOLD_PX = 5

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
    this.camera.position.set(0, AU_TO_SCENE_UNITS * 1.1, AU_TO_SCENE_UNITS * 1.6)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = AU_TO_SCENE_UNITS * 0.3
    this.controls.maxDistance = AU_TO_SCENE_UNITS * 4

    this.scene.add(new THREE.AmbientLight(0xffffff, 1))
    this.scene.add(createSun())

    for (const planet of PLANET_IDS) {
      const mesh = createPlanet(planet)
      this.scene.add(mesh)
      this.planets.set(planet, { mesh })
      this.scene.add(createOrbitRing(this.sampleOrbitRingPoints(planet)))
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

  /** Repositions every planet/spacecraft marker for `currentDate`, and reports in-transit changes. */
  private syncToCurrentDate(): void {
    for (const [planet, state] of this.planets) {
      state.mesh.position.copy(auToScene(planetHeliocentricPositionAu(planet, this.currentDate)))
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
