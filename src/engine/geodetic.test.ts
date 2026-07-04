import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM, SIDEREAL_DAY_S } from './constants'
import { ecefToGeodetic, eciToEcef, eciToGeodetic, geodeticToEcefDirection } from './geodetic'

describe('eciToEcef', () => {
  it('is the identity at simTimeSeconds = 0 (frames aligned at epoch)', () => {
    const position = { x: 1000, y: 2000, z: 3000 }
    const ecef = eciToEcef(position, 0)
    expect(ecef.x).toBeCloseTo(position.x, 9)
    expect(ecef.y).toBeCloseTo(position.y, 9)
    expect(ecef.z).toBeCloseTo(position.z, 9)
  })

  it('preserves the radius (rotation only, no scaling)', () => {
    const position = { x: 4321, y: -1234, z: 5678 }
    const ecef = eciToEcef(position, 12345)
    const rEci = Math.hypot(position.x, position.y, position.z)
    const rEcef = Math.hypot(ecef.x, ecef.y, ecef.z)
    expect(rEcef).toBeCloseTo(rEci, 9)
  })

  it('rotates a point on the equator westward (in ECEF) as time advances', () => {
    // A point fixed in inertial space appears to drift west in the
    // Earth-fixed frame as Earth spins east underneath it.
    const position = { x: EARTH_RADIUS_KM, y: 0, z: 0 }
    const ecef = eciToEcef(position, SIDEREAL_DAY_S / 4)
    // A quarter sidereal day later, Earth has rotated 90 degrees east, so the
    // inertially-fixed point should now sit on the ECEF -Y axis.
    expect(ecef.x).toBeCloseTo(0, 6)
    expect(ecef.y).toBeCloseTo(-EARTH_RADIUS_KM, 6)
  })

  it('returns to the identity after one full sidereal day', () => {
    const position = { x: 1000, y: -2000, z: 500 }
    const ecef = eciToEcef(position, SIDEREAL_DAY_S)
    expect(ecef.x).toBeCloseTo(position.x, 6)
    expect(ecef.y).toBeCloseTo(position.y, 6)
  })
})

describe('ecefToGeodetic', () => {
  it('places an equatorial point at latitude 0', () => {
    const geo = ecefToGeodetic({ x: EARTH_RADIUS_KM + 400, y: 0, z: 0 })
    expect(geo.latitudeRad).toBeCloseTo(0, 9)
    expect(geo.longitudeRad).toBeCloseTo(0, 9)
    expect(geo.altitudeKm).toBeCloseTo(400, 6)
  })

  it('places a point on the spin axis at the poles', () => {
    const northPole = ecefToGeodetic({ x: 0, y: 0, z: EARTH_RADIUS_KM + 500 })
    expect(northPole.latitudeRad).toBeCloseTo(Math.PI / 2, 9)

    const southPole = ecefToGeodetic({ x: 0, y: 0, z: -(EARTH_RADIUS_KM + 500) })
    expect(southPole.latitudeRad).toBeCloseTo(-Math.PI / 2, 9)
  })

  it('computes longitude via atan2 (quadrant-correct)', () => {
    const geo = ecefToGeodetic({ x: 0, y: EARTH_RADIUS_KM, z: 0 })
    expect(geo.longitudeRad).toBeCloseTo(Math.PI / 2, 9)
  })
})

describe('eciToGeodetic', () => {
  it('matches ecefToGeodetic(eciToEcef(...)) composition', () => {
    const position = { x: 5000, y: 3000, z: 2000 }
    const simTimeSeconds = 4321
    const direct = eciToGeodetic(position, simTimeSeconds)
    const composed = ecefToGeodetic(eciToEcef(position, simTimeSeconds))
    expect(direct).toEqual(composed)
  })

  it('a geostationary-radius point tracks the same longitude as Earth rotates under it', () => {
    // In ECI, a point held fixed relative to the stars will, in the ECEF
    // frame, appear to sweep through all longitudes as Earth rotates.
    const position = { x: EARTH_RADIUS_KM + 35786, y: 0, z: 0 }
    const quarterDay = eciToGeodetic(position, SIDEREAL_DAY_S / 4)
    expect(quarterDay.longitudeRad).toBeCloseTo(-Math.PI / 2, 6)
  })

  it('reports altitude independent of Earth rotation', () => {
    const position = { x: 6000, y: 4000, z: 1000 }
    const t0 = eciToGeodetic(position, 0)
    const t1 = eciToGeodetic(position, 9999)
    expect(t1.altitudeKm).toBeCloseTo(t0.altitudeKm, 9)
  })

  it('wraps rotation angle correctly for large sim times (multiple sidereal days)', () => {
    const position = { x: EARTH_RADIUS_KM, y: 0, z: 0 }
    const oneDay = eciToGeodetic(position, SIDEREAL_DAY_S / 4)
    const manyDaysLater = eciToGeodetic(position, SIDEREAL_DAY_S / 4 + 10 * SIDEREAL_DAY_S)
    expect(manyDaysLater.longitudeRad).toBeCloseTo(oneDay.longitudeRad, 6)
  })
})

describe('geodeticToEcefDirection', () => {
  it('places the equator/prime-meridian point on the +X axis', () => {
    const direction = geodeticToEcefDirection({ latitudeRad: 0, longitudeRad: 0, altitudeKm: 0 })
    expect(direction.x).toBeCloseTo(1, 9)
    expect(direction.y).toBeCloseTo(0, 9)
    expect(direction.z).toBeCloseTo(0, 9)
  })

  it('places the north pole on +Z, independent of longitude', () => {
    const direction = geodeticToEcefDirection({
      latitudeRad: Math.PI / 2,
      longitudeRad: 1.23,
      altitudeKm: 0,
    })
    expect(direction.x).toBeCloseTo(0, 9)
    expect(direction.y).toBeCloseTo(0, 9)
    expect(direction.z).toBeCloseTo(1, 9)
  })

  it('always returns a unit vector', () => {
    const direction = geodeticToEcefDirection({
      latitudeRad: 0.4,
      longitudeRad: -2.1,
      altitudeKm: 12345,
    })
    const length = Math.hypot(direction.x, direction.y, direction.z)
    expect(length).toBeCloseTo(1, 9)
  })

  it('round-trips through ecefToGeodetic', () => {
    const original = { latitudeRad: 0.5, longitudeRad: -1.1, altitudeKm: 0 }
    const roundTripped = ecefToGeodetic(geodeticToEcefDirection(original))
    expect(roundTripped.latitudeRad).toBeCloseTo(original.latitudeRad, 9)
    expect(roundTripped.longitudeRad).toBeCloseTo(original.longitudeRad, 9)
  })
})
