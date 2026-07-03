import earthDaymapUrl from '../assets/earth-daymap.jpg'
import type { GeodeticCoordinates } from '../engine'
import { radToDeg } from './angleUnits'
import { colorToCss } from './companions'

const WIDTH = 720
const HEIGHT = 360

const lonToX = (lonRad: number): number => ((radToDeg(lonRad) + 180) / 360) * WIDTH
const latToY = (latRad: number): number => ((90 - radToDeg(latRad)) / 180) * HEIGHT

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
}

/** 2D equirectangular ground track: every tracked object's subpoint, traced over a trailing time window. */
export function GroundTrackView({ tracks }: GroundTrackViewProps) {
  return (
    <div
      className="relative w-80 max-w-[80vw] overflow-hidden rounded-lg bg-slate-900/80 backdrop-blur"
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
