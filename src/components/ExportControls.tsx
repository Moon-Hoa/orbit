import { useState } from 'react'
import type { OrbitalElements } from '../engine'
import { downloadTextFile } from '../export/download'
import { buildEphemerisCsv } from '../export/csv'
import {
  type EphemerisRow,
  type ExportWindow,
  sampleDesignEphemeris,
  sampleDesignEphemerisInertial,
  sampleRealEphemeris,
} from '../export/ephemeris'
import { buildGroundTrackKml } from '../export/kml'
import type { TleRecord } from '../satellite'

interface ExportControlsProps {
  label: string
  isTrackingReal: boolean
  elements: OrbitalElements
  enableJ2: boolean
  tle: TleRecord | null
  /**
   * Whether the current central body supports Earth-only features - gates
   * the KML (ground-track) export and whether the real-satellite ephemeris
   * path applies. See `sampleDesignEphemerisInertial`'s doc comment for why
   * KML specifically doesn't generalize to other bodies.
   */
  hasEarthOnlyFeatures: boolean
  /** The current central body's gravitational parameter, km^3/s^2 - used for the non-Earth (inertial) CSV export path. */
  muKm3S2: number
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

/**
 * Export of the current ephemeris as CSV (every central body), or the
 * ground track as KML (Earth only - see `hasEarthOnlyFeatures`), over a
 * user-chosen time window. Lives inside `SettingsPanel` rather than the
 * main top bar - see the Settings-relocation issue.
 */
export function ExportControls({
  label,
  isTrackingReal,
  elements,
  enableJ2,
  tle,
  hasEarthOnlyFeatures,
  muKm3S2,
}: ExportControlsProps) {
  const [exportWindow, setExportWindow] = useState<ExportWindow>('next-orbit')

  /** Always has a geodetic subpoint - only called from the KML path, which is hidden unless `hasEarthOnlyFeatures`. */
  function sampleEarthEphemeris(): EphemerisRow[] {
    if (isTrackingReal && tle) return sampleRealEphemeris(tle, new Date(), exportWindow)
    return sampleDesignEphemeris(elements, exportWindow, enableJ2)
  }

  function handleExportKml() {
    const rows = sampleEarthEphemeris()
    const kml = buildGroundTrackKml(
      label,
      rows.map((row) => row.geodetic),
    )
    downloadTextFile(`${slug(label)}-ground-track.kml`, 'application/vnd.google-earth.kml+xml', kml)
  }

  function handleExportCsv() {
    const rows = hasEarthOnlyFeatures
      ? sampleEarthEphemeris()
      : sampleDesignEphemerisInertial(elements, exportWindow, muKm3S2, enableJ2)
    const csv = buildEphemerisCsv(rows)
    downloadTextFile(`${slug(label)}-ephemeris.csv`, 'text/csv', csv)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <select
        aria-label="Export window"
        value={exportWindow}
        onChange={(event) => setExportWindow(event.target.value as ExportWindow)}
        className="rounded bg-slate-800 px-1.5 py-1 text-slate-200"
      >
        <option value="next-orbit">Next orbit</option>
        <option value="next-24h">Next 24h</option>
      </select>
      {hasEarthOnlyFeatures && (
        <button
          type="button"
          onClick={handleExportKml}
          className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
        >
          Export KML
        </button>
      )}
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
