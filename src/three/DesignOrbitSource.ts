import type * as THREE from 'three'
import {
  type GeodeticCoordinates,
  type OrbitalElements,
  type StateVector,
  TWO_PI,
  eciToGeodetic,
  elementsToStateVector,
  orbitalPeriodSeconds,
  propagateToStateVector,
  sampleGroundTrack,
} from '../engine'
import { eciToScene } from './coordinates'
import type { OrbitSource } from './OrbitSource'

/** Points sampled uniformly in true anomaly around one full orbit. */
const PATH_SEGMENTS = 256

/** An orbit driven by user-editable classical elements, via the Phase 1 two-body engine. */
export class DesignOrbitSource implements OrbitSource {
  private readonly elements: OrbitalElements

  constructor(elements: OrbitalElements) {
    this.elements = elements
  }

  getStateAt(simTimeSeconds: number): StateVector {
    return propagateToStateVector(this.elements, simTimeSeconds)
  }

  getGeodeticAt(simTimeSeconds: number): GeodeticCoordinates {
    return eciToGeodetic(this.getStateAt(simTimeSeconds).position, simTimeSeconds)
  }

  getGroundTrack(
    centerSimTimeSeconds: number,
    windowSeconds: number,
    sampleIntervalSeconds: number,
  ): GeodeticCoordinates[] {
    return sampleGroundTrack(
      this.elements,
      centerSimTimeSeconds,
      windowSeconds,
      sampleIntervalSeconds,
    )
  }

  getOrbitPathPoints(): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < PATH_SEGMENTS; i++) {
      const trueAnomalyRad = (i / PATH_SEGMENTS) * TWO_PI
      const state = elementsToStateVector({ ...this.elements, trueAnomalyRad })
      points.push(eciToScene(state.position))
    }
    return points
  }

  getPeriodSeconds(): number {
    return orbitalPeriodSeconds(this.elements.semiMajorAxisKm)
  }
}
