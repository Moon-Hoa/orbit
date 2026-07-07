import type { RefObject } from 'react'
import { useMemo } from 'react'
import {
  EARTH_MU_KM3_S2,
  EARTH_RADIUS_KM,
  type GeodeticCoordinates,
  type OrbitalElements,
  apogeeAltitudeKm,
  orbitalPeriodSeconds,
  perigeeAltitudeKm,
} from '../engine'
import type { TleRecord } from '../satellite'
import { PRIMARY_OBJECT_ID } from '../three/OrbitScene'
import { radToDeg } from './angleUnits'
import { type CompanionEntry, DEFAULT_PRIMARY_COLOR, colorToCss } from './companions'
import { type UnitSystem, formatDistanceKm } from './distanceUnits'
import { HohmannPlanner } from './HohmannPlanner'
import type { ViewerMode } from './ModeToggle'

interface StatRowProps {
  label: string
  value?: string
  valueRef?: RefObject<HTMLSpanElement | null>
  testId?: string
}

function StatRow({ label, value, valueRef, testId }: StatRowProps) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      {valueRef ? (
        <span ref={valueRef} data-testid={testId} className="font-mono text-slate-100">
          —
        </span>
      ) : (
        <span className="font-mono text-slate-100">{value}</span>
      )}
    </div>
  )
}

/** The subset of orbital shape needed for period/apogee/perigee - works for either engine mode. */
export interface OrbitShape {
  semiMajorAxisKm: number
  eccentricity: number
}

interface TrackedObjectChipProps {
  label: string
  color: number
  isFocused: boolean
  onFocus: () => void
  onRemove?: () => void
}

function TrackedObjectChip({ label, color, isFocused, onFocus, onRemove }: TrackedObjectChipProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onFocus}
        aria-pressed={isFocused}
        aria-label={`Focus ${label}`}
        className={`flex flex-1 items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-left ${
          isFocused ? 'bg-slate-700' : 'hover:bg-slate-800'
        }`}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: colorToCss(color) }}
        />
        <span className="truncate text-slate-200">{label}</span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Stop tracking ${label}`}
          className="shrink-0 px-1 text-slate-400 hover:text-slate-100"
        >
          ×
        </button>
      )}
    </div>
  )
}

interface StatsPanelProps {
  orbitShape: OrbitShape
  /** The current top-level mode - drives the "Mode" row and whether the raw design-element rows show. */
  mode: ViewerMode
  /** The primary object's raw design elements - shown (design mode only) regardless of which object is focused, mirroring `AccessibleDataView`'s prior behavior. */
  elements: OrbitalElements
  selectedTle: TleRecord | null
  /** The primary object's current ground position, or `null` when not meaningful (non-Earth body, or no ground track yet). */
  currentGeodetic: GeodeticCoordinates | null
  currentAltitudeRef: RefObject<HTMLSpanElement | null>
  currentSpeedRef: RefObject<HTMLSpanElement | null>
  currentEclipseStatusRef: RefObject<HTMLSpanElement | null>
  /** Whether to show the eclipse indicator - only meaningful for a real satellite, and only for the primary object. */
  showEclipseStatus: boolean
  unitSystem: UnitSystem
  primaryLabel: string
  companions: CompanionEntry[]
  focusedId: string
  onFocus: (id: string) => void
  onRemoveCompanion: (id: string) => void
  /** The selected central body's gravitational parameter, km^3/s^2. Defaults to Earth's. */
  muKm3S2?: number
  /** The selected central body's radius, km. Defaults to Earth's. */
  bodyRadiusKm?: number
  /** The selected central body's display name. Defaults to "Earth". */
  centralBodyLabel?: string
  /** Whether to show the Hohmann transfer planner section - Earth, design mode only. Defaults to false. */
  showHohmannPlanner?: boolean
}

/**
 * The single bottom-left "everything about the current state" panel -
 * derived orbit stats (period/apogee/perigee from shape, plus live
 * altitude/speed via refs), the identity/mode/raw-element/ground-position
 * data that used to live in a separate toggleable `AccessibleDataView`
 * table, the tracked-object list (primary + companions), and (Earth, design
 * mode only) the Hohmann transfer planner - all merged into one panel per
 * the settings-overhaul issue, rather than three separately-positioned
 * cards. This intentionally keeps `StatsPanel`'s pre-existing flex-row
 * layout (label/value pairs as sibling text, not a `<table>`) rather than
 * adopting `AccessibleDataView`'s table markup - the accessibility
 * guarantee that mattered (#18) is "real DOM text describing state, reachable
 * without the canvas," which this satisfies either way; a `<table>`'s extra
 * row/column semantics aren't required for a screen reader to read this
 * panel's contents.
 */
export function StatsPanel({
  orbitShape,
  mode,
  elements,
  selectedTle,
  currentGeodetic,
  currentAltitudeRef,
  currentSpeedRef,
  currentEclipseStatusRef,
  showEclipseStatus,
  unitSystem,
  primaryLabel,
  companions,
  focusedId,
  onFocus,
  onRemoveCompanion,
  muKm3S2 = EARTH_MU_KM3_S2,
  bodyRadiusKm = EARTH_RADIUS_KM,
  centralBodyLabel = 'Earth',
  showHohmannPlanner = false,
}: StatsPanelProps) {
  const { semiMajorAxisKm, eccentricity } = orbitShape

  const periodMinutes = useMemo(
    () => orbitalPeriodSeconds(semiMajorAxisKm, muKm3S2) / 60,
    [semiMajorAxisKm, muKm3S2],
  )
  const apogeeKm = useMemo(
    () => apogeeAltitudeKm(semiMajorAxisKm, eccentricity, bodyRadiusKm),
    [semiMajorAxisKm, eccentricity, bodyRadiusKm],
  )
  const perigeeKm = useMemo(
    () => perigeeAltitudeKm(semiMajorAxisKm, eccentricity, bodyRadiusKm),
    [semiMajorAxisKm, eccentricity, bodyRadiusKm],
  )

  return (
    <div className="flex w-56 flex-col gap-1 rounded-lg bg-slate-900/80 p-3 text-xs backdrop-blur">
      <h2 className="mb-1 text-sm font-semibold text-slate-100">Stats</h2>
      <StatRow label="Central body" value={centralBodyLabel} />
      <StatRow label="Mode" value={mode === 'design' ? 'Design orbit' : 'Track real satellite'} />
      <StatRow
        label="Tracked object"
        value={selectedTle ? `${primaryLabel} (NORAD ${selectedTle.noradId})` : primaryLabel}
      />
      <StatRow label="Period" value={`${periodMinutes.toFixed(1)} min`} />
      <StatRow label="Apogee alt" value={formatDistanceKm(apogeeKm, unitSystem, 0)} />
      <StatRow label="Perigee alt" value={formatDistanceKm(perigeeKm, unitSystem, 0)} />
      <StatRow label="Altitude" valueRef={currentAltitudeRef} testId="current-altitude" />
      <StatRow label="Velocity" valueRef={currentSpeedRef} testId="current-speed" />
      {currentGeodetic && (
        <>
          <StatRow label="Latitude" value={`${radToDeg(currentGeodetic.latitudeRad).toFixed(3)}°`} />
          <StatRow label="Longitude" value={`${radToDeg(currentGeodetic.longitudeRad).toFixed(3)}°`} />
        </>
      )}
      {showEclipseStatus && (
        <StatRow label="Sun" valueRef={currentEclipseStatusRef} testId="current-eclipse-status" />
      )}

      {mode === 'design' && (
        <div className="mt-2 flex flex-col gap-0.5 border-t border-slate-700 pt-2">
          <h3 className="mb-0.5 text-slate-400">Orbital elements</h3>
          <StatRow label="a" value={`${elements.semiMajorAxisKm.toFixed(3)} km`} />
          <StatRow label="e" value={elements.eccentricity.toFixed(4)} />
          <StatRow label="i" value={`${radToDeg(elements.inclinationRad).toFixed(2)}°`} />
          <StatRow label="Ω" value={`${radToDeg(elements.raanRad).toFixed(2)}°`} />
          <StatRow label="ω" value={`${radToDeg(elements.argOfPerigeeRad).toFixed(2)}°`} />
          <StatRow label="ν" value={`${radToDeg(elements.trueAnomalyRad).toFixed(2)}°`} />
        </div>
      )}

      {companions.length > 0 && (
        <div className="mt-2 flex flex-col gap-0.5 border-t border-slate-700 pt-2">
          <TrackedObjectChip
            label={primaryLabel}
            color={DEFAULT_PRIMARY_COLOR}
            isFocused={focusedId === PRIMARY_OBJECT_ID}
            onFocus={() => onFocus(PRIMARY_OBJECT_ID)}
          />
          {companions.map((companion) => (
            <TrackedObjectChip
              key={companion.id}
              label={companion.label}
              color={companion.color}
              isFocused={focusedId === companion.id}
              onFocus={() => onFocus(companion.id)}
              onRemove={() => onRemoveCompanion(companion.id)}
            />
          ))}
        </div>
      )}

      {showHohmannPlanner && <HohmannPlanner />}
    </div>
  )
}
