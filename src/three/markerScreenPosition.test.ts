import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { isOccludedBySphere, projectMarkerToScreen } from './markerScreenPosition'

describe('isOccludedBySphere', () => {
  const bodyRadius = 2

  it('is not occluded when nothing sits between the camera and the marker', () => {
    const camera = new THREE.Vector3(0, 0, 10)
    const marker = new THREE.Vector3(0, 0, bodyRadius) // front-facing surface point
    expect(isOccludedBySphere(camera, marker, bodyRadius)).toBe(false)
  })

  it('is occluded when the marker is on the far side of the body', () => {
    const camera = new THREE.Vector3(0, 0, 10)
    const marker = new THREE.Vector3(0, 0, -bodyRadius) // back-facing surface point
    expect(isOccludedBySphere(camera, marker, bodyRadius)).toBe(true)
  })

  it('is not occluded for an orbiter positioned in front of the body, further out', () => {
    const camera = new THREE.Vector3(0, 0, 10)
    const marker = new THREE.Vector3(0, 0, bodyRadius * 3)
    expect(isOccludedBySphere(camera, marker, bodyRadius)).toBe(false)
  })

  it('is occluded for an orbiter positioned behind the body from the camera', () => {
    const camera = new THREE.Vector3(0, 0, 10)
    const marker = new THREE.Vector3(0, 0, -bodyRadius * 3)
    expect(isOccludedBySphere(camera, marker, bodyRadius)).toBe(true)
  })

  it('is not occluded when the camera and marker coincide (degenerate case)', () => {
    const point = new THREE.Vector3(1, 2, 3)
    expect(isOccludedBySphere(point, point.clone(), bodyRadius)).toBe(false)
  })
})

describe('projectMarkerToScreen', () => {
  it('projects a marker directly ahead (a front-facing surface point) to the center of the viewport', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()

    const result = projectMarkerToScreen(new THREE.Vector3(0, 0, 2), camera, 800, 600, 2)
    expect(result.xPx).toBeCloseTo(400, 5)
    expect(result.yPx).toBeCloseTo(300, 5)
    expect(result.occluded).toBe(false)
  })

  it('projects a marker offset to the right/top of center to the corresponding screen quadrant', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()

    const result = projectMarkerToScreen(new THREE.Vector3(1, 1, 0), camera, 800, 600, 2)
    expect(result.xPx).toBeGreaterThan(400)
    expect(result.yPx).toBeLessThan(300) // +Y in scene space is "up", which is a smaller pixel-y (screen space is top-down)
  })

  it('reports occluded when the marker is behind the central body', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()

    const result = projectMarkerToScreen(new THREE.Vector3(0, 0, -2), camera, 800, 600, 2)
    expect(result.occluded).toBe(true)
  })
})
