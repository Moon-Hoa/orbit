import type { RefObject } from 'react'
import type { GeodeticCoordinates, OrbitalElements } from '../engine'
import type { TleRecord } from '../satellite'
import { radToDeg } from './angleUnits'
import type { ViewerMode } from './ModeToggle'

interface DataRowProps {
  label: string
  value?: string
  valueRef?: RefObject<HTMLTableCellElement | null>
}

function DataRow({ label, value, valueRef }: DataRowProps) {
  return (
    <tr>
      <th scope="row" className="pr-4 text-left font-normal text-slate-400">
        {label}
      </th>
      {valueRef ? (
        <td ref={valueRef} className="font-mono text-slate-100">
          —
        </td>
      ) : (
        <td className="font-mono text-slate-100">{value}</td>
      )}
    </tr>
  )
}

interface AccessibleDataViewProps {
  isOpen: boolean
  onToggle: () => void
  mode: ViewerMode
  primaryLabel: string
  selectedTle: TleRecord | null
  elements: OrbitalElements
  currentGeodetic: GeodeticCoordinates | null
  currentAltitudeRef: RefObject<HTMLTableCellElement | null>
  currentSpeedRef: RefObject<HTMLTableCellElement | null>
  currentEclipseStatusRef: RefObject<HTMLTableCellElement | null>
  showEclipseStatus: boolean
  /** The selected central body's display name (Earth, Moon, Mars). Defaults to "Earth". */
  centralBodyLabel?: string
}

/**
 * A non-visual alternative to the 3D scene and SVG ground track: a real
 * `<table>` surfacing the same live-updating values (identity/elements,
 * altitude, velocity, position) so a screen-reader user can determine
 * current state without seeing the canvas. Toggleable rather than always
 * visible, so it doesn't clutter the view for sighted mouse users who don't
 * need it - reachable and dismissable via keyboard either way.
 */
export function AccessibleDataView({
  isOpen,
  onToggle,
  mode,
  primaryLabel,
  selectedTle,
  elements,
  currentGeodetic,
  currentAltitudeRef,
  currentSpeedRef,
  currentEclipseStatusRef,
  showEclipseStatus,
  centralBodyLabel = 'Earth',
}: AccessibleDataViewProps) {
  return (
    <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="accessible-data-table"
        className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 backdrop-blur hover:bg-slate-800"
      >
        {isOpen ? 'Hide data table' : 'Show data table'}
      </button>

      {isOpen && (
        <table
          id="accessible-data-table"
          className="mt-2 rounded-lg bg-slate-900/90 p-3 text-xs backdrop-blur"
        >
          <caption className="mb-1 text-left text-sm font-semibold text-slate-100">
            Live orbit data
          </caption>
          <tbody>
            <DataRow label="Central body" value={centralBodyLabel} />
            <DataRow label="Mode" value={mode === 'design' ? 'Design orbit' : 'Track real satellite'} />
            <DataRow
              label="Tracked object"
              value={selectedTle ? `${primaryLabel} (NORAD ${selectedTle.noradId})` : primaryLabel}
            />
            {mode === 'design' && (
              <>
                <DataRow label="Semi-major axis (a)" value={`${elements.semiMajorAxisKm.toFixed(3)} km`} />
                <DataRow label="Eccentricity (e)" value={elements.eccentricity.toFixed(4)} />
                <DataRow label="Inclination (i)" value={`${radToDeg(elements.inclinationRad).toFixed(2)}°`} />
                <DataRow label="RAAN (Ω)" value={`${radToDeg(elements.raanRad).toFixed(2)}°`} />
                <DataRow
                  label="Argument of perigee (ω)"
                  value={`${radToDeg(elements.argOfPerigeeRad).toFixed(2)}°`}
                />
                <DataRow label="True anomaly (ν)" value={`${radToDeg(elements.trueAnomalyRad).toFixed(2)}°`} />
              </>
            )}
            <DataRow label="Altitude" valueRef={currentAltitudeRef} />
            <DataRow label="Velocity" valueRef={currentSpeedRef} />
            <DataRow
              label="Latitude"
              value={currentGeodetic ? `${radToDeg(currentGeodetic.latitudeRad).toFixed(3)}°` : '—'}
            />
            <DataRow
              label="Longitude"
              value={currentGeodetic ? `${radToDeg(currentGeodetic.longitudeRad).toFixed(3)}°` : '—'}
            />
            {showEclipseStatus && <DataRow label="Sun" valueRef={currentEclipseStatusRef} />}
          </tbody>
        </table>
      )}
    </div>
  )
}
