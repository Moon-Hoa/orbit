import { useMemo, useState } from 'react'
import { EARTH_RADIUS_KM, hohmannTransfer } from '../engine'

const DEFAULT_FROM_ALTITUDE_KM = 300
const DEFAULT_TO_ALTITUDE_KM = 35786

/** Formats a duration in seconds as "Xh Ym", for the (potentially many-hour) Hohmann transfer time. */
function formatTransferTime(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

interface StatRowProps {
  label: string
  value: string
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-100">{value}</span>
    </div>
  )
}

/**
 * Two-impulse Hohmann transfer calculator between two circular, coplanar
 * orbits, specified by altitude - design mode only. Deliberately
 * altitude-driven (rather than picking two presets) since several presets
 * are eccentric, and a Hohmann transfer is only defined between circular
 * orbits.
 */
export function HohmannPlanner() {
  const [fromAltitudeKm, setFromAltitudeKm] = useState(DEFAULT_FROM_ALTITUDE_KM)
  const [toAltitudeKm, setToAltitudeKm] = useState(DEFAULT_TO_ALTITUDE_KM)

  const transfer = useMemo(() => {
    const departureRadiusKm = EARTH_RADIUS_KM + fromAltitudeKm
    const arrivalRadiusKm = EARTH_RADIUS_KM + toAltitudeKm
    if (departureRadiusKm <= 0 || arrivalRadiusKm <= 0) return null
    return hohmannTransfer(departureRadiusKm, arrivalRadiusKm)
  }, [fromAltitudeKm, toAltitudeKm])

  return (
    <div className="relative flex max-h-[45vh] w-full flex-col gap-2 overflow-y-auto rounded-lg bg-slate-900/80 p-3 text-xs backdrop-blur lg:absolute lg:right-4 lg:bottom-4 lg:w-72 lg:max-w-[calc(100vw-2rem)]">
      <h2 className="text-sm font-semibold text-slate-100">Hohmann transfer</h2>
      <p className="text-slate-400">
        Circular, coplanar orbits only — no plane-change delta-v, no eccentric orbits.
      </p>

      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2">
          <span className="text-slate-400">From</span>
          <input
            type="number"
            aria-label="From altitude"
            value={fromAltitudeKm}
            onChange={(event) => setFromAltitudeKm(Number(event.target.value))}
            className="w-0 flex-1 rounded bg-slate-800 px-2 py-1 text-slate-100"
          />
        </label>
        <span className="text-slate-400">km alt</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2">
          <span className="text-slate-400">To</span>
          <input
            type="number"
            aria-label="To altitude"
            value={toAltitudeKm}
            onChange={(event) => setToAltitudeKm(Number(event.target.value))}
            className="w-0 flex-1 rounded bg-slate-800 px-2 py-1 text-slate-100"
          />
        </label>
        <span className="text-slate-400">km alt</span>
      </div>

      {transfer ? (
        <div className="mt-1 flex flex-col gap-0.5 border-t border-slate-700 pt-2">
          <StatRow label="Departure Δv" value={`${transfer.departureDeltaVKmS.toFixed(3)} km/s`} />
          <StatRow label="Arrival Δv" value={`${transfer.arrivalDeltaVKmS.toFixed(3)} km/s`} />
          <StatRow label="Total Δv" value={`${transfer.totalDeltaVKmS.toFixed(3)} km/s`} />
          <StatRow label="Transfer time" value={formatTransferTime(transfer.transferTimeSeconds)} />
        </div>
      ) : (
        <p className="text-red-400">Enter positive altitudes for both orbits.</p>
      )}
    </div>
  )
}
