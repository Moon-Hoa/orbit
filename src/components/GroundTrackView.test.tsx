import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GeodeticCoordinates } from '../engine'
import { GroundTrackView, type GroundTrack } from './GroundTrackView'

const degToRad = (deg: number) => (deg * Math.PI) / 180

function point(latDeg: number, lonDeg: number): GeodeticCoordinates {
  return { latitudeRad: degToRad(latDeg), longitudeRad: degToRad(lonDeg), altitudeKm: 408 }
}

function track(id: string, points: GeodeticCoordinates[], color = 0x38bdf8): GroundTrack {
  return { id, pathColor: color, markerColor: color, points }
}

describe('GroundTrackView', () => {
  it('renders no polylines and no marker for an empty track', () => {
    const { container } = render(<GroundTrackView tracks={[track('a', [])]} />)
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
    expect(container.querySelectorAll('circle')).toHaveLength(0)
  })

  it('draws a single polyline segment for a track with no antimeridian crossing', () => {
    const { container } = render(
      <GroundTrackView tracks={[track('a', [point(0, -10), point(10, 0), point(20, 10)])]} />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
  })

  it('splits into separate segments when the track wraps across +/-180 degrees longitude', () => {
    const { container } = render(
      <GroundTrackView
        tracks={[track('a', [point(0, 170), point(1, 179), point(2, -179), point(3, -170)])]}
      />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
  })

  it('places the current-position marker at the most recent point', () => {
    render(<GroundTrackView tracks={[track('a', [point(0, 0), point(45, 90)])]} />)
    const svg = screen.getByRole('img', { name: 'Ground track' })
    const circle = svg.querySelector('circle')
    expect(circle).not.toBeNull()
    // lon=90deg -> x = (90+180)/360 * 720 = 540
    expect(circle?.getAttribute('cx')).toBe('540')
  })

  it('draws multiple simultaneous tracks, each colored independently', () => {
    const { container } = render(
      <GroundTrackView
        tracks={[
          track('primary', [point(0, -10), point(10, 0)], 0x38bdf8),
          track('companion', [point(-20, 100), point(-10, 110)], 0xf97316),
        ]}
      />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(container.querySelectorAll('circle')).toHaveLength(2)

    const strokes = Array.from(container.querySelectorAll('polyline')).map((el) =>
      el.getAttribute('stroke'),
    )
    expect(strokes).toContain('#38bdf8')
    expect(strokes).toContain('#f97316')
  })

  it('renders nothing for a track list with no tracked objects', () => {
    const { container } = render(<GroundTrackView tracks={[]} />)
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
    expect(container.querySelectorAll('circle')).toHaveLength(0)
  })
})

describe('GroundTrackView terminator overlay', () => {
  it('renders no night-shading polygon when no subsolar point is given', () => {
    const { container } = render(<GroundTrackView tracks={[]} />)
    expect(container.querySelector('polygon')).toBeNull()
  })

  it('renders no night-shading polygon when the subsolar point is explicitly null', () => {
    const { container } = render(<GroundTrackView tracks={[]} subsolarPoint={null} />)
    expect(container.querySelector('polygon')).toBeNull()
  })

  it('draws a night-shading polygon and a terminator line when given a subsolar point', () => {
    const { container } = render(
      <GroundTrackView tracks={[]} subsolarPoint={point(10, 20)} />,
    )
    expect(container.querySelector('polygon')).not.toBeNull()
    // Terminator + tracks are both polylines; with no tracks, only the terminator line should exist.
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
  })

  it('places the subsolar marker at the given lat/lon', () => {
    const { container } = render(
      <GroundTrackView tracks={[]} subsolarPoint={point(0, 90)} />,
    )
    // lon=90deg -> x = (90+180)/360 * 720 = 540; lat=0 -> y = 180
    const sunMarker = container.querySelector('circle[fill="#fde047"]')
    expect(sunMarker).not.toBeNull()
    expect(sunMarker?.getAttribute('cx')).toBe('540')
    expect(sunMarker?.getAttribute('cy')).toBe('180')
  })

  it('shades the southern hemisphere (against the bottom edge) when the subsolar point is north of the equator', () => {
    const { container } = render(
      <GroundTrackView tracks={[]} subsolarPoint={point(23, 0)} />,
    )
    const polygon = container.querySelector('polygon')
    const points = polygon?.getAttribute('points') ?? ''
    // The polygon's closing corners should sit on the bottom edge (y=HEIGHT=360).
    expect(points.trim().endsWith('720,360 0,360')).toBe(true)
  })

  it('shades the northern hemisphere (against the top edge) when the subsolar point is south of the equator', () => {
    const { container } = render(
      <GroundTrackView tracks={[]} subsolarPoint={point(-23, 0)} />,
    )
    const polygon = container.querySelector('polygon')
    const points = polygon?.getAttribute('points') ?? ''
    expect(points.trim().endsWith('720,0 0,0')).toBe(true)
  })
})
