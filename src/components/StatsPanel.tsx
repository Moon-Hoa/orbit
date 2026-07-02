import type { RefObject } from 'react'
import { useMemo } from 'react'
import { apogeeAltitudeKm, orbitalPeriodSeconds, perigeeAltitudeKm } from '../engine'

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

interface StatsPanelProps {
  orbitShape: OrbitShape
  currentAltitudeRef: RefObject<HTMLSpanElement | null>
  currentSpeedRef: RefObject<HTMLSpanElement | null>
}

/** Derived orbit stats: period/apogee/perigee (from orbit shape) plus live altitude/speed (ref-driven). */
export function StatsPanel({ orbitShape, currentAltitudeRef, currentSpeedRef }: StatsPanelProps) {
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
    <div className="absolute bottom-4 left-4 flex w-56 flex-col gap-1 rounded-lg bg-slate-900/80 p-3 text-xs backdrop-blur">
      <h2 className="mb-1 text-sm font-semibold text-slate-100">Stats</h2>
      <StatRow label="Period" value={`${periodMinutes.toFixed(1)} min`} />
      <StatRow label="Apogee alt" value={`${apogeeKm.toFixed(0)} km`} />
      <StatRow label="Perigee alt" value={`${perigeeKm.toFixed(0)} km`} />
      <StatRow label="Altitude" valueRef={currentAltitudeRef} testId="current-altitude" />
      <StatRow label="Velocity" valueRef={currentSpeedRef} testId="current-speed" />
    </div>
  )
}
