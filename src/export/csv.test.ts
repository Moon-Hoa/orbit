import { describe, expect, it } from 'vitest'
import type { EphemerisRow, InertialEphemerisRow } from './ephemeris'
import { buildEphemerisCsv } from './csv'

const sampleRows: EphemerisRow[] = [
  {
    elapsedSeconds: 0,
    timestampIso: '2026-07-02T12:00:00.000Z',
    position: { x: 1000, y: 2000, z: 3000 },
    velocity: { x: 1, y: 2, z: 3 },
    geodetic: { latitudeRad: 0.1, longitudeRad: 0.2, altitudeKm: 408 },
  },
  {
    elapsedSeconds: 60,
    timestampIso: null,
    position: { x: 1100, y: 2100, z: 3100 },
    velocity: { x: 1.1, y: 2.1, z: 3.1 },
    geodetic: { latitudeRad: -0.1, longitudeRad: -0.2, altitudeKm: 410 },
  },
]

/** Naive CSV row parser - fine for this fixture, which has no quoted/escaped fields. */
function parseCsv(csv: string): string[][] {
  return csv
    .trim()
    .split('\n')
    .map((line) => line.split(','))
}

describe('buildEphemerisCsv', () => {
  it('round-trips through a basic parser with the expected columns', () => {
    const csv = buildEphemerisCsv(sampleRows)
    const [header, ...rows] = parseCsv(csv)

    expect(header).toEqual([
      'elapsed_seconds',
      'timestamp_utc',
      'position_x_km',
      'position_y_km',
      'position_z_km',
      'velocity_x_km_s',
      'velocity_y_km_s',
      'velocity_z_km_s',
      'latitude_deg',
      'longitude_deg',
      'altitude_km',
    ])
    expect(rows).toHaveLength(2)
  })

  it('writes numeric fields that parse back to the original values', () => {
    const csv = buildEphemerisCsv(sampleRows)
    const [, firstRow] = parseCsv(csv)

    expect(Number(firstRow[0])).toBeCloseTo(0, 6)
    expect(firstRow[1]).toBe('2026-07-02T12:00:00.000Z')
    expect(Number(firstRow[2])).toBeCloseTo(1000, 6)
    expect(Number(firstRow[5])).toBeCloseTo(1, 6)
    expect(Number(firstRow[8])).toBeCloseTo((0.1 * 180) / Math.PI, 6)
  })

  it('leaves timestamp_utc empty for design-mode rows (no real epoch)', () => {
    const csv = buildEphemerisCsv(sampleRows)
    const [, , secondRow] = parseCsv(csv)
    expect(secondRow[1]).toBe('')
  })

  it('leaves the geodetic columns empty for rows with no geodetic subpoint (non-Earth bodies)', () => {
    const inertialRows: InertialEphemerisRow[] = [
      {
        elapsedSeconds: 0,
        timestampIso: null,
        position: { x: 1000, y: 2000, z: 3000 },
        velocity: { x: 1, y: 2, z: 3 },
      },
    ]

    const csv = buildEphemerisCsv(inertialRows)
    const [, row] = parseCsv(csv)

    expect(row).toHaveLength(11) // same column count as the Earth shape, just blank at the end
    expect(row.slice(8)).toEqual(['', '', ''])
  })
})
