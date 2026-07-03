import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EARTH_RADIUS_KM, type OrbitalElements } from '../engine'
import type { TleRecord } from '../satellite'
import { ExportControls } from './ExportControls'

const designElements: OrbitalElements = {
  semiMajorAxisKm: EARTH_RADIUS_KM + 408,
  eccentricity: 0.0007,
  inclinationRad: (51.6 * Math.PI) / 180,
  raanRad: 0,
  argOfPerigeeRad: 0,
  trueAnomalyRad: 0,
}

const ISS_TLE: TleRecord = {
  name: 'ISS (ZARYA)',
  noradId: '25544',
  line1: '1 25544U 98067A   26182.50817465  .00006185  00000+0  11827-3 0  9996',
  line2: '2 25544  51.6311 229.1989 0004224 255.0896 104.9625 15.49503254573972',
}

let clickedLinks: HTMLAnchorElement[] = []

beforeEach(() => {
  clickedLinks = []
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clickedLinks.push(this)
  })
})

describe('ExportControls', () => {
  it('downloads a KML file named after the label in design mode', () => {
    render(
      <ExportControls
        label="Design orbit"
        isTrackingReal={false}
        elements={designElements}
        enableJ2={false}
        tle={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Export KML' }))

    expect(clickedLinks).toHaveLength(1)
    expect(clickedLinks[0].download).toBe('design-orbit-ground-track.kml')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('downloads a CSV file named after the label', () => {
    render(
      <ExportControls
        label="ISS (ZARYA)"
        isTrackingReal={true}
        elements={designElements}
        enableJ2={false}
        tle={ISS_TLE}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(clickedLinks).toHaveLength(1)
    expect(clickedLinks[0].download).toBe('iss-zarya-ephemeris.csv')
  })

  it('uses the real-satellite sampler (with real timestamps) when tracking real and a TLE is set', async () => {
    render(
      <ExportControls
        label="ISS (ZARYA)"
        isTrackingReal={true}
        elements={designElements}
        enableJ2={false}
        tle={ISS_TLE}
      />,
    )

    let capturedBlob: Blob | null = null
    vi.mocked(URL.createObjectURL).mockImplementation((blob) => {
      capturedBlob = blob as Blob
      return 'blob:mock-url'
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(capturedBlob).not.toBeNull()
    const text = await (capturedBlob as unknown as Blob).text()
    expect(text).toContain(new Date().getUTCFullYear().toString())
  })

  it('respects the selected export window', () => {
    render(
      <ExportControls
        label="Design orbit"
        isTrackingReal={false}
        elements={designElements}
        enableJ2={false}
        tle={null}
      />,
    )

    fireEvent.change(screen.getByLabelText('Export window'), { target: { value: 'next-24h' } })
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(clickedLinks).toHaveLength(1)
  })
})
