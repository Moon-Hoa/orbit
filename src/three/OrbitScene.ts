import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { type OrbitalElements, orbitalPeriodSeconds, propagateToStateVector } from '../engine'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'
import { eciToScene } from './coordinates'
import { createEarth } from './createEarth'
import { createOrbitPath } from './createOrbitPath'
import { createSatelliteMarker } from './createSatelliteMarker'
import { disposeObject3D } from './disposeObject3D'

export interface OrbitSceneOptions {
  initialElements: OrbitalElements
  /** Called every animation frame with elapsed sim time, wrapped to [0, orbital period). */
  onTick?: (simTimeSeconds: number) => void
}

/**
 * Owns the Three.js scene, camera, renderer, controls, and render loop.
 * Deliberately kept free of React so the render loop stays under direct
 * control; the React side only mounts/unmounts an instance and calls its
 * imperative methods (setElements/play/pause/seek/...).
 */
export class OrbitScene {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private readonly satelliteMarker: THREE.Mesh
  private readonly onTick?: (simTimeSeconds: number) => void

  private orbitPath: THREE.Mesh
  private elements: OrbitalElements
  private simTimeSeconds = 0
  private isPlaying = false
  private speedMultiplier = 60
  private animationFrameId: number | null = null
  private lastFrameTime: number | null = null

  constructor(container: HTMLElement, options: OrbitSceneOptions) {
    this.container = container
    this.elements = options.initialElements
    this.onTick = options.onTick
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(50, this.aspectRatio, 0.1, 1000)
    this.camera.position.set(0, EARTH_RADIUS_SCENE_UNITS * 2, EARTH_RADIUS_SCENE_UNITS * 5)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = EARTH_RADIUS_SCENE_UNITS * 1.2
    this.controls.maxDistance = EARTH_RADIUS_SCENE_UNITS * 15

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.position.set(5, 3, 5)
    this.scene.add(sun)

    this.scene.add(createEarth())

    this.orbitPath = createOrbitPath(this.elements)
    this.scene.add(this.orbitPath)

    this.satelliteMarker = createSatelliteMarker()
    this.scene.add(this.satelliteMarker)
    this.updateSatellitePosition()

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

  private updateSatellitePosition(): void {
    const state = propagateToStateVector(this.elements, this.simTimeSeconds)
    this.satelliteMarker.position.copy(eciToScene(state.position))
  }

  private reportTick(): void {
    const period = orbitalPeriodSeconds(this.elements.semiMajorAxisKm)
    const wrapped = ((this.simTimeSeconds % period) + period) % period
    this.onTick?.(wrapped)
  }

  /** Replaces the current orbital elements, rebuilding the path and repositioning the satellite. */
  setElements(elements: OrbitalElements): void {
    this.elements = elements

    this.scene.remove(this.orbitPath)
    disposeObject3D(this.orbitPath)
    this.orbitPath = createOrbitPath(elements)
    this.scene.add(this.orbitPath)

    this.updateSatellitePosition()
    this.reportTick()
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

  /** Seeks to a given elapsed sim time (seconds since epoch) and repositions the satellite. */
  seek(simTimeSeconds: number): void {
    this.simTimeSeconds = simTimeSeconds
    this.updateSatellitePosition()
    this.reportTick()
  }

  start(): void {
    const tick = (now: number) => {
      const deltaSeconds = this.lastFrameTime === null ? 0 : (now - this.lastFrameTime) / 1000
      this.lastFrameTime = now

      if (this.isPlaying) {
        this.simTimeSeconds += deltaSeconds * this.speedMultiplier
        this.updateSatellitePosition()
        this.reportTick()
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
