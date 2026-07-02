import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GeodeticCoordinates } from '../engine'
import { GroundTrackView } from './GroundTrackView'

const degToRad = (deg: number) => (deg * Math.PI) / 180

function point(latDeg: number, lonDeg: number): GeodeticCoordinates {
  return { latitudeRad: degToRad(latDeg), longitudeRad: degToRad(lonDeg), altitudeKm: 408 }
}

describe('GroundTrackView', () => {
  it('renders no polylines and no marker for an empty track', () => {
    const { container } = render(<GroundTrackView points={[]} />)
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
    expect(container.querySelectorAll('circle')).toHaveLength(0)
  })

  it('draws a single polyline segment for a track with no antimeridian crossing', () => {
    const { container } = render(
      <GroundTrackView points={[point(0, -10), point(10, 0), point(20, 10)]} />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
  })

  it('splits into separate segments when the track wraps across +/-180 degrees longitude', () => {
    const { container } = render(
      <GroundTrackView points={[point(0, 170), point(1, 179), point(2, -179), point(3, -170)]} />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
  })

  it('places the current-position marker at the most recent point', () => {
    render(<GroundTrackView points={[point(0, 0), point(45, 90)]} />)
    const svg = screen.getByRole('img', { name: 'Ground track' })
    const circle = svg.querySelector('circle')
    expect(circle).not.toBeNull()
    // lon=90deg -> x = (90+180)/360 * 720 = 540
    expect(circle?.getAttribute('cx')).toBe('540')
  })
})
