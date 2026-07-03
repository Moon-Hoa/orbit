import type { ClosestApproachResult } from '../three/closestApproach'

/** Formats a duration in seconds as "HH:MM:SS" (no day rollover - the search window is capped at a few days). */
function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
}

interface ClosestApproachPanelProps {
  result: ClosestApproachResult | null
}

/** Time/distance/relative-velocity of closest approach between the two currently-tracked objects. Renders nothing unless exactly two are tracked. */
export function ClosestApproachPanel({ result }: ClosestApproachPanelProps) {
  if (!result) return null

  return (
    <div className="flex w-56 flex-col gap-1 rounded-lg bg-slate-900/80 p-3 text-xs backdrop-blur">
      <h2 className="mb-1 text-sm font-semibold text-slate-100">Closest approach</h2>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Time to CA</span>
        <span className="font-mono text-slate-100">
          {formatDuration(result.timeToClosestApproachSeconds)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Min distance</span>
        <span className="font-mono text-slate-100">{result.minDistanceKm.toFixed(1)} km</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">Rel. velocity</span>
        <span className="font-mono text-slate-100">
          {result.relativeVelocityKmS.toFixed(3)} km/s
        </span>
      </div>
    </div>
  )
}
