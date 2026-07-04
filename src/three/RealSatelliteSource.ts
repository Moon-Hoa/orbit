import type * as THREE from 'three'
import type { GeodeticCoordinates, StateVector } from '../engine'
import {
  type TleRecord,
  orbitalPeriodSecondsFromTle,
  propagateTle,
  sampleRealGroundTrack,
  sampleRealOrbitEci,
  tleToGeodetic,
} from '../satellite'
import { eciToScene } from './coordinates'
import type { OrbitSource } from './OrbitSource'

/**
 * A real satellite, propagated via SGP4/SDP4 (satellite.js) from its TLE.
 * `simTimeSeconds` is interpreted as an offset from `referenceDate`
 * (established once when the scene is created), so the same
 * play/pause/speed/scrub machinery in OrbitScene works unchanged regardless
 * of which source is active.
 */
export class RealSatelliteSource implements OrbitSource {
  private readonly tle: TleRecord
  private readonly referenceDate: Date

  constructor(tle: TleRecord, referenceDate: Date) {
    this.tle = tle
    this.referenceDate = referenceDate
  }

  private dateAt(simTimeSeconds: number): Date {
    return new Date(this.referenceDate.getTime() + simTimeSeconds * 1000)
  }

  getStateAt(simTimeSeconds: number): StateVector {
    return propagateTle(this.tle, this.dateAt(simTimeSeconds))
  }

  getGeodeticAt(simTimeSeconds: number): GeodeticCoordinates {
    return tleToGeodetic(this.tle, this.dateAt(simTimeSeconds))
  }

  getGroundTrack(
    centerSimTimeSeconds: number,
    windowSeconds: number,
    sampleIntervalSeconds: number,
  ): GeodeticCoordinates[] {
    return sampleRealGroundTrack(
      this.tle,
      this.dateAt(centerSimTimeSeconds),
      windowSeconds,
      sampleIntervalSeconds,
    )
  }

  getOrbitPathPoints(): THREE.Vector3[] {
    const eciPoints = sampleRealOrbitEci(this.tle, this.referenceDate, this.getPeriodSeconds())
    return eciPoints.map(eciToScene)
  }

  getPeriodSeconds(): number {
    return orbitalPeriodSecondsFromTle(this.tle, this.referenceDate)
  }

  getCurrentDate(simTimeSeconds: number): Date {
    return this.dateAt(simTimeSeconds)
  }

  reanchorTo(date: Date): RealSatelliteSource {
    return new RealSatelliteSource(this.tle, date)
  }
}
