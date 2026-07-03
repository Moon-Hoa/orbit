import type { RefObject } from 'react'
import { useMemo } from 'react'
import { apogeeAltitudeKm, orbitalPeriodSeconds, perigeeAltitudeKm } from '../engine'
import { PRIMARY_OBJECT_ID } from '../three/OrbitScene'
import { type CompanionEntry, DEFAULT_PRIMARY_COLOR, colorToCss } from './companions'
import { type UnitSystem, formatDistanceKm } from './distanceUnits'

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
}

/**
 * Derived orbit stats (period/apogee/perigee from shape, plus live
 * altitude/speed via refs) for the focused tracked object, plus a list of
 * every tracked object (primary + companions) to switch focus or stop
 * tracking a companion.
 */
export function StatsPanel({
  orbitShape,
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
}: StatsPanelProps) {
  const { semiMajorAxisKm, eccentricity } = orbitShape

  const periodMinutes = useMemo(
    () => orbitalPeriodSeconds(semiMajorAxisKm) / 60,
    [semiMajorAxisKm],
  )
  const apogeeKm = useMemo(
    () => apogeeAltitudeKm(semiMajorAxisKm, eccentricity),
    [semiMajorAxisKm, eccentricity],
  )
  const perigeeKm = useMemo(
    () => perigeeAltitudeKm(semiMajorAxisKm, eccentricity),
    [semiMajorAxisKm, eccentricity],
  )

  return (
    <div className="flex w-56 flex-col gap-1 rounded-lg bg-slate-900/80 p-3 text-xs backdrop-blur">
      <h2 className="mb-1 text-sm font-semibold text-slate-100">Stats</h2>
      <StatRow label="Period" value={`${periodMinutes.toFixed(1)} min`} />
      <StatRow label="Apogee alt" value={formatDistanceKm(apogeeKm, unitSystem, 0)} />
      <StatRow label="Perigee alt" value={formatDistanceKm(perigeeKm, unitSystem, 0)} />
      <StatRow label="Altitude" valueRef={currentAltitudeRef} testId="current-altitude" />
      <StatRow label="Velocity" valueRef={currentSpeedRef} testId="current-speed" />
      {showEclipseStatus && (
        <StatRow label="Sun" valueRef={currentEclipseStatusRef} testId="current-eclipse-status" />
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
    </div>
  )
}
