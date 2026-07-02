import type { OrbitalElements, Vector3 } from '../engine'

/** Camera position and orbit-controls look-at target, both in scene units. */
export interface CameraState {
  position: Vector3
  target: Vector3
}

/** Everything needed to reproduce a viewer session from a URL. */
export type Scenario =
  | {
      mode: 'design'
      elements: OrbitalElements
      speedMultiplier: number
      camera?: CameraState
    }
  | {
      mode: 'track-real'
      noradId: string
      speedMultiplier: number
      camera?: CameraState
    }
