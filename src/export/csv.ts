import type { EphemerisRow, InertialEphemerisRow } from './ephemeris'

const RAD_TO_DEG = 180 / Math.PI

const CSV_HEADER = [
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
].join(',')

/**
 * Formats sampled ephemeris rows as CSV, one row per sample. Accepts either
 * shape `sampleDesignEphemeris`/`sampleRealEphemeris` (Earth, with a
 * geodetic subpoint) or `sampleDesignEphemerisInertial` (every other
 * central body) produce - the header stays the same either way, with the
 * three geodetic columns left blank for rows that don't have one, rather
 * than needing two different CSV shapes depending on which body was
 * selected.
 */
export function buildEphemerisCsv(rows: ReadonlyArray<EphemerisRow | InertialEphemerisRow>): string {
  const lines = rows.map((row) => {
    const geodetic = 'geodetic' in row ? row.geodetic : null
    return [
      row.elapsedSeconds.toFixed(3),
      row.timestampIso ?? '',
      row.position.x.toFixed(6),
      row.position.y.toFixed(6),
      row.position.z.toFixed(6),
      row.velocity.x.toFixed(6),
      row.velocity.y.toFixed(6),
      row.velocity.z.toFixed(6),
      geodetic ? (geodetic.latitudeRad * RAD_TO_DEG).toFixed(6) : '',
      geodetic ? (geodetic.longitudeRad * RAD_TO_DEG).toFixed(6) : '',
      geodetic ? geodetic.altitudeKm.toFixed(3) : '',
    ].join(',')
  })

  return [CSV_HEADER, ...lines].join('\n')
}
