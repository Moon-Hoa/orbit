import * as THREE from 'three'

/** Where a marker projects to in the viewport, and whether the central body blocks the view of it. */
export interface MarkerScreenPosition {
  xPx: number
  yPx: number
  occluded: boolean
}

/**
 * True if the central body's sphere (radius `bodyRadiusSceneUnits`, centered
 * at the scene origin - true of every central body mesh in this app) blocks
 * the line of sight from `cameraPosition` to `markerPosition`. Shrinks the
 * test sphere slightly so a marker sitting exactly on the surface (a ground
 * station or celestial surface-object pin) doesn't self-occlude from
 * floating-point noise.
 */
export function isOccludedBySphere(
  cameraPosition: THREE.Vector3,
  markerPosition: THREE.Vector3,
  bodyRadiusSceneUnits: number,
): boolean {
  const toMarker = markerPosition.clone().sub(cameraPosition)
  const distanceToMarker = toMarker.length()
  if (distanceToMarker === 0) return false

  const ray = new THREE.Ray(cameraPosition, toMarker.normalize())
  const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), bodyRadiusSceneUnits * 0.999)
  const hit = ray.intersectSphere(sphere, new THREE.Vector3())
  if (!hit) return false

  return cameraPosition.distanceTo(hit) < distanceToMarker - 1e-6
}

/**
 * Projects a scene-space marker position to CSS pixel coordinates within a
 * `widthPx` x `heightPx` viewport, plus whether the central body occludes it
 * (see `isOccludedBySphere`) - e.g. a surface pin or orbiter marker that has
 * rotated to the far side of the globe.
 */
export function projectMarkerToScreen(
  markerPosition: THREE.Vector3,
  camera: THREE.Camera,
  widthPx: number,
  heightPx: number,
  bodyRadiusSceneUnits: number,
): MarkerScreenPosition {
  const ndc = markerPosition.clone().project(camera)
  return {
    xPx: (ndc.x * 0.5 + 0.5) * widthPx,
    yPx: (-ndc.y * 0.5 + 0.5) * heightPx,
    occluded: isOccludedBySphere(camera.position, markerPosition, bodyRadiusSceneUnits),
  }
}
