import type * as THREE from 'three'
import {
  EARTH_MU_KM3_S2,
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

/**
 * An orbit driven by user-editable classical elements, via the Phase 1
 * two-body engine. `enableJ2` optionally layers in the J2 secular
 * RAAN/argument-of-perigee drift (see `engine/j2.ts`) - off by default, which
 * keeps output identical to plain two-body propagation. `mu` is the central
 * body's gravitational parameter (defaults to Earth's) - it only affects
 * time-dependent quantities (period, mean motion, velocity); the drawn orbit
 * path shape is a pure function of the elements themselves.
 */
export class DesignOrbitSource implements OrbitSource {
  private readonly elements: OrbitalElements
  private readonly enableJ2: boolean
  private readonly mu: number

  constructor(elements: OrbitalElements, enableJ2 = false, mu: number = EARTH_MU_KM3_S2) {
    this.elements = elements
    this.enableJ2 = enableJ2
    this.mu = mu
  }

  getStateAt(simTimeSeconds: number): StateVector {
    return propagateToStateVector(this.elements, simTimeSeconds, this.mu, this.enableJ2)
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
      this.mu,
      this.enableJ2,
    )
  }

  getOrbitPathPoints(): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < PATH_SEGMENTS; i++) {
      const trueAnomalyRad = (i / PATH_SEGMENTS) * TWO_PI
      const state = elementsToStateVector({ ...this.elements, trueAnomalyRad }, this.mu)
      points.push(eciToScene(state.position))
    }
    return points
  }

  getPeriodSeconds(): number {
    return orbitalPeriodSeconds(this.elements.semiMajorAxisKm, this.mu)
  }

  /** The underlying elements, e.g. so a caller can rebuild an equivalent source with a different `mu`. */
  getElements(): OrbitalElements {
    return this.elements
  }

  getEnableJ2(): boolean {
    return this.enableJ2
  }
}
