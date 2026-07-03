import { useState } from 'react'
import type { OrbitalElements } from '../engine'
import { downloadTextFile } from '../export/download'
import { type ExportWindow, sampleDesignEphemeris, sampleRealEphemeris } from '../export/ephemeris'
import { buildEphemerisCsv } from '../export/csv'
import { buildGroundTrackKml } from '../export/kml'
import type { TleRecord } from '../satellite'

interface ExportControlsProps {
  label: string
  isTrackingReal: boolean
  elements: OrbitalElements
  enableJ2: boolean
  tle: TleRecord | null
}

/** Turns a label into a filesystem-safe filename stem, e.g. "ISS (ZARYA)" -> "iss-zarya". */
function slug(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'orbit'
  )
}

/** Export of the current ground track (KML) or full ephemeris (CSV), over a user-chosen time window. */
export function ExportControls({
  label,
  isTrackingReal,
  elements,
  enableJ2,
  tle,
}: ExportControlsProps) {
  const [exportWindow, setExportWindow] = useState<ExportWindow>('next-orbit')

  function sampleEphemeris() {
    if (isTrackingReal && tle) return sampleRealEphemeris(tle, new Date(), exportWindow)
    return sampleDesignEphemeris(elements, exportWindow, enableJ2)
  }

  function handleExportKml() {
    const rows = sampleEphemeris()
    const kml = buildGroundTrackKml(
      label,
      rows.map((row) => row.geodetic),
    )
    downloadTextFile(`${slug(label)}-ground-track.kml`, 'application/vnd.google-earth.kml+xml', kml)
  }

  function handleExportCsv() {
    const csv = buildEphemerisCsv(sampleEphemeris())
    downloadTextFile(`${slug(label)}-ephemeris.csv`, 'text/csv', csv)
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 p-1.5 text-xs backdrop-blur">
      <select
        aria-label="Export window"
        value={exportWindow}
        onChange={(event) => setExportWindow(event.target.value as ExportWindow)}
        className="rounded bg-slate-800 px-1.5 py-1 text-slate-200"
      >
        <option value="next-orbit">Next orbit</option>
        <option value="next-24h">Next 24h</option>
      </select>
      <button
        type="button"
        onClick={handleExportKml}
        className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
      >
        Export KML
      </button>
      <button
        type="button"
        onClick={handleExportCsv}
        className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
      >
        Export CSV
      </button>
    </div>
  )
}
