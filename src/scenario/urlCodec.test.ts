import { describe, expect, it } from 'vitest'
import type { OrbitalElements } from '../engine'
import type { CameraState, Scenario } from './types'
import { decodeScenario, encodeScenario } from './urlCodec'

const degToRad = (deg: number) => (deg * Math.PI) / 180

const issElements: OrbitalElements = {
  semiMajorAxisKm: 6786.137,
  eccentricity: 0.0007,
  inclinationRad: degToRad(51.6),
  raanRad: degToRad(45),
  argOfPerigeeRad: degToRad(30),
  trueAnomalyRad: degToRad(12.5),
}

const camera: CameraState = {
  position: { x: 4.123456, y: -2.5, z: 10 },
  target: { x: 0, y: 0.1, z: 0 },
}

describe('encodeScenario / decodeScenario round trip', () => {
  it('round-trips a design scenario without camera state', () => {
    const scenario: Scenario = {
      mode: 'design',
      elements: issElements,
      speedMultiplier: 60,
      centralBody: 'earth',
    }
    const decoded = decodeScenario(encodeScenario(scenario))

    expect(decoded?.mode).toBe('design')
    if (decoded?.mode !== 'design') throw new Error('expected design mode')
    expect(decoded.speedMultiplier).toBe(60)
    expect(decoded.centralBody).toBe('earth')
    expect(decoded.camera).toBeUndefined()
    expect(decoded.elements.semiMajorAxisKm).toBeCloseTo(issElements.semiMajorAxisKm, 5)
    expect(decoded.elements.eccentricity).toBeCloseTo(issElements.eccentricity, 5)
    expect(decoded.elements.inclinationRad).toBeCloseTo(issElements.inclinationRad, 8)
    expect(decoded.elements.raanRad).toBeCloseTo(issElements.raanRad, 8)
    expect(decoded.elements.argOfPerigeeRad).toBeCloseTo(issElements.argOfPerigeeRad, 8)
    expect(decoded.elements.trueAnomalyRad).toBeCloseTo(issElements.trueAnomalyRad, 8)
  })

  it('round-trips a design scenario with camera state', () => {
    const scenario: Scenario = {
      mode: 'design',
      elements: issElements,
      speedMultiplier: 300,
      centralBody: 'earth',
      camera,
    }
    const decoded = decodeScenario(encodeScenario(scenario))

    expect(decoded?.camera?.position.x).toBeCloseTo(camera.position.x, 5)
    expect(decoded?.camera?.position.y).toBeCloseTo(camera.position.y, 5)
    expect(decoded?.camera?.position.z).toBeCloseTo(camera.position.z, 5)
    expect(decoded?.camera?.target).toEqual(camera.target)
  })

  it('round-trips a design scenario centered on the Moon or Mars', () => {
    for (const centralBody of ['moon', 'mars'] as const) {
      const scenario: Scenario = {
        mode: 'design',
        elements: issElements,
        speedMultiplier: 60,
        centralBody,
      }
      const decoded = decodeScenario(encodeScenario(scenario))
      expect(decoded?.centralBody, centralBody).toBe(centralBody)
    }
  })

  it('round-trips a track-real scenario', () => {
    const scenario: Scenario = {
      mode: 'track-real',
      noradId: '25544',
      speedMultiplier: 60,
      centralBody: 'earth',
    }
    const decoded = decodeScenario(encodeScenario(scenario))

    expect(decoded).toEqual(scenario)
  })

  it('produces human-readable query params', () => {
    const params = encodeScenario({
      mode: 'track-real',
      noradId: '25544',
      speedMultiplier: 60,
      centralBody: 'earth',
    })
    expect(params.get('mode')).toBe('track-real')
    expect(params.get('norad')).toBe('25544')
    expect(params.get('speed')).toBe('60')
    expect(params.get('body')).toBe('earth')
  })
})

describe('decodeScenario robustness', () => {
  it('returns null for empty params', () => {
    expect(decodeScenario(new URLSearchParams())).toBeNull()
  })

  it('returns null for an unknown mode', () => {
    expect(decodeScenario(new URLSearchParams('mode=bogus&speed=60'))).toBeNull()
  })

  it('returns null when speed is missing, zero, negative, or non-numeric', () => {
    expect(decodeScenario(new URLSearchParams('mode=track-real&norad=25544'))).toBeNull()
    expect(
      decodeScenario(new URLSearchParams('mode=track-real&norad=25544&speed=0')),
    ).toBeNull()
    expect(
      decodeScenario(new URLSearchParams('mode=track-real&norad=25544&speed=-5')),
    ).toBeNull()
    expect(
      decodeScenario(new URLSearchParams('mode=track-real&norad=25544&speed=abc')),
    ).toBeNull()
  })

  it('returns null for track-real mode missing a NORAD id', () => {
    expect(decodeScenario(new URLSearchParams('mode=track-real&speed=60'))).toBeNull()
  })

  it('returns null for design mode missing any element field', () => {
    const complete = 'mode=design&speed=60&a=6786&e=0&i=0&raan=0&argp=0&nu=0'
    expect(decodeScenario(new URLSearchParams(complete))).not.toBeNull()

    for (const field of ['a', 'e', 'i', 'raan', 'argp', 'nu']) {
      const params = new URLSearchParams(complete)
      params.delete(field)
      expect(decodeScenario(params), `missing ${field}`).toBeNull()
    }
  })

  it('defaults centralBody to earth when the body param is missing or unrecognized', () => {
    const missing = decodeScenario(
      new URLSearchParams('mode=design&speed=60&a=6786&e=0&i=0&raan=0&argp=0&nu=0'),
    )
    expect(missing?.centralBody).toBe('earth')

    const bogus = decodeScenario(
      new URLSearchParams('mode=design&speed=60&a=6786&e=0&i=0&raan=0&argp=0&nu=0&body=pluto'),
    )
    expect(bogus?.centralBody).toBe('earth')
  })

  it('forces centralBody to earth for track-real mode even if body says otherwise', () => {
    const decoded = decodeScenario(
      new URLSearchParams('mode=track-real&norad=25544&speed=60&body=moon'),
    )
    expect(decoded?.centralBody).toBe('earth')
  })

  it('ignores malformed camera state rather than failing the whole scenario', () => {
    const params = new URLSearchParams(
      'mode=track-real&norad=25544&speed=60&cam=not,a,vector&tgt=0,0',
    )
    const decoded = decodeScenario(params)
    expect(decoded).not.toBeNull()
    expect(decoded?.camera).toBeUndefined()
  })
})
