import type { EphemerisRow } from './ephemeris'

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

/** Formats sampled ephemeris rows (ECI state + geodetic subpoint) as CSV, one row per sample. */
export function buildEphemerisCsv(rows: EphemerisRow[]): string {
  const lines = rows.map((row) =>
    [
      row.elapsedSeconds.toFixed(3),
      row.timestampIso ?? '',
      row.position.x.toFixed(6),
      row.position.y.toFixed(6),
      row.position.z.toFixed(6),
      row.velocity.x.toFixed(6),
      row.velocity.y.toFixed(6),
      row.velocity.z.toFixed(6),
      (row.geodetic.latitudeRad * RAD_TO_DEG).toFixed(6),
      (row.geodetic.longitudeRad * RAD_TO_DEG).toFixed(6),
      row.geodetic.altitudeKm.toFixed(3),
    ].join(','),
  )

  return [CSV_HEADER, ...lines].join('\n')
}
