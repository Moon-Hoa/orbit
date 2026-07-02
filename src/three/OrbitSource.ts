import type * as THREE from 'three'
import type { GeodeticCoordinates, StateVector } from '../engine'

/**
 * Abstracts "where is the satellite / what does its path look like" so
 * OrbitScene can drive either a designed two-body orbit or a real satellite
 * (SGP4) without caring which. `simTimeSeconds` means "elapsed seconds since
 * the scene's reference instant" in both cases - each source interprets it
 * however makes sense internally (a real satellite adds it to a real
 * calendar date; a designed orbit just treats it as time-since-epoch).
 */
export interface OrbitSource {
  getStateAt(simTimeSeconds: number): StateVector
  getGeodeticAt(simTimeSeconds: number): GeodeticCoordinates
  getGroundTrack(
    centerSimTimeSeconds: number,
    windowSeconds: number,
    sampleIntervalSeconds: number,
  ): GeodeticCoordinates[]
  /** Scene-space points tracing one full orbit, for the 3D path line. */
  getOrbitPathPoints(): THREE.Vector3[]
  getPeriodSeconds(): number
}
