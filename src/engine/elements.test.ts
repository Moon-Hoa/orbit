import { describe, expect, it } from 'vitest'
import { EARTH_MU_KM3_S2, EARTH_RADIUS_KM } from './constants'
import { elementsToStateVector, stateVectorToElements } from './elements'
import type { OrbitalElements, StateVector } from './types'
import { magnitude } from './vector'

const degToRad = (deg: number) => (deg * Math.PI) / 180

describe('elements -> state vector -> elements round trip', () => {
  it('recovers ISS-like (non-degenerate) elements within tolerance', () => {
    const original: OrbitalElements = {
      semiMajorAxisKm: EARTH_RADIUS_KM + 408,
      eccentricity: 0.02,
      inclinationRad: degToRad(51.6),
      raanRad: degToRad(45),
      argOfPerigeeRad: degToRad(30),
      trueAnomalyRad: degToRad(60),
    }

    const state = elementsToStateVector(original)
    const recovered = stateVectorToElements(state)

    expect(recovered.semiMajorAxisKm).toBeCloseTo(original.semiMajorAxisKm, 6)
    expect(recovered.eccentricity).toBeCloseTo(original.eccentricity, 9)
    expect(recovered.inclinationRad).toBeCloseTo(original.inclinationRad, 9)
    expect(recovered.raanRad).toBeCloseTo(original.raanRad, 9)
    expect(recovered.argOfPerigeeRad).toBeCloseTo(original.argOfPerigeeRad, 9)
    expect(recovered.trueAnomalyRad).toBeCloseTo(original.trueAnomalyRad, 9)
  })

  it('recovers a highly eccentric, steeply inclined orbit within tolerance', () => {
    const original: OrbitalElements = {
      semiMajorAxisKm: 24000,
      eccentricity: 0.72,
      inclinationRad: degToRad(63.4),
      raanRad: degToRad(200),
      argOfPerigeeRad: degToRad(270),
      trueAnomalyRad: degToRad(310),
    }

    const recovered = stateVectorToElements(elementsToStateVector(original))

    expect(recovered.semiMajorAxisKm).toBeCloseTo(original.semiMajorAxisKm, 6)
    expect(recovered.eccentricity).toBeCloseTo(original.eccentricity, 9)
    expect(recovered.inclinationRad).toBeCloseTo(original.inclinationRad, 9)
    expect(recovered.raanRad).toBeCloseTo(original.raanRad, 9)
    expect(recovered.argOfPerigeeRad).toBeCloseTo(original.argOfPerigeeRad, 9)
    expect(recovered.trueAnomalyRad).toBeCloseTo(original.trueAnomalyRad, 9)
  })
})

/**
 * Circular and/or equatorial orbits are singular for the classical element set
 * (RAAN and/or argument of perigee are undefined), so elements don't round-trip
 * uniquely there. Instead we check the state vector round-trips through the
 * degenerate elements representation, which is always well-defined.
 */
function expectStateRoundTrips(state: StateVector) {
  const recovered = elementsToStateVector(stateVectorToElements(state))
  expect(recovered.position.x).toBeCloseTo(state.position.x, 6)
  expect(recovered.position.y).toBeCloseTo(state.position.y, 6)
  expect(recovered.position.z).toBeCloseTo(state.position.z, 6)
  expect(recovered.velocity.x).toBeCloseTo(state.velocity.x, 9)
  expect(recovered.velocity.y).toBeCloseTo(state.velocity.y, 9)
  expect(recovered.velocity.z).toBeCloseTo(state.velocity.z, 9)
}

describe('state vector round trip through singular element sets', () => {
  it('handles a circular equatorial (GEO-like) orbit', () => {
    expectStateRoundTrips(
      elementsToStateVector({
        semiMajorAxisKm: 42164,
        eccentricity: 0,
        inclinationRad: 0,
        raanRad: 0,
        argOfPerigeeRad: 0,
        trueAnomalyRad: degToRad(123),
      }),
    )
  })

  it('handles a circular inclined orbit', () => {
    expectStateRoundTrips(
      elementsToStateVector({
        semiMajorAxisKm: EARTH_RADIUS_KM + 700,
        eccentricity: 0,
        inclinationRad: degToRad(97.8),
        raanRad: degToRad(10),
        argOfPerigeeRad: 0,
        trueAnomalyRad: degToRad(200),
      }),
    )
  })

  it('handles an eccentric equatorial orbit', () => {
    expectStateRoundTrips(
      elementsToStateVector({
        semiMajorAxisKm: 26600,
        eccentricity: 0.3,
        inclinationRad: 0,
        raanRad: 0,
        argOfPerigeeRad: degToRad(80),
        trueAnomalyRad: degToRad(15),
      }),
    )
  })
})

describe('elementsToStateVector sanity checks', () => {
  it('places a circular orbit at radius = a with speed = sqrt(mu/a)', () => {
    const a = EARTH_RADIUS_KM + 500
    const state = elementsToStateVector({
      semiMajorAxisKm: a,
      eccentricity: 0,
      inclinationRad: degToRad(28.5),
      raanRad: degToRad(15),
      argOfPerigeeRad: 0,
      trueAnomalyRad: degToRad(50),
    })

    expect(magnitude(state.position)).toBeCloseTo(a, 6)
    expect(magnitude(state.velocity)).toBeCloseTo(Math.sqrt(EARTH_MU_KM3_S2 / a), 9)
  })
})
