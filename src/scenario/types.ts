import type { CentralBodyId, OrbitalElements, Vector3 } from '../engine'

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
      /** Which body the scene is centered on. Defaults to Earth when absent from an older shared URL. */
      centralBody: CentralBodyId
      camera?: CameraState
    }
  | {
      mode: 'track-real'
      noradId: string
      speedMultiplier: number
      /** Always 'earth': real-satellite tracking is Earth-only (see the Moon/Mars view issues). */
      centralBody: CentralBodyId
      camera?: CameraState
    }
