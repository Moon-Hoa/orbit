import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { OrbitalElements } from '../engine'
import { EARTH_RADIUS_SCENE_UNITS } from './constants'
import { createEarth } from './createEarth'
import { createOrbitPath } from './createOrbitPath'

/**
 * Owns the Three.js scene, camera, renderer, controls, and render loop.
 * Deliberately kept free of React so the render loop stays under direct
 * control; the React side only mounts/unmounts an instance of this class.
 */
export class OrbitScene {
  private readonly container: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private animationFrameId: number | null = null

  constructor(container: HTMLElement, orbitElements: OrbitalElements) {
    this.container = container
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.aspectRatio,
      0.1,
      1000,
    )
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
    this.scene.add(createOrbitPath(orbitElements))

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

  start(): void {
    const tick = () => {
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.animationFrameId = requestAnimationFrame(tick)
    }
    tick()
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          material.map?.dispose()
          material.dispose()
        }
      }
    })
  }
}
