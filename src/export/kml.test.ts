import { describe, expect, it } from 'vitest'
import type { GeodeticCoordinates } from '../engine'
import { buildGroundTrackKml } from './kml'

const degToRad = (deg: number) => (deg * Math.PI) / 180

function point(latDeg: number, lonDeg: number, altKm = 408): GeodeticCoordinates {
  return { latitudeRad: degToRad(latDeg), longitudeRad: degToRad(lonDeg), altitudeKm: altKm }
}

describe('buildGroundTrackKml', () => {
  it('produces well-formed XML', () => {
    const kml = buildGroundTrackKml('ISS', [point(0, 0), point(10, 20), point(-10, -20)])
    const doc = new DOMParser().parseFromString(kml, 'application/xml')
    expect(doc.querySelector('parsererror')).toBeNull()
  })

  it('includes a LineString with plausible lon,lat,alt coordinate ranges', () => {
    const kml = buildGroundTrackKml('ISS', [point(45, 90, 408), point(-45, -90, 420)])
    const doc = new DOMParser().parseFromString(kml, 'application/xml')

    const coordinatesText = doc.querySelector('LineString coordinates')?.textContent ?? ''
    const tuples = coordinatesText.trim().split(' ').map((tuple) => tuple.split(',').map(Number))

    expect(tuples).toHaveLength(2)
    for (const [lon, lat, altM] of tuples) {
      expect(lon).toBeGreaterThanOrEqual(-180)
      expect(lon).toBeLessThanOrEqual(180)
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(altM).toBeGreaterThan(0)
    }

    expect(tuples[0]).toEqual([90, 45, 408000])
    expect(tuples[1]).toEqual([-90, -45, 420000])
  })

  it('escapes XML-sensitive characters in the name', () => {
    const kml = buildGroundTrackKml('AT&T <Satellite>', [point(0, 0)])
    const doc = new DOMParser().parseFromString(kml, 'application/xml')
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.querySelector('Document > name')?.textContent).toBe('AT&T <Satellite>')
  })
})
