import type { GeodeticCoordinates } from '../engine'

const RAD_TO_DEG = 180 / Math.PI

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Wraps a sampled ground track in a valid KML document with a single
 * `<LineString>` placemark, viewable directly in Google Earth. KML
 * coordinates are `lon,lat,alt` (degrees, degrees, meters) - note the
 * lon-before-lat order, the opposite of this app's usual lat/lon convention.
 */
export function buildGroundTrackKml(name: string, points: GeodeticCoordinates[]): string {
  const coordinates = points
    .map((p) => {
      const lonDeg = (p.longitudeRad * RAD_TO_DEG).toFixed(6)
      const latDeg = (p.latitudeRad * RAD_TO_DEG).toFixed(6)
      const altM = (p.altitudeKm * 1000).toFixed(1)
      return `${lonDeg},${latDeg},${altM}`
    })
    .join(' ')

  const safeName = escapeXml(name)

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${safeName}</name>
    <Placemark>
      <name>${safeName} ground track</name>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>
`
}
