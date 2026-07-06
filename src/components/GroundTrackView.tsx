import earthDaymapUrl from '../assets/earth-daymap.jpg'
import type { GeodeticCoordinates } from '../engine'
import { degToRad, radToDeg } from './angleUnits'
import { colorToCss } from './companions'

const WIDTH = 720
const HEIGHT = 360

const lonToX = (lonRad: number): number => ((radToDeg(lonRad) + 180) / 360) * WIDTH
const latToY = (latRad: number): number => ((90 - radToDeg(latRad)) / 180) * HEIGHT

/** How many longitude samples make up the terminator curve; smooth without being expensive to recompute each report. */
const TERMINATOR_SAMPLE_COUNT = 145
/** Floor on |tan(subsolar latitude)| to avoid a divide-by-zero right at the equinox instant. */
const MIN_ABS_TAN_SUBSOLAR_LAT = 1e-6

/**
 * The day/night terminator as a sequence of {x, y} pixel points spanning the
 * full map width, plus a night-side polygon (the terminator curve closed off
 * against whichever map edge - top or bottom - falls on the night side).
 *
 * Terminator latitude as a function of longitude: a point is on the
 * boundary when its angular distance from the subsolar point is exactly 90
 * degrees, i.e. tan(lat) * tan(subLat) + cos(lon - subLon) = 0.
 */
function computeTerminator(subsolarPoint: GeodeticCoordinates): {
  terminatorPoints: { x: number; y: number }[]
  nightPolygonPoints: { x: number; y: number }[]
} {
  const subLatRad = subsolarPoint.latitudeRad
  const subLonRad = subsolarPoint.longitudeRad

  const tanSubLat = Math.tan(subLatRad)
  const safeTanSubLat =
    Math.abs(tanSubLat) < MIN_ABS_TAN_SUBSOLAR_LAT
      ? Math.sign(tanSubLat || 1) * MIN_ABS_TAN_SUBSOLAR_LAT
      : tanSubLat

  const terminatorPoints = Array.from({ length: TERMINATOR_SAMPLE_COUNT }, (_, i) => {
    const lonDeg = -180 + (i / (TERMINATOR_SAMPLE_COUNT - 1)) * 360
    const lonRad = degToRad(lonDeg)
    const latRad = Math.atan(-Math.cos(lonRad - subLonRad) / safeTanSubLat)
    return { x: lonToX(lonRad), y: latToY(latRad) }
  })

  // North pole is sunlit whenever the subsolar point is in the northern
  // hemisphere, which puts the night side against the bottom map edge.
  const nightEdgeY = subLatRad >= 0 ? HEIGHT : 0
  const nightPolygonPoints = [
    ...terminatorPoints,
    { x: WIDTH, y: nightEdgeY },
    { x: 0, y: nightEdgeY },
  ]

  return { terminatorPoints, nightPolygonPoints }
}

/** Splits a chronological point sequence into segments, breaking wherever it wraps across +/-180 deg longitude. */
function splitAtAntimeridian(points: GeodeticCoordinates[]): GeodeticCoordinates[][] {
  if (points.length === 0) return []

  const segments: GeodeticCoordinates[][] = [[points[0]]]
  for (let i = 1; i < points.length; i++) {
    const prevLonDeg = radToDeg(points[i - 1].longitudeRad)
    const currLonDeg = radToDeg(points[i].longitudeRad)
    if (Math.abs(currLonDeg - prevLonDeg) > 180) {
      segments.push([])
    }
    segments.at(-1)?.push(points[i])
  }
  return segments
}

/** One tracked object's ground track, colored to match its 3D counterpart. */
export interface GroundTrack {
  id: string
  pathColor: number
  markerColor: number
  points: GeodeticCoordinates[]
}

interface GroundTrackViewProps {
  tracks: GroundTrack[]
  /** The subsolar point, for the day/night terminator overlay. Omitted (or null) hides the overlay - design mode has no real sun position. */
  subsolarPoint?: GeodeticCoordinates | null
}

/** 2D equirectangular ground track: every tracked object's subpoint, traced over a trailing time window. */
export function GroundTrackView({ tracks, subsolarPoint }: GroundTrackViewProps) {
  const terminator = subsolarPoint ? computeTerminator(subsolarPoint) : null

  return (
    <div
      className="relative w-full lg:w-80 lg:max-w-[80vw] overflow-hidden rounded-lg bg-slate-900/80 backdrop-blur"
      style={{ aspectRatio: '2 / 1' }}
    >
      <img
        src={earthDaymapUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <span className="absolute top-1 left-2 text-xs font-semibold text-slate-100">
        Ground track
      </span>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Ground track"
      >
        {terminator && subsolarPoint && (
          <g>
            <polygon
              points={terminator.nightPolygonPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="#020617"
              fillOpacity={0.55}
            />
            <polyline
              points={terminator.terminatorPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#fbbf24"
              strokeOpacity={0.7}
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            <circle
              cx={lonToX(subsolarPoint.longitudeRad)}
              cy={latToY(subsolarPoint.latitudeRad)}
              r={4}
              fill="#fde047"
              stroke="#78350f"
              strokeWidth={0.5}
            />
          </g>
        )}
        {tracks.map((track) => {
          const segments = splitAtAntimeridian(track.points)
          const current = track.points.at(-1)
          const pathCss = colorToCss(track.pathColor)
          const markerCss = colorToCss(track.markerColor)

          return (
            <g key={track.id}>
              {segments.map((segment, index) => (
                <polyline
                  key={index}
                  points={segment
                    .map((p) => `${lonToX(p.longitudeRad)},${latToY(p.latitudeRad)}`)
                    .join(' ')}
                  fill="none"
                  stroke={pathCss}
                  strokeWidth={1.5}
                />
              ))}
              {current && (
                <circle
                  cx={lonToX(current.longitudeRad)}
                  cy={latToY(current.latitudeRad)}
                  r={3.5}
                  fill={markerCss}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
