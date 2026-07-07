import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EARTH_MU_KM3_S2, EARTH_RADIUS_KM, MOON_MU_KM3_S2, MOON_RADIUS_KM, type OrbitalElements } from '../engine'
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

const lowLunarOrbitElements: OrbitalElements = {
  semiMajorAxisKm: MOON_RADIUS_KM + 100,
  eccentricity: 0,
  inclinationRad: (90 * Math.PI) / 180,
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

function renderControls(overrides: Partial<Parameters<typeof ExportControls>[0]> = {}) {
  return render(
    <ExportControls
      label="Design orbit"
      isTrackingReal={false}
      elements={designElements}
      enableJ2={false}
      tle={null}
      hasEarthOnlyFeatures={true}
      muKm3S2={EARTH_MU_KM3_S2}
      {...overrides}
    />,
  )
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
    renderControls()

    fireEvent.click(screen.getByRole('button', { name: 'Export KML' }))

    expect(clickedLinks).toHaveLength(1)
    expect(clickedLinks[0].download).toBe('design-orbit-ground-track.kml')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('downloads a CSV file named after the label', () => {
    renderControls({ label: 'ISS (ZARYA)', isTrackingReal: true, tle: ISS_TLE })

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(clickedLinks).toHaveLength(1)
    expect(clickedLinks[0].download).toBe('iss-zarya-ephemeris.csv')
  })

  it('uses the real-satellite sampler (with real timestamps) when tracking real and a TLE is set', async () => {
    renderControls({ label: 'ISS (ZARYA)', isTrackingReal: true, tle: ISS_TLE })

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
    renderControls()

    fireEvent.change(screen.getByLabelText('Export window'), { target: { value: 'next-24h' } })
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(clickedLinks).toHaveLength(1)
  })

  describe('non-Earth bodies', () => {
    it('hides the Export KML button (no ground-track concept without a real rotating frame)', () => {
      renderControls({ hasEarthOnlyFeatures: false, muKm3S2: MOON_MU_KM3_S2 })
      expect(screen.queryByRole('button', { name: 'Export KML' })).not.toBeInTheDocument()
    })

    it('still exports a CSV, using the given body\'s mu for the inertial sampler', async () => {
      renderControls({
        elements: lowLunarOrbitElements,
        hasEarthOnlyFeatures: false,
        muKm3S2: MOON_MU_KM3_S2,
      })

      let capturedBlob: Blob | null = null
      vi.mocked(URL.createObjectURL).mockImplementation((blob) => {
        capturedBlob = blob as Blob
        return 'blob:mock-url'
      })

      fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

      expect(capturedBlob).not.toBeNull()
      const text = await (capturedBlob as unknown as Blob).text()
      const [header, firstRow] = text.trim().split('\n')
      expect(header).toContain('latitude_deg') // same column shape as Earth...
      const columns = firstRow.split(',')
      expect(columns.at(-1)).toBe('') // ...but left blank, since there's no geodetic subpoint
    })
  })
})
