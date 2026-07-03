import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM } from './constants'
import { hohmannTransfer } from './hohmann'

describe('hohmannTransfer', () => {
  // Classic textbook case: a ~300 km circular LEO parking orbit to GEO.
  const LEO_RADIUS_KM = EARTH_RADIUS_KM + 300
  const GEO_RADIUS_KM = EARTH_RADIUS_KM + 35786

  it('matches published LEO -> GEO delta-v figures (~2.43 + ~1.47 = ~3.89 km/s)', () => {
    const transfer = hohmannTransfer(LEO_RADIUS_KM, GEO_RADIUS_KM)
    expect(transfer.departureDeltaVKmS).toBeCloseTo(2.426, 2)
    expect(transfer.arrivalDeltaVKmS).toBeCloseTo(1.467, 2)
    expect(transfer.totalDeltaVKmS).toBeCloseTo(3.893, 2)
  })

  it('matches the published LEO -> GEO transfer time (~5.28 hours)', () => {
    const transfer = hohmannTransfer(LEO_RADIUS_KM, GEO_RADIUS_KM)
    expect(transfer.transferTimeSeconds / 3600).toBeCloseTo(5.275, 1)
  })

  it('uses the mean of the two radii as the transfer ellipse semi-major axis', () => {
    const transfer = hohmannTransfer(LEO_RADIUS_KM, GEO_RADIUS_KM)
    expect(transfer.transferSemiMajorAxisKm).toBeCloseTo((LEO_RADIUS_KM + GEO_RADIUS_KM) / 2, 6)
  })

  it('is symmetric in total delta-v regardless of transfer direction', () => {
    const outbound = hohmannTransfer(LEO_RADIUS_KM, GEO_RADIUS_KM)
    const inbound = hohmannTransfer(GEO_RADIUS_KM, LEO_RADIUS_KM)
    expect(inbound.totalDeltaVKmS).toBeCloseTo(outbound.totalDeltaVKmS, 9)
  })

  it('requires zero delta-v for two identical circular radii (the degenerate case)', () => {
    const transfer = hohmannTransfer(LEO_RADIUS_KM, LEO_RADIUS_KM)
    expect(transfer.totalDeltaVKmS).toBeCloseTo(0, 9)
  })
})
